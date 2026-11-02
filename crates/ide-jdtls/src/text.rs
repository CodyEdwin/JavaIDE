//! Workspace-edit application with UTF-16 → UTF-8 conversion.
//!
//! jdtls sends positions in UTF-16 code units. The canonical text model in this
//! workspace is UTF-8 bytes (ADR 0006), so every edit is converted at this
//! boundary. `changes` and versioned `documentChanges` are planned for the
//! editor. Resource operations are rejected instead of partially applied.
//!
//! The planner validates edits and returns them to the editor. It does not
//! write the workspace. A version on a `documentChanges` entry must match the
//! open buffer; a mismatch is rejected instead of being applied to newer text.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use lsp_types::{
    DocumentChangeOperation, DocumentChanges, OneOf, Position, TextDocumentEdit, TextEdit,
    WorkspaceEdit,
};

use crate::JdtlsError;
use crate::config::uri_to_path;
use crate::features::text_edits;
use crate::intelligence::FileEdits;

/// Result of applying a workspace edit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WorkspaceEditOutcome {
    /// Number of files whose contents changed.
    pub files_changed: usize,
    /// Number of text edits applied.
    pub edits_applied: usize,
}

/// Validates a workspace edit and returns per-file buffer edits.
///
/// Nothing is written. `open_versions` maps a document URI to the editor's
/// current version. A `documentChanges` entry whose version does not match is
/// rejected. Unversioned `changes` entries are accepted and applied by the
/// editor to whatever buffer it has open.
///
/// # Errors
///
/// Returns [`JdtlsError::WorkspaceEdit`] for resource operations, paths outside
/// the workspace, overlapping ranges, or a stale document version.
pub fn plan_workspace_edit(
    workspace_root: &Path,
    edit: &WorkspaceEdit,
    open_versions: &BTreeMap<String, i32>,
) -> Result<Vec<FileEdits>, JdtlsError> {
    plan_workspace_edit_roots(&[workspace_root.to_path_buf()], edit, open_versions)
}

/// Validates a workspace edit against every root in a multi-root workspace.
///
/// # Errors
///
/// Same as [`plan_workspace_edit`]. A path must sit inside one of `roots`.
pub fn plan_workspace_edit_roots(
    roots: &[PathBuf],
    edit: &WorkspaceEdit,
    open_versions: &BTreeMap<String, i32>,
) -> Result<Vec<FileEdits>, JdtlsError> {
    let mut canonical_roots = Vec::new();
    for root in roots {
        let canonical = root.canonicalize().map_err(|error| JdtlsError::PathIo {
            path: root.clone(),
            source: error,
        })?;
        if !canonical_roots.contains(&canonical) {
            canonical_roots.push(canonical);
        }
    }
    if canonical_roots.is_empty() {
        return Err(JdtlsError::WorkspaceEdit(
            "workspace edit has no workspace root".to_owned(),
        ));
    }
    let mut grouped: BTreeMap<PathBuf, Vec<TextEdit>> = BTreeMap::new();
    collect_changes(edit, &canonical_roots, open_versions, &mut grouped)?;
    if grouped.is_empty() {
        return Err(JdtlsError::WorkspaceEdit(
            "workspace edit contains no file changes".to_owned(),
        ));
    }
    let mut files = Vec::new();
    for (path, edits) in grouped {
        reject_overlaps(&edits)?;
        files.push(FileEdits {
            path,
            edits: text_edits(edits),
        });
    }
    Ok(files)
}

/// Counts a validated workspace edit without writing it.
///
/// This replaces the Phase 0 disk writer. Callers apply [`FileEdits`] to
/// editor buffers.
///
/// # Errors
///
/// Same as [`plan_workspace_edit`] with an empty version map.
pub fn apply_workspace_edit(
    workspace_root: &Path,
    edit: &WorkspaceEdit,
) -> Result<WorkspaceEditOutcome, JdtlsError> {
    let files = plan_workspace_edit(workspace_root, edit, &BTreeMap::new())?;
    let edits_applied = files.iter().map(|file| file.edits.len()).sum();
    Ok(WorkspaceEditOutcome {
        files_changed: files.len(),
        edits_applied,
    })
}

#[allow(clippy::mutable_key_type)]
fn collect_changes(
    edit: &WorkspaceEdit,
    roots: &[PathBuf],
    open_versions: &BTreeMap<String, i32>,
    grouped: &mut BTreeMap<PathBuf, Vec<TextEdit>>,
) -> Result<(), JdtlsError> {
    if let Some(changes) = edit.changes.as_ref() {
        for (uri, edits) in changes {
            let path = file_inside(roots, uri)?;
            grouped.entry(path).or_default().extend(edits.clone());
        }
    }
    if let Some(document_changes) = &edit.document_changes {
        let operations = match document_changes {
            DocumentChanges::Edits(edits) => edits
                .iter()
                .map(|edit| DocumentChangeOperation::Edit(edit.clone()))
                .collect::<Vec<_>>(),
            DocumentChanges::Operations(operations) => operations.clone(),
        };
        for operation in operations {
            match operation {
                DocumentChangeOperation::Op(_) => {
                    return Err(JdtlsError::WorkspaceEdit(
                        "file create, rename, and delete operations are not applied".to_owned(),
                    ));
                }
                DocumentChangeOperation::Edit(edit) => {
                    remember_document_edit(roots, open_versions, grouped, &edit)?;
                }
            }
        }
    }
    Ok(())
}

fn remember_document_edit(
    roots: &[PathBuf],
    open_versions: &BTreeMap<String, i32>,
    grouped: &mut BTreeMap<PathBuf, Vec<TextEdit>>,
    edit: &TextDocumentEdit,
) -> Result<(), JdtlsError> {
    let uri = edit.text_document.uri.as_str();
    if let Some(version) = edit.text_document.version {
        match open_versions.get(uri) {
            Some(open) if *open == version => {}
            Some(open) => {
                return Err(JdtlsError::WorkspaceEdit(format!(
                    "stale edit for {uri}: edit version {version}, buffer version {open}"
                )));
            }
            None => {
                return Err(JdtlsError::WorkspaceEdit(format!(
                    "edit for {uri} names version {version}, but that document is not open"
                )));
            }
        }
    }
    let path = file_inside(roots, &edit.text_document.uri)?;
    let edits = edit
        .edits
        .iter()
        .map(|edit| match edit {
            OneOf::Left(text) => text.clone(),
            OneOf::Right(annotated) => annotated.text_edit.clone(),
        })
        .collect::<Vec<_>>();
    grouped.entry(path).or_default().extend(edits);
    Ok(())
}

fn file_inside(roots: &[PathBuf], uri: &lsp_types::Uri) -> Result<PathBuf, JdtlsError> {
    let path = uri_to_path(uri)?;
    let canonical = path.canonicalize().unwrap_or(path);
    let allowed = roots.iter().any(|root| canonical.starts_with(root));
    if !allowed {
        return Err(JdtlsError::WorkspaceEdit(format!(
            "refusing to edit outside the workspace: {}",
            canonical.display()
        )));
    }
    Ok(canonical)
}

fn reject_overlaps(edits: &[TextEdit]) -> Result<(), JdtlsError> {
    let mut ordered = edits.to_vec();
    ordered.sort_by_key(|edit| {
        (
            edit.range.start.line,
            edit.range.start.character,
            edit.range.end.line,
            edit.range.end.character,
        )
    });
    for pair in ordered.windows(2) {
        let end = (pair[0].range.end.line, pair[0].range.end.character);
        let next = (pair[1].range.start.line, pair[1].range.start.character);
        if next < end {
            return Err(JdtlsError::WorkspaceEdit(
                "overlapping edits in one file were rejected".to_owned(),
            ));
        }
    }
    Ok(())
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
    fn stale_document_version_is_rejected_without_writing() {
        let root = std::env::temp_dir().join(format!("javaide-edit-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let file = root.join("A.java");
        std::fs::write(&file, "class A {}\n").unwrap();
        let uri = crate::config::file_uri(&file).unwrap();
        let edit = WorkspaceEdit {
            changes: None,
            document_changes: Some(DocumentChanges::Edits(vec![TextDocumentEdit {
                text_document: lsp_types::OptionalVersionedTextDocumentIdentifier {
                    uri,
                    version: Some(2),
                },
                edits: vec![OneOf::Left(edit((0, 6), (0, 7), "B"))],
            }])),
            change_annotations: None,
        };
        let mut versions = BTreeMap::new();
        versions.insert(edit_uri(&edit), 4);
        let error = plan_workspace_edit(&root, &edit, &versions).unwrap_err();
        assert!(error.to_string().contains("stale"));
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "class A {}\n");
        let _ = std::fs::remove_dir_all(&root);
    }

    fn edit_uri(edit: &WorkspaceEdit) -> String {
        match edit.document_changes.as_ref().unwrap() {
            DocumentChanges::Edits(edits) => edits[0].text_document.uri.as_str().to_owned(),
            DocumentChanges::Operations(_) => String::new(),
        }
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
