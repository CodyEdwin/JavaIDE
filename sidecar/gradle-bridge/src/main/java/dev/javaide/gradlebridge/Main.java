package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Entry point for the Gradle bridge.
 *
 * <p>stdout is reserved for JSON-RPC frames. All diagnostics go to stderr and,
 * when configured, an append-only log file. The process exits after a
 * {@code shutdown} request or end of stdin.
 */
public final class Main {
    private static final String VERSION = "0.1.0";

    private Main() {}

    public static void main(String[] args) {
        Options options;
        try {
            options = Options.parse(args);
        } catch (IllegalArgumentException error) {
            System.err.println("gradle-bridge: " + error.getMessage());
            System.err.println(Options.usage());
            System.exit(2);
            return;
        }
        if (options.help) {
            System.out.println(Options.usage());
            return;
        }
        if (options.version) {
            System.out.println("gradle-bridge " + VERSION);
            return;
        }
        if (options.logFile != null) {
            Log.openFile(options.logFile);
        }
        Log.info(
                "starting gradle-bridge %s on Java %s (%s)",
                VERSION,
                System.getProperty("java.version"),
                System.getProperty("java.vendor"));

        ObjectMapper mapper = new ObjectMapper();
        Path classpath;
        try {
            classpath = bridgeClasspath();
        } catch (RuntimeException error) {
            Log.error("cannot locate the bridge classpath: %s", RpcException.describe(error));
            System.err.println("gradle-bridge: cannot locate its own classpath");
            System.exit(1);
            return;
        }

        GradleService backend = new GradleService(classpath, mapper);
        BridgeServer server = new BridgeServer(System.in, System.out, backend, mapper);
        Runtime.getRuntime().addShutdownHook(new Thread(server::close, "bridge-shutdown"));
        try {
            server.serve();
        } catch (RuntimeException error) {
            Log.error("bridge crashed", error);
            System.err.println("gradle-bridge: fatal error: " + RpcException.describe(error));
            System.exit(1);
        }
    }

    private static Path bridgeClasspath() {
        var source = Main.class.getProtectionDomain().getCodeSource();
        if (source == null || source.getLocation() == null) {
            throw new IllegalStateException("no code source; start from a jar or classes directory");
        }
        try {
            return Path.of(source.getLocation().toURI()).toAbsolutePath().normalize();
        } catch (URISyntaxException error) {
            throw new IllegalStateException("invalid code source URI: " + source.getLocation(), error);
        }
    }

    private static final class Options {
        final boolean help;
        final boolean version;
        final Path logFile;

        Options(boolean help, boolean version, Path logFile) {
            this.help = help;
            this.version = version;
            this.logFile = logFile;
        }

        static Options parse(String[] args) {
            boolean help = false;
            boolean version = false;
            Path logFile = null;
            List<String> remaining = new ArrayList<>();
            for (int index = 0; index < args.length; index++) {
                String arg = args[index];
                switch (arg) {
                    case "--help", "-h" -> help = true;
                    case "--version", "-V" -> version = true;
                    case "--log" -> {
                        if (index + 1 >= args.length) {
                            throw new IllegalArgumentException("--log requires a path");
                        }
                        logFile = Path.of(args[++index]);
                    }
                    default -> {
                        if (arg.startsWith("--log=")) {
                            logFile = Path.of(arg.substring("--log=".length()));
                        } else {
                            remaining.add(arg);
                        }
                    }
                }
            }
            if (!remaining.isEmpty()) {
                throw new IllegalArgumentException("unknown arguments: " + String.join(" ", remaining));
            }
            return new Options(help, version, logFile);
        }

        static String usage() {
            return """
                    usage: gradle-bridge [--log PATH] [--version] [--help]

                    Speaks JSON-RPC 2.0 over stdin/stdout with Content-Length framing.
                    stdout is protocol only; diagnostics go to stderr and the log file.
                    """;
        }
    }
}
