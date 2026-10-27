package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * The set of long-running operations behind the JSON-RPC server.
 *
 * <p>Implementations must be safe to call from several worker threads. The
 * server owns lifecycle methods ({@code initialize}, {@code cancel},
 * {@code shutdown}); everything else is delegated here.
 */
public interface BridgeBackend extends AutoCloseable {
    Object handle(String method, JsonNode params, OperationContext context);

    @Override
    void close();
}
