package dev.javaide.gradlebridge;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.objectweb.asm.AnnotationVisitor;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.Label;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;
import org.objectweb.asm.Type;

/**
 * Test discovery by scanning compiled test classes with ASM.
 *
 * <p>Discovery must not execute user tests. The scan recognizes JUnit 5, JUnit
 * 4, and TestNG annotations and reads {@code SourceFile}/{@code LineNumberTable}
 * for source locations. Unsupported frameworks produce a warning rather than
 * invented methods.
 */
final class TestScanner {
    private static final int MAX_CLASSES = 20_000;
    private static final String JUNIT5 = "junit5";
    private static final String JUNIT4 = "junit4";
    private static final String TESTNG = "testng";

    record MethodInfo(
            String name,
            String displayName,
            Integer line,
            String kind,
            boolean hasParameters,
            boolean disabled) {}

    record ClassInfo(
            String name,
            String displayName,
            String framework,
            String sourceFile,
            String sourcePath,
            boolean nested,
            List<MethodInfo> methods) {}

    record Result(List<ClassInfo> classes, List<String> warnings) {}

    private TestScanner() {}

    static Result scan(List<Path> outputDirs, List<Path> sourceDirs) {
        Map<String, ClassInfo> classes = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();
        int scanned = 0;
        for (Path outputDir : outputDirs) {
            if (!Files.isDirectory(outputDir)) {
                continue;
            }
            try (Stream<Path> files = Files.walk(outputDir)) {
                List<Path> classFiles = files
                        .filter(Files::isRegularFile)
                        .filter(path -> path.toString().endsWith(".class"))
                        .filter(path -> !path.getFileName().toString().equals("module-info.class"))
                        .filter(path -> !path.getFileName().toString().equals("package-info.class"))
                        .sorted()
                        .toList();
                for (Path file : classFiles) {
                    if (scanned++ >= MAX_CLASSES) {
                        warnings.add("test discovery stopped after " + MAX_CLASSES + " classes");
                        break;
                    }
                    try {
                        ClassInfo info = scanClass(file, sourceDirs);
                        if (info != null) {
                            classes.putIfAbsent(info.name(), info);
                        }
                    } catch (IOException | RuntimeException error) {
                        warnings.add("cannot scan " + file + ": " + RpcException.describe(error));
                    }
                }
            } catch (IOException error) {
                warnings.add("cannot walk " + outputDir + ": " + RpcException.describe(error));
            }
            if (scanned >= MAX_CLASSES) {
                break;
            }
        }
        List<ClassInfo> result = new ArrayList<>(classes.values());
        result.sort(Comparator.comparing(ClassInfo::name));
        warnings.sort(String::compareTo);
        return new Result(result, warnings);
    }

    private static ClassInfo scanClass(Path file, List<Path> sourceDirs) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        ClassCollector collector = new ClassCollector();
        new ClassReader(bytes).accept(collector, ClassReader.SKIP_FRAMES);
        if (collector.name == null || collector.methods.isEmpty()) {
            return null;
        }
        int access = collector.access;
        if ((access & (Opcodes.ACC_INTERFACE
                        | Opcodes.ACC_ANNOTATION
                        | Opcodes.ACC_ENUM
                        | Opcodes.ACC_MODULE
                        | Opcodes.ACC_SYNTHETIC
                        | Opcodes.ACC_ABSTRACT))
                != 0) {
            return null;
        }
        String className = collector.name.replace('/', '.');
        String framework = collector.framework;
        if (framework == null) {
            framework = "unknown";
        }
        List<MethodInfo> methods = new ArrayList<>(collector.methods);
        methods.sort(Comparator
                .comparing((MethodInfo method) -> method.line() == null ? Integer.MAX_VALUE : method.line())
                .thenComparing(MethodInfo::name));
        String sourcePath = resolveSource(className, collector.sourceFile, sourceDirs);
        String displayName = collector.displayName;
        if (displayName == null || displayName.isBlank()) {
            displayName = className.replace('$', '.');
        }
        return new ClassInfo(
                className,
                displayName,
                framework,
                collector.sourceFile,
                sourcePath,
                collector.nested,
                List.copyOf(methods));
    }

    private static String resolveSource(String className, String sourceFile, List<Path> sourceDirs) {
        if (sourceFile == null || sourceFile.isBlank()) {
            return null;
        }
        int separator = className.lastIndexOf('.');
        String packagePath = separator < 0 ? "" : className.substring(0, separator).replace('.', '/');
        for (Path sourceDir : sourceDirs) {
            Path candidate = sourceDir.resolve(packagePath).resolve(sourceFile).normalize();
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().toString();
            }
        }
        return null;
    }

    private static final class ClassCollector extends ClassVisitor {
        String name;
        int access;
        String sourceFile;
        String displayName;
        String framework;
        boolean nested;
        final List<MethodInfo> methods = new ArrayList<>();

        ClassCollector() {
            super(Opcodes.ASM9);
        }

        @Override
        public void visit(
                int version,
                int access,
                String name,
                String signature,
                String superName,
                String[] interfaces) {
            this.name = name;
            this.access = access;
        }

        @Override
        public void visitSource(String source, String debug) {
            this.sourceFile = source;
        }

        @Override
        public AnnotationVisitor visitAnnotation(String descriptor, boolean visible) {
            switch (descriptor) {
                case "Lorg/junit/jupiter/api/Testable;" -> framework = JUNIT5;
                case "Lorg/junit/jupiter/api/Nested;" -> {
                    framework = JUNIT5;
                    nested = true;
                }
                case "Lorg/junit/jupiter/api/DisplayName;" -> {
                    framework = JUNIT5;
                    return displayNameVisitor();
                }
                case "Lorg/junit/runner/RunWith;" -> framework = JUNIT4;
                case "Lorg/testng/annotations/Test;" -> framework = TESTNG;
                default -> {
                    // Not a class-level test annotation.
                }
            }
            return null;
        }

        @Override
        public MethodVisitor visitMethod(
                int access, String name, String descriptor, String signature, String[] exceptions) {
            return new MethodCollector(access, name, descriptor);
        }

        private AnnotationVisitor displayNameVisitor() {
            return new AnnotationVisitor(Opcodes.ASM9) {
                @Override
                public void visit(String name, Object value) {
                    if ("value".equals(name) && value instanceof String text) {
                        displayName = text;
                    }
                }
            };
        }

        private final class MethodCollector extends MethodVisitor {
            private final int methodAccess;
            private final String methodName;
            private final String methodDescriptor;
            private String kind;
            private String methodFramework;
            private String methodDisplayName;
            private Integer line;
            private boolean disabled;

            MethodCollector(int access, String name, String descriptor) {
                super(Opcodes.ASM9);
                this.methodAccess = access;
                this.methodName = name;
                this.methodDescriptor = descriptor;
            }

            @Override
            public AnnotationVisitor visitAnnotation(String descriptor, boolean visible) {
                switch (descriptor) {
                    case "Lorg/junit/jupiter/api/Test;" -> junit5("test");
                    case "Lorg/junit/jupiter/api/TestFactory;" -> junit5("testFactory");
                    case "Lorg/junit/jupiter/api/ParameterizedTest;" -> junit5("parameterized");
                    case "Lorg/junit/jupiter/api/RepeatedTest;" -> junit5("repeated");
                    case "Lorg/junit/jupiter/api/TestTemplate;" -> junit5("testTemplate");
                    case "Lorg/junit/jupiter/api/DisplayName;" -> {
                        return displayNameVisitor();
                    }
                    case "Lorg/junit/jupiter/api/Disabled;" -> {
                        disabled = true;
                        if (methodFramework == null) {
                            methodFramework = JUNIT5;
                        }
                    }
                    case "Lorg/junit/Test;" -> {
                        kind = "test";
                        methodFramework = JUNIT4;
                    }
                    case "Lorg/junit/Ignore;" -> disabled = true;
                    case "Lorg/testng/annotations/Test;" -> {
                        kind = "test";
                        methodFramework = TESTNG;
                    }
                    default -> {
                        // Not a test annotation.
                    }
                }
                return null;
            }

            private void junit5(String testKind) {
                kind = testKind;
                methodFramework = JUNIT5;
            }

            private AnnotationVisitor displayNameVisitor() {
                return new AnnotationVisitor(Opcodes.ASM9) {
                    @Override
                    public void visit(String name, Object value) {
                        if ("value".equals(name) && value instanceof String text) {
                            methodDisplayName = text;
                        }
                    }
                };
            }

            @Override
            public void visitLineNumber(int lineNumber, Label start) {
                if (line == null || lineNumber < line) {
                    line = lineNumber;
                }
            }

            @Override
            public void visitEnd() {
                if (kind == null) {
                    return;
                }
                if ((methodAccess
                                & (Opcodes.ACC_SYNTHETIC
                                        | Opcodes.ACC_BRIDGE
                                        | Opcodes.ACC_ABSTRACT
                                        | Opcodes.ACC_STATIC))
                        != 0) {
                    return;
                }
                if (methodName.startsWith("<")) {
                    return;
                }
                if (methodFramework != null) {
                    framework = mergeFramework(framework, methodFramework);
                }
                int parameters = Type.getArgumentTypes(methodDescriptor).length;
                methods.add(new MethodInfo(
                        methodName,
                        methodDisplayName == null || methodDisplayName.isBlank()
                                ? methodName
                                : methodDisplayName,
                        line,
                        kind,
                        parameters > 0,
                        disabled));
            }
        }
    }

    private static String mergeFramework(String current, String candidate) {
        if (current == null) {
            return candidate;
        }
        if (current.equals(candidate)) {
            return current;
        }
        // A class mixing frameworks is unusual. JUnit 5 has the richest model.
        if (JUNIT5.equals(current) || JUNIT5.equals(candidate)) {
            return JUNIT5;
        }
        if (JUNIT4.equals(current) || JUNIT4.equals(candidate)) {
            return JUNIT4;
        }
        return TESTNG;
    }
}
