package dev.javaide.gradlebridge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class BridgeServerTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void dispatchesInitializeSyncCancelAndShutdown() {
        assertTimeoutPreemptively(Duration.ofSeconds(20), () -> {
            FakeBackend backend = new FakeBackend();
            PipedOutputStream clientToServer = new PipedOutputStream();
            PipedInputStream serverInput = new PipedInputStream(clientToServer, 1 << 20);
            PipedOutputStream serverOutput = new PipedOutputStream();
            PipedInputStream clientInput = new PipedInputStream(serverOutput, 1 << 20);

            BridgeServer server = new BridgeServer(serverInput, serverOutput, backend, mapper);
            Thread thread = new Thread(server::serve, "bridge-test-server");
            thread.start();

            JsonRpcStream writer = new JsonRpcStream(
                    new ByteArrayInputStream(new byte[0]), clientToServer, mapper);
            JsonRpcStream reader = new JsonRpcStream(
                    clientInput, new ByteArrayOutputStream(), mapper);

            writer.write(request(1, "initialize", null));
            JsonNode initialized = reader.read();
            assertEquals("gradle-bridge", initialized.path("result").path("name").asText());

            ObjectNode syncParams = mapper.createObjectNode();
            syncParams.put("requestId", "sync-1");
            writer.write(request(2, "sync", syncParams));
            assertTrue(backend.started.await(5, TimeUnit.SECONDS));

            ObjectNode cancelParams = mapper.createObjectNode();
            cancelParams.put("requestId", "sync-1");
            writer.write(request(3, "cancel", cancelParams));

            Map<Integer, JsonNode> responses = new HashMap<>();
            for (int index = 0; index < 2; index++) {
                JsonNode response = reader.read();
                assertNotNull(response);
                responses.put(response.get("id").asInt(), response);
            }
            assertTrue(responses.get(2).path("result").path("cancelled").asBoolean());
            assertTrue(responses.get(3).path("result").path("cancelled").asBoolean());

            writer.write(request(4, "shutdown", null));
            JsonNode shutdown = reader.read();
            assertTrue(shutdown.path("result").path("ok").asBoolean());
            thread.join(5_000);
            assertFalse(thread.isAlive());
            assertTrue(backend.closed.get());
        });
    }

    private ObjectNode request(int id, String method, JsonNode params) {
        ObjectNode request = mapper.createObjectNode();
        request.put("jsonrpc", "2.0");
        request.put("id", id);
        request.put("method", method);
        if (params != null) {
            request.set("params", params);
        }
        return request;
    }

    private static final class FakeBackend implements BridgeBackend {
        final CountDownLatch started = new CountDownLatch(1);
        final AtomicBoolean closed = new AtomicBoolean();

        @Override
        public Object handle(String method, JsonNode params, OperationContext context) {
            if (!"sync".equals(method)) {
                return Map.of("echo", params == null ? "none" : params.path("value").asText());
            }
            started.countDown();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (!context.isCancelled() && System.nanoTime() < deadline) {
                try {
                    Thread.sleep(10);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            return Map.of("requestId", context.requestId(), "cancelled", context.isCancelled());
        }

        @Override
        public void close() {
            closed.set(true);
        }
    }
}
