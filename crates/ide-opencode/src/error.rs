//! Provenance errors for the OpenCode client.
//!
//! The variants are deliberately actionable: the UI can distinguish "OpenCode
//! is not running" from "the service is V1" from "the password is wrong"
//! without string matching. Response bodies are bounded before they are
//! embedded in an error so a hostile local service cannot exhaust memory.

use std::path::PathBuf;

/// Anything that can go wrong while discovering or talking to OpenCode.
#[derive(Debug, thiserror::Error)]
pub enum OpenCodeError {
    /// The platform home/config directory is not known.
    #[error("cannot locate the OpenCode state or configuration directory")]
    HomeUnavailable,
    /// The state registration file does not exist.
    #[error("OpenCode service is not running (no registration at {0})")]
    NotRunning(PathBuf),
    /// A registration or credentials file could not be read.
    #[error("cannot read {path}: {source}")]
    Read {
        /// File that could not be read.
        path: PathBuf,
        /// Underlying I/O error.
        #[source]
        source: std::io::Error,
    },
    /// A registration or credentials file was not valid JSON.
    #[error("invalid OpenCode file {path}: {source}")]
    InvalidFile {
        /// File that failed validation.
        path: PathBuf,
        /// JSON parse error.
        #[source]
        source: serde_json::Error,
    },
    /// The registered service URL is malformed or unsafe.
    #[error("invalid OpenCode service URL: {0}")]
    InvalidServiceUrl(String),
    /// The service reports a protocol version this client cannot speak.
    #[error("OpenCode {found} is not V2-compatible; version 2.x is required")]
    IncompatibleVersion {
        /// Version reported by the registration or `/api/info`.
        found: String,
    },
    /// The HTTP request failed below the API layer.
    #[error("OpenCode HTTP transport failed: {0}")]
    Transport(#[from] reqwest::Error),
    /// The service returned an error response.
    #[error("OpenCode returned HTTP {status}{tag}: {message}")]
    Http {
        /// Numeric status.
        status: u16,
        /// Optional OpenCode error tag (for example `UnauthorizedError`).
        tag: String,
        /// Bounded human-readable message.
        message: String,
    },
    /// Authentication is required or was rejected.
    #[error(
        "OpenCode authentication failed; check the service password in ~/.config/opencode/service.json"
    )]
    Unauthorized,
    /// The response body was not the expected JSON shape.
    #[error("invalid OpenCode response: {0}")]
    Json(#[from] serde_json::Error),
    /// A request argument was invalid before any HTTP call was made.
    #[error("invalid OpenCode request: {0}")]
    InvalidArgument(String),
    /// The WebSocket upgrade failed.
    #[error("OpenCode client-MCP WebSocket failed: {0}")]
    WebSocket(#[from] tokio_tungstenite::tungstenite::Error),
    /// An event stream frame or state was invalid.
    #[error("OpenCode event stream error: {0}")]
    EventStream(String),
    /// The server or socket closed while an operation was in progress.
    #[error("OpenCode connection closed")]
    Closed,
    /// The server sent a payload that does not match the V2 contract.
    #[error("OpenCode protocol error: {0}")]
    Protocol(String),
}
