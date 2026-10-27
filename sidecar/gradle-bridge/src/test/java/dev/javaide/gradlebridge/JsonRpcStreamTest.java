package dev.javaide.gradlebridge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class JsonRpcStreamTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void writesAndReadsAFrame() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        JsonRpcStream writer = new JsonRpcStream(new ByteArrayInputStream(new byte[0]), output, mapper);
        JsonNode message = mapper.readTree("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}");
        writer.write(message);

        ByteArrayInputStream input = new ByteArrayInputStream(output.toByteArray());
        JsonRpcStream reader = new JsonRpcStream(input, new ByteArrayOutputStream(), mapper);
        JsonNode read = reader.read();
        assertEquals("ping", read.get("method").asText());
        assertEquals(1, read.get("id").asInt());
        assertNull(reader.read());
    }

    @Test
    void readsTwoFramesInOneBuffer() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        JsonRpcStream writer = new JsonRpcStream(new ByteArrayInputStream(new byte[0]), output, mapper);
        writer.write(mapper.readTree("{\"jsonrpc\":\"2.0\",\"method\":\"one\"}"));
        writer.write(mapper.readTree("{\"jsonrpc\":\"2.0\",\"method\":\"two\"}"));

        JsonRpcStream reader = new JsonRpcStream(
                new ByteArrayInputStream(output.toByteArray()), new ByteArrayOutputStream(), mapper);
        assertEquals("one", reader.read().get("method").asText());
        assertEquals("two", reader.read().get("method").asText());
        assertNull(reader.read());
    }

    @Test
    void rejectsMissingContentLength() {
        JsonRpcStream reader = new JsonRpcStream(
                new ByteArrayInputStream("X-Test: 1\r\n\r\n{}".getBytes(StandardCharsets.UTF_8)),
                new ByteArrayOutputStream(),
                mapper);
        assertThrows(JsonRpcStream.ProtocolFailure.class, reader::read);
    }

    @Test
    void rejectsOversizedFramesBeforeAllocating() {
        JsonRpcStream reader = new JsonRpcStream(
                new ByteArrayInputStream(
                        "Content-Length: 16777217\r\n\r\n".getBytes(StandardCharsets.UTF_8)),
                new ByteArrayOutputStream(),
                mapper);
        JsonRpcStream.ProtocolFailure error =
                assertThrows(JsonRpcStream.ProtocolFailure.class, reader::read);
        assertTrue(error.getMessage().contains("exceeds"));
    }

    @Test
    void reportsInvalidJsonAsParseFailure() {
        JsonRpcStream reader = new JsonRpcStream(
                new ByteArrayInputStream(
                        "Content-Length: 1\r\n\r\n{".getBytes(StandardCharsets.UTF_8)),
                new ByteArrayOutputStream(),
                mapper);
        assertThrows(JsonRpcStream.ParseFailure.class, reader::read);
    }

    @Test
    void rejectsDuplicateHeaders() {
        JsonRpcStream reader = new JsonRpcStream(
                new ByteArrayInputStream(
                        "Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}"
                                .getBytes(StandardCharsets.UTF_8)),
                new ByteArrayOutputStream(),
                mapper);
        assertThrows(JsonRpcStream.ProtocolFailure.class, reader::read);
    }
}
