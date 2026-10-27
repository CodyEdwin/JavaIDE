package dev.javaide.gradlebridge.model;

import java.io.Serializable;
import java.util.List;

/** One Java source set and its resolved classpaths. */
public interface SourceSetModel extends Serializable {
    String getName();

    List<String> getJavaDirs();

    List<String> getResourceDirs();

    List<String> getOutputDirs();

    List<String> getCompileClasspath();

    List<String> getRuntimeClasspath();

    /** Non-null when a classpath could not be resolved during sync. */
    String getResolutionError();
}
