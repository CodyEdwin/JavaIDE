package dev.javaide.gradlebridge.model;

import java.io.Serializable;

/** One resolved file belonging to a configuration. */
public interface DependencyArtifactModel extends Serializable {
    String getGroup();

    String getModule();

    String getVersion();

    String getComponentId();

    String getFile();
}
