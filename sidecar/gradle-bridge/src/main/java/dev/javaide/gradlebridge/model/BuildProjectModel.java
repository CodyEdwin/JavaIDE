package dev.javaide.gradlebridge.model;

import java.io.Serializable;
import java.util.List;

/** One Gradle project in a build. */
public interface BuildProjectModel extends Serializable {
    /** Gradle project path, for example {@code :app}. */
    String getPath();

    String getName();

    String getDirectory();

    String getDescription();

    /** Build script path, or {@code null} when the project has no own script. */
    String getBuildFile();

    List<TaskModel> getTasks();

    /** Convenience subset: tasks that execute tests. */
    List<TaskModel> getTestTasks();

    List<SourceSetModel> getSourceSets();

    List<ConfigurationModel> getConfigurations();

    /** Source compatibility reported by the Java plugin. */
    String getJavaVersion();

    /** Toolchain language version when one is explicitly configured. */
    String getToolchain();

    List<String> getPlugins();
}
