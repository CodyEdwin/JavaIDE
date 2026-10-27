package dev.javaide.gradlebridge;

import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;

/** Minimal stderr/file logger. Protocol stdout is never used for logs. */
public final class Log {
    private static final int MESSAGE_LIMIT = 8 * 1024;
    private static final Object LOCK = new Object();
    private static PrintWriter file;

    private Log() {}

    /** Opens an optional append-only log file. */
    public static void openFile(Path path) {
        try {
            Path parent = path.toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            file = new PrintWriter(Files.newBufferedWriter(
                    path,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND));
        } catch (Exception error) {
            warn("cannot open log file {}: {}", path, error.toString());
        }
    }

    public static void info(String format, Object... arguments) {
        write("INFO", format(format, arguments));
    }

    public static void warn(String format, Object... arguments) {
        write("WARN", format(format, arguments));
    }

    public static void error(String format, Object... arguments) {
        write("ERROR", format(format, arguments));
    }

    public static void error(String message, Throwable error) {
        StringBuilder text = new StringBuilder(message).append(": ").append(error);
        for (Throwable cause = error.getCause(); cause != null && cause != error; cause = cause.getCause()) {
            text.append(" <- ").append(cause);
        }
        write("ERROR", text.toString());
    }

    private static String format(String format, Object... arguments) {
        try {
            return arguments.length == 0 ? format : String.format(format, arguments);
        } catch (RuntimeException error) {
            return format + " [format error: " + error + "]";
        }
    }

    private static void write(String level, String message) {
        String bounded = message.length() > MESSAGE_LIMIT
                ? message.substring(0, MESSAGE_LIMIT) + "…"
                : message;
        String line = Instant.now() + " " + level + " " + bounded;
        synchronized (LOCK) {
            System.err.println(line);
            System.err.flush();
            if (file != null) {
                file.println(line);
                file.flush();
            }
        }
    }
}
