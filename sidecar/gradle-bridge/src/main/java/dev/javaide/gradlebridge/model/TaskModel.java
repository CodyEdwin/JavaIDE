package dev.javaide.gradlebridge.model;

import java.io.Serializable;

/** One executable Gradle task. */
public interface TaskModel extends Serializable {
    /** Fully qualified task path, for example {@code :app:test}. */
    String getPath();

    String getName();

    String getGroup();

    String getDescription();

    /** Concrete Gradle task type with the generated {@code _Decorated} suffix removed. */
    String getType();

    boolean getIsTest();

    boolean getIsRun();
}
