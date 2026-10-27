package dev.javaide.gradlebridge.model;

import javax.inject.Inject;
import org.gradle.api.Plugin;
import org.gradle.api.Project;
import org.gradle.tooling.provider.model.ToolingModelBuilderRegistry;

/**
 * Registers the bridge model builder through the generated init script.
 *
 * <p>The registry is injected by Gradle. The plugin is applied only to the root
 * project; the builder then walks the whole build itself.
 */
public final class BridgePlugin implements Plugin<Project> {
    private final ToolingModelBuilderRegistry registry;

    @Inject
    public BridgePlugin(ToolingModelBuilderRegistry registry) {
        this.registry = registry;
    }

    @Override
    public void apply(Project project) {
        registry.register(new BuildSnapshotBuilder());
        registry.register(new DependencyReportBuilder());
    }
}
