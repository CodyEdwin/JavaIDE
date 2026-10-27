package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.javaide.gradlebridge.model.BuildProjectModel;
import dev.javaide.gradlebridge.model.BuildSnapshotModel;
import dev.javaide.gradlebridge.model.DependencyReportModel;
import dev.javaide.gradlebridge.model.SourceSetModel;
import dev.javaide.gradlebridge.model.TaskModel;
import java.io.IOException;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.gradle.tooling.BuildActionExecuter;
import org.gradle.tooling.BuildCancelledException;
import org.gradle.tooling.BuildException;
import org.gradle.tooling.BuildLauncher;
import org.gradle.tooling.ConfigurableLauncher;
import org.gradle.tooling.Failure;
import org.gradle.tooling.GradleConnectionException;
import org.gradle.tooling.ProgressListener;
import org.gradle.tooling.events.OperationType;

/**
 * Implements the Gradle bridge methods on top of the Tooling API.
 *
 * <p>One process may serve several root builds. Each root has one connection
 * and one operation at a time; cancellation flows through the operation
 * context and never waits for the connection lock.
 */
final class GradleService implements BridgeBackend {
    private final ConnectionPool pool = new ConnectionPool();
    private final ObjectMapper mapper;
    private final Path bridgeClasspath;
    private final Map<String, BuildSnapshotModel> snapshots = new ConcurrentHashMap<>();
    private final AtomicBoolean closed = new AtomicBoolean();

    GradleService(Path bridgeClasspath, ObjectMapper mapper) {
        this.bridgeClasspath = bridgeClasspath;
        this.mapper = mapper;
    }

    @Override
    public Object handle(String method, JsonNode params, OperationContext context) {
        return switch (method) {
            case "sync" -> sync(params, context);
            case "runTask" -> runTask(params, context);
            case "resolveClasspath" -> resolveClasspath(params, context);
            case "listTests" -> listTests(params, context);
            case "runTests" -> runTests(params, context);
            case "dependencyReport" -> dependencyReport(params, context);
            default -> throw RpcException.methodNotFound(method);
        };
    }

    private Map<String, Object> sync(JsonNode params, OperationContext context) {
        try (Leased lease = lease(params)) {
            BuildSnapshotModel snapshot = fetchSnapshot(lease, params, context);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("requestId", context.requestId());
            result.put("snapshot", tree(BuildSnapshotModel.class, snapshot));
            return result;
        } catch (RpcException error) {
            throw error;
        } catch (RuntimeException error) {
            throw syncFailure(context, error);
        }
    }

    private BuildSnapshotModel fetchSnapshot(
            Leased lease, JsonNode params, OperationContext context) {
        Path initScript = null;
        try {
            initScript = writeInitScript();
            List<String> arguments = arguments(params);
            arguments.add("--init-script");
            arguments.add(initScript.toString());

            BuildActionExecuter<BuildSnapshotModel> executer =
                    lease.holder.connection.action(new FetchSnapshotAction());
            applyCommon(executer, lease, context, arguments, Map.of());
            executer.addProgressListener((ProgressListener)
                    event -> context.notify(
                            "sync.progress", Map.of("message", String.valueOf(event.getDescription()))));
            BuildSnapshotModel snapshot = executer.run();
            snapshots.put(lease.root.toString(), snapshot);
            return snapshot;
        } finally {
            deleteQuietly(initScript);
        }
    }

    private Map<String, Object> runTask(JsonNode params, OperationContext context) {
        List<String> tasks = Params.strings(params, "tasks");
        if (tasks.isEmpty()) {
            throw RpcException.invalidParams("tasks must not be empty");
        }
        try (Leased lease = lease(params)) {
            return runTask(lease, params, context, tasks);
        }
    }

    private Map<String, Object> runTask(
            Leased lease, JsonNode params, OperationContext context, List<String> tasks) {
        long startedAt = System.currentTimeMillis();
        BuildEvents events = new BuildEvents(context);
        StreamingOutput stdout = new StreamingOutput(context, "stdout");
        StreamingOutput stderr = new StreamingOutput(context, "stderr");
        List<String> failures = new ArrayList<>();
        boolean cancelled = false;
        boolean failed = false;
        try {
            BuildLauncher launcher = lease.holder.connection.newBuild();
            launcher.forTasks(tasks.toArray(String[]::new));
            applyCommon(launcher, lease, context, arguments(params), Params.stringMap(params, "environment"));
            launcher.setStandardOutput(stdout);
            launcher.setStandardError(stderr);
            launcher.addProgressListener(events, OperationType.TASK);
            launcher.addProgressListener((ProgressListener)
                    event -> context.notify(
                            "task.progress", Map.of("message", String.valueOf(event.getDescription()))));
            launcher.withDetailedFailure();
            launcher.run();
            failed = events.failed();
            failures.addAll(events.failures());
        } catch (BuildException error) {
            failed = true;
            failures.addAll(failureMessages(error));
        } catch (GradleConnectionException error) {
            if (isCancellation(error) || context.isCancelled()) {
                cancelled = true;
            } else {
                throw RpcException.failed("gradle.task.failed", "Gradle task failed", error);
            }
        } finally {
            stdout.close();
            stderr.close();
        }
        cancelled = cancelled || context.isCancelled();
        if (failures.isEmpty() && failed) {
            failures.add("Gradle reported a failed task; see the build output");
        }
        if (cancelled && failures.isEmpty()) {
            failures.add(context.isTimedOut() ? "operation timed out" : "operation was cancelled");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requestId", context.requestId());
        result.put("cancelled", cancelled);
        result.put("timedOut", context.isTimedOut());
        result.put("failed", failed);
        result.put("durationMs", System.currentTimeMillis() - startedAt);
        result.put("taskOutcomes", events.taskOutcomes());
        result.put("failures", List.copyOf(failures));
        result.put("stdout", stdout.text());
        result.put("stderr", stderr.text());
        return result;
    }

    private Map<String, Object> listTests(JsonNode params, OperationContext context) {
        try (Leased lease = lease(params)) {
            BuildSnapshotModel snapshot = snapshots.get(lease.root.toString());
            if (snapshot == null) {
                snapshot = fetchSnapshot(lease, params, context);
            }
            String projectPath = Params.text(params, "projectPath");
            if (projectPath == null || projectPath.isBlank()) {
                projectPath = ":";
            }
            BuildProjectModel project = findProject(snapshot, projectPath);
            String taskPath = Params.text(params, "taskPath");
            if (taskPath == null || taskPath.isBlank()) {
                if (project.getTestTasks().isEmpty()) {
                    throw RpcException.failed(
                            "gradle.tests.noTestTask",
                            "project " + projectPath + " has no test task",
                            (String) null);
                }
                taskPath = project.getTestTasks().get(0).getPath();
            }

            List<String> warnings = new ArrayList<>();
            boolean compiled = false;
            boolean compileFailed = false;
            String compileOutput = "";
            if (Params.bool(params, "compile", true)) {
                compiled = true;
                String compileTask = taskPath + "Classes";
                Map<String, Object> compile = runTask(
                        lease, params, context, List.of(compileTask));
                compileFailed = Boolean.TRUE.equals(compile.get("failed"))
                        || Boolean.TRUE.equals(compile.get("cancelled"));
                compileOutput = String.valueOf(compile.get("stdout"))
                        + String.valueOf(compile.get("stderr"));
                if (compileFailed) {
                    warnings.add("compiling " + compileTask + " failed; test discovery may be stale");
                }
            }

            List<Path> outputDirs = new ArrayList<>();
            List<Path> sourceDirs = new ArrayList<>();
            for (SourceSetModel sourceSet : project.getSourceSets()) {
                if (!isTestSourceSet(sourceSet.getName())) {
                    continue;
                }
                for (String dir : sourceSet.getOutputDirs()) {
                    outputDirs.add(Path.of(dir));
                }
                for (String dir : sourceSet.getJavaDirs()) {
                    sourceDirs.add(Path.of(dir));
                }
                for (String dir : sourceSet.getResourceDirs()) {
                    sourceDirs.add(Path.of(dir));
                }
            }
            if (outputDirs.isEmpty()) {
                warnings.add("no compiled test source sets found for " + projectPath);
            }
            TestScanner.Result scan = TestScanner.scan(outputDirs, sourceDirs);
            warnings.addAll(scan.warnings());

            List<Map<String, Object>> tests = new ArrayList<>();
            for (TestScanner.ClassInfo info : scan.classes()) {
                String classId = projectPath + "|" + info.name();
                Map<String, Object> testClass = new LinkedHashMap<>();
                testClass.put("id", classId);
                testClass.put("projectPath", projectPath);
                testClass.put("taskPath", taskPath);
                testClass.put("className", info.name());
                testClass.put("displayName", info.displayName());
                testClass.put("framework", info.framework());
                testClass.put("sourceFile", info.sourceFile());
                testClass.put("sourcePath", info.sourcePath());
                testClass.put("nested", info.nested());
                List<Map<String, Object>> methods = new ArrayList<>();
                for (TestScanner.MethodInfo method : info.methods()) {
                    Map<String, Object> methodMap = new LinkedHashMap<>();
                    methodMap.put("id", classId + "#" + method.name());
                    methodMap.put("name", method.name());
                    methodMap.put("displayName", method.displayName());
                    methodMap.put("line", method.line());
                    methodMap.put("kind", method.kind());
                    methodMap.put("hasParameters", method.hasParameters());
                    methodMap.put("disabled", method.disabled());
                    methods.add(methodMap);
                }
                testClass.put("methods", methods);
                tests.add(testClass);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("requestId", context.requestId());
            result.put("projectPath", projectPath);
            result.put("taskPath", taskPath);
            result.put("compiled", compiled);
            result.put("compileFailed", compileFailed);
            result.put("compileOutput", compileOutput);
            result.put("tests", tests);
            result.put("warnings", warnings);
            return result;
        } catch (RpcException error) {
            throw error;
        } catch (RuntimeException error) {
            throw syncFailure(context, error);
        }
    }

    private Map<String, Object> runTests(JsonNode params, OperationContext context) {
        try (Leased lease = lease(params)) {
            BuildSnapshotModel snapshot = snapshots.get(lease.root.toString());
            if (snapshot == null) {
                snapshot = fetchSnapshot(lease, params, context);
            }
            String projectPath = Params.text(params, "projectPath");
            if (projectPath == null || projectPath.isBlank()) {
                projectPath = ":";
            }
            BuildProjectModel project = findProject(snapshot, projectPath);
            String taskPath = Params.text(params, "taskPath");
            if (taskPath == null || taskPath.isBlank()) {
                if (project.getTestTasks().isEmpty()) {
                    throw RpcException.failed(
                            "gradle.tests.noTestTask",
                            "project " + projectPath + " has no test task",
                            (String) null);
                }
                taskPath = project.getTestTasks().get(0).getPath();
            }

            List<String> classes = Params.strings(params, "classes");
            List<TestMethod> methods = testMethods(params);
            JsonNode debugNode = Params.object(params, "debug");
            boolean debugEnabled = debugNode != null && Params.bool(debugNode, "enabled", true);
            Path testScript = null;
            String debugHost = null;
            int debugPort = 0;
            boolean debugSuspend = true;
            List<String> arguments = arguments(params);
            if (debugEnabled) {
                debugHost = Params.text(debugNode, "host");
                if (debugHost == null || debugHost.isBlank()) {
                    debugHost = "127.0.0.1";
                }
                long requestedPort = Params.longValue(debugNode, "port", 0);
                if (requestedPort < 0 || requestedPort > 65_535) {
                    throw RpcException.invalidParams("debug.port is out of range");
                }
                debugPort = requestedPort == 0 ? allocatePort() : (int) requestedPort;
                debugSuspend = Params.bool(debugNode, "suspend", true);
            }
            try {
                testScript = TestRunScript.write(
                        taskPath,
                        classes,
                        methods.stream()
                                .map(method -> new TestRunScript.TestRef(
                                        method.className(), method.methodName()))
                                .toList(),
                        debugEnabled
                                ? new TestRunScript.DebugOptions(
                                        debugHost, debugPort, debugSuspend)
                                : null);
            } catch (IOException | IllegalArgumentException error) {
                throw RpcException.failed(
                        "gradle.debug.script", "cannot prepare the test run", error);
            }
            arguments.add("--init-script");
            arguments.add(testScript.toString());
            if (debugEnabled) {
                Log.info(
                        "test debug enabled on %s:%d (suspend=%s) via %s",
                        debugHost, debugPort, debugSuspend, testScript);
            }

            long startedAt = System.currentTimeMillis();
            BuildEvents events = new BuildEvents(context);
            StreamingOutput stdout = new StreamingOutput(context, "stdout");
            StreamingOutput stderr = new StreamingOutput(context, "stderr");
            List<String> failures = new ArrayList<>();
            boolean cancelled = false;
            boolean failed = false;
            try {
                BuildLauncher launcher = lease.holder.connection.newBuild();
                launcher.forTasks(taskPath);
                applyCommon(
                        launcher,
                        lease,
                        context,
                        arguments,
                        Params.stringMap(params, "environment"));
                launcher.setStandardOutput(stdout);
                launcher.setStandardError(stderr);
                launcher.addProgressListener(
                        events, OperationType.TASK, OperationType.TEST, OperationType.TEST_OUTPUT);
                launcher.addProgressListener((ProgressListener)
                        event -> context.notify(
                                "task.progress",
                                Map.of("message", String.valueOf(event.getDescription()))));
                launcher.withDetailedFailure();
                launcher.run();
                failed = events.failed();
                failures.addAll(events.failures());
            } catch (BuildException error) {
                failed = true;
                failures.addAll(failureMessages(error));
            } catch (GradleConnectionException error) {
                if (isCancellation(error) || context.isCancelled()) {
                    cancelled = true;
                } else {
                    throw RpcException.failed("gradle.tests.failed", "Gradle test run failed", error);
                }
            } finally {
                stdout.close();
                stderr.close();
                deleteQuietly(testScript);
            }
            cancelled = cancelled || context.isCancelled();
            if (failures.isEmpty() && failed) {
                failures.add("Gradle reported a failed test run; see the test output");
            }
            if (cancelled && failures.isEmpty()) {
                failures.add(context.isTimedOut() ? "operation timed out" : "operation was cancelled");
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("requestId", context.requestId());
            result.put("projectPath", projectPath);
            result.put("taskPath", taskPath);
            result.put("cancelled", cancelled);
            result.put("timedOut", context.isTimedOut());
            result.put("failed", failed);
            result.put("durationMs", System.currentTimeMillis() - startedAt);
            result.put("tests", events.testResults());
            result.put("taskOutcomes", events.taskOutcomes());
            result.put("failures", List.copyOf(failures));
            result.put("stdout", stdout.text());
            result.put("stderr", stderr.text());
            if (debugEnabled) {
                result.put("debug", Map.of(
                        "host", debugHost,
                        "port", debugPort,
                        "suspend", debugSuspend));
            }
            return result;
        } catch (RpcException error) {
            throw error;
        } catch (RuntimeException error) {
            throw syncFailure(context, error);
        }
    }

    private Map<String, Object> resolveClasspath(JsonNode params, OperationContext context) {
        try (Leased lease = lease(params)) {
            BuildSnapshotModel snapshot = snapshots.get(lease.root.toString());
            if (snapshot == null) {
                snapshot = fetchSnapshot(lease, params, context);
            }
            String projectPath = Params.text(params, "projectPath");
            if (projectPath == null || projectPath.isBlank()) {
                projectPath = ":";
            }
            String sourceSetName = Params.text(params, "sourceSet");
            if (sourceSetName == null || sourceSetName.isBlank()) {
                sourceSetName = "main";
            }
            BuildProjectModel project = findProject(snapshot, projectPath);
            SourceSetModel sourceSet = null;
            for (SourceSetModel candidate : project.getSourceSets()) {
                if (candidate.getName().equals(sourceSetName)) {
                    sourceSet = candidate;
                    break;
                }
            }
            if (sourceSet == null) {
                throw RpcException.failed(
                        "gradle.classpath.noSourceSet",
                        "unknown source set " + sourceSetName + " in " + projectPath,
                        (String) null);
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("requestId", context.requestId());
            result.put("projectPath", projectPath);
            result.put("sourceSet", sourceSetName);
            result.put("compileClasspath", sourceSet.getCompileClasspath());
            result.put("runtimeClasspath", sourceSet.getRuntimeClasspath());
            result.put("outputDirs", sourceSet.getOutputDirs());
            result.put("resolutionError", sourceSet.getResolutionError());
            return result;
        } catch (RpcException error) {
            throw error;
        } catch (RuntimeException error) {
            throw syncFailure(context, error);
        }
    }

    private Map<String, Object> dependencyReport(JsonNode params, OperationContext context) {
        String projectPath = Params.text(params, "projectPath");
        if (projectPath == null || projectPath.isBlank()) {
            projectPath = ":";
        }
        String configuration = Params.requiredText(params, "configuration");
        try (Leased lease = lease(params)) {
            Path initScript = null;
            try {
                initScript = writeInitScript();
                List<String> arguments = arguments(params);
                arguments.add("--init-script");
                arguments.add(initScript.toString());
                BuildActionExecuter<DependencyReportModel> executer =
                        lease.holder.connection.action(
                                new FetchDependencyReportAction(projectPath, configuration));
                applyCommon(executer, lease, context, arguments, Map.of());
                DependencyReportModel report = executer.run();
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("requestId", context.requestId());
                result.put("report", tree(DependencyReportModel.class, report));
                return result;
            } finally {
                deleteQuietly(initScript);
            }
        } catch (RpcException error) {
            throw error;
        } catch (RuntimeException error) {
            throw syncFailure(context, error);
        }
    }

    private void applyCommon(            ConfigurableLauncher<?> launcher,
            Leased lease,
            OperationContext context,
            List<String> arguments,
            Map<String, String> environment) {
        if (!arguments.isEmpty()) {
            launcher.withArguments(arguments);
        }
        if (lease.options.javaHome != null) {
            launcher.setJavaHome(lease.options.javaHome.toFile());
        }
        if (!environment.isEmpty()) {
            launcher.setEnvironmentVariables(environment);
        }
        launcher.setColorOutput(false);
        launcher.withCancellationToken(context.token());
    }

    private <T> JsonNode tree(Class<T> type, T value) {
        try {
            return mapper.readTree(mapper.writerFor(type).writeValueAsString(value));
        } catch (IOException error) {
            throw RpcException.failed("gradle.serialize", "cannot serialize Gradle model", error);
        }
    }

    private Leased lease(JsonNode params) {
        String rootText = Params.root(params);
        Path root = Path.of(rootText);
        ConnectionPool.Options options = ConnectionPool.options(
                root,
                Params.text(params, "gradleHome"),
                Params.text(params, "javaHome"),
                Params.text(params, "gradleUserHome"));
        ConnectionPool.Holder holder = pool.acquire(options);
        holder.lock.lock();
        return new Leased(holder, options);
    }

    private List<String> arguments(JsonNode params) {
        List<String> arguments = new ArrayList<>(Params.strings(params, "arguments"));
        if (Params.bool(params, "offline", false)) {
            arguments.add("--offline");
        }
        return arguments;
    }

    private BuildProjectModel findProject(BuildSnapshotModel snapshot, String projectPath) {
        for (BuildProjectModel project : snapshot.getProjects()) {
            if (project.getPath().equals(projectPath)) {
                return project;
            }
        }
        throw RpcException.failed(
                "gradle.project.notFound",
                "unknown Gradle project path: " + projectPath,
                (String) null);
    }

    private static boolean isTestSourceSet(String name) {
        String lower = name.toLowerCase(java.util.Locale.ROOT);
        return lower.equals("test") || lower.contains("test");
    }

    private Path writeInitScript() {
        try {
            String escaped = bridgeClasspath
                    .toAbsolutePath()
                    .toString()
                    .replace("\\", "\\\\")
                    .replace("'", "\\'");
            String script = """
                    // Generated by JavaIDE. Registers the bridge's Tooling API models.
                    initscript {
                        dependencies { classpath files('%s') }
                    }
                    gradle.rootProject { p ->
                        p.apply plugin: dev.javaide.gradlebridge.model.BridgePlugin
                    }
                    """.formatted(escaped);
            Path file = Files.createTempFile("javaide-gradle-bridge-", ".gradle");
            Files.writeString(file, script, StandardCharsets.UTF_8);
            return file;
        } catch (IOException error) {
            throw RpcException.failed("gradle.initScript", "cannot write Gradle init script", error);
        }
    }

    private static List<TestMethod> testMethods(JsonNode params) {
        JsonNode node = params == null ? null : params.get("methods");
        if (node == null || node.isNull()) {
            return List.of();
        }
        if (!node.isArray()) {
            throw RpcException.invalidParams("methods must be an array");
        }
        List<TestMethod> methods = new ArrayList<>();
        for (JsonNode element : node) {
            if (!element.isObject()) {
                throw RpcException.invalidParams("methods must contain objects");
            }
            String className = Params.requiredText(element, "className");
            String methodName = Params.requiredText(element, "methodName");
            methods.add(new TestMethod(className, methodName));
        }
        return methods;
    }

    private static int allocatePort() {
        try (ServerSocket socket = new ServerSocket(0, 1, java.net.InetAddress.getLoopbackAddress())) {
            return socket.getLocalPort();
        } catch (IOException error) {
            throw RpcException.failed("gradle.debug.port", "cannot allocate a loopback port", error);
        }
    }

    private static void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException error) {
            Log.warn("cannot delete %s: %s", path, RpcException.describe(error));
        }
    }

    private static RpcException syncFailure(OperationContext context, Throwable error) {
        if (context.isCancelled() || isCancellation(error)) {
            return context.isTimedOut()
                    ? RpcException.timedOut(context.timeoutMs())
                    : RpcException.cancelled();
        }
        return RpcException.failed("gradle.sync.failed", "Gradle operation failed", error);
    }

    private static boolean isCancellation(Throwable error) {
        for (Throwable current = error; current != null; current = current.getCause()) {
            if (current instanceof BuildCancelledException) {
                return true;
            }
            if (current.getCause() == current) {
                break;
            }
        }
        return false;
    }

    private static List<String> failureMessages(Throwable error) {
        List<String> messages = new ArrayList<>();
        for (Throwable current = error; current != null && messages.size() < 64; current = current.getCause()) {
            String message = current.getMessage();
            if (message == null || message.isBlank()) {
                message = current.getClass().getName();
            }
            messages.add(message);
            if (current instanceof GradleConnectionException connection) {
                collectFailures(connection.getFailures(), messages, 0);
            }
            if (current.getCause() == current) {
                break;
            }
        }
        return messages;
    }

    private static void collectFailures(List<? extends Failure> failures, List<String> messages, int depth) {
        if (failures == null || depth > 4) {
            return;
        }
        for (Failure failure : failures) {
            if (messages.size() >= 64) {
                return;
            }
            String message = failure.getMessage();
            if (message == null || message.isBlank()) {
                message = failure.getDescription();
            }
            if (message != null && !message.isBlank()) {
                messages.add(message);
            }
            collectFailures(failure.getCauses(), messages, depth + 1);
        }
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            pool.close();
        }
    }

    private record TestMethod(String className, String methodName) {}

    private final class Leased implements AutoCloseable {
        final ConnectionPool.Holder holder;
        final ConnectionPool.Options options;
        final Path root;

        Leased(ConnectionPool.Holder holder, ConnectionPool.Options options) {
            this.holder = holder;
            this.options = options;
            this.root = options.root;
        }

        @Override
        public void close() {
            holder.lock.unlock();
        }
    }
}
