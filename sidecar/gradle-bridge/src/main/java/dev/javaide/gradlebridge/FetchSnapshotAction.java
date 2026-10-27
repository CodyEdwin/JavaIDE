package dev.javaide.gradlebridge;

import java.io.Serializable;
import org.gradle.tooling.BuildAction;
import org.gradle.tooling.BuildController;
import dev.javaide.gradlebridge.model.BuildSnapshotModel;

/**
 * Fetches the bridge snapshot inside the Gradle daemon.
 *
 * <p>The model builder is registered by the generated init script, which also
 * puts the bridge jar on the init-script classpath. A {@link BuildAction} is
 * required because {@code ProjectConnection.getModel} cannot accept init-script
 * arguments.
 */
public final class FetchSnapshotAction implements BuildAction<BuildSnapshotModel>, Serializable {
    private static final long serialVersionUID = 1L;

    @Override
    public BuildSnapshotModel execute(BuildController controller) {
        return controller.getModel(BuildSnapshotModel.class);
    }
}
