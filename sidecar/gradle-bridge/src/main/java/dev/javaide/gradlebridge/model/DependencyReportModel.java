package dev.javaide.gradlebridge.model;

import java.io.Serializable;
import java.util.List;

/**
 * The resolved dependency graph for one configuration.
 *
 * <p>Dependency resolution happens inside the Gradle daemon when the bridge
 * asks for this model. The graph is a tree of occurrences, not a deduplicated
 * module list, so callers can show why a version was selected. Cycles are cut
 * off at the repeated component and flagged on the edge.
 */
public interface DependencyReportModel extends Serializable {
    String getProjectPath();

    String getConfiguration();

    List<DependencyEdgeModel> getRoots();

    List<DependencyArtifactModel> getArtifacts();

    List<BuildProblemModel> getProblems();
}
