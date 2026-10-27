//! JSON-RPC 2.0 message envelopes.
//!
//! The wire format is validated on deserialization: a peer that sends
//! `"jsonrpc": "1.0"`, a message that is both a request and a response, or a
//! response with neither `result` nor `error` is rejected rather than silently
//! coerced. Being strict here keeps protocol bugs visible in the adapter that
//! owns the connection.
//!
//! # Examples
//!
//! ```
//! use ide_jsonrpc::{Message, RequestId};
//! use serde_json::json;
//!
//! let message = Message::request(
//!     RequestId::Number(1),
//!     "initialize",
//!     Some(json!({ "processId": null })),
//! );
//! let encoded = serde_json::to_string(&message).unwrap();
//! let decoded: Message = serde_json::from_str(&encoded).unwrap();
//! assert_eq!(message, decoded);
//! ```

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use thiserror::Error;

/// The only JSON-RPC protocol version this crate accepts.
pub const JSONRPC_VERSION: &str = "2.0";

/// The three JSON-RPC message shapes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MessageKind {
    /// A call that expects a response, identified by [`RequestId`].
    Request,
    /// A one-way call with no id and no response.
    Notification,
    /// A result or error for a previously sent request.
    Response,
}

impl fmt::Display for MessageKind {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Self::Request => "request",
            Self::Notification => "notification",
            Self::Response => "response",
        };
        formatter.write_str(name)
    }
}

/// A JSON-RPC request identifier.
///
/// The spec allows numbers and strings. Numbers are restricted to `i64`
/// because every protocol this workspace talks to (LSP, DAP, Gradle, OpenCode)
/// uses integral ids. A fractional id is a protocol error, not something to
/// round.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RequestId {
    /// Numeric id, as used by LSP and DAP.
    Number(i64),
    /// String id, permitted by JSON-RPC 2.0 and used by some servers.
    String(String),
}

impl RequestId {
    /// Returns the numeric id, if this is a [`RequestId::Number`].
    #[must_use]
    pub const fn as_number(&self) -> Option<i64> {
        match self {
            Self::Number(value) => Some(*value),
            Self::String(_) => None,
        }
    }

    /// Returns the string id, if this is a [`RequestId::String`].
    #[must_use]
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value),
            Self::Number(_) => None,
        }
    }
}

impl fmt::Display for RequestId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Number(value) => write!(formatter, "{value}"),
            Self::String(value) => formatter.write_str(value),
        }
    }
}

impl From<i64> for RequestId {
    fn from(value: i64) -> Self {
        Self::Number(value)
    }
}

impl From<String> for RequestId {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}

impl From<&str> for RequestId {
    fn from(value: &str) -> Self {
        Self::String(value.to_owned())
    }
}

/// A JSON-RPC error object.
///
/// Standard codes are available as associated constants. `data` is free-form
/// and is preserved verbatim.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErrorObject {
    /// Numeric error code. Negative values are reserved for protocol errors.
    pub code: i32,
    /// Short, human-readable error summary.
    pub message: String,
    /// Optional structured error details.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl fmt::Display for ErrorObject {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} (code {})", self.message, self.code)
    }
}

impl ErrorObject {
    /// Invalid JSON was received; the request could not be parsed.
    pub const PARSE_ERROR: i32 = -32700;
    /// The JSON was valid but did not match the request schema.
    pub const INVALID_REQUEST: i32 = -32600;
    /// The requested method does not exist.
    pub const METHOD_NOT_FOUND: i32 = -32601;
    /// The method exists but the parameters are invalid.
    pub const INVALID_PARAMS: i32 = -32602;
    /// The method failed internally.
    pub const INTERNAL_ERROR: i32 = -32603;

    /// Creates an error without structured data.
    #[must_use]
    pub fn new(code: i32, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            data: None,
        }
    }

    /// Adds structured data, consuming the error.
    #[must_use]
    pub fn with_data(mut self, data: Value) -> Self {
        self.data = Some(data);
        self
    }

    /// Creates a “method not found” error for the given method name.
    #[must_use]
    pub fn method_not_found(method: &str) -> Self {
        Self::new(Self::METHOD_NOT_FOUND, format!("unknown method: {method}"))
    }
}

/// The payload of a JSON-RPC response.
#[derive(Debug, Clone, PartialEq)]
pub enum ResponsePayload {
    /// Successful result. `Value::Null` is a valid success result.
    Result(Value),
    /// Failed call.
    Error(ErrorObject),
}

/// A JSON-RPC response.
///
/// `id` is optional because the spec permits `null` when the request id could
/// not be determined (for example, a parse error). A missing `id` member is
/// still rejected by [`Message::from_value`].
#[derive(Debug, Clone, PartialEq)]
pub struct Response {
    /// Id echoed from the request, or `None` for an unidentifiable request.
    pub id: Option<RequestId>,
    /// Result or error payload.
    pub payload: ResponsePayload,
}

impl Response {
    /// Returns the success value, if any.
    #[must_use]
    pub const fn result(&self) -> Option<&Value> {
        match &self.payload {
            ResponsePayload::Result(value) => Some(value),
            ResponsePayload::Error(_) => None,
        }
    }

    /// Returns the error object, if any.
    #[must_use]
    pub const fn error(&self) -> Option<&ErrorObject> {
        match &self.payload {
            ResponsePayload::Result(_) => None,
            ResponsePayload::Error(error) => Some(error),
        }
    }
}

/// A validated JSON-RPC 2.0 message.
#[derive(Debug, Clone, PartialEq)]
pub enum Message {
    /// A request that expects a response.
    Request {
        /// Correlation id chosen by the sender.
        id: RequestId,
        /// Method name.
        method: String,
        /// Structured parameters. Present-but-`null` is normalized to `None`.
        params: Option<Value>,
    },
    /// A one-way notification.
    Notification {
        /// Method name.
        method: String,
        /// Structured parameters. Present-but-`null` is normalized to `None`.
        params: Option<Value>,
    },
    /// A response to a request.
    Response(Response),
}

impl Message {
    /// Builds a request. `params: None` omits the member entirely.
    #[must_use]
    pub fn request(id: RequestId, method: impl Into<String>, params: Option<Value>) -> Self {
        Self::Request {
            id,
            method: method.into(),
            params: normalize_params(params),
        }
    }

    /// Builds a notification.
    #[must_use]
    pub fn notification(method: impl Into<String>, params: Option<Value>) -> Self {
        Self::Notification {
            method: method.into(),
            params: normalize_params(params),
        }
    }

    /// Builds a successful response.
    #[must_use]
    pub fn success(id: RequestId, result: Value) -> Self {
        Self::Response(Response {
            id: Some(id),
            payload: ResponsePayload::Result(result),
        })
    }

    /// Builds an error response for a known request id.
    #[must_use]
    pub fn error(id: RequestId, error: ErrorObject) -> Self {
        Self::Response(Response {
            id: Some(id),
            payload: ResponsePayload::Error(error),
        })
    }

    /// Builds an error response whose id could not be determined.
    #[must_use]
    pub fn error_without_id(error: ErrorObject) -> Self {
        Self::Response(Response {
            id: None,
            payload: ResponsePayload::Error(error),
        })
    }

    /// Classifies the message.
    #[must_use]
    pub const fn kind(&self) -> MessageKind {
        match self {
            Self::Request { .. } => MessageKind::Request,
            Self::Notification { .. } => MessageKind::Notification,
            Self::Response(_) => MessageKind::Response,
        }
    }

    /// Returns the request id for requests and responses.
    #[must_use]
    pub fn id(&self) -> Option<&RequestId> {
        match self {
            Self::Request { id, .. } => Some(id),
            Self::Notification { .. } => None,
            Self::Response(response) => response.id.as_ref(),
        }
    }

    /// Returns the method name for requests and notifications.
    #[must_use]
    pub fn method(&self) -> Option<&str> {
        match self {
            Self::Request { method, .. } | Self::Notification { method, .. } => Some(method),
            Self::Response(_) => None,
        }
    }

    /// Returns the parameters for requests and notifications.
    #[must_use]
    pub fn params(&self) -> Option<&Value> {
        match self {
            Self::Request { params, .. } | Self::Notification { params, .. } => params.as_ref(),
            Self::Response(_) => None,
        }
    }

    /// Parses a JSON value, validating the envelope.
    ///
    /// # Errors
    ///
    /// Returns [`MessageError`] when the value is not an object, uses another
    /// protocol version, or mixes request/response members.
    pub fn from_value(value: Value) -> Result<Self, MessageError> {
        let Value::Object(mut object) = value else {
            return Err(MessageError::NotAnObject);
        };

        let version = object
            .remove("jsonrpc")
            .ok_or(MessageError::MissingVersion)?;
        let version = version.as_str().ok_or(MessageError::InvalidVersion)?;
        if version != JSONRPC_VERSION {
            return Err(MessageError::UnsupportedVersion(version.to_owned()));
        }

        let method = object.remove("method");
        match method {
            Some(method) => {
                let method = method
                    .as_str()
                    .ok_or(MessageError::InvalidMethod)?
                    .to_owned();
                if object.contains_key("result") || object.contains_key("error") {
                    return Err(MessageError::RequestWithResult);
                }
                let id = match object.remove("id") {
                    Some(Value::Null) | None => None,
                    Some(value) => Some(
                        serde_json::from_value::<RequestId>(value)
                            .map_err(MessageError::InvalidId)?,
                    ),
                };
                let params = normalize_params(object.remove("params"));
                match id {
                    Some(id) => Ok(Self::Request { id, method, params }),
                    None => Ok(Self::Notification { method, params }),
                }
            }
            None => {
                let result = object.remove("result");
                let error = object.remove("error");
                let payload = match (result, error) {
                    (Some(result), None) => ResponsePayload::Result(result),
                    (None, Some(error)) => ResponsePayload::Error(
                        serde_json::from_value(error).map_err(MessageError::InvalidError)?,
                    ),
                    (Some(_), Some(_)) => return Err(MessageError::BothResultAndError),
                    (None, None) => return Err(MessageError::MissingResult),
                };
                let id = object.remove("id").ok_or(MessageError::MissingResponseId)?;
                let id = if id.is_null() {
                    None
                } else {
                    Some(serde_json::from_value::<RequestId>(id).map_err(MessageError::InvalidId)?)
                };
                Ok(Self::Response(Response { id, payload }))
            }
        }
    }
}

fn normalize_params(params: Option<Value>) -> Option<Value> {
    params.filter(|value| !value.is_null())
}

impl Serialize for Message {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::Request { id, method, params } => {
                #[derive(Serialize)]
                struct WireRequest<'a> {
                    jsonrpc: &'static str,
                    id: &'a RequestId,
                    method: &'a str,
                    #[serde(skip_serializing_if = "Option::is_none")]
                    params: Option<&'a Value>,
                }
                WireRequest {
                    jsonrpc: JSONRPC_VERSION,
                    id,
                    method,
                    params: params.as_ref(),
                }
                .serialize(serializer)
            }
            Self::Notification { method, params } => {
                #[derive(Serialize)]
                struct WireNotification<'a> {
                    jsonrpc: &'static str,
                    method: &'a str,
                    #[serde(skip_serializing_if = "Option::is_none")]
                    params: Option<&'a Value>,
                }
                WireNotification {
                    jsonrpc: JSONRPC_VERSION,
                    method,
                    params: params.as_ref(),
                }
                .serialize(serializer)
            }
            Self::Response(Response { id, payload }) => match payload {
                ResponsePayload::Result(result) => {
                    #[derive(Serialize)]
                    struct WireSuccess<'a> {
                        jsonrpc: &'static str,
                        id: Option<&'a RequestId>,
                        result: &'a Value,
                    }
                    WireSuccess {
                        jsonrpc: JSONRPC_VERSION,
                        id: id.as_ref(),
                        result,
                    }
                    .serialize(serializer)
                }
                ResponsePayload::Error(error) => {
                    #[derive(Serialize)]
                    struct WireError<'a> {
                        jsonrpc: &'static str,
                        id: Option<&'a RequestId>,
                        error: &'a ErrorObject,
                    }
                    WireError {
                        jsonrpc: JSONRPC_VERSION,
                        id: id.as_ref(),
                        error,
                    }
                    .serialize(serializer)
                }
            },
        }
    }
}

impl<'de> Deserialize<'de> for Message {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        Self::from_value(value).map_err(serde::de::Error::custom)
    }
}

impl TryFrom<Value> for Message {
    type Error = MessageError;

    fn try_from(value: Value) -> Result<Self, Self::Error> {
        Self::from_value(value)
    }
}

/// Envelope validation failure.
#[derive(Debug, Error)]
pub enum MessageError {
    /// The top-level JSON value is not an object.
    #[error("JSON-RPC message must be an object")]
    NotAnObject,
    /// The `jsonrpc` member is absent.
    #[error("missing jsonrpc version")]
    MissingVersion,
    /// The `jsonrpc` member is not a string.
    #[error("jsonrpc version must be a string")]
    InvalidVersion,
    /// The `jsonrpc` version is not `2.0`.
    #[error("unsupported JSON-RPC version: {0}")]
    UnsupportedVersion(String),
    /// The `method` member is not a string.
    #[error("method must be a string")]
    InvalidMethod,
    /// A message carried both `method` and `result`/`error`.
    #[error("message cannot be both a request and a response")]
    RequestWithResult,
    /// A response carried both `result` and `error`.
    #[error("response cannot contain both result and error")]
    BothResultAndError,
    /// A response carried neither `result` nor `error`.
    #[error("response must contain result or error")]
    MissingResult,
    /// A response omitted the `id` member entirely.
    #[error("response is missing the id member")]
    MissingResponseId,
    /// The request id was neither an integer nor a string.
    #[error("invalid request id: {0}")]
    InvalidId(serde_json::Error),
    /// The error member did not match [`ErrorObject`].
    #[error("invalid error object: {0}")]
    InvalidError(serde_json::Error),
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn request_round_trip() {
        let message = Message::request(
            RequestId::Number(7),
            "textDocument/hover",
            Some(json!({ "position": { "line": 3, "character": 9 } })),
        );
        let encoded = serde_json::to_value(&message).unwrap();
        assert_eq!(encoded["jsonrpc"], "2.0");
        assert_eq!(encoded["id"], 7);
        assert_eq!(encoded["method"], "textDocument/hover");
        assert_eq!(message, Message::from_value(encoded).unwrap());
    }

    #[test]
    fn notification_omits_id() {
        let message = Message::notification("initialized", Some(json!({})));
        let encoded = serde_json::to_value(&message).unwrap();
        assert!(encoded.get("id").is_none());
        assert_eq!(encoded["method"], "initialized");
    }

    #[test]
    fn null_params_are_normalized_to_none() {
        let raw = json!({ "jsonrpc": "2.0", "method": "exit", "params": null });
        let message = Message::from_value(raw).unwrap();
        assert_eq!(message.params(), None);
        let encoded = serde_json::to_value(&message).unwrap();
        assert!(encoded.get("params").is_none());
    }

    #[test]
    fn null_id_with_method_is_a_notification() {
        let raw = json!({ "jsonrpc": "2.0", "id": null, "method": "exit" });
        let message = Message::from_value(raw).unwrap();
        assert_eq!(message.kind(), MessageKind::Notification);
    }

    #[test]
    fn success_with_null_result_is_valid() {
        let raw = json!({ "jsonrpc": "2.0", "id": 1, "result": null });
        let message = Message::from_value(raw).unwrap();
        assert_eq!(message, Message::success(RequestId::Number(1), Value::Null));
        let encoded = serde_json::to_value(&message).unwrap();
        assert!(encoded.get("result").is_some_and(Value::is_null));
    }

    #[test]
    fn error_response_round_trip() {
        let message = Message::error(
            RequestId::String("abc".to_owned()),
            ErrorObject::new(ErrorObject::INVALID_PARAMS, "bad params")
                .with_data(json!({ "at": 2 })),
        );
        let encoded = serde_json::to_value(&message).unwrap();
        assert_eq!(encoded["id"], "abc");
        assert_eq!(encoded["error"]["code"], -32602);
        assert_eq!(message, Message::from_value(encoded).unwrap());
    }

    #[test]
    fn error_response_with_null_id_is_accepted() {
        let raw = json!({
            "jsonrpc": "2.0",
            "id": null,
            "error": { "code": -32700, "message": "parse error" }
        });
        let message = Message::from_value(raw).unwrap();
        assert_eq!(message.kind(), MessageKind::Response);
        assert_eq!(message.id(), None);
    }

    #[test]
    fn missing_response_id_is_rejected() {
        let raw = json!({ "jsonrpc": "2.0", "result": 1 });
        assert!(matches!(
            Message::from_value(raw),
            Err(MessageError::MissingResponseId)
        ));
    }

    #[test]
    fn mixed_request_and_response_is_rejected() {
        let raw = json!({ "jsonrpc": "2.0", "id": 1, "method": "x", "result": 1 });
        assert!(matches!(
            Message::from_value(raw),
            Err(MessageError::RequestWithResult)
        ));
    }

    #[test]
    fn response_without_result_or_error_is_rejected() {
        let raw = json!({ "jsonrpc": "2.0", "id": 1 });
        assert!(matches!(
            Message::from_value(raw),
            Err(MessageError::MissingResult)
        ));
    }

    #[test]
    fn unsupported_version_is_rejected() {
        let raw = json!({ "jsonrpc": "1.0", "id": 1, "result": 1 });
        assert!(matches!(
            Message::from_value(raw),
            Err(MessageError::UnsupportedVersion(version)) if version == "1.0"
        ));
    }

    #[test]
    fn non_integral_id_is_rejected() {
        let raw = json!({ "jsonrpc": "2.0", "id": 1.5, "method": "x" });
        assert!(matches!(
            Message::from_value(raw),
            Err(MessageError::InvalidId(_))
        ));
    }

    #[test]
    fn request_id_display_and_accessors() {
        assert_eq!(RequestId::Number(42).to_string(), "42");
        assert_eq!(RequestId::from("abc").to_string(), "abc");
        assert_eq!(RequestId::Number(42).as_number(), Some(42));
        assert_eq!(RequestId::from("abc").as_str(), Some("abc"));
    }
}
