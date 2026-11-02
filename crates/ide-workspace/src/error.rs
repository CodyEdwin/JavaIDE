//! Errors from workspace operations.
use std::path::PathBuf;
use thiserror::Error;

/// Errors from workspace operations.
#[derive(Debug, Error)]
pub enum WorkspaceError {
    /// The document is not open in the store.
    #[error("document not open: {uri}")]
    DocumentNotOpen {
        /// Document URI.
        uri: String,
    },
    /// The document version is stale.
    #[error("stale document version for {uri}: expected {expected}, got {got}")]
    StaleVersion {
        /// Document URI.
        uri: String,
        /// Expected version.
        expected: u64,
        /// Actual version.
        got: u64,
    },
    /// An I/O operation failed.
    #[error("I/O error at {path}: {source}")]
    Io {
        /// Path involved.
        path: PathBuf,
        /// Underlying error.
        #[source]
        source: std::io::Error,
    },
    /// The file watcher failed.
    #[error("watcher error: {0}")]
    Watcher(String),
}
