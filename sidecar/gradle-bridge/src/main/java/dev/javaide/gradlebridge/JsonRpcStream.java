package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * LSP-style {@code Content-Length} framing used by {@code ide-jsonrpc}.
 *
 * <p>The format and limits match the Rust codec: 8 KiB of headers and a 16 MiB
 * frame. A framing error is terminal; a body that is valid framing but invalid
 * JSON is reported as {@link ParseFailure} so the server can answer with a JSON
 * parse error and keep reading.
 */
public final class JsonRpcStream {
    private static final int MAX_HEADER_BYTES = 8 * 1024;
    private static final int MAX_FRAME_BYTES = 16 * 1024 * 1024;

    private final InputStream input;
    private final OutputStream output;
    private final ObjectMapper mapper;
    private final Object writeLock = new Object();

    public JsonRpcStream(InputStream input, OutputStream output, ObjectMapper mapper) {
        this.input = input;
        this.output = output;
        this.mapper = mapper;
    }

    /** Returns the next JSON message, or {@code null} at a clean end of stream. */
    public JsonNode read() throws IOException, ParseFailure, ProtocolFailure {
        long contentLength = -1;
        while (true) {
            Map<String, String> headers = new LinkedHashMap<>();
            int total = 0;
            boolean sawHeader = false;
            while (true) {
                String line = readHeaderLine();
                if (line == null) {
                    if (!sawHeader) {
                        return null;
                    }
                    throw new EOFException("unexpected end of stream inside JSON-RPC headers");
                }
                sawHeader = true;
                total += line.length() + 2;
                if (total > MAX_HEADER_BYTES) {
                    throw new ProtocolFailure("JSON-RPC headers exceed " + MAX_HEADER_BYTES + " bytes");
                }
                if (line.isEmpty()) {
                    break;
                }
                int separator = line.indexOf(':');
                if (separator <= 0) {
                    throw new ProtocolFailure("invalid JSON-RPC header: " + line);
                }
                String name = line.substring(0, separator).trim().toLowerCase(Locale.ROOT);
                String value = line.substring(separator + 1).trim();
                if (headers.putIfAbsent(name, value) != null) {
                    throw new ProtocolFailure("duplicate JSON-RPC header: " + name);
                }
            }
            if (headers.isEmpty()) {
                // Tolerate blank lines between frames.
                continue;
            }
            String rawLength = headers.get("content-length");
            if (rawLength == null) {
                throw new ProtocolFailure("missing Content-Length header");
            }
            try {
                contentLength = Long.parseLong(rawLength);
            } catch (NumberFormatException error) {
                throw new ProtocolFailure("invalid Content-Length: " + rawLength);
            }
            if (contentLength < 0) {
                throw new ProtocolFailure("negative Content-Length: " + contentLength);
            }
            if (contentLength > MAX_FRAME_BYTES) {
                throw new ProtocolFailure("JSON-RPC frame exceeds " + MAX_FRAME_BYTES + " bytes");
            }
            break;
        }

        byte[] body = input.readNBytes((int) contentLength);
        if (body.length != contentLength) {
            throw new EOFException("unexpected end of stream inside JSON-RPC body");
        }
        try {
            JsonNode node = mapper.readTree(body);
            if (node == null) {
                throw new ParseFailure("empty JSON-RPC body");
            }
            return node;
        } catch (IOException error) {
            throw new ParseFailure("invalid JSON-RPC body: " + error.getMessage());
        }
    }

    /** Writes one JSON value with a Content-Length header. */
    public void write(JsonNode message) throws IOException {
        byte[] body = mapper.writeValueAsBytes(message);
        if (body.length > MAX_FRAME_BYTES) {
            throw new IOException("outgoing JSON-RPC frame exceeds " + MAX_FRAME_BYTES + " bytes");
        }
        byte[] header =
                ("Content-Length: " + body.length + "\r\n\r\n").getBytes(StandardCharsets.US_ASCII);
        synchronized (writeLock) {
            output.write(header);
            output.write(body);
            output.flush();
        }
    }

    private String readHeaderLine() throws IOException, ProtocolFailure {
        byte[] line = new byte[256];
        int length = 0;
        while (true) {
            int value = input.read();
            if (value == -1) {
                return length == 0 ? null : new String(line, 0, length, StandardCharsets.UTF_8);
            }
            if (value == '\n') {
                if (length > 0 && line[length - 1] == '\r') {
                    length--;
                }
                return new String(line, 0, length, StandardCharsets.UTF_8);
            }
            if (length == line.length) {
                if (length >= MAX_HEADER_BYTES) {
                    throw new ProtocolFailure("JSON-RPC header line exceeds " + MAX_HEADER_BYTES + " bytes");
                }
                byte[] grown = new byte[Math.min(line.length * 2, MAX_HEADER_BYTES)];
                System.arraycopy(line, 0, grown, 0, length);
                line = grown;
            }
            line[length++] = (byte) value;
        }
    }

    /** Framing is unusable; the connection must close. */
    public static final class ProtocolFailure extends Exception {
        private static final long serialVersionUID = 1L;

        public ProtocolFailure(String message) {
            super(message);
        }
    }

    /** The frame was intact but its body was not valid JSON. */
    public static final class ParseFailure extends Exception {
        private static final long serialVersionUID = 1L;

        public ParseFailure(String message) {
            super(message);
        }
    }
}
