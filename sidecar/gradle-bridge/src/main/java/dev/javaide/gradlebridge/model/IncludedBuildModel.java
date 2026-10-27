package dev.javaide.gradlebridge.model;

import java.io.Serializable;

/**
 * An included build discovered from the root build.
 *
 * <p>The root model builder can only report the included build's name and root
 * directory. The bridge opens a second connection for each one and fills
 * {@link #getSnapshot()} with a full snapshot. The field stays {@code null} in
 * the raw model returned by Gradle.
 */
public interface IncludedBuildModel extends Serializable {
    String getName();

    String getRoot();

    BuildSnapshotModel getSnapshot();
}
