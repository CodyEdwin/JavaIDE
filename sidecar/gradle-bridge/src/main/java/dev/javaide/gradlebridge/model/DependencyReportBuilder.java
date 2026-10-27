package dev.javaide.gradlebridge.model;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.gradle.api.Project;
import org.gradle.api.artifacts.Configuration;
import org.gradle.api.artifacts.LenientConfiguration;
import org.gradle.api.artifacts.ModuleVersionIdentifier;
import org.gradle.api.artifacts.ResolvedArtifact;
import org.gradle.api.artifacts.UnresolvedDependency;
import org.gradle.api.artifacts.component.ComponentIdentifier;
import org.gradle.api.artifacts.result.ComponentSelectionDescriptor;
import org.gradle.api.artifacts.result.DependencyResult;
import org.gradle.api.artifacts.result.ResolvedComponentResult;
import org.gradle.api.artifacts.result.ResolvedDependencyResult;
import org.gradle.api.artifacts.result.UnresolvedDependencyResult;
import org.gradle.tooling.provider.model.ParameterizedToolingModelBuilder;

/**
 * Resolves one configuration and returns its dependency graph.
 *
 * <p>This builder is parameterized so the bridge can ask for a single
 * configuration on demand instead of resolving every configuration during
 * sync. Resolution failures are captured as graph edges and problems; a single
 * missing module must not hide the rest of the graph.
 */
public final class DependencyReportBuilder implements ParameterizedToolingModelBuilder<DependencyQuery> {
    private static final int MAX_DEPTH = 12;
    private static final int MAX_EDGES = 5_000;

    @Override
    public Class<DependencyQuery> getParameterType() {
        return DependencyQuery.class;
    }

    @Override
    public boolean canBuild(String modelName) {
        return modelName.equals(DependencyReportModel.class.getName());
    }

    @Override
    public Object buildAll(String modelName, Project project) {
        return null;
    }

    @Override
    public Object buildAll(String modelName, DependencyQuery query, Project project) {
        String projectPath = query.getProjectPath();
        if (projectPath == null || projectPath.isBlank()) {
            projectPath = ":";
        }
        String configurationName = query.getConfiguration();
        if (configurationName == null || configurationName.isBlank()) {
            throw new IllegalArgumentException("configuration is required");
        }
        Project target = project.findProject(projectPath);
        if (target == null) {
            throw new IllegalArgumentException("unknown project path: " + projectPath);
        }
        Configuration configuration = target.getConfigurations().findByName(configurationName);
        if (configuration == null) {
            throw new IllegalArgumentException(
                    "unknown configuration " + configurationName + " in " + projectPath);
        }
        if (!configuration.isCanBeResolved()) {
            throw new IllegalArgumentException(
                    "configuration " + configurationName + " is not resolvable");
        }

        List<BuildProblemModel> problems = new ArrayList<>();
        Map<String, String> artifactFiles = new HashMap<>();
        List<DependencyArtifactModel> artifacts = new ArrayList<>();
        try {
            LenientConfiguration lenient = configuration.getResolvedConfiguration().getLenientConfiguration();
            for (ResolvedArtifact artifact : lenient.getArtifacts()) {
                ComponentIdentifier component = artifact.getId().getComponentIdentifier();
                String componentId = component.getDisplayName();
                File file = artifact.getFile();
                artifactFiles.put(componentId, file.getAbsolutePath());
                ModuleVersionIdentifier module = artifact.getModuleVersion().getId();
                artifacts.add(new DependencyBeans.Artifact(
                        module.getGroup(),
                        module.getName(),
                        module.getVersion(),
                        componentId,
                        file.getAbsolutePath()));
            }
            for (UnresolvedDependency unresolved : lenient.getUnresolvedModuleDependencies()) {
                problems.add(new ModelBeans.Problem(
                        "error",
                        "Could not resolve " + selector(unresolved.getSelector()) + ": "
                                + describe(unresolved.getProblem()),
                        null,
                        null,
                        null));
            }
        } catch (RuntimeException error) {
            problems.add(new ModelBeans.Problem(
                    "error",
                    "Could not resolve " + projectPath + ":" + configurationName + ": " + describe(error),
                    null,
                    null,
                    null));
        }
        artifacts.sort((left, right) -> left.getComponentId().compareTo(right.getComponentId()));

        List<DependencyEdgeModel> roots = new ArrayList<>();
        Set<String> path = new HashSet<>();
        int[] budget = {MAX_EDGES};
        try {
            ResolvedComponentResult root = configuration
                    .getIncoming()
                    .getResolutionResult()
                    .getRoot();
            path.add(root.getId().getDisplayName());
            for (DependencyResult dependency : root.getDependencies()) {
                roots.add(edge(dependency, artifactFiles, path, 0, budget));
            }
        } catch (RuntimeException error) {
            problems.add(new ModelBeans.Problem(
                    "error",
                    "Could not read dependency graph for " + projectPath + ":" + configurationName + ": "
                            + describe(error),
                    null,
                    null,
                    null));
        }
        roots.sort((left, right) -> String.valueOf(left.getRequested())
                .compareTo(String.valueOf(right.getRequested())));

        return new DependencyBeans.Report(projectPath, configurationName, roots, artifacts, problems);
    }

    private static DependencyEdgeModel edge(
            DependencyResult dependency,
            Map<String, String> artifactFiles,
            Set<String> path,
            int depth,
            int[] budget) {
        if (budget[0]-- <= 0) {
            return new DependencyBeans.Edge(
                    null,
                    null,
                    null,
                    dependency.getRequested().getDisplayName(),
                    null,
                    null,
                    false,
                    dependency.isConstraint(),
                    false,
                    true,
                    "dependency graph budget exhausted",
                    null,
                    List.of());
        }

        if (dependency instanceof UnresolvedDependencyResult unresolved) {
            return new DependencyBeans.Edge(
                    null,
                    null,
                    null,
                    unresolved.getRequested().getDisplayName(),
                    null,
                    unresolved.getAttempted() == null
                            ? null
                            : unresolved.getAttempted().getDisplayName(),
                    false,
                    unresolved.isConstraint(),
                    false,
                    true,
                    describe(unresolved.getFailure()),
                    null,
                    List.of());
        }

        ResolvedDependencyResult resolved = (ResolvedDependencyResult) dependency;
        ResolvedComponentResult selected = resolved.getSelected();
        String componentId = selected.getId().getDisplayName();
        ModuleVersionIdentifier module = selected.getModuleVersion();
        boolean cycle = path.contains(componentId) || depth >= MAX_DEPTH;
        boolean conflict = selected.getSelectionReason().isConflictResolution();

        List<DependencyEdgeModel> children = new ArrayList<>();
        if (!cycle) {
            path.add(componentId);
            for (DependencyResult child : selected.getDependencies()) {
                children.add(edge(child, artifactFiles, path, depth + 1, budget));
            }
            path.remove(componentId);
            children.sort((left, right) -> String.valueOf(left.getRequested())
                    .compareTo(String.valueOf(right.getRequested())));
        }

        return new DependencyBeans.Edge(
                module == null ? null : module.getGroup(),
                module == null ? null : module.getName(),
                module == null ? null : module.getVersion(),
                resolved.getRequested().getDisplayName(),
                artifactFiles.get(componentId),
                componentId,
                conflict,
                resolved.isConstraint(),
                cycle,
                false,
                null,
                selectionReason(selected),
                children);
    }

    private static String selectionReason(ResolvedComponentResult component) {        List<String> descriptions = new ArrayList<>();
        for (ComponentSelectionDescriptor descriptor :
                component.getSelectionReason().getDescriptions()) {
            String description = descriptor.getDescription();
            if (description != null && !description.isBlank()) {
                descriptions.add(description);
            }
        }
        return descriptions.isEmpty() ? null : String.join("; ", descriptions);
    }

    private static String selector(org.gradle.api.artifacts.ModuleVersionSelector selector) {
        return selector.getGroup() + ":" + selector.getName() + ":"
                + (selector.getVersion() == null ? "<none>" : selector.getVersion());
    }

    private static String describe(Throwable error) {
        if (error == null) {
            return "unknown error";
        }
        String message = error.getMessage();
        return message == null || message.isBlank() ? error.getClass().getName() : message;
    }
}
