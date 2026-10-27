package dev.javaide.gradlebridge;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Captures build output and forwards complete lines as notifications.
 *
 * <p>The Tooling API writes to this stream from build threads. Writes are
 * synchronized, bounded per line and globally, and never throw: losing a log
 * line is preferable to failing a build. The retained tail is returned with
 * the operation result.
 */
final class StreamingOutput extends OutputStream {
    private static final int MAX_LINE_BYTES = 8 * 1024;
    private static final int MAX_LOG_CHARS = 256 * 1024;

    private final OperationContext context;
    private final String stream;
    private final ByteArrayOutputStream line = new ByteArrayOutputStream();
    private final StringBuilder log = new StringBuilder();
    private boolean lineTruncated;
    private boolean logTruncated;

    StreamingOutput(OperationContext context, String stream) {
        this.context = context;
        this.stream = stream;
    }

    @Override
    public synchronized void write(int value) {
        if (value == '\n') {
            emitLine();
            return;
        }
        if (line.size() < MAX_LINE_BYTES) {
            line.write(value);
        } else {
            lineTruncated = true;
        }
    }

    @Override
    public synchronized void write(byte[] bytes, int offset, int length) {
        for (int index = offset; index < offset + length; index++) {
            write(bytes[index]);
        }
    }

    @Override
    public synchronized void flush() {
        if (line.size() > 0) {
            emitLine();
        }
    }

    @Override
    public void close() {
        flush();
    }

    synchronized String text() {
        return log.toString();
    }

    private void emitLine() {
        String text = line.toString(StandardCharsets.UTF_8);
        line.reset();
        if (text.endsWith("\r")) {
            text = text.substring(0, text.length() - 1);
        }
        if (lineTruncated) {
            text = text + "…";
            lineTruncated = false;
        }
        if (text.isEmpty()) {
            return;
        }
        if (log.length() + text.length() + 1 <= MAX_LOG_CHARS) {
            log.append(text).append('\n');
        } else if (!logTruncated) {
            log.append("… output truncated\n");
            logTruncated = true;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("stream", stream);
        payload.put("text", text);
        context.notify("task.output", payload);
    }
}
