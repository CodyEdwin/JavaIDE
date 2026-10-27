package dev.javaide.gradlebridge;

/**
 * A domain error that becomes a JSON-RPC error response.
 *
 * <p>The JSON-RPC {@code code} stays in the reserved server-error range; the
 * stable machine-readable code lives in {@code error.data.code}. This keeps the
 * envelope compliant while giving the Rust client a typed reason.
 */
public final class RpcException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    private static final int SERVER_ERROR = -32000;
    private static final int INVALID_PARAMS = -32602;
    private static final int METHOD_NOT_FOUND = -32601;

    private final int rpcCode;
    private final String code;
    private final String detail;
    private final String file;
    private final Integer line;
    private final Integer column;

    public RpcException(
            int rpcCode,
            String code,
            String message,
            String detail,
            String file,
            Integer line,
            Integer column,
            Throwable cause) {
        super(message, cause);
        this.rpcCode = rpcCode;
        this.code = code;
        this.detail = detail;
        this.file = file;
        this.line = line;
        this.column = column;
    }

    public int rpcCode() {
        return rpcCode;
    }

    public String code() {
        return code;
    }

    public String detail() {
        return detail;
    }

    public String file() {
        return file;
    }

    public Integer line() {
        return line;
    }

    public Integer column() {
        return column;
    }

    public static RpcException invalidParams(String message) {
        return new RpcException(
                INVALID_PARAMS, "bridge.invalidParams", message, null, null, null, null, null);
    }

    public static RpcException methodNotFound(String method) {
        return new RpcException(
                METHOD_NOT_FOUND,
                "bridge.methodNotFound",
                "unknown method: " + method,
                null,
                null,
                null,
                null,
                null);
    }

    public static RpcException failed(String code, String message, Throwable cause) {
        return new RpcException(
                SERVER_ERROR, code, message, describe(cause), null, null, null, cause);
    }

    public static RpcException failed(String code, String message, String detail) {
        return new RpcException(SERVER_ERROR, code, message, detail, null, null, null, null);
    }

    public static RpcException cancelled() {
        return new RpcException(
                SERVER_ERROR,
                "gradle.cancelled",
                "operation was cancelled",
                null,
                null,
                null,
                null,
                null);
    }

    public static RpcException timedOut(long timeoutMs) {
        return new RpcException(
                SERVER_ERROR,
                "gradle.timeout",
                "operation exceeded " + timeoutMs + " ms",
                null,
                null,
                null,
                null,
                null);
    }

    public static String describe(Throwable error) {
        if (error == null) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        for (Throwable current = error; current != null && builder.length() < 4000; current = current.getCause()) {
            if (current.getCause() == current) {
                break;
            }
            String message = current.getMessage();
            if (message == null || message.isBlank()) {
                message = current.getClass().getName();
            }
            if (builder.length() > 0) {
                builder.append(" <- ");
            }
            builder.append(message);
        }
        return builder.toString();
    }
}
