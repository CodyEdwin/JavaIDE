//! Domain error taxonomy.
//!
//! Every capability has its own error type so callers can match on specific
//! failure modes instead of string-matching error messages.

use std::fmt;

/// A domain-level error with a stable machine-readable code.
pub trait DomainError: fmt::Display + fmt::Debug + Send + Sync + 'static {
    /// Stable error code, for example `jdtls.initialize_timeout`.
    fn code(&self) -> &'static str;
}

/// Errors from the Java language service (jdtls).
#[derive(Debug, thiserror::Error)]
pub enum LanguageError {
    /// The server could not be started.
    #[error("language server failed to start: {0}")]
    Start(String),
    /// The initialize handshake failed.
    #[error("language server initialize failed: {0}")]
    Initialize(String),
    /// The server did not become ready within the deadline.
    #[error("language server not ready: {0}")]
    NotReady(String),
    /// A request timed out.
    #[error("language request timed out: {0}")]
    Timeout(String),
    /// The server returned a malformed response.
    #[error("invalid language response: {0}")]
    Protocol(String),
    /// The connection closed unexpectedly.
    #[error("language server connection closed")]
    Closed,
    /// The requested document is not open.
    #[error("document not open: {0}")]
    DocumentNotOpen(String),
}

impl DomainError for LanguageError {
    fn code(&self) -> &'static str {
        match self {
            LanguageError::Start(_) => "language.start",
            LanguageError::Initialize(_) => "language.initialize",
            LanguageError::NotReady(_) => "language.not_ready",
            LanguageError::Timeout(_) => "language.timeout",
            LanguageError::Protocol(_) => "language.protocol",
            LanguageError::Closed => "language.closed",
            LanguageError::DocumentNotOpen(_) => "language.document_not_open",
        }
    }
}

/// Errors from the build system (Gradle sidecar).
#[derive(Debug, thiserror::Error)]
pub enum BuildError {
    /// The sidecar could not be spawned.
    #[error("build system failed to start: {0}")]
    Start(String),
    /// A sync or task request timed out.
    #[error("build request timed out: {0}")]
    Timeout(String),
    /// The sidecar returned a protocol error.
    #[error("build protocol error: {0}")]
    Protocol(String),
    /// The build failed with one or more problems.
    #[error("build failed: {0}")]
    Failed(String),
    /// A task was cancelled.
    #[error("build cancelled")]
    Cancelled,
}

impl DomainError for BuildError {
    fn code(&self) -> &'static str {
        match self {
            BuildError::Start(_) => "build.start",
            BuildError::Timeout(_) => "build.timeout",
            BuildError::Protocol(_) => "build.protocol",
            BuildError::Failed(_) => "build.failed",
            BuildError::Cancelled => "build.cancelled",
        }
    }
}

/// Errors from the assistant service (OpenCode).
#[derive(Debug, thiserror::Error)]
pub enum AssistantError {
    /// The service could not be discovered or connected.
    #[error("assistant service unavailable: {0}")]
    Unavailable(String),
    /// A session could not be created.
    #[error("cannot create session: {0}")]
    Session(String),
    /// A prompt was rejected or the session is busy.
    #[error("prompt rejected: {0}")]
    Rejected(String),
    /// A permission request is pending.
    #[error("permission pending: {0}")]
    PermissionPending(String),
    /// The service returned an error.
    #[error("assistant protocol error: {0}")]
    Protocol(String),
}

impl DomainError for AssistantError {
    fn code(&self) -> &'static str {
        match self {
            AssistantError::Unavailable(_) => "assistant.unavailable",
            AssistantError::Session(_) => "assistant.session",
            AssistantError::Rejected(_) => "assistant.rejected",
            AssistantError::PermissionPending(_) => "assistant.permission_pending",
            AssistantError::Protocol(_) => "assistant.protocol",
        }
    }
}

/// Errors from the debug adapter.
#[derive(Debug, thiserror::Error)]
pub enum DebugError {
    /// The debug adapter could not be started.
    #[error("debug adapter failed to start: {0}")]
    Start(String),
    /// A debug operation timed out.
    #[error("debug operation timed out: {0}")]
    Timeout(String),
    /// The debug adapter returned a protocol error.
    #[error("debug protocol error: {0}")]
    Protocol(String),
    /// No debug session is active.
    #[error("no debug session")]
    NoSession,
}

impl DomainError for DebugError {
    fn code(&self) -> &'static str {
        match self {
            DebugError::Start(_) => "debug.start",
            DebugError::Timeout(_) => "debug.timeout",
            DebugError::Protocol(_) => "debug.protocol",
            DebugError::NoSession => "debug.no_session",
        }
    }
}
