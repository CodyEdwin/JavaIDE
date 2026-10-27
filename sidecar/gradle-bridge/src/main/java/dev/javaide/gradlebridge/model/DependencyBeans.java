package dev.javaide.gradlebridge.model;

import java.util.ArrayList;
import java.util.List;

/** Plain implementations of the dependency model interfaces. */
public final class DependencyBeans {
    private DependencyBeans() {}

    public static final class Report implements DependencyReportModel {
        private static final long serialVersionUID = 1L;

        private final String projectPath;
        private final String configuration;
        private final ArrayList<DependencyEdgeModel> roots;
        private final ArrayList<DependencyArtifactModel> artifacts;
        private final ArrayList<BuildProblemModel> problems;

        public Report(
                String projectPath,
                String configuration,
                List<DependencyEdgeModel> roots,
                List<DependencyArtifactModel> artifacts,
                List<BuildProblemModel> problems) {
            this.projectPath = projectPath;
            this.configuration = configuration;
            this.roots = new ArrayList<>(roots);
            this.artifacts = new ArrayList<>(artifacts);
            this.problems = new ArrayList<>(problems);
        }

        @Override
        public String getProjectPath() {
            return projectPath;
        }

        @Override
        public String getConfiguration() {
            return configuration;
        }

        @Override
        public List<DependencyEdgeModel> getRoots() {
            return roots;
        }

        @Override
        public List<DependencyArtifactModel> getArtifacts() {
            return artifacts;
        }

        @Override
        public List<BuildProblemModel> getProblems() {
            return problems;
        }
    }

    public static final class Edge implements DependencyEdgeModel {
        private static final long serialVersionUID = 1L;

        private final String group;
        private final String module;
        private final String version;
        private final String requested;
        private final String resolved;
        private final String componentId;
        private final boolean conflict;
        private final boolean constraint;
        private final boolean cycle;
        private final boolean failed;
        private final String failureMessage;
        private final String selectionReason;
        private final ArrayList<DependencyEdgeModel> children;

        public Edge(
                String group,
                String module,
                String version,
                String requested,
                String resolved,
                String componentId,
                boolean conflict,
                boolean constraint,
                boolean cycle,
                boolean failed,
                String failureMessage,
                String selectionReason,
                List<DependencyEdgeModel> children) {
            this.group = group;
            this.module = module;
            this.version = version;
            this.requested = requested;
            this.resolved = resolved;
            this.componentId = componentId;
            this.conflict = conflict;
            this.constraint = constraint;
            this.cycle = cycle;
            this.failed = failed;
            this.failureMessage = failureMessage;
            this.selectionReason = selectionReason;
            this.children = new ArrayList<>(children);
        }

        @Override
        public String getGroup() {
            return group;
        }

        @Override
        public String getModule() {
            return module;
        }

        @Override
        public String getVersion() {
            return version;
        }

        @Override
        public String getRequested() {
            return requested;
        }

        @Override
        public String getResolved() {
            return resolved;
        }

        @Override
        public String getComponentId() {
            return componentId;
        }

        @Override
        public boolean getConflict() {
            return conflict;
        }

        @Override
        public boolean getConstraint() {
            return constraint;
        }

        @Override
        public boolean getCycle() {
            return cycle;
        }

        @Override
        public boolean getFailed() {
            return failed;
        }

        @Override
        public String getFailureMessage() {
            return failureMessage;
        }

        @Override
        public String getSelectionReason() {
            return selectionReason;
        }

        @Override
        public List<DependencyEdgeModel> getChildren() {
            return children;
        }
    }

    public static final class Artifact implements DependencyArtifactModel {
        private static final long serialVersionUID = 1L;

        private final String group;
        private final String module;
        private final String version;
        private final String componentId;
        private final String file;

        public Artifact(String group, String module, String version, String componentId, String file) {
            this.group = group;
            this.module = module;
            this.version = version;
            this.componentId = componentId;
            this.file = file;
        }

        @Override
        public String getGroup() {
            return group;
        }

        @Override
        public String getModule() {
            return module;
        }

        @Override
        public String getVersion() {
            return version;
        }

        @Override
        public String getComponentId() {
            return componentId;
        }

        @Override
        public String getFile() {
            return file;
        }
    }
}
