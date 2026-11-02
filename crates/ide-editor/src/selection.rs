//! Text selections: cursors and ranges.
//!
//! Supports single and multi-cursor selections. Selections are clamped to
//! valid byte offsets in the buffer.

use ide_domain::{ByteOffset, TextRange};
use serde::{Deserialize, Serialize};

/// A single text selection: a range plus an active cursor position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Selection {
    /// The selected range (half-open byte offsets).
    pub range: TextRange,
    /// The active cursor position (where the cursor is rendered).
    pub cursor: ByteOffset,
}

impl Selection {
    /// Creates a caret (collapsed selection) at `offset`.
    #[must_use]
    pub fn caret(offset: ByteOffset) -> Self {
        Self {
            range: TextRange::new(offset, offset),
            cursor: offset,
        }
    }

    /// Creates a selection from `start` to `end`, with the cursor at `end`.
    #[must_use]
    pub fn new(start: ByteOffset, end: ByteOffset) -> Self {
        let (start, end) = if start <= end { (start, end) } else { (end, start) };
        Self {
            range: TextRange::new(start, end),
            cursor: end,
        }
    }

    /// Returns whether the selection is empty (caret only).
    #[must_use]
    pub const fn is_empty(self) -> bool {
        self.range.is_empty()
    }

    /// Returns whether `offset` is inside the selection range.
    #[must_use]
    pub fn contains(self, offset: ByteOffset) -> bool {
        offset.get() >= self.range.start.get() && offset.get() <= self.range.end.get()
    }

    /// Shifts the selection by `delta` bytes.
    #[must_use]
    pub const fn shifted(self, delta: i64) -> Self {
        let start = self.range.start.get() as i64 + delta;
        let end = self.range.end.get() as i64 + delta;
        let cursor = self.cursor.get() as i64 + delta;
        Self {
            range: TextRange::new(
                ByteOffset::new(start.max(0) as usize),
                ByteOffset::new(end.max(0) as usize),
            ),
            cursor: ByteOffset::new(cursor.max(0) as usize),
        }
    }
}

impl Default for Selection {
    fn default() -> Self {
        Self::caret(ByteOffset::new(0))
    }
}

/// A set of selections for multi-cursor editing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SelectionSet {
    selections: Vec<Selection>,
    active: usize,
}

impl SelectionSet {
    /// Creates a selection set with a single caret.
    #[must_use]
    pub fn single(offset: ByteOffset) -> Self {
        Self {
            selections: vec![Selection::caret(offset)],
            active: 0,
        }
    }

    /// Returns the number of selections.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.selections.len()
    }

    /// Returns whether the set is empty.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.selections.is_empty()
    }

    /// Returns the active selection.
    #[must_use]
    pub const fn active(&self) -> &Selection {
        &self.selections[self.active]
    }

    /// Returns all selections.
    #[must_use]
    pub const fn all(&self) -> &[Selection] {
        &self.selections
    }

    /// Adds a selection, making it active.
    pub fn add(&mut self, selection: Selection) {
        self.active = self.selections.len();
        self.selections.push(selection);
    }

    /// Sets the active selection index.
    ///
    /// Returns `false` if the index is out of range.
    pub fn set_active(&mut self, index: usize) -> bool {
        if index < self.selections.len() {
            self.active = index;
            true
        } else {
            false
        }
    }

    /// Removes the active selection.
    pub fn remove_active(&mut self) -> Option<Selection> {
        if self.selections.is_empty() {
            return None;
        }
        let removed = self.selections.remove(self.active);
        if self.active >= self.selections.len() && !self.selections.is_empty() {
            self.active = self.selections.len() - 1;
        }
        Some(removed)
    }

    /// Replaces all selections with a single caret.
    pub fn collapse_to_caret(&mut self, offset: ByteOffset) {
        self.selections = vec![Selection::caret(offset)];
        self.active = 0;
    }
}

impl Default for SelectionSet {
    fn default() -> Self {
        Self::single(ByteOffset::new(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caret_is_empty() {
        let sel = Selection::caret(ByteOffset::new(5));
        assert!(sel.is_empty());
        assert_eq!(sel.cursor.get(), 5);
    }

    #[test]
    fn selection_range_normalized() {
        let sel = Selection::new(ByteOffset::new(10), ByteOffset::new(5));
        assert_eq!(sel.range.start.get(), 5);
        assert_eq!(sel.range.end.get(), 10);
    }

    #[test]
    fn selection_set_add_and_active() {
        let mut set = SelectionSet::single(ByteOffset::new(0));
        set.add(Selection::new(ByteOffset::new(5), ByteOffset::new(10)));
        assert_eq!(set.len(), 2);
        assert_eq!(set.active().cursor.get(), 10);
        assert!(set.set_active(0));
        assert_eq!(set.active().cursor.get(), 0);
        assert!(!set.set_active(5));
    }

    #[test]
    fn collapse_to_caret() {
        let mut set = SelectionSet::single(ByteOffset::new(0));
        set.add(Selection::new(ByteOffset::new(5), ByteOffset::new(10)));
        set.collapse_to_caret(ByteOffset::new(3));
        assert_eq!(set.len(), 1);
        assert_eq!(set.active().cursor.get(), 3);
    }
}
