//! Document store: open documents, buffers, and versions.
//!
//! The store maps a document URI to its buffer and version. Versions increase
//! monotonically on every edit and guard against stale edits and diagnostics.

use std::collections::BTreeMap;

use ide_domain::DocumentId;
use ide_domain::TextRange;
use ide_domain::ByteOffset;
use ide_editor::EditorBuffer;

/// An entry in the document store.
#[derive(Debug, Clone)]
pub struct DocumentEntry {
    /// Document ID.
    pub id: DocumentId,
    /// Document URI.
    pub uri: String,
    /// The buffer.
    pub buffer: EditorBuffer,
    /// Current buffer version.
    pub version: ide_editor::BufferVersion,
    /// Whether the document has unsaved changes.
    pub dirty: bool,
    /// The language ID (e.g. "java").
    pub language_id: String,
}

impl DocumentEntry {
    /// Creates a new document entry.
    #[must_use]
    pub fn new(id: DocumentId, uri: String, text: String, language_id: String) -> Self {
        let buffer = EditorBuffer::with_text(&text);
        let version = buffer.version();
        Self {
            id,
            uri,
            buffer,
            version,
            dirty: false,
            language_id,
        }
    }

    /// Returns the document text.
    #[must_use]
    pub fn text(&self) -> String {
        self.buffer.text()
    }

    /// Applies an edit to the document.
    ///
    /// # Errors
    ///
    /// Returns [`crate::WorkspaceError`] if the edit range is invalid.
    pub fn apply_edit(
        &mut self,
        edit: ide_editor::BufferEdit,
    ) -> Result<ide_editor::BufferVersion, crate::WorkspaceError> {
        let version = self
            .buffer
            .apply(edit)
            .map_err(|e| crate::WorkspaceError::Io {
                path: std::path::PathBuf::from(&self.uri),
                source: std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()),
            })?;
        self.version = version;
        self.dirty = true;
        Ok(version)
    }

    /// Marks the document as saved (clean).
    pub fn mark_saved(&mut self) {
        self.dirty = false;
    }

    /// Returns whether the document is dirty.
    #[must_use]
    pub const fn is_dirty(&self) -> bool {
        self.dirty
    }
}

/// The document store: open documents keyed by URI.
pub struct DocumentStore {
    documents: BTreeMap<String, DocumentEntry>,
    next_id: u64,
}

impl DocumentStore {
    /// Creates an empty document store.
    #[must_use]
    pub fn new() -> Self {
        Self {
            documents: BTreeMap::new(),
            next_id: 0,
        }
    }

    /// Opens a document, creating a new entry if it doesn't exist.
    ///
    /// Returns the document entry and whether it was newly created.
    pub fn open_document(
        &mut self,
        uri: &str,
        text: &str,
        language_id: &str,
    ) -> (DocumentEntry, bool) {
        let id = DocumentId::new();
        if let Some(entry) = self.documents.get_mut(uri) {
            (entry.clone(), false)
        } else {
            let entry = DocumentEntry::new(id, uri.to_owned(), text.to_owned(), language_id.to_owned());
            self.documents.insert(uri.to_owned(), entry.clone());
            (entry, true)
        }
    }

    /// Closes a document, removing it from the store.
    pub fn close_document(&mut self, uri: &str) -> Option<DocumentEntry> {
        self.documents.remove(uri)
    }

    /// Returns the document entry for `uri`, if open.
    #[must_use]
    pub fn get(&self, uri: &str) -> Option<&DocumentEntry> {
        self.documents.get(uri)
    }

    /// Returns a mutable reference to the document entry for `uri`.
    pub fn get_mut(&mut self, uri: &str) -> Option<&mut DocumentEntry> {
        self.documents.get_mut(uri)
    }

    /// Returns all open document URIs.
    #[must_use]
    pub fn uris(&self) -> Vec<String> {
        self.documents.keys().cloned().collect()
    }

    /// Returns the number of open documents.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.documents.len()
    }

    /// Returns whether the store is empty.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.documents.is_empty()
    }

    /// Applies an edit to the document at `uri`.
    ///
    /// # Errors
    ///
    /// Returns [`WorkspaceError::DocumentNotOpen`] if the document is not open.
    pub fn apply_edit(
        &mut self,
        uri: &str,
        edit: ide_editor::BufferEdit,
    ) -> Result<ide_editor::BufferVersion, WorkspaceError> {
        let entry = self
            .documents
            .get_mut(uri)
            .ok_or_else(|| WorkspaceError::DocumentNotOpen {
                uri: uri.to_owned(),
            })?;
        entry.apply_edit(edit)
    }

    /// Marks the document at `uri` as saved.
    ///
    /// # Errors
    ///
    /// Returns [`WorkspaceError::DocumentNotOpen`] if the document is not open.
    pub fn mark_saved(&mut self, uri: &str) -> Result<(), WorkspaceError> {
        let entry = self
            .documents
            .get_mut(uri)
            .ok_or_else(|| WorkspaceError::DocumentNotOpen {
                uri: uri.to_owned(),
            })?;
        entry.mark_saved();
        Ok(())
    }
}

impl Default for DocumentStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_and_get_document() {
        let mut store = DocumentStore::new();
        let (entry, created) = store.open_document("file:///a.java", "class A {}", "java");
        assert!(created);
        assert_eq!(entry.uri, "file:///a.java");
        assert_eq!(entry.text(), "class A {}");
        assert_eq!(store.len(), 1);
        let (_, created2) = store.open_document("file:///a.java", "class A {}", "java");
        assert!(!created2);
        assert_eq!(store.len(), 1);
    }

    #[test]
    fn apply_edit_increments_version() {
        let mut store = DocumentStore::new();
        store.open_document("file:///a.java", "hello", "java");
        let v = store
            .apply_edit(
                "file:///a.java",
                ide_editor::BufferEdit {
                    range: TextRange::new(ByteOffset::new(0), ByteOffset::new(5)),
                    new_text: "world".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(v.get(), 2);
        let entry = store.get("file:///a.java").unwrap();
        assert_eq!(entry.text(), "world");
        assert!(entry.is_dirty());
    }

    #[test]
    fn close_document_removes() {
        let mut store = DocumentStore::new();
        store.open_document("file:///a.java", "hello", "java");
        assert_eq!(store.len(), 1);
        store.close_document("file:///a.java");
        assert_eq!(store.len(), 0);
        assert!(store.get("file:///a.java").is_none());
    }

    #[test]
    fn edit_unknown_document_errors() {
        let mut store = DocumentStore::new();
        let error = store.apply_edit(
            "file:///unknown.java",
            ide_editor::BufferEdit {
                range: TextRange::new(ByteOffset::new(0), ByteOffset::new(1)),
                new_text: "x".to_owned(),
            },
        );
        assert!(matches!(error, WorkspaceError::DocumentNotOpen { .. }));
    }
}
