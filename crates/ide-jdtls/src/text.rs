//! Workspace-edit application with UTF-16 → UTF-8 conversion.
//!
//! jdtls sends positions in UTF-16 code units. The canonical text model in this
//! workspace is UTF-8 bytes (ADR 0006), so every edit is converted at this
//! boundary. Phase 0 supports plain `changes` edits; `documentChanges` and
//! resource operations are rejected instead of partially applied.
//!
//! Writes are atomic per file: content is prepared for every file first, then
//! each file is replaced through a temporary file in the same directory. A
//! multi-file edit is not yet transactional across files; that is a Phase 2
//! requirement and is documented rather than hidden.

use std::collections::BTreeMap;
use std::io::Write;
use std::path::{Path, PathBuf};

use lsp_types::{Position, TextEdit, WorkspaceEdit};

use crate::JdtlsError;
use crate::config::uri_to_path;

/// Result of applying a workspace edit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WorkspaceEditOutcome {
    /// Number of files whose contents changed.
    pub files_changed: usize,
    /// Number of text edits applied.
    pub edits_applied: usize,
}

/// Applies an LSP workspace edit restricted to `workspace_root`.
///
/// # Rules
///
/// - only `changes` edits are supported;
/// - every target must resolve inside `workspace_root`;
/// - files must exist and be valid UTF-8;
/// - overlapping edits in one file are rejected;
/// - files are written atomically, preserving permissions where possible.
///
/// # Errors
///
/// Returns [`JdtlsError::WorkspaceEdit`] for unsupported edit shapes, invalid
/// positions, overlaps, or paths outside the workspace.
pub fn apply_workspace_edit(
    workspace_root: &Path,
    edit: &WorkspaceEdit,
) -> Result<WorkspaceEditOutcome, JdtlsError> {
    if edit.document_changes.is_some() {
        return Err(JdtlsError::WorkspaceEdit(
            "documentChanges edits are not supported in Phase 0".to_owned(),
        ));
    }
    // `Uri` caches its parsed form in a `Cell`. Hash and equality ignore that
    // cache, so holding the server's change map is sound.
    #[allow(clippy::mutable_key_type)]
    let changes = edit.changes.as_ref().ok_or_else(|| {
        JdtlsError::WorkspaceEdit("workspace edit contains no changes".to_owned())
    })?;

    let root = workspace_root
        .canonicalize()
        .map_err(|error| JdtlsError::PathIo {
            path: workspace_root.to_path_buf(),
            source: error,
        })?;

    let mut updates: BTreeMap<PathBuf, (String, usize)> = BTreeMap::new();
    for (uri, edits) in changes {
        let path = uri_to_path(uri)?;
        let canonical = path.canonicalize().map_err(|error| JdtlsError::PathIo {
            path: path.clone(),
            source: error,
        })?;
        if !canonical.starts_with(&root) {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "refusing to edit outside the workspace: {}",
                canonical.display()
            )));
        }
        if updates.contains_key(&canonical) {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "workspace edit targets the same file twice: {}",
                canonical.display()
            )));
        }

        let bytes = std::fs::read(&canonical).map_err(|error| JdtlsError::PathIo {
            path: canonical.clone(),
            source: error,
        })?;
        let text = String::from_utf8(bytes).map_err(|_| {
            JdtlsError::WorkspaceEdit(format!("{} is not valid UTF-8", canonical.display()))
        })?;
        let updated = apply_text_edits(&text, edits)?;
        if updated != text {
            updates.insert(canonical, (updated, edits.len()));
        }
    }

    let mut edits_applied = 0usize;
    for (path, (content, count)) in &updates {
        write_atomic(path, content)?;
        edits_applied += count;
    }

    Ok(WorkspaceEditOutcome {
        files_changed: updates.len(),
        edits_applied,
    })
}

/// Applies LSP text edits to a string.
///
/// Edits may be supplied in any order. They are sorted, checked for overlap,
/// and applied from the end of the document so earlier offsets stay valid.
///
/// # Errors
///
/// Returns [`JdtlsError::WorkspaceEdit`] when a position is out of range, splits
/// a surrogate pair, or overlaps another edit.
pub fn apply_text_edits(text: &str, edits: &[TextEdit]) -> Result<String, JdtlsError> {
    let mut ranges = Vec::with_capacity(edits.len());
    for edit in edits {
        let start = position_to_offset(text, edit.range.start)?;
        let end = position_to_offset(text, edit.range.end)?;
        if start > end {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "edit range has start {start} after end {end}"
            )));
        }
        ranges.push((start, end, edit.new_text.as_str()));
    }
    ranges.sort_by_key(|(start, end, _)| (*start, *end));

    let mut previous_end = 0usize;
    for (index, (start, end, _)) in ranges.iter().enumerate() {
        if index > 0 && *start < previous_end {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "overlapping text edits at byte {start}"
            )));
        }
        previous_end = *end;
    }

    let mut result = text.to_owned();
    for (start, end, new_text) in ranges.iter().rev() {
        result.replace_range(*start..*end, new_text);
    }
    Ok(result)
}

/// Converts an LSP position (zero-based line, UTF-16 character) to a UTF-8 byte
/// offset.
///
/// # Errors
///
/// Returns [`JdtlsError::WorkspaceEdit`] when the line or character is out of
/// range, or the character splits a surrogate pair.
pub fn position_to_offset(text: &str, position: Position) -> Result<usize, JdtlsError> {
    let line = usize::try_from(position.line)
        .map_err(|_| JdtlsError::WorkspaceEdit("line does not fit usize".to_owned()))?;
    let character = position.character;

    let mut current_line = 0usize;
    let mut line_start = 0usize;
    if line > 0 {
        for (index, byte) in text.bytes().enumerate() {
            if byte == b'\n' {
                current_line += 1;
                line_start = index + 1;
                if current_line == line {
                    break;
                }
            }
        }
    }
    if current_line != line {
        return Err(JdtlsError::WorkspaceEdit(format!(
            "line {} is outside the document",
            position.line
        )));
    }

    let line_end = text[line_start..]
        .find('\n')
        .map_or(text.len(), |offset| line_start + offset);
    // `\r` belongs to the line terminator, not to the line's characters.
    let content_end = if line_end > line_start && text.as_bytes()[line_end - 1] == b'\r' {
        line_end - 1
    } else {
        line_end
    };

    let mut utf16 = 0u32;
    for (offset, symbol) in text[line_start..content_end].char_indices() {
        if utf16 == character {
            return Ok(line_start + offset);
        }
        let next = utf16 + symbol.len_utf16() as u32;
        if next > character {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "position line {} character {} splits a surrogate pair",
                position.line, character
            )));
        }
        utf16 = next;
    }
    if utf16 == character {
        Ok(content_end)
    } else {
        Err(JdtlsError::WorkspaceEdit(format!(
            "character {} is outside line {}",
            character, position.line
        )))
    }
}

fn write_atomic(path: &Path, content: &str) -> Result<(), JdtlsError> {
    let parent = path.parent().ok_or_else(|| {
        JdtlsError::WorkspaceEdit(format!("{} has no parent directory", path.display()))
    })?;
    let mut temporary =
        tempfile::NamedTempFile::new_in(parent).map_err(|error| JdtlsError::PathIo {
            path: parent.to_path_buf(),
            source: error,
        })?;
    if let Ok(metadata) = std::fs::metadata(path) {
        temporary
            .as_file()
            .set_permissions(metadata.permissions())
            .map_err(|error| JdtlsError::PathIo {
                path: path.to_path_buf(),
                source: error,
            })?;
    }
    temporary
        .write_all(content.as_bytes())
        .map_err(|error| JdtlsError::PathIo {
            path: path.to_path_buf(),
            source: error,
        })?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|error| JdtlsError::PathIo {
            path: path.to_path_buf(),
            source: error,
        })?;
    // `persist` replaces the destination on Unix. On Windows it fails if the
    // destination exists; a platform-specific replace path is a Phase 2 item.
    temporary
        .persist(path)
        .map_err(|error| JdtlsError::PathIo {
            path: path.to_path_buf(),
            source: error.error,
        })?;

    // Best-effort directory fsync so the rename survives a crash on Unix.
    #[cfg(unix)]
    if let Ok(directory) = std::fs::File::open(parent) {
        let _ = directory.sync_all();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use lsp_types::Range;

    use super::*;

    fn position(line: u32, character: u32) -> Position {
        Position { line, character }
    }

    fn edit(start: (u32, u32), end: (u32, u32), text: &str) -> TextEdit {
        TextEdit {
            range: Range {
                start: position(start.0, start.1),
                end: position(end.0, end.1),
            },
            new_text: text.to_owned(),
        }
    }

    #[test]
    fn converts_ascii_positions() {
        let text = "abc\ndefg\n";
        assert_eq!(position_to_offset(text, position(0, 0)).unwrap(), 0);
        assert_eq!(position_to_offset(text, position(0, 3)).unwrap(), 3);
        assert_eq!(position_to_offset(text, position(1, 0)).unwrap(), 4);
        assert_eq!(position_to_offset(text, position(1, 4)).unwrap(), 8);
        assert_eq!(position_to_offset(text, position(2, 0)).unwrap(), 9);
    }

    #[test]
    fn crlf_excludes_the_carriage_return() {
        let text = "a\r\nbc";
        assert_eq!(position_to_offset(text, position(0, 1)).unwrap(), 1);
        assert_eq!(position_to_offset(text, position(1, 0)).unwrap(), 3);
        assert_eq!(position_to_offset(text, position(1, 2)).unwrap(), 5);
        assert!(position_to_offset(text, position(0, 2)).is_err());
    }

    #[test]
    fn handles_non_bmp_characters() {
        let text = "a😀b";
        assert_eq!(position_to_offset(text, position(0, 1)).unwrap(), 1);
        // The emoji occupies two UTF-16 units.
        assert_eq!(position_to_offset(text, position(0, 3)).unwrap(), 5);
        assert!(position_to_offset(text, position(0, 2)).is_err());
    }

    #[test]
    fn handles_bmp_multibyte_characters() {
        let text = "äö";
        assert_eq!(position_to_offset(text, position(0, 1)).unwrap(), 2);
        assert_eq!(position_to_offset(text, position(0, 2)).unwrap(), 4);
    }

    #[test]
    fn applies_edits_in_any_order() {
        let text = "one two three";
        let edits = [
            edit((0, 8), (0, 13), "THREE"),
            edit((0, 0), (0, 3), "ONE"),
            edit((0, 4), (0, 7), "TWO"),
        ];
        assert_eq!(apply_text_edits(text, &edits).unwrap(), "ONE TWO THREE");
    }

    #[test]
    fn allows_adjacent_edits_but_rejects_overlap() {
        let text = "abc";
        assert_eq!(
            apply_text_edits(
                text,
                &[edit((0, 0), (0, 1), "x"), edit((0, 1), (0, 2), "y")]
            )
            .unwrap(),
            "xyc"
        );
        let error = apply_text_edits(
            text,
            &[edit((0, 0), (0, 2), "x"), edit((0, 1), (0, 3), "y")],
        )
        .unwrap_err();
        assert!(error.to_string().contains("overlapping"));
    }

    #[test]
    fn rejects_reversed_ranges() {
        let error = apply_text_edits("abc", &[edit((0, 2), (0, 1), "x")]).unwrap_err();
        assert!(error.to_string().contains("start"));
    }

    #[test]
    fn inserts_at_end_of_document() {
        let text = "abc";
        assert_eq!(
            apply_text_edits(text, &[edit((0, 3), (0, 3), "!")]).unwrap(),
            "abc!"
        );
    }
}
