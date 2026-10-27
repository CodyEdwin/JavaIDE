package dev.javaide.gradlebridge;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.gradle.tooling.Failure;
import org.gradle.tooling.events.FailureResult;
import org.gradle.tooling.events.OperationDescriptor;
import org.gradle.tooling.events.ProgressEvent;
import org.gradle.tooling.events.ProgressListener;
import org.gradle.tooling.events.task.TaskFailureResult;
import org.gradle.tooling.events.task.TaskFinishEvent;
import org.gradle.tooling.events.task.TaskOperationDescriptor;
import org.gradle.tooling.events.task.TaskOperationResult;
import org.gradle.tooling.events.task.TaskSkippedResult;
import org.gradle.tooling.events.task.TaskStartEvent;
import org.gradle.tooling.events.task.TaskSuccessResult;
import org.gradle.tooling.events.test.Destination;
import org.gradle.tooling.events.test.JvmTestOperationDescriptor;
import org.gradle.tooling.events.test.TestFailureResult;
import org.gradle.tooling.events.test.TestFinishEvent;
import org.gradle.tooling.events.test.TestOperationDescriptor;
import org.gradle.tooling.events.test.TestOperationResult;
import org.gradle.tooling.events.test.TestOutputEvent;
import org.gradle.tooling.events.test.TestSkippedResult;
import org.gradle.tooling.events.test.TestStartEvent;

/**
 * Normalizes Tooling API progress into bridge notifications.
 *
 * <p>One listener instance handles task, test, and test-output events so a run
 * has a single ordered record of what happened. Event callbacks are defensive:
 * a malformed or unsupported event must not fail the build.
 */
final class BuildEvents implements ProgressListener {
    private static final int TEXT_LIMIT = 8 * 1024;

    private final OperationContext context;
    private final Map<String, TaskRecord> tasks = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> tests = new ConcurrentHashMap<>();
    private final Map<String, Long> testStarts = new ConcurrentHashMap<>();
    private final List<String> failures = Collections.synchronizedList(new ArrayList<>());
    private volatile boolean failed;

    BuildEvents(OperationContext context) {
        this.context = context;
    }

    @Override
    public void statusChanged(ProgressEvent event) {
        try {
            if (event instanceof TaskStartEvent start) {
                taskStarted(start);
            } else if (event instanceof TaskFinishEvent finish) {
                taskFinished(finish);
            } else if (event instanceof TestStartEvent start) {
                testStarted(start);
            } else if (event instanceof TestFinishEvent finish) {
                testFinished(finish);
            } else if (event instanceof TestOutputEvent output) {
                testOutput(output);
            }
        } catch (RuntimeException error) {
            Log.warn("ignoring malformed progress event {}: {}", event.getClass().getName(), error);
        }
    }

    boolean failed() {
        return failed;
    }

    List<String> failures() {
        synchronized (failures) {
            return List.copyOf(failures);
        }
    }

    List<Map<String, Object>> taskOutcomes() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (TaskRecord record : tasks.values()) {
            result.add(record.toMap());
        }
        result.sort((left, right) -> String.valueOf(left.get("taskPath"))
                .compareTo(String.valueOf(right.get("taskPath"))));
        return result;
    }

    List<Map<String, Object>> testResults() {
        List<Map<String, Object>> result = new ArrayList<>(tests.values());
        result.sort((left, right) -> String.valueOf(left.get("id")).compareTo(String.valueOf(right.get("id"))));
        return result;
    }

    private void taskStarted(TaskStartEvent event) {
        TaskOperationDescriptor descriptor = event.getDescriptor();
        String path = descriptor.getTaskPath();
        TaskRecord record = tasks.computeIfAbsent(path, ignored -> new TaskRecord(path));
        record.startTime = event.getEventTime();
        record.displayName = descriptor.getDisplayName();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("taskPath", path);
        payload.put("displayName", descriptor.getDisplayName());
        payload.put("eventTime", event.getEventTime());
        context.notify("task.started", payload);
    }

    private void taskFinished(TaskFinishEvent event) {
        TaskOperationDescriptor descriptor = event.getDescriptor();
        String path = descriptor.getTaskPath();
        TaskRecord record = tasks.computeIfAbsent(path, ignored -> new TaskRecord(path));
        if (record.startTime == 0) {
            record.startTime = event.getEventTime();
        }
        record.endTime = event.getEventTime();
        record.displayName = descriptor.getDisplayName();

        TaskOperationResult result = event.getResult();
        if (result instanceof TaskSkippedResult) {
            record.outcome = "SKIPPED";
        } else if (result instanceof TaskFailureResult failure) {
            record.outcome = "FAILED";
            failed = true;
            record.failures.addAll(failures(failure));
            failures.addAll(record.failures);
        } else if (result instanceof TaskSuccessResult success) {
            record.outcome = success.isFromCache() ? "FROM_CACHE" : success.isUpToDate() ? "UP_TO_DATE" : "SUCCESS";
        } else {
            record.outcome = "SUCCESS";
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("taskPath", path);
        payload.put("displayName", descriptor.getDisplayName());
        payload.put("outcome", record.outcome);
        payload.put("startTime", record.startTime);
        payload.put("endTime", record.endTime);
        payload.put("durationMs", Math.max(0, record.endTime - record.startTime));
        context.notify("task.finished", payload);
    }

    private void testStarted(TestStartEvent event) {
        TestOperationDescriptor descriptor = event.getDescriptor();
        String key = testKey(descriptor);
        testStarts.put(key, event.getEventTime());
        Map<String, Object> test = testDescriptor(descriptor);
        Map<String, Object> result = new LinkedHashMap<>(test);
        result.put("id", key);
        result.put("state", "running");
        result.put("durationMs", 0);
        result.put("failures", List.of());
        tests.put(key, result);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("test", test);
        payload.put("eventTime", event.getEventTime());
        context.notify("test.started", payload);
    }

    private void testFinished(TestFinishEvent event) {
        TestOperationDescriptor descriptor = event.getDescriptor();
        String key = testKey(descriptor);
        long started = testStarts.getOrDefault(key, event.getEventTime());
        long duration = Math.max(0, event.getEventTime() - started);

        TestOperationResult result = event.getResult();
        String state;
        List<String> failureMessages = new ArrayList<>();
        if (result instanceof TestFailureResult failure) {
            state = "failed";
            failed = true;
            failureMessages.addAll(failures(failure));
            failures.addAll(failureMessages);
        } else if (result instanceof TestSkippedResult) {
            state = "skipped";
        } else {
            state = "passed";
        }

        Map<String, Object> test = testDescriptor(descriptor);
        test.put("id", key);
        test.put("state", state);
        test.put("durationMs", duration);
        test.put("failures", failureMessages);
        tests.put(key, test);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("test", test);
        payload.put("eventTime", event.getEventTime());
        context.notify("test.finished", payload);
    }

    private void testOutput(TestOutputEvent event) {
        var descriptor = event.getDescriptor();
        String text = descriptor.getMessage();
        if (text == null) {
            return;
        }
        String stream = descriptor.getDestination() == Destination.StdErr ? "stderr" : "stdout";
        Map<String, Object> payload = new LinkedHashMap<>();
        OperationDescriptor parent = descriptor.getParent();
        payload.put("test", parent == null ? null : testKey(parent));
        payload.put("stream", stream);
        payload.put("text", bounded(text));
        context.notify("test.output", payload);
    }

    private static Map<String, Object> testDescriptor(TestOperationDescriptor descriptor) {
        Map<String, Object> test = new LinkedHashMap<>();
        test.put("name", descriptor.getName());
        test.put("displayName", descriptor.getDisplayName());
        if (descriptor instanceof JvmTestOperationDescriptor jvm) {
            test.put("className", jvm.getClassName());
            test.put("methodName", normalizeMethodName(jvm.getMethodName()));
            test.put("suiteName", jvm.getSuiteName());
            test.put("kind", jvm.getJvmTestKind() == null ? "unknown" : jvm.getJvmTestKind().name().toLowerCase());
            test.put("atomic", jvm.getJvmTestKind() != null && "ATOMIC".equals(jvm.getJvmTestKind().name()));
        } else {
            test.put("className", null);
            test.put("methodName", null);
            test.put("suiteName", null);
            test.put("kind", "unknown");
            test.put("atomic", false);
        }
        return test;
    }

    private static String testKey(OperationDescriptor descriptor) {        List<String> parts = new ArrayList<>();
        for (OperationDescriptor current = descriptor; current != null; current = current.getParent()) {
            String name = current.getDisplayName();
            if (name == null || name.isBlank()) {
                name = current.getName();
            }
            parts.add(name == null ? "?" : name);
        }
        Collections.reverse(parts);
        return String.join(" > ", parts);
    }

    private static String normalizeMethodName(String methodName) {
        if (methodName == null) {
            return null;
        }
        return methodName.endsWith("()")
                ? methodName.substring(0, methodName.length() - 2)
                : methodName;
    }

    private static List<String> failures(FailureResult result) {
        List<String> messages = new ArrayList<>();
        for (Failure failure : result.getFailures()) {
            collectFailure(failure, messages, 0);
        }
        return messages;
    }

    private static void collectFailure(Failure failure, List<String> messages, int depth) {
        if (depth > 8 || messages.size() > 64) {
            return;
        }
        String message = failure.getMessage();
        if (message == null || message.isBlank()) {
            message = failure.getDescription();
        }
        if (message != null && !message.isBlank()) {
            messages.add(bounded(message));
        }
        for (Failure cause : failure.getCauses()) {
            collectFailure(cause, messages, depth + 1);
        }
    }

    private static String bounded(String text) {
        return text.length() <= TEXT_LIMIT ? text : text.substring(0, TEXT_LIMIT) + "…";
    }

    private static final class TaskRecord {
        final String path;
        final List<String> failures = new ArrayList<>();
        String displayName;
        String outcome = "SUCCESS";
        long startTime;
        long endTime;

        TaskRecord(String path) {
            this.path = path;
        }

        Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("taskPath", path);
            result.put("displayName", displayName);
            result.put("outcome", outcome);
            result.put("startTime", startTime);
            result.put("endTime", endTime);
            result.put("durationMs", Math.max(0, endTime - startTime));
            result.put("failures", List.copyOf(failures));
            return result;
        }
    }
}
