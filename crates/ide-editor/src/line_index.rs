//! Line index: converts between UTF-8 byte offsets and (line, UTF-16 character)
//! positions.
//!
//! LSP positions are UTF-16 code units. This index maps them to/from the
//! buffer's canonical UTF-8 byte offsets.

use ide_domain::{ByteOffset, LspPosition, TextRange};

/// A line and UTF-16 character position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct LineColumn {
    /// Zero-based line.
    pub line: usize,
    /// Zero-based UTF-16 code-unit offset within the line.
    pub character: usize,
}

/// Cached mapping from byte offsets to (line, UTF-16 character) positions.
///
/// Stores the document text so UTF-16 character offsets can be computed.
/// Recomputed on every buffer change.
pub struct LineIndex {
    text: String,
    /// Cumulative byte offset of the start of each line (including the
    /// newline terminator).
    line_starts: Vec<usize>,
}

impl LineIndex {
    /// Builds a line index from text.
    #[must_use]
    pub fn new(text: &str) -> Self {
        let mut line_starts = vec![0usize];
        for (i, byte) in text.bytes().enumerate() {
            if byte == b'\n' {
                line_starts.push(i + 1);
            }
        }
        Self {
            text: text.to_owned(),
            line_starts,
        }
    }

    /// Returns the number of lines.
    #[must_use]
    pub const fn line_count(&self) -> usize {
        self.line_starts.len()
    }

    /// Converts a UTF-8 byte offset to a (line, UTF-16 character) position.
    ///
    /// Returns `None` if the offset is outside the document.
    #[must_use]
    pub fn offset_to_position(&self, offset: ByteOffset) -> Option<LineColumn> {
        let offset = offset.get();
        if offset > self.text.len() {
            return None;
        }
        let line = self.line_starts.partition_point(|&start| start <= offset).saturating_sub(1);
        let line_start = self.line_starts[line];
        let line_end = self
            .line_starts
            .get(line + 1)
            .copied()
            .unwrap_or(self.text.len());
        let line_text = &self.text[line_start..line_end];
        // Strip trailing newline from line text for character counting.
        let line_content = line_text.strip_suffix('\n').unwrap_or(line_text);
        let character = line_content[..offset - line_start]
            .chars()
            .map(|c| c.len_utf16())
            .sum::<usize>();
        Some(LineColumn { line, character })
    }

    /// Converts a (line, UTF-16 character) position to a UTF-8 byte offset.
    ///
    /// Returns `None` if the line or character is outside the document, or if
    /// the character splits a surrogate pair.
    #[must_use]
    pub fn position_to_offset(&self, position: LspPosition) -> Option<ByteOffset> {
        let line = position.line as usize;
        if line >= self.line_starts.len() {
            return None;
        }
        let line_start = self.line_starts[line];
        let line_end = self
            .line_starts
            .get(line + 1)
            .copied()
            .unwrap_or(self.text.len());
        let line_text = &self.text[line_start..line_end];
        let line_content = line_text.strip_suffix('\n').unwrap_or(line_text);
        let mut utf16 = 0usize;
        let mut byte_offset = 0usize;
        for c in line_content.chars() {
            if utf16 == position.character as usize {
                return Some(ByteOffset::new(line_start + byte_offset));
            }
            let next = utf16 + c.len_utf16();
            if next > position.character as usize {
                return None; // splits a surrogate pair
            }
            utf16 = next;
            byte_offset += c.len_utf8();
        }
        if utf16 == position.character as usize {
            Some(ByteOffset::new(line_start + byte_offset))
        } else {
            None
        }
    }

    /// Converts a byte range to a (line, character) range.
    #[must_use]
    pub fn range_to_positions(&self, range: ide_domain::TextRange) -> Option<(LineColumn, LineColumn)> {
        let start = self.offset_to_position(range.start)?;
        let end = self.offset_to_position(range.end)?;
        Some((start, end))
    }

    /// Returns the text of a line (without the trailing newline).
    #[must_use]
    pub fn line_text(&self, line: usize) -> Option<&str> {
        if line >= self.line_starts.len() {
            return None;
        }
        let start = self.line_starts[line];
        let end = self.line_starts.get(line + 1).copied().unwrap_or(self.text.len());
        let line_text = &self.text[start..end];
        Ok(line_text.strip_suffix('\n').unwrap_or(line_text))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_count_and_starts() {
        let index = LineIndex::new("a\nbc\ndef");
        assert_eq!(index.line_count(), 3);
        assert_eq!(
            index.offset_to_position(ByteOffset::new(0)).unwrap(),
            LineColumn { line: 0, character: 0 }
        );
        assert_eq!(
            index.offset_to_position(ByteOffset::new(2)).unwrap(),
            LineColumn { line: 1, character: 0 }
        );
        assert_eq!(
            index.offset_to_position(ByteOffset::new(5)).unwrap(),
            LineColumn { line: 2, character: 0 }
        );
    }

    #[test]
    fn position_to_offset_round_trip_ascii() {
        let index = LineIndex::new("hello\nworld");
        let lsp = LspPosition { line: 1, character: 3 };
        let offset = index.position_to_offset(lsp).unwrap();
        let back = index.offset_to_position(offset).unwrap();
        assert_eq!(back.line, 1);
        assert_eq!(back.character, 3);
    }

    #[test]
    fn rejects_out_of_range_line() {
        let index = LineIndex::new("a\nb");
        let lsp = LspPosition { line: 5, character: 0 };
        assert!(index.position_to_offset(lsp).is_none());
    }

    #[test]
    fn crlf_excludes_carriage_return() {
        let index = LineIndex::new("a\r\nbc");
        // Offset 0 is 'a', offset 1 is '\r'. Character 1 should be at offset 1 ('\r' counts as one UTF-16 unit).
        let pos = index.offset_to_position(ByteOffset::new(1)).unwrap();
        assert_eq!(pos.line, 0);
        assert_eq!(pos.character, 1);
        // Position (1, 0) is start of line 2, offset 3.
        let lsp = LspPosition { line: 1, character: 0 };
        let offset = index.position_to_offset(lsp).unwrap();
        assert_eq!(offset.get(), 3);
    }

    #[test]
    fn non_bmp_character_offsets() {
        let index = LineIndex::new("a😀b");
        // 'a' is 1 UTF-16 unit, '😀' is 2 UTF-16 units.
        let pos = index.offset_to_position(ByteOffset::new(1)).unwrap();
        assert_eq!(pos.character, 1);
        // Character 2 is the start of '😀' (2 UTF-16 units in), offset 4 (after 'a' + 3 bytes of emoji).
        let lsp = LspPosition { line: 0, character: 3 };
        let offset = index.position_to_offset(lsp).unwrap();
        assert_eq!(offset.get(), 4);
        // Character 2 splits the surrogate pair.
        let lsp = LspPosition { line: 0, character: 2 };
        assert!(index.position_to_offset(lsp).is_none());
    }
}
