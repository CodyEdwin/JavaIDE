package dev.javaide.gradlebridge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TestScannerTest {
    @Test
    void discoversJunit5TestsFromCompiledClasses() {
        TestScanner.Result result = TestScanner.scan(
                List.of(Path.of("build/classes/java/test")), List.of(Path.of("src/test/java")));

        TestScanner.ClassInfo sample = result.classes().stream()
                .filter(info -> info.name().equals("dev.javaide.gradlebridge.fixtures.SampleTests"))
                .findFirst()
                .orElseThrow();
        assertEquals("junit5", sample.framework());
        assertEquals("Sample tests", sample.displayName());
        assertNotNull(sample.sourcePath());
        assertTrue(Files.isRegularFile(Path.of(sample.sourcePath())));

        Map<String, TestScanner.MethodInfo> methods = sample.methods().stream()
                .collect(java.util.stream.Collectors.toMap(
                        TestScanner.MethodInfo::name, method -> method));
        assertEquals("works", methods.get("works").displayName());
        assertNotNull(methods.get("works").line());
        assertTrue(methods.get("skipped").disabled());
        assertFalse(methods.containsKey("<init>"));

        TestScanner.ClassInfo nested = result.classes().stream()
                .filter(info -> info.name().equals(
                        "dev.javaide.gradlebridge.fixtures.SampleTests$NestedCase"))
                .findFirst()
                .orElseThrow();
        assertTrue(nested.nested());
        assertTrue(nested.methods().stream().anyMatch(method -> method.name().equals("nestedWorks")));
    }

    @Test
    void missingOutputDirectoriesProduceNoTests() {
        TestScanner.Result result = TestScanner.scan(
                List.of(Path.of("build/does-not-exist")), List.of(Path.of("src/test/java")));
        assertTrue(result.classes().isEmpty());
    }
}
