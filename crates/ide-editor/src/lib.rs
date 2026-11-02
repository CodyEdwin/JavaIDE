//! Editor text model: rope buffer, line index, selections, and syntax.
//!
//! # Boundary
//!
//! This crate owns the in-memory text model used by editors. It knows nothing
//! about LSP, the UI, or any protocol. Positions are UTF-8 byte offsets
//! ([`ByteOffset`] from [`ide_domain`]); LSP UTF-16 positions are converted
//! through the line index at protocol boundaries.
//!
//! # Invariants
//!
//! - The rope is the source of truth for document text.
//! - The line index is recomputed on every content change.
//! - Selections are clamped to valid byte offsets.
//! - The tree-sitter tree is kept in sync with the rope via incremental edits.
//!
//! # Cancellation
//!
//! All operations are synchronous and bounded; no async work.
//!
//! # Errors
//!
//! [`EditorError`] covers out-of-range positions, invalid UTF-8, and tree-sitter
//! parse failures.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod buffer;
mod line_index;
mod selection;
mod syntax;

pub use buffer::{EditorBuffer, EditorError, BufferVersion};
pub use line_index::{LineIndex, LineColumn};
pub use selection::{Selection, SelectionSet};
pub use syntax::{SyntaxTree, SyntaxNode};
