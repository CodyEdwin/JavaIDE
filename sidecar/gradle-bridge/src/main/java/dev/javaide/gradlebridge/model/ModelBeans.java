package dev.javaide.gradlebridge.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Plain immutable model implementations.
 *
 * <p>They deliberately use only JDK and bridge model types so the same classes
 * can be instantiated inside the Gradle daemon and serialized to the bridge
 * process.
 */
public final class ModelBeans {
    private ModelBeans() {}

    public static final class Snapshot implements BuildSnapshotModel {
        private static final long serialVersionUID = 1L;

        private final String root;
        private final String buildName;
        private final String gradleVersion;
        private final String gradleHome;
        private final String javaHome;
        private final String daemonJavaHome;
        private final long syncedAt;
        private final ArrayList<BuildProjectModel> projects;
        private final ArrayList<IncludedBuildModel> includedBuilds;
        private final ArrayList<BuildProblemModel> problems;

        public Snapshot(
                String root,
                String buildName,
                String gradleVersion,
                String gradleHome,
                String javaHome,
                String daemonJavaHome,
                long syncedAt,
                List<BuildProjectModel> projects,
                List<IncludedBuildModel> includedBuilds,
                List<BuildProblemModel> problems) {
            this.root = root;
            this.buildName = buildName;
            this.gradleVersion = gradleVersion;
            this.gradleHome = gradleHome;
            this.javaHome = javaHome;
            this.daemonJavaHome = daemonJavaHome;
            this.syncedAt = syncedAt;
            this.projects = new ArrayList<>(projects);
            this.includedBuilds = new ArrayList<>(includedBuilds);
            this.problems = new ArrayList<>(problems);
        }

        @Override
        public String getRoot() {
            return root;
        }

        @Override
        public String getBuildName() {
            return buildName;
        }

        @Override
        public String getGradleVersion() {
            return gradleVersion;
        }

        @Override
        public String getGradleHome() {
            return gradleHome;
        }

        @Override
        public String getJavaHome() {
            return javaHome;
        }

        @Override
        public String getDaemonJavaHome() {
            return daemonJavaHome;
        }

        @Override
        public long getSyncedAt() {
            return syncedAt;
        }

        @Override
        public List<BuildProjectModel> getProjects() {
            return projects;
        }

        @Override
        public List<IncludedBuildModel> getIncludedBuilds() {
            return includedBuilds;
        }

        @Override
        public List<BuildProblemModel> getProblems() {
            return problems;
        }
    }

    public static final class Project implements BuildProjectModel {
        private static final long serialVersionUID = 1L;

        private final String path;
        private final String name;
        private final String directory;
        private final String description;
        private final String buildFile;
        private final ArrayList<TaskModel> tasks;
        private final ArrayList<TaskModel> testTasks;
        private final ArrayList<SourceSetModel> sourceSets;
        private final ArrayList<ConfigurationModel> configurations;
        private final String javaVersion;
        private final String toolchain;
        private final ArrayList<String> plugins;

        public Project(
                String path,
                String name,
                String directory,
                String description,
                String buildFile,
                List<TaskModel> tasks,
                List<TaskModel> testTasks,
                List<SourceSetModel> sourceSets,
                List<ConfigurationModel> configurations,
                String javaVersion,
                String toolchain,
                List<String> plugins) {
            this.path = path;
            this.name = name;
            this.directory = directory;
            this.description = description;
            this.buildFile = buildFile;
            this.tasks = new ArrayList<>(tasks);
            this.testTasks = new ArrayList<>(testTasks);
            this.sourceSets = new ArrayList<>(sourceSets);
            this.configurations = new ArrayList<>(configurations);
            this.javaVersion = javaVersion;
            this.toolchain = toolchain;
            this.plugins = new ArrayList<>(plugins);
        }

        @Override
        public String getPath() {
            return path;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getDirectory() {
            return directory;
        }

        @Override
        public String getDescription() {
            return description;
        }

        @Override
        public String getBuildFile() {
            return buildFile;
        }

        @Override
        public List<TaskModel> getTasks() {
            return tasks;
        }

        @Override
        public List<TaskModel> getTestTasks() {
            return testTasks;
        }

        @Override
        public List<SourceSetModel> getSourceSets() {
            return sourceSets;
        }

        @Override
        public List<ConfigurationModel> getConfigurations() {
            return configurations;
        }

        @Override
        public String getJavaVersion() {
            return javaVersion;
        }

        @Override
        public String getToolchain() {
            return toolchain;
        }

        @Override
        public List<String> getPlugins() {
            return plugins;
        }
    }

    public static final class Task implements TaskModel {
        private static final long serialVersionUID = 1L;

        private final String path;
        private final String name;
        private final String group;
        private final String description;
        private final String type;
        private final boolean test;
        private final boolean run;

        public Task(
                String path,
                String name,
                String group,
                String description,
                String type,
                boolean test,
                boolean run) {
            this.path = path;
            this.name = name;
            this.group = group;
            this.description = description;
            this.type = type;
            this.test = test;
            this.run = run;
        }

        @Override
        public String getPath() {
            return path;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getGroup() {
            return group;
        }

        @Override
        public String getDescription() {
            return description;
        }

        @Override
        public String getType() {
            return type;
        }

        @Override
        public boolean getIsTest() {
            return test;
        }

        @Override
        public boolean getIsRun() {
            return run;
        }
    }

    public static final class SourceSet implements SourceSetModel {
        private static final long serialVersionUID = 1L;

        private final String name;
        private final ArrayList<String> javaDirs;
        private final ArrayList<String> resourceDirs;
        private final ArrayList<String> outputDirs;
        private final ArrayList<String> compileClasspath;
        private final ArrayList<String> runtimeClasspath;
        private final String resolutionError;

        public SourceSet(
                String name,
                List<String> javaDirs,
                List<String> resourceDirs,
                List<String> outputDirs,
                List<String> compileClasspath,
                List<String> runtimeClasspath,
                String resolutionError) {
            this.name = name;
            this.javaDirs = new ArrayList<>(javaDirs);
            this.resourceDirs = new ArrayList<>(resourceDirs);
            this.outputDirs = new ArrayList<>(outputDirs);
            this.compileClasspath = new ArrayList<>(compileClasspath);
            this.runtimeClasspath = new ArrayList<>(runtimeClasspath);
            this.resolutionError = resolutionError;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public List<String> getJavaDirs() {
            return javaDirs;
        }

        @Override
        public List<String> getResourceDirs() {
            return resourceDirs;
        }

        @Override
        public List<String> getOutputDirs() {
            return outputDirs;
        }

        @Override
        public List<String> getCompileClasspath() {
            return compileClasspath;
        }

        @Override
        public List<String> getRuntimeClasspath() {
            return runtimeClasspath;
        }

        @Override
        public String getResolutionError() {
            return resolutionError;
        }
    }

    public static final class Configuration implements ConfigurationModel {
        private static final long serialVersionUID = 1L;

        private final String name;
        private final String description;
        private final boolean resolvable;
        private final boolean consumable;
        private final boolean visible;

        public Configuration(
                String name,
                String description,
                boolean resolvable,
                boolean consumable,
                boolean visible) {
            this.name = name;
            this.description = description;
            this.resolvable = resolvable;
            this.consumable = consumable;
            this.visible = visible;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getDescription() {
            return description;
        }

        @Override
        public boolean isResolvable() {
            return resolvable;
        }

        @Override
        public boolean isConsumable() {
            return consumable;
        }

        @Override
        public boolean isVisible() {
            return visible;
        }
    }

    public static final class Problem implements BuildProblemModel {
        private static final long serialVersionUID = 1L;

        private final String severity;
        private final String message;
        private final String file;
        private final Integer line;
        private final Integer column;

        public Problem(String severity, String message, String file, Integer line, Integer column) {
            this.severity = severity;
            this.message = message;
            this.file = file;
            this.line = line;
            this.column = column;
        }

        @Override
        public String getSeverity() {
            return severity;
        }

        @Override
        public String getMessage() {
            return message;
        }

        @Override
        public String getFile() {
            return file;
        }

        @Override
        public Integer getLine() {
            return line;
        }

        @Override
        public Integer getColumn() {
            return column;
        }
    }

    public static final class IncludedBuild implements IncludedBuildModel {
        private static final long serialVersionUID = 1L;

        private final String name;
        private final String root;
        private final BuildSnapshotModel snapshot;

        public IncludedBuild(String name, String root, BuildSnapshotModel snapshot) {
            this.name = name;
            this.root = root;
            this.snapshot = snapshot;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getRoot() {
            return root;
        }

        @Override
        public BuildSnapshotModel getSnapshot() {
            return snapshot;
        }
    }
}
