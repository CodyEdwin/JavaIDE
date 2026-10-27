package dev.javaide.gradlebridge;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.gradle.tooling.CancellationTokenSource;

/**
 * Per-request cancellation, timeout and notification state.
 *
 * <p>The client supplies a string {@code requestId} in the parameters. It is
 * separate from the JSON-RPC id so the Rust peer can cancel even though
 * {@code ide-jsonrpc} owns request-id allocation. Notifications echo it.
 */
public final class OperationContext {
    /** Sends one JSON-RPC notification. */
    @FunctionalInterface
    public interface Sink {
        void notification(String method, Map<String, Object> params);
    }

    private final String requestId;
    private final long timeoutMs;
    private final CancellationTokenSource cancellation;
    private final Sink sink;
    private final AtomicBoolean cancelled = new AtomicBoolean();
    private final AtomicBoolean timedOut = new AtomicBoolean();

    public OperationContext(
            String requestId,
            long timeoutMs,
            CancellationTokenSource cancellation,
            Sink sink) {
        this.requestId = requestId;
        this.timeoutMs = timeoutMs;
        this.cancellation = cancellation;
        this.sink = sink;
    }

    public String requestId() {
        return requestId;
    }

    public long timeoutMs() {
        return timeoutMs;
    }

    public org.gradle.tooling.CancellationToken token() {
        return cancellation.token();
    }

    public boolean isCancelled() {
        return cancelled.get();
    }

    public boolean isTimedOut() {
        return timedOut.get();
    }

    public void cancel() {
        if (cancelled.compareAndSet(false, true)) {
            cancellation.cancel();
        }
    }

    public void cancelForTimeout() {
        timedOut.set(true);
        cancel();
    }

    public void notify(String method, Map<String, Object> params) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", requestId);
        if (params != null) {
            payload.putAll(params);
        }
        sink.notification(method, payload);
    }
}
