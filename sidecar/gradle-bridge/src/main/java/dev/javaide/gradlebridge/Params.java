package dev.javaide.gradlebridge;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Small, strict helpers for reading JSON-RPC parameters. */
final class Params {
    private Params() {}

    static String requiredText(JsonNode params, String name) {
        String value = text(params, name);
        if (value == null || value.isBlank()) {
            throw RpcException.invalidParams("missing required parameter: " + name);
        }
        return value;
    }

    static String text(JsonNode params, String name) {
        if (params == null) {
            return null;
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isTextual()) {
            throw RpcException.invalidParams(name + " must be a string");
        }
        return value.asText();
    }

    static boolean bool(JsonNode params, String name, boolean fallback) {
        if (params == null) {
            return fallback;
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return fallback;
        }
        if (!value.isBoolean()) {
            throw RpcException.invalidParams(name + " must be a boolean");
        }
        return value.asBoolean();
    }

    static long longValue(JsonNode params, String name, long fallback) {
        if (params == null) {
            return fallback;
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return fallback;
        }
        if (!value.canConvertToLong()) {
            throw RpcException.invalidParams(name + " must be an integer");
        }
        return value.asLong();
    }

    static List<String> strings(JsonNode params, String name) {
        if (params == null) {
            return List.of();
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return List.of();
        }
        if (!value.isArray()) {
            throw RpcException.invalidParams(name + " must be an array of strings");
        }
        List<String> result = new ArrayList<>();
        for (JsonNode element : value) {
            if (!element.isTextual()) {
                throw RpcException.invalidParams(name + " must be an array of strings");
            }
            result.add(element.asText());
        }
        return result;
    }

    static Map<String, String> stringMap(JsonNode params, String name) {
        if (params == null) {
            return Map.of();
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return Map.of();
        }
        if (!value.isObject()) {
            throw RpcException.invalidParams(name + " must be an object with string values");
        }
        Map<String, String> result = new LinkedHashMap<>();
        value.fields().forEachRemaining(entry -> {
            if (!entry.getValue().isTextual()) {
                throw RpcException.invalidParams(name + " must be an object with string values");
            }
            result.put(entry.getKey(), entry.getValue().asText());
        });
        return result;
    }

    static JsonNode object(JsonNode params, String name) {
        if (params == null) {
            return null;
        }
        JsonNode value = params.get(name);
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isObject()) {
            throw RpcException.invalidParams(name + " must be an object");
        }
        return value;
    }

    static String root(JsonNode params) {
        return requiredText(params, "root");
    }
}
