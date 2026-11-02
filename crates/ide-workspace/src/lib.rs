//! Workspace document store, file tree, and watcher.
//!
//! # Boundary
//!
//! This crate owns the document store (buffers + versions), the file tree
//! index, and file-system change detection. It does not know about LSP,
//! Gradle, or UI.
//!
//! # Invariants
//!
//! - Every open document has a URI, a buffer, and a monotonically increasing
//!   version.
//! - Document versions guard against stale edits and diagnostics.
//! - Writes are atomic (temp file + fsync + rename).
//! - Watcher events are coalesced; callers should debounce.
//!
//! # Errors
//!
//! [`WorkspaceError`] covers missing documents, out-of-range versions, I/O
//! failures, and watcher errors.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod document_store;
mod error;
mod file_tree;

pub use document_store::{DocumentStore, DocumentEntry};
pub use error::WorkspaceError;
pub use file_tree::FileTree;
