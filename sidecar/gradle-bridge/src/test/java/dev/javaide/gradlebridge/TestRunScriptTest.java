package dev.javaide.gradlebridge;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class TestRunScriptTest {
    @Test
    void writesDebugOptionsFiltersAndForcedExecution() throws Exception {
        Path file = TestRunScript.write(
                ":app:test",
                List.of("com.example.AppTest"),
                List.of(new TestRunScript.TestRef(
                        "com.example.AppTest", "addsTwoNumbers")),
                new TestRunScript.DebugOptions("127.0.0.1", 5005, true));
        try {
            String script = Files.readString(file, StandardCharsets.UTF_8);
            assertTrue(script.contains("testTask.path == ':app:test'"));
            assertTrue(script.contains("setFailOnNoMatchingTests(false)"));
            assertTrue(script.contains("includeTest('com.example.AppTest', null)"));
            assertTrue(script.contains(
                    "includeTest('com.example.AppTest', 'addsTwoNumbers')"));
            assertTrue(script.contains("enabled = true"));
            assertTrue(script.contains("host = '127.0.0.1'"));
            assertTrue(script.contains("port = 5005"));
            assertTrue(script.contains("server = true"));
            assertTrue(script.contains("suspend = true"));
            assertTrue(script.contains("maxParallelForks = 1"));
            assertTrue(script.contains("forkEvery = 0"));
            assertTrue(script.contains("upToDateWhen { false }"));
            assertTrue(script.contains("cacheIf { false }"));
        } finally {
            Files.deleteIfExists(file);
        }
    }

    @Test
    void runAllScriptHasNoFiltersOrDebugOptions() throws Exception {
        Path file = TestRunScript.write(":test", List.of(), List.of(), null);
        try {
            String script = Files.readString(file, StandardCharsets.UTF_8);
            assertFalse(script.contains("debugOptions"));
            assertFalse(script.contains("includeTest("));
            assertTrue(script.contains("upToDateWhen { false }"));
            assertTrue(script.contains("cacheIf { false }"));
        } finally {
            Files.deleteIfExists(file);
        }
    }

    @Test
    void rejectsNonLoopbackHosts() {
        assertThrows(
                IllegalArgumentException.class,
                () -> TestRunScript.write(
                        ":test",
                        List.of(),
                        List.of(),
                        new TestRunScript.DebugOptions("10.0.0.5", 5005, true)));
    }

    @Test
    void rejectsInvalidPorts() {
        assertThrows(
                IllegalArgumentException.class,
                () -> TestRunScript.write(
                        ":test",
                        List.of(),
                        List.of(),
                        new TestRunScript.DebugOptions("127.0.0.1", 0, true)));
        assertThrows(
                IllegalArgumentException.class,
                () -> TestRunScript.write(
                        ":test",
                        List.of(),
                        List.of(),
                        new TestRunScript.DebugOptions("127.0.0.1", 70_000, true)));
    }

    @Test
    void rejectsInvalidTaskPaths() {
        assertThrows(
                IllegalArgumentException.class,
                () -> TestRunScript.write("test", List.of(), List.of(), null));
    }
}
