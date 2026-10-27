package dev.javaide.gradlebridge.model;

import java.io.Serializable;
import java.util.List;

/** One dependency occurrence in a resolved configuration graph. */
public interface DependencyEdgeModel extends Serializable {
    /** Requested group from the build script, when known. */
    String getGroup();

    String getModule();

    /** Selected version, or {@code null} for project dependencies. */
    String getVersion();

    /** Requested coordinate as Gradle displays it, for example {@code g:m:1.0}. */
    String getRequested();

    /** Local file for an external artifact; {@code null} for projects and unresolved edges. */
    String getResolved();

    String getComponentId();

    boolean getConflict();

    boolean getConstraint();

    boolean getCycle();

    boolean getFailed();

    String getFailureMessage();

    /** Human-readable reason, for example conflict resolution or forced version. */
    String getSelectionReason();

    List<DependencyEdgeModel> getChildren();
}
