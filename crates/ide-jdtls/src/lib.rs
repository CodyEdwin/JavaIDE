//! Eclipse JDT Language Server adapter.
//!
//! # Boundary
//!
//! This crate owns:
//!
//! - locating and launching a pinned jdtls distribution;
//! - the LSP `initialize`/`initialized` handshake and document lifecycle;
//! - translating server requests that the IDE must answer
//!   (`workspace/configuration`, `workspace/applyEdit`, capability
//!   registration);
//! - publishing diagnostics and status events;
//! - applying workspace edits from jdtls with UTF-16 → UTF-8 conversion.
//!
//! It does **not** own Gradle tasks, test execution, debugging, or editor
//! buffers. Java semantics belong to jdtls (ADR 0003); build and runtime
//! concerns belong to the Gradle sidecar (ADR 0002).
//!
//! # Invariants
//!
//! - jdtls is a child process with piped stdio; protocol bytes never mix with
//!   logs.
//! - Server requests are always answered (including unknown methods) so jdtls
//!   never hangs waiting on the client.
//! - Diagnostics are cached so a late subscriber can still observe the latest
//!   publication.
//! - Workspace edits are restricted to the workspace root.
//!
//! # Cancellation and shutdown
//!
//! Dropping [`JdtlsClient`] signals the process monitor to kill jdtls. Call
//! [`JdtlsClient::shutdown`] for a protocol-level `shutdown`/`exit` first. The
//! reader task is aborted when the last peer handle is dropped.
//!
//! # Errors
//!
//! [`JdtlsError`] is a typed, non-retryable taxonomy except for explicit
//! restart. Launch failures report the missing path or Java version; protocol
//! failures preserve the underlying JSON-RPC error.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod client;
mod config;
mod features;
mod intelligence;
mod provision;
mod surface;
mod text;

use std::path::PathBuf;

pub use client::{JdtlsClient, JdtlsEvent};
pub use config::{
    JDTLS_MIN_JAVA, JdtlsConfig, JdtlsInstallation, file_uri, is_launcher_jar, java_executable,
    parse_java_major, uri_to_path,
};
pub use features::{
    CompletionCandidate, DocumentDiagnostics, HoverInfo, JavaDiagnostic, MAX_COMPLETION_CANDIDATES,
    SourceLocation, SourcePosition, SourceRange, SourceTextEdit,
};
pub use intelligence::{
    FileEdits, JavaCodeAction, JavaSignature, JavaSymbol, PrepareRename, SignatureParameter,
};
pub use provision::{
    PINNED_JDK_SHA256, PINNED_JDK_VERSION, PINNED_JDTLS_SHA256, PINNED_JDTLS_VERSION, ensure_jdk,
    ensure_jdtls,
};
pub use surface::{CodeLensView, FoldRange, HierarchyNode, InlayHintView, SemanticToken};
pub use text::{WorkspaceEditOutcome, apply_text_edits, apply_workspace_edit, position_to_offset};

/// Errors from provisioning, launching, or talking to jdtls.
#[derive(Debug, thiserror::Error)]
pub enum JdtlsError {
    /// The distribution layout is not understood.
    #[error("jdtls installation error: {0}")]
    Installation(String),
    /// A required file is missing.
    #[error("missing file: {0}")]
    MissingFile(PathBuf),
    /// A required directory is missing.
    #[error("missing directory: {0}")]
    MissingDirectory(PathBuf),
    /// The Java runtime is missing.
    #[error("Java runtime is missing: {0}")]
    JavaMissing(PathBuf),
    /// The Java version is below the pinned jdtls build's minimum.
    #[error("Java {found} is too old for this jdtls build; JDK 25 or newer is required")]
    JavaTooOld {
        /// Detected major version.
        found: u32,
    },
    /// `java -version` did not contain a parseable version.
    #[error("could not determine the Java version from: {0}")]
    JavaVersionUnknown(String),
    /// A filesystem operation failed at a specific path.
    #[error("I/O error at {path}: {source}")]
    PathIo {
        /// Path involved in the operation.
        path: PathBuf,
        /// Underlying error.
        #[source]
        source: std::io::Error,
    },
    /// The process could not be started.
    #[error("failed to start jdtls: {0}")]
    Spawn(#[source] std::io::Error),
    /// JSON-RPC transport failure.
    #[error("JSON-RPC transport error: {0}")]
    Rpc(#[from] ide_jsonrpc::RpcPeerError),
    /// JSON serialization or deserialization failure.
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    /// The payload was valid JSON but not a valid LSP shape.
    #[error("invalid LSP payload: {0}")]
    Protocol(String),
    /// The connection closed unexpectedly.
    #[error("jdtls connection closed")]
    Closed,
    /// The process exited.
    #[error("jdtls exited (status {status:?})")]
    Exited {
        /// Exit status, or `None` if it could not be collected.
        status: Option<std::process::ExitStatus>,
    },
    /// A deadline expired.
    #[error("timed out waiting for {0}")]
    Timeout(String),
    /// A URI could not be converted.
    #[error("invalid URI: {0}")]
    Uri(String),
    /// A workspace edit was invalid or unsupported.
    #[error("workspace edit failed: {0}")]
    WorkspaceEdit(String),
    /// The jdtls archive could not be downloaded.
    #[error("jdtls download failed: {0}")]
    Download(String),
    /// The downloaded archive did not match the pinned checksum.
    #[error("jdtls archive checksum mismatch: expected {expected}, got {actual}")]
    Checksum {
        /// Expected SHA-256 hex digest.
        expected: String,
        /// Digest of the downloaded bytes.
        actual: String,
    },
    /// Generic I/O failure.
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}
