//! Core domain model: identities, text units, ports, and error taxonomy.
//!
//! # Boundary
//!
//! This crate owns the facts that every other part of the IDE references:
//! document/workspace/project IDs, text offsets and ranges, and the port traits
//! that adapters implement. It knows nothing about LSP, DAP, Gradle, OpenCode,
//! tokio, or any UI toolkit.
//!
//! # Invariants
//!
//! - [`ByteOffset`] is a UTF-8 byte offset into a document, never a line/column.
//! - [`TextRange`] is half-open in UTF-8 byte offsets.
//! - IDs are opaque newtypes; never expose the inner UUID outside this crate.
//! - Ports return domain types, never `serde_json::Value` or protocol structs.
//! - All methods are cancellation-safe; async work accepts a
//!   [`CancellationToken`] or returns a cancellable handle.
//!
//! # Cancellation
//!
//! [`CancellationToken`] is a simple flag. Callers drop it or set it to request
//! cancellation; adapters poll it or observe the drop of the returned future.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod error;
mod id;
mod port;
mod text;

pub use error::{
    AssistantError, BuildError, DebugError, DomainError, LanguageError,
};
pub use id::{
    AssistantSessionId, DocumentId, PermissionRequestId, ProjectId, TurnId,
    WorkspaceId,
};
pub use port::{
    AssistantService, BuildSystem, CancellationToken, IdeToolHost,
    LanguageService, FileEdits, SourceEdit, SourceLocation,
};
pub use text::{ByteOffset, LspPosition, TextRange};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_ids_are_opaque_and_unique() {
        let a = DocumentId::new();
        let b = DocumentId::new();
        assert_ne!(a, b);
        let _ = serde_json::to_value(a).expect("serializable");
    }

    #[test]
    fn workspace_ids_are_unique() {
        let a = WorkspaceId::new();
        let b = WorkspaceId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn project_ids_are_unique() {
        let a = ProjectId::new();
        let b = ProjectId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn text_range_is_half_open() {
        let range = TextRange::new(ByteOffset::new(0), ByteOffset::new(5));
        assert!(!range.is_empty());
        assert_eq!(range.len(), 5);
        let empty = TextRange::new(ByteOffset::new(3), ByteOffset::new(3));
        assert!(empty.is_empty());
        assert_eq!(empty.len(), 0);
    }

    #[test]
    fn lsp_position_round_trips() {
        let pos = LspPosition::new(3, 7);
        let json = serde_json::to_value(pos).expect("serialize");
        let back: LspPosition = serde_json::from_value(json).expect("deserialize");
        assert_eq!(back, pos);
    }

    #[test]
    fn cancellation_token_starts_not_cancelled() {
        let token = CancellationToken::new();
        assert!(!token.is_cancelled());
    }

    #[test]
    fn cancellation_token_propagates_to_clones() {
        let token = CancellationToken::new();
        let clone = token.clone();
        token.cancel();
        assert!(clone.is_cancelled());
        assert!(token.is_cancelled());
    }
}
