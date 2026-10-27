package dev.javaide.gradlebridge.model;

import java.io.File;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.gradle.api.Plugin;
import org.gradle.api.Project;
import org.gradle.api.initialization.IncludedBuild;
import org.gradle.api.plugins.JavaPluginExtension;
import org.gradle.api.tasks.JavaExec;
import org.gradle.api.tasks.SourceSet;
import org.gradle.api.tasks.testing.Test;
import org.gradle.tooling.provider.model.ToolingModelBuilder;

/**
 * Builds one {@link BuildSnapshotModel} for the root project of a build.
 *
 * <p>The model is intentionally shallow where Gradle would otherwise resolve
 * the world: configurations are listed but not resolved, and dependency graphs
 * are fetched separately. Source set classpaths are resolved because the editor
 * needs runtime/test classpaths, but a failed resolution is recorded as a
 * problem instead of failing the whole snapshot.
 */
public final class BuildSnapshotBuilder implements ToolingModelBuilder {
    private static final List<String> KNOWN_PLUGIN_IDS = List.of(
            "java",
            "java-library",
            "java-platform",
            "java-test-fixtures",
            "application",
            "war",
            "ear",
            "groovy",
            "scala",
            "antlr",
            "jacoco",
            "checkstyle",
            "pmd",
            "codenarc",
            "maven-publish",
            "ivy-publish",
            "signing",
            "base",
            "distribution");

    @Override
    public boolean canBuild(String modelName) {
        return modelName.equals(BuildSnapshotModel.class.getName());
    }

    @Override
    public Object buildAll(String modelName, Project project) {
        List<BuildProblemModel> problems = new ArrayList<>();
        List<BuildProjectModel> projects = new ArrayList<>();
        for (Project candidate : project.getAllprojects()) {
            projects.add(buildProject(candidate, problems));
        }
        projects.sort(Comparator.comparing(BuildProjectModel::getPath));

        List<IncludedBuildModel> included = new ArrayList<>();
        for (IncludedBuild build : project.getGradle().getIncludedBuilds()) {
            included.add(new ModelBeans.IncludedBuild(
                    build.getName(), build.getProjectDir().getAbsolutePath(), null));
        }
        included.sort(Comparator.comparing(IncludedBuildModel::getName));

        File gradleHome = project.getGradle().getGradleHomeDir();
        String javaHome = System.getProperty("java.home");
        return new ModelBeans.Snapshot(
                project.getRootDir().getAbsolutePath(),
                project.getRootProject().getName(),
                project.getGradle().getGradleVersion(),
                gradleHome == null ? null : gradleHome.getAbsolutePath(),
                javaHome,
                javaHome,
                System.currentTimeMillis(),
                projects,
                included,
                problems);
    }

    @SuppressWarnings("deprecation")
    private static BuildProjectModel buildProject(Project project, List<BuildProblemModel> problems) {
        List<TaskModel> tasks = new ArrayList<>();
        List<TaskModel> testTasks = new ArrayList<>();
        project.getTasks().forEach(task -> {
            boolean test = task instanceof Test;
            boolean run = task instanceof JavaExec;
            ModelBeans.Task model = new ModelBeans.Task(
                    task.getPath(),
                    task.getName(),
                    task.getGroup(),
                    task.getDescription(),
                    taskType(task.getClass()),
                    test,
                    run);
            tasks.add(model);
            if (test) {
                testTasks.add(model);
            }
        });
        tasks.sort(Comparator.comparing(TaskModel::getPath));
        testTasks.sort(Comparator.comparing(TaskModel::getPath));

        List<ConfigurationModel> configurations = new ArrayList<>();
        project.getConfigurations().forEach(configuration -> configurations.add(
                new ModelBeans.Configuration(
                        configuration.getName(),
                        configuration.getDescription(),
                        configuration.isCanBeResolved(),
                        configuration.isCanBeConsumed(),
                        configuration.isVisible())));
        configurations.sort(Comparator.comparing(ConfigurationModel::getName));

        List<SourceSetModel> sourceSets = new ArrayList<>();
        String javaVersion = null;
        String toolchain = null;
        JavaPluginExtension java = project.getExtensions().findByType(JavaPluginExtension.class);
        if (java != null) {
            for (SourceSet sourceSet : java.getSourceSets()) {
                sourceSets.add(buildSourceSet(project, sourceSet, problems));
            }
            sourceSets.sort(Comparator.comparing(SourceSetModel::getName));
            try {
                javaVersion = java.getSourceCompatibility().toString();
            } catch (RuntimeException ignored) {
                // A build can replace the extension; a missing value is not fatal.
            }
            try {
                var languageVersion = java.getToolchain().getLanguageVersion().getOrNull();
                if (languageVersion != null) {
                    toolchain = languageVersion.toString();
                }
            } catch (RuntimeException ignored) {
                // Toolchain properties can be unsupported by older Gradle versions.
            }
        }

        File buildFile = project.getBuildFile();
        return new ModelBeans.Project(
                project.getPath(),
                project.getName(),
                project.getProjectDir().getAbsolutePath(),
                project.getDescription(),
                buildFile != null && buildFile.isFile() ? buildFile.getAbsolutePath() : null,
                tasks,
                testTasks,
                sourceSets,
                configurations,
                javaVersion,
                toolchain,
                pluginIds(project));
    }

    private static SourceSetModel buildSourceSet(
            Project project, SourceSet sourceSet, List<BuildProblemModel> problems) {
        List<String> javaDirs = paths(sourceSet.getAllJava().getSrcDirs());
        List<String> resourceDirs = paths(sourceSet.getResources().getSrcDirs());

        Set<String> outputDirs = new TreeSet<>();
        sourceSet.getOutput().getClassesDirs().getFiles().forEach(file -> outputDirs.add(file.getAbsolutePath()));
        File resourcesDir = sourceSet.getOutput().getResourcesDir();
        if (resourcesDir != null) {
            outputDirs.add(resourcesDir.getAbsolutePath());
        }

        List<String> compileClasspath = new ArrayList<>();
        List<String> runtimeClasspath = new ArrayList<>();
        String resolutionError = null;
        try {
            compileClasspath = paths(sourceSet.getCompileClasspath().getFiles());
        } catch (RuntimeException error) {
            resolutionError = describe(error);
            problems.add(new ModelBeans.Problem(
                    "error",
                    "Compile classpath for " + project.getPath() + ":" + sourceSet.getName()
                            + " could not be resolved: " + resolutionError,
                    null,
                    null,
                    null));
        }
        try {
            runtimeClasspath = paths(sourceSet.getRuntimeClasspath().getFiles());
        } catch (RuntimeException error) {
            if (resolutionError == null) {
                resolutionError = describe(error);
            }
            problems.add(new ModelBeans.Problem(
                    "error",
                    "Runtime classpath for " + project.getPath() + ":" + sourceSet.getName()
                            + " could not be resolved: " + describe(error),
                    null,
                    null,
                    null));
        }

        return new ModelBeans.SourceSet(
                sourceSet.getName(),
                javaDirs,
                resourceDirs,
                new ArrayList<>(outputDirs),
                compileClasspath,
                runtimeClasspath,
                resolutionError);
    }

    private static List<String> pluginIds(Project project) {
        Set<String> ids = new LinkedHashSet<>();
        for (String id : KNOWN_PLUGIN_IDS) {
            if (project.getPlugins().hasPlugin(id)) {
                ids.add(id);
            }
        }
        for (Plugin<?> plugin : project.getPlugins()) {
            String name = plugin.getClass().getName();
            int separator = name.lastIndexOf('.');
            String simple = separator >= 0 ? name.substring(separator + 1) : name;
            if (simple.endsWith("Plugin")) {
                simple = simple.substring(0, simple.length() - "Plugin".length());
            }
            ids.add(simple);
        }
        return new ArrayList<>(ids);
    }

    private static String taskType(Class<?> type) {
        String name = type.getName();
        return name.endsWith("_Decorated") ? name.substring(0, name.length() - "_Decorated".length()) : name;
    }

    private static List<String> paths(Iterable<File> files) {
        List<String> paths = new ArrayList<>();
        for (File file : files) {
            paths.add(file.getAbsolutePath());
        }
        paths.sort(String::compareTo);
        return paths;
    }

    private static List<String> paths(Set<File> files) {
        return paths((Iterable<File>) files);
    }

    private static String describe(Throwable error) {
        String message = error.getMessage();
        return message == null || message.isBlank() ? error.getClass().getName() : message;
    }
}
