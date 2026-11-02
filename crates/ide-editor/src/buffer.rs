//! The editor buffer: a rope-backed text store with undo/redo support.
//!
//! The rope is the source of truth. Every edit produces a new version, and the
//! line index is recomputed lazily on demand.

use std::ops::RangeBounds;

use ide_domain::{ByteOffset, TextRange};
use ropey::Rope;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// A version counter for the buffer.
///
/// Incremented on every edit. Used by LSP and the workspace actor to detect
/// stale diagnostics and edits.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct BufferVersion(pub u64);

impl BufferVersion {
    /// The initial version of a newly created buffer.
    #[must_use]
    pub const fn initial() -> Self {
        Self(1)
    }

    /// Returns the next version after this one.
    #[must_use]
    pub const fn next(self) -> Self {
        Self(self.0 + 1)
    }

    /// Returns the inner counter.
    #[must_use]
    pub const fn get(self) -> u64 {
        self.0
    }
}

/// An edit to apply to the buffer.
///
/// `range` is a half-open range of byte offsets. `new_text` replaces the range;
/// an empty `new_text` deletes the range.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BufferEdit {
    /// Range of bytes to replace.
    pub range: TextRange,
    /// Replacement text.
    pub new_text: String,
}

/// Errors from buffer operations.
#[derive(Debug, Error)]
pub enum EditorError {
    /// A byte offset is outside the document.
    #[error("byte offset {0} is outside the document (len {1})")]
    OffsetOutOfRange(usize, usize),
    /// A range is invalid (start > end).
    #[error("invalid range: start {0} after end {1}")]
    InvalidRange(usize, usize),
    /// The text is not valid UTF-8.
    #[error("text is not valid UTF-8")]
    InvalidUtf8,
    /// Tree-sitter failed to parse the document.
    #[error("syntax parse failed: {0}")]
    Parse(String),
}

/// An undoable edit entry.
#[derive(Debug, Clone)]
struct UndoEntry {
    /// The edit that was applied.
    edit: BufferEdit,
    /// The text that was replaced (for undo).
    old_text: String,
}

/// The editor buffer: rope text with version, line index, and undo history.
pub struct EditorBuffer {
    rope: Rope,
    version: BufferVersion,
    line_index: LineIndex,
    undo_stack: Vec<UndoEntry>,
    redo_stack: Vec<UndoEntry>,
    max_undo: usize,
}

impl EditorBuffer {
    /// Creates a new empty buffer.
    #[must_use]
    pub fn new() -> Self {
        Self {
            rope: Rope::new(),
            version: BufferVersion::initial(),
            line_index: LineIndex::new(""),
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_undo: 100,
        }
    }

    /// Creates a buffer with initial text.
    #[must_use]
    pub fn with_text(text: &str) -> Self {
        let rope = Rope::from_str(text);
        let line_index = LineIndex::new(text);
        Self {
            rope,
            version: BufferVersion::initial(),
            line_index,
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_undo: 100,
        }
    }

    /// Returns the current buffer version.
    #[must_use]
    pub const fn version(&self) -> BufferVersion {
        self.version
    }

    /// Returns the current text length in bytes.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.rope.len_bytes()
    }

    /// Returns whether the buffer is empty.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.rope.is_empty()
    }

    /// Returns a slice of the text for the given byte range.
    ///
    /// # Errors
    ///
    /// Returns [`EditorError::OffsetOutOfRange`] if either offset is out of
    /// range, or [`EditorError::InvalidRange`] if start > end.
    pub fn slice<R>(&self, range: R) -> Result<String, EditorError>
    where
        R: RangeBounds<usize>,
    {
        let start = match range.start_bound() {
            std::ops::Bound::Included(&b) => b,
            std::ops::Bound::Excluded(&b) => b + 1,
            std::ops::Bound::Unbounded => 0,
        };
        let end = match range.end_bound() {
            std::ops::Bound::Included(&b) => b + 1,
            std::ops::Bound::Excluded(&b) => b,
            std::ops::Bound::Unbounded => self.rope.len_bytes(),
        };
        if start > self.rope.len_bytes() {
            return Err(EditorError::OffsetOutOfRange(start, self.rope.len_bytes()));
        }
        if end > self.rope.len_bytes() {
            return Err(EditorError::OffsetOutOfRange(end, self.rope.len_bytes()));
        }
        if start > end {
            return Err(EditorError::InvalidRange(start, end));
        }
        Ok(self.rope.slice_bytes(start..end).to_string())
    }

    /// Returns the full text.
    #[must_use]
    pub fn text(&self) -> String {
        self.rope.to_string()
    }

    /// Applies an edit to the buffer.
    ///
    /// The edit is pushed onto the undo stack and the redo stack is cleared.
    /// The buffer version is incremented.
    ///
    /// # Errors
    ///
    /// Returns [`EditorError`] if the edit range is invalid or out of range.
    pub fn apply(&mut self, edit: BufferEdit) -> Result<BufferVersion, EditorError> {
        let start = edit.range.start.get();
        let end = edit.range.end.get();
        if start > self.rope.len_bytes() {
            return Err(EditorError::OffsetOutOfRange(start, self.rope.len_bytes()));
        }
        if end > self.rope.len_bytes() {
            return Err(EditorError::OffsetOutOfRange(end, self.rope.len_bytes()));
        }
        if start > end {
            return Err(EditorError::InvalidRange(start, end));
        }

        let old_text = self.slice(start..end)?;
        self.rope
            .edit_bytes(start..end, edit.new_text.as_str())
            .map_err(|_| EditorError::InvalidRange(start, end))?;
        self.version = self.version.next();

        self.undo_stack.push(UndoEntry {
            edit: BufferEdit {
                range: TextRange::new(ByteOffset::new(start), ByteOffset::new(start + edit.new_text.len())),
                new_text: old_text.clone(),
            },
            old_text,
        });
        if self.undo_stack.len() > self.max_undo {
            self.undo_stack.remove(0);
        }
        self.redo_stack.clear();

        self.line_index = LineIndex::new(&self.text());

        Ok(self.version)
    }

    /// Undoes the last edit.
    ///
    /// Returns the new buffer version, or `None` if there is nothing to undo.
    pub fn undo(&mut self) -> Option<BufferVersion> {
        let entry = self.undo_stack.pop()?;
        let edit = BufferEdit {
            range: TextRange::new(
                ByteOffset::new(entry.edit.range.start.get()),
                ByteOffset::new(entry.edit.range.start.get() + entry.edit.new_text.len()),
            ),
            new_text: entry.old_text.clone(),
        };
        self.apply(edit).ok()?;
        self.redo_stack.push(entry);
        Some(self.version)
    }

    /// Redoes the last undone edit.
    ///
    /// Returns the new buffer version, or `None` if there is nothing to redo.
    pub fn redo(&mut self) -> Option<BufferVersion> {
        let entry = self.redo_stack.pop()?;
        self.apply(entry.edit).ok()?;
        self.undo_stack.push(entry);
        Some(self.version)
    }

    /// Returns the line index for the current text.
    #[must_use]
    pub const fn line_index(&self) -> &LineIndex {
        &self.line_index
    }

    /// Sets the maximum number of undo entries.
    pub fn set_max_undo(&mut self, max: usize) {
        self.max_undo = max;
        while self.undo_stack.len() > max {
            self.undo_stack.remove(0);
        }
    }
}

impl Default for EditorBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn buffer_starts_empty() {
        let buf = EditorBuffer::new();
        assert!(buf.is_empty());
        assert_eq!(buf.len(), 0);
        assert_eq!(buf.version(), BufferVersion::initial());
    }

    #[test]
    fn apply_edit_increments_version() {
        let mut buf = EditorBuffer::with_text("hello world");
        let v = buf
            .apply(BufferEdit {
                range: TextRange::new(ByteOffset::new(0), ByteOffset::new(5)),
                new_text: "goodbye".to_owned(),
            })
            .unwrap();
        assert_eq!(v.get(), 2);
        assert_eq!(buf.text(), "goodbye world");
    }

    #[test]
    fn undo_redo() {
        let mut buf = EditorBuffer::with_text("hello");
        buf.apply(BufferEdit {
            range: TextRange::new(ByteOffset::new(0), ByteOffset::new(5)),
            new_text: "world".to_owned(),
        })
        .unwrap();
        assert_eq!(buf.text(), "world");
        buf.undo();
        assert_eq!(buf.text(), "hello");
        buf.redo();
        assert_eq!(buf.text(), "world");
    }

    #[test]
    fn slice_range() {
        let buf = EditorBuffer::with_text("abc\ndef\nghi");
        assert_eq!(buf.slice(0..3).unwrap(), "abc");
        assert_eq!(buf.slice(4..7).unwrap(), "def");
    }

    #[test]
    fn rejects_out_of_range_offsets() {
        let buf = EditorBuffer::with_text("hi");
        assert!(buf.slice(0..5).is_err());
        assert!(buf.slice(5..6).is_err());
    }

    #[test]
    fn version_next_increments() {
        assert_eq!(BufferVersion::initial().next().get(), 2);
        assert_eq!(BufferVersion::initial().get(), 1);
    }
}
