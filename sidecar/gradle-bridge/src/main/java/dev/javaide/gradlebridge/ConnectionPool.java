package dev.javaide.gradlebridge;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import org.gradle.tooling.GradleConnector;
import org.gradle.tooling.ProjectConnection;

/**
 * Keeps one {@link ProjectConnection} per root build and serializes operations
 * on each connection.
 *
 * <p>Gradle's Tooling API allows concurrent operations on a single connection,
 * but mixing a sync with a task run makes model results hard to correlate and
 * can overlap configuration work. The bridge therefore takes a per-build lock
 * for the whole operation. Cancellation does not wait for this lock: it goes
 * through {@link OperationContext}.
 */
final class ConnectionPool implements AutoCloseable {
    static final class Options {
        final Path root;
        final Path gradleHome;
        final Path javaHome;
        final Path gradleUserHome;

        Options(Path root, Path gradleHome, Path javaHome, Path gradleUserHome) {
            this.root = root;
            this.gradleHome = gradleHome;
            this.javaHome = javaHome;
            this.gradleUserHome = gradleUserHome;
        }

        String key() {
            return root + "|" + gradleHome + "|" + javaHome + "|" + gradleUserHome;
        }
    }

    static final class Holder {
        final ProjectConnection connection;
        final ReentrantLock lock = new ReentrantLock();

        Holder(ProjectConnection connection) {
            this.connection = connection;
        }

        void close() {
            connection.close();
        }
    }

    private final Map<String, Holder> holders = new HashMap<>();
    private final List<Holder> retired = new ArrayList<>();

    synchronized Holder acquire(Options options) {
        String key = options.key();
        Holder existing = holders.get(key);
        if (existing != null) {
            return existing;
        }
        // A changed distribution or Java home invalidates the connection for
        // this root. Keep other variants (for example included builds) alive.
        String rootPrefix = options.root + "|";
        holders.entrySet().removeIf(entry -> {
            if (!entry.getKey().startsWith(rootPrefix)) {
                return false;
            }
            retired.add(entry.getValue());
            return true;
        });

        GradleConnector connector = GradleConnector.newConnector()
                .forProjectDirectory(options.root.toFile());
        if (options.gradleHome != null) {
            connector.useInstallation(options.gradleHome.toFile());
        } else {
            connector.useBuildDistribution();
        }
        if (options.gradleUserHome != null) {
            connector.useGradleUserHomeDir(options.gradleUserHome.toFile());
        }
        Log.info("connecting to Gradle build %s", options.root);
        ProjectConnection connection = connector.connect();
        Holder holder = new Holder(connection);
        holders.put(key, holder);
        return holder;
    }

    synchronized List<Holder> takeRetired() {
        List<Holder> copy = List.copyOf(retired);
        retired.clear();
        return copy;
    }

    @Override
    public synchronized void close() {
        List<Holder> all = new ArrayList<>(holders.values());
        all.addAll(retired);
        holders.clear();
        retired.clear();
        for (Holder holder : all) {
            try {
                holder.close();
            } catch (RuntimeException error) {
                Log.warn("closing Gradle connection failed: %s", RpcException.describe(error));
            }
        }
    }

    static Options options(Path root, String gradleHome, String javaHome, String gradleUserHome) {
        Path normalizedRoot = normalizeDirectory(root, "root");
        return new Options(
                normalizedRoot,
                optionalDirectory(gradleHome, "gradleHome"),
                optionalDirectory(javaHome, "javaHome"),
                optionalDirectory(gradleUserHome, "gradleUserHome"));
    }

    static Path normalizeDirectory(Path path, String label) {
        if (path == null) {
            throw RpcException.invalidParams("missing required parameter: " + label);
        }
        Path absolute = path.toAbsolutePath().normalize();
        if (!Files.isDirectory(absolute)) {
            throw RpcException.invalidParams(label + " is not a directory: " + absolute);
        }
        return absolute;
    }

    private static Path optionalDirectory(String value, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeDirectory(Path.of(value), label);
    }

    static File file(Path path) {
        return path == null ? null : path.toFile();
    }
}
