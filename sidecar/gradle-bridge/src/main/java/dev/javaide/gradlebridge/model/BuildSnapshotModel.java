package dev.javaide.gradlebridge.model;

import java.io.Serializable;
import java.util.List;

/**
 * One Gradle build, as produced by the bridge's custom Tooling API model.
 *
 * <p>The interface lives in both the bridge process and the Gradle daemon. It
 * must stay free of third-party types: the daemon loads it from the bridge jar
 * named by the generated init script.
 *
 * <p>Paths are absolute, normalized strings. The Rust client converts them to
 * platform paths and never assumes a separator.
 */
public interface BuildSnapshotModel extends Serializable {
    String getRoot();

    String getBuildName();

    String getGradleVersion();

    String getGradleHome();

    /** JVM running the Gradle daemon, when Gradle exposes it. */
    String getJavaHome();

    /** JVM running this bridge, for diagnostics. */
    String getDaemonJavaHome();

    long getSyncedAt();

    List<BuildProjectModel> getProjects();

    List<IncludedBuildModel> getIncludedBuilds();

    List<BuildProblemModel> getProblems();
}
