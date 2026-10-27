package dev.javaide.gradlebridge.model;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class ModelSerializationTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void serializesSnapshotThroughItsInterface() throws Exception {
        ModelBeans.Snapshot snapshot = new ModelBeans.Snapshot(
                "/tmp/project",
                "project",
                "9.8.1",
                "/opt/gradle",
                "/opt/java",
                "/opt/java",
                42L,
                List.of(new ModelBeans.Project(
                        ":",
                        "project",
                        "/tmp/project",
                        "fixture",
                        "/tmp/project/build.gradle.kts",
                        List.of(new ModelBeans.Task(
                                ":test",
                                "test",
                                "verification",
                                "Runs tests",
                                "org.gradle.api.tasks.testing.Test",
                                true,
                                false)),
                        List.of(),
                        List.of(),
                        List.of(),
                        "21",
                        "21",
                        List.of("java"))),
                List.of(),
                List.of());

        String json = mapper.writerFor(BuildSnapshotModel.class).writeValueAsString(snapshot);
        JsonNode tree = mapper.readTree(json);
        JsonNode task = tree.path("projects").get(0).path("tasks").get(0);
        assertTrue(task.path("isTest").asBoolean());
        assertTrue(task.has("isRun"));
        assertTrue(tree.has("gradleVersion"));
        assertTrue(tree.path("projects").get(0).has("testTasks"));
    }

    @Test
    void serializesDependencyReportThroughItsInterface() throws Exception {
        DependencyBeans.Report report = new DependencyBeans.Report(
                ":app",
                "runtimeClasspath",
                List.of(new DependencyBeans.Edge(
                        "org.example",
                        "lib",
                        "1.0",
                        "org.example:lib:1.0",
                        "/tmp/lib.jar",
                        "org.example:lib:1.0",
                        false,
                        false,
                        false,
                        false,
                        null,
                        "selected by rule",
                        List.of())),
                List.of(new DependencyBeans.Artifact(
                        "org.example", "lib", "1.0", "org.example:lib:1.0", "/tmp/lib.jar")),
                List.of());

        String json = mapper.writerFor(DependencyReportModel.class).writeValueAsString(report);
        JsonNode tree = mapper.readTree(json);
        assertTrue(tree.path("roots").get(0).has("conflict"));
        assertTrue(tree.path("artifacts").get(0).has("componentId"));
    }
}
