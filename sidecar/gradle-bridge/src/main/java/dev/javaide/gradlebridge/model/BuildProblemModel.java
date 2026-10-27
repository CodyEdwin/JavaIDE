package dev.javaide.gradlebridge.model;

import java.io.Serializable;

/** A non-fatal problem found while building the snapshot. */
public interface BuildProblemModel extends Serializable {
    /** {@code warning}, {@code error}, or {@code info}. */
    String getSeverity();

    String getMessage();

    String getFile();

    Integer getLine();

    Integer getColumn();
}
