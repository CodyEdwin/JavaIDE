package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.gradle.tooling.GradleConnector;

/**
 * JSON-RPC 2.0 server for the Gradle bridge.
 *
 * <p>The read loop stays responsive: long operations run on a worker pool, and
 * {@code cancel} is handled inline so it cannot queue behind the operation it
 * is meant to stop. Responses and notifications share one write path with a
 * lock inside {@link JsonRpcStream}.
 */
final class BridgeServer {
    private static final int WORKERS = 8;
    private static final String PROTOCOL_VERSION = "1";

    private final JsonRpcStream stream;
    private final ObjectMapper mapper;
    private final BridgeBackend backend;
    private final ExecutorService workers;
    private final ScheduledExecutorService timeouts;
    private final Map<String, OperationContext> active = new ConcurrentHashMap<>();
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicLong generatedIds = new AtomicLong();
    private final CountDownLatch stopped = new CountDownLatch(1);

    BridgeServer(InputStream input, OutputStream output, BridgeBackend backend, ObjectMapper mapper) {
        this.stream = new JsonRpcStream(input, output, mapper);
        this.mapper = mapper;
        this.backend = backend;
        this.workers = Executors.newFixedThreadPool(WORKERS, threadFactory("bridge-rpc-"));
        this.timeouts = Executors.newScheduledThreadPool(2, threadFactory("bridge-timeout-"));
    }

    void serve() {
        try {
            while (running.get()) {
                JsonNode message;
                try {
                    message = stream.read();
                } catch (JsonRpcStream.ParseFailure error) {
                    writeError(null, -32700, "parse error", error.getMessage(), null, null, null);
                    continue;
                } catch (JsonRpcStream.ProtocolFailure error) {
                    Log.error("JSON-RPC framing failed: %s", error.getMessage());
                    break;
                } catch (IOException error) {
                    if (running.get()) {
                        Log.error("JSON-RPC input failed: %s", RpcException.describe(error));
                    }
                    break;
                }
                if (message == null) {
                    break;
                }
                if (!dispatch(message)) {
                    break;
                }
            }
        } finally {
            running.set(false);
            cancelAll();
            workers.shutdown();
            timeouts.shutdownNow();
            try {
                workers.awaitTermination(5, TimeUnit.SECONDS);
                timeouts.awaitTermination(2, TimeUnit.SECONDS);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
            workers.shutdownNow();
            backend.close();
            stopped.countDown();
        }
    }

    void await() throws InterruptedException {
        stopped.await();
    }

    void close() {
        running.set(false);
        cancelAll();
        workers.shutdownNow();
        timeouts.shutdownNow();
        backend.close();
    }

    /** Returns false when the server should stop. */
    private boolean dispatch(JsonNode message) {
        if (!message.isObject()) {
            writeError(null, -32600, "invalid request", "request must be a JSON object", null, null, null);
            return true;
        }
        JsonNode version = message.get("jsonrpc");
        JsonNode methodNode = message.get("method");
        JsonNode id = message.get("id");
        boolean notification = id == null;
        if (version == null || !"2.0".equals(version.asText())
                || methodNode == null || !methodNode.isTextual()) {
            if (!notification) {
                writeError(id, -32600, "invalid request", "expected jsonrpc 2.0 and a method", null, null, null);
            }
            return true;
        }
        String method = methodNode.asText();
        JsonNode params = message.get("params");
        if (notification) {
            Log.info("ignoring notification %s", method);
            return true;
        }

        switch (method) {
            case "initialize" -> writeResult(id, initialize());
            case "cancel" -> writeResult(id, cancel(params));
            case "shutdown" -> {
                writeResult(id, Map.of("ok", true));
                return false;
            }
            default -> submit(id, method, params);
        }
        return true;
    }

    private void submit(JsonNode id, String method, JsonNode params) {
        workers.execute(() -> {
            String requestId = requestId(params, id);
            long timeoutMs = Params.longValue(params, "timeoutMs", 0);
            if (timeoutMs < 0) {
                writeError(id, -32602, "invalid params", "timeoutMs must not be negative", null, null, null);
                return;
            }
            OperationContext context = new OperationContext(
                    requestId,
                    timeoutMs,
                    GradleConnector.newCancellationTokenSource(),
                    this::sendNotification);
            OperationContext previous = active.putIfAbsent(requestId, context);
            if (previous != null) {
                writeError(
                        id,
                        -32602,
                        "invalid params",
                        "duplicate requestId: " + requestId,
                        null,
                        null,
                        null);
                return;
            }
            ScheduledFuture<?> timeout = null;
            if (timeoutMs > 0) {
                timeout = timeouts.schedule(
                        context::cancelForTimeout, timeoutMs, TimeUnit.MILLISECONDS);
            }
            try {
                Object result = backend.handle(method, params, context);
                writeResult(id, result);
            } catch (RpcException error) {
                writeError(
                        id,
                        error.rpcCode(),
                        error.getMessage(),
                        error.detail(),
                        error.code(),
                        error.line(),
                        error.column());
            } catch (RuntimeException error) {
                Log.error("request " + method + " failed", error);
                writeError(
                        id,
                        -32603,
                        "internal error",
                        RpcException.describe(error),
                        "bridge.internal",
                        null,
                        null);
            } finally {
                if (timeout != null) {
                    timeout.cancel(false);
                }
                active.remove(requestId);
            }
        });
    }

    private Map<String, Object> initialize() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", "gradle-bridge");
        result.put("version", version());
        result.put("protocolVersion", PROTOCOL_VERSION);
        result.put(
                "capabilities",
                java.util.List.of(
                        "sync",
                        "cancel",
                        "runTask",
                        "resolveClasspath",
                        "listTests",
                        "runTests",
                        "dependencyReport",
                        "shutdown"));
        result.put("javaVersion", System.getProperty("java.version"));
        result.put("javaVendor", System.getProperty("java.vendor"));
        String toolingApiVersion = GradleConnector.class.getPackage().getImplementationVersion();
        result.put("toolingApiVersion", toolingApiVersion == null ? "unknown" : toolingApiVersion);
        return result;
    }

    private Map<String, Object> cancel(JsonNode params) {
        String requestId = Params.requiredText(params, "requestId");
        OperationContext context = active.get(requestId);
        if (context != null) {
            context.cancel();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requestId", requestId);
        result.put("cancelled", context != null);
        return result;
    }

    private void cancelAll() {
        for (OperationContext context : active.values()) {
            context.cancel();
        }
    }

    private String requestId(JsonNode params, JsonNode id) {
        String requestId = Params.text(params, "requestId");
        if (requestId == null || requestId.isBlank()) {
            String idText = id == null ? "?" : id.asText();
            return "auto-" + idText + "-" + generatedIds.incrementAndGet();
        }
        return requestId;
    }

    private void sendNotification(String method, Map<String, Object> params) {
        ObjectNode message = mapper.createObjectNode();
        message.put("jsonrpc", "2.0");
        message.put("method", method);
        message.set("params", mapper.valueToTree(params));
        try {
            stream.write(message);
        } catch (IOException error) {
            Log.error("cannot write JSON-RPC notification %s: %s", method, RpcException.describe(error));
            running.set(false);
        }
    }

    private void writeResult(JsonNode id, Object result) {
        ObjectNode message = mapper.createObjectNode();
        message.put("jsonrpc", "2.0");
        message.set("id", id == null ? mapper.nullNode() : id);
        message.set("result", mapper.valueToTree(result));
        write(message);
    }

    private void writeError(
            JsonNode id,
            int code,
            String message,
            String detail,
            String stableCode,
            Integer line,
            Integer column) {
        ObjectNode envelope = mapper.createObjectNode();
        envelope.put("jsonrpc", "2.0");
        envelope.set("id", id == null ? mapper.nullNode() : id);
        ObjectNode error = envelope.putObject("error");
        error.put("code", code);
        error.put("message", message == null ? "error" : message);
        ObjectNode data = error.putObject("data");
        data.put("code", stableCode == null ? "bridge.error" : stableCode);
        if (detail != null) {
            data.put("detail", detail);
        }
        if (line != null) {
            data.put("line", line);
        }
        if (column != null) {
            data.put("column", column);
        }
        write(envelope);
    }

    private void write(ObjectNode message) {
        try {
            stream.write(message);
        } catch (IOException error) {
            Log.error("cannot write JSON-RPC response: %s", RpcException.describe(error));
            running.set(false);
        }
    }

    private static String version() {
        String version = BridgeServer.class.getPackage().getImplementationVersion();
        return version == null || version.isBlank() ? "0.1.0" : version;
    }

    private static ThreadFactory threadFactory(String prefix) {
        AtomicLong counter = new AtomicLong();
        return runnable -> {
            Thread thread = new Thread(runnable, prefix + counter.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }
}
