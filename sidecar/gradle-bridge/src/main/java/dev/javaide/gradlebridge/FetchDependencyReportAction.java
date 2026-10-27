package dev.javaide.gradlebridge;

import dev.javaide.gradlebridge.model.DependencyQuery;
import dev.javaide.gradlebridge.model.DependencyReportModel;
import java.io.Serializable;
import org.gradle.api.Action;
import org.gradle.tooling.BuildAction;
import org.gradle.tooling.BuildController;

/** Fetches a resolved dependency graph for one project/configuration. */
public final class FetchDependencyReportAction
        implements BuildAction<DependencyReportModel>, Serializable {
    private static final long serialVersionUID = 1L;

    private final String projectPath;
    private final String configuration;

    public FetchDependencyReportAction(String projectPath, String configuration) {
        this.projectPath = projectPath;
        this.configuration = configuration;
    }

    @Override
    public DependencyReportModel execute(BuildController controller) {
        return controller.getModel(
                DependencyReportModel.class,
                DependencyQuery.class,
                new QueryInitializer(projectPath, configuration));
    }

    private static final class QueryInitializer implements Action<DependencyQuery> {
        private final String projectPath;
        private final String configuration;

        QueryInitializer(String projectPath, String configuration) {
            this.projectPath = projectPath;
            this.configuration = configuration;
        }

        @Override
        public void execute(DependencyQuery query) {
            query.setProjectPath(projectPath);
            query.setConfiguration(configuration);
        }
    }
}
