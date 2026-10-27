package dev.javaide.gradlebridge.model;

import java.io.Serializable;

/** One Gradle configuration. Dependencies are resolved on demand, not during sync. */
public interface ConfigurationModel extends Serializable {
    String getName();

    String getDescription();

    boolean isResolvable();

    boolean isConsumable();

    boolean isVisible();
}
