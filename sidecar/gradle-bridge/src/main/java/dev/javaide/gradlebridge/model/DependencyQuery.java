package dev.javaide.gradlebridge.model;

/**
 * Client-side parameter for {@link DependencyReportModel}.
 *
 * <p>Gradle's parameterized Tooling API models require a client parameter type
 * that is a plain interface with matching getters and setters. The bridge uses
 * this interface only to describe the query; the implementation is a Gradle
 * proxy that is serialized to the daemon.
 */
public interface DependencyQuery {
    String getProjectPath();

    void setProjectPath(String projectPath);

    String getConfiguration();

    void setConfiguration(String configuration);
}
