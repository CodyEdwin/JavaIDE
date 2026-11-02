//! Text units: byte offsets and ranges.
//!
//! The canonical text model is UTF-8 byte offsets. LSP positions (line, UTF-16
//! character) live only at protocol boundaries and are converted through a
//! line index.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A byte offset into a UTF-8 document.
///
/// This is the canonical offset unit inside the IDE. Never pass this to LSP;
/// convert through a line index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ByteOffset(pub usize);

impl ByteOffset {
    /// Creates a byte offset.
    #[must_use]
    pub const fn new(offset: usize) -> Self {
        Self(offset)
    }

    /// Returns the offset as a `usize`.
    #[must_use]
    pub const fn get(self) -> usize {
        self.0
    }
}

/// A range in UTF-8 byte offsets, half-open: `start..end`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TextRange {
    /// Start offset, inclusive.
    pub start: ByteOffset,
    /// End offset, exclusive.
    pub end: ByteOffset,
}

impl TextRange {
    /// Creates a half-open range.
    #[must_use]
    pub const fn new(start: ByteOffset, end: ByteOffset) -> Self {
        Self { start, end }
    }

    /// Returns whether the range is empty (`start == end`).
    #[must_use]
    pub const fn is_empty(self) -> bool {
        self.start == self.end
    }

    /// Returns the length of the range in bytes.
    #[must_use]
    pub const fn len(self) -> usize {
        self.end.get() - self.start.get()
    }
}

/// A position in LSP's negotiated encoding (UTF-16 for jdtls).
///
/// Only protocol adapters and the line index should construct this type. The
/// domain never stores line/column positions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LspPosition {
    /// Zero-based line.
    pub line: u32,
    /// Zero-based UTF-16 code-unit offset within the line.
    pub character: u32,
}

impl LspPosition {
    /// Creates an LSP position.
    #[must_use]
    pub const fn new(line: u32, character: u32) -> Self {
        Self { line, character }
    }
}
