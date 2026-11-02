//! Protocol-neutral view types for Java language features.
//!
//! # Boundary
//!
//! `lsp_types` never leaves this crate. These types are the shape the
//! application and the UI consume: absolute paths, zero-based line numbers, and
//! UTF-16 character offsets. That is the same unit LSP uses and the unit a
//! browser text model uses, so the UI can convert positions without guessing.
//!
//! # Invariants
//!
//! - [`SourcePosition`] is zero-based in both fields.
//! - Characters are UTF-16 code units, never bytes or Unicode scalar values.
//! - Locations with a non-`file:` URI (for example jdtls `jdt://` virtual
//!   documents) are dropped instead of being turned into bogus paths.
//! - Completion responses are capped at [`MAX_COMPLETION_CANDIDATES`].

use std::path::PathBuf;

use lsp_types::{
    CompletionItem, CompletionItemKind, CompletionResponse, Diagnostic,
    DiagnosticRelatedInformation, DiagnosticSeverity, Documentation, GotoDefinitionResponse, Hover,
    HoverContents, Location, MarkedString, NumberOrString, Position, PublishDiagnosticsParams,
    Range, TextEdit, Uri, WorkspaceEdit,
};
use serde::{Deserialize, Serialize};

use crate::config::uri_to_path;

/// Upper bound on completion candidates returned from one request.
pub const MAX_COMPLETION_CANDIDATES: usize = 500;

/// A zero-based position inside a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourcePosition {
    /// Zero-based line number.
    pub line: u32,
    /// Zero-based UTF-16 code-unit offset within the line.
    pub character: u32,
}

impl SourcePosition {
    /// Creates a position from a zero-based line and UTF-16 character offset.
    #[must_use]
    pub const fn new(line: u32, character: u32) -> Self {
        Self { line, character }
    }
}

impl From<Position> for SourcePosition {
    fn from(position: Position) -> Self {
        Self {
            line: position.line,
            character: position.character,
        }
    }
}

/// A half-open range inside a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRange {
    /// Inclusive start position.
    pub start: SourcePosition,
    /// Exclusive end position.
    pub end: SourcePosition,
}

impl From<Range> for SourceRange {
    fn from(range: Range) -> Self {
        Self {
            start: range.start.into(),
            end: range.end.into(),
        }
    }
}

/// A text edit to apply to an editor buffer.
///
/// `new_text` replaces `range`; an empty `new_text` deletes the range. Edits are
/// applied to the in-memory buffer rather than the file so unsaved changes stay
/// authoritative, and the caller groups them into one undo step.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceTextEdit {
    /// Range to replace.
    pub range: SourceRange,
    /// Replacement text.
    pub new_text: String,
}

impl From<TextEdit> for SourceTextEdit {
    fn from(edit: TextEdit) -> Self {
        Self {
            range: edit.range.into(),
            new_text: edit.new_text,
        }
    }
}

/// Hover text for a position, rendered as plain text by the UI.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HoverInfo {
    /// Markdown or plain text supplied by jdtls.
    pub contents: String,
    /// Range the hover applies to, when jdtls reports one.
    pub range: Option<SourceRange>,
}

/// One completion candidate.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionCandidate {
    /// Display label.
    pub label: String,
    /// Lowercase jdtls kind name, for example `method` or `field`.
    pub kind: String,
    /// Short type signature or declaring type.
    pub detail: Option<String>,
    /// Documentation shown in the completion details panel.
    pub documentation: Option<String>,
    /// Text to insert; falls back to the label. May contain snippet
    /// placeholders, which the UI must handle or ignore.
    pub insert_text: Option<String>,
    /// jdtls sort key, when provided.
    pub sort_text: Option<String>,
    /// Whether jdtls marked the item as deprecated.
    pub deprecated: bool,
}

/// A source location another file can be opened at.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceLocation {
    /// Absolute filesystem path. Empty when [`Self::uri`] is a virtual document.
    pub path: PathBuf,
    /// Range inside that file.
    pub range: SourceRange,
    /// `jdt://` URI when the target is a decompiled class file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
}

/// A secondary location attached to a diagnostic.
///
/// jdtls uses these to explain a problem with another declaration, for example
/// the overridden method or the conflicting type. Related locations with a
/// non-`file:` URI are dropped, matching [`JavaDiagnostic`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaRelatedInformation {
    /// Absolute filesystem path of the related document.
    pub path: PathBuf,
    /// Range inside that document.
    pub range: SourceRange,
    /// Message explaining the relation.
    pub message: String,
}

/// One diagnostic for a document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaDiagnostic {
    /// Range the diagnostic covers.
    pub range: SourceRange,
    /// `error`, `warning`, `info`, or `hint`.
    pub severity: String,
    /// Diagnostic message.
    pub message: String,
    /// Producer, typically `Java`.
    pub source: Option<String>,
    /// Stable diagnostic code, when jdtls supplies one.
    pub code: Option<String>,
    /// Secondary locations that explain the diagnostic.
    pub related_information: Vec<JavaRelatedInformation>,
}

/// The full diagnostic publication for one document.
///
/// jdtls publishes the complete list for a document on every change, so
/// consumers replace their previous state rather than merging.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDiagnostics {
    /// Absolute filesystem path of the document.
    pub path: PathBuf,
    /// Document version the publication applies to, when supplied.
    pub version: Option<i32>,
    /// Diagnostics for the document; empty means the file is clean.
    pub diagnostics: Vec<JavaDiagnostic>,
}

/// Converts a `publishDiagnostics` payload, dropping non-file URIs.
pub(crate) fn document_diagnostics(
    params: &PublishDiagnosticsParams,
) -> Option<DocumentDiagnostics> {
    let path = uri_to_path(&params.uri).ok()?;
    Some(DocumentDiagnostics {
        path,
        version: params.version,
        diagnostics: params.diagnostics.iter().map(java_diagnostic).collect(),
    })
}

fn java_diagnostic(diagnostic: &Diagnostic) -> JavaDiagnostic {
    JavaDiagnostic {
        range: diagnostic.range.into(),
        severity: severity_name(diagnostic.severity).to_owned(),
        message: diagnostic.message.clone(),
        source: diagnostic.source.clone(),
        code: diagnostic.code.as_ref().map(code_text),
        related_information: diagnostic
            .related_information
            .as_deref()
            .unwrap_or_default()
            .iter()
            .filter_map(java_related_information)
            .collect(),
    }
}

fn java_related_information(info: &DiagnosticRelatedInformation) -> Option<JavaRelatedInformation> {
    Some(JavaRelatedInformation {
        path: uri_to_path(&info.location.uri).ok()?,
        range: info.location.range.into(),
        message: info.message.clone(),
    })
}

fn severity_name(severity: Option<DiagnosticSeverity>) -> &'static str {
    match severity {
        Some(DiagnosticSeverity::ERROR) => "error",
        Some(DiagnosticSeverity::WARNING) => "warning",
        Some(DiagnosticSeverity::INFORMATION) => "info",
        Some(DiagnosticSeverity::HINT) => "hint",
        _ => "info",
    }
}

fn code_text(code: &NumberOrString) -> String {
    match code {
        NumberOrString::Number(number) => number.to_string(),
        NumberOrString::String(text) => text.clone(),
    }
}

/// Converts an LSP hover response.
pub(crate) fn hover_info(hover: Hover) -> HoverInfo {
    HoverInfo {
        contents: hover_contents(hover.contents),
        range: hover.range.map(Into::into),
    }
}

fn hover_contents(contents: HoverContents) -> String {
    match contents {
        HoverContents::Scalar(marked) => marked_string(marked),
        HoverContents::Array(items) => items
            .into_iter()
            .map(marked_string)
            .filter(|text| !text.is_empty())
            .collect::<Vec<_>>()
            .join("\n\n"),
        HoverContents::Markup(markup) => markup.value,
    }
}

fn marked_string(value: MarkedString) -> String {
    match value {
        MarkedString::String(text) => text,
        MarkedString::LanguageString(code) => code.value,
    }
}

/// Converts a completion response into bounded candidates.
pub(crate) fn completion_candidates(response: CompletionResponse) -> Vec<CompletionCandidate> {
    match response {
        CompletionResponse::Array(items) => items.into_iter().map(completion_candidate).collect(),
        CompletionResponse::List(list) => {
            let mut candidates = list
                .items
                .into_iter()
                .map(completion_candidate)
                .collect::<Vec<_>>();
            // jdtls returns an unsorted list; respect its ordering hints so the
            // editor's own ranking starts from the server's preferences.
            candidates.sort_by(|left, right| {
                let left_key = left.sort_text.as_deref().unwrap_or(&left.label);
                let right_key = right.sort_text.as_deref().unwrap_or(&right.label);
                left_key.cmp(right_key)
            });
            candidates
        }
    }
    .into_iter()
    .take(MAX_COMPLETION_CANDIDATES)
    .collect()
}

fn completion_candidate(item: CompletionItem) -> CompletionCandidate {
    let label = item.label;
    CompletionCandidate {
        kind: completion_kind(item.kind).to_owned(),
        detail: item.detail,
        documentation: item.documentation.map(documentation_text),
        insert_text: item
            .insert_text
            .or_else(|| Some(label_insert_text(&label)))
            .filter(|text| !text.is_empty()),
        sort_text: item.sort_text,
        deprecated: item.deprecated.unwrap_or(false),
        label,
    }
}

/// Derives insertable text from a jdtls display label.
///
/// jdtls often omits `insertText` and labels fields and methods in a display
/// form such as `out : PrintStream` or `exit(int status) : void`. Inserting the
/// label verbatim would write the return type into the buffer, so the
/// identifier is taken up to the first type separator or parameter list.
fn label_insert_text(label: &str) -> String {
    let name = label.split(" : ").next().unwrap_or(label);
    let name = name.split('(').next().unwrap_or(name).trim();
    name.to_owned()
}

fn completion_kind(kind: Option<CompletionItemKind>) -> &'static str {
    match kind {
        Some(CompletionItemKind::TEXT) => "text",
        Some(CompletionItemKind::METHOD) => "method",
        Some(CompletionItemKind::FUNCTION) => "function",
        Some(CompletionItemKind::CONSTRUCTOR) => "constructor",
        Some(CompletionItemKind::FIELD) => "field",
        Some(CompletionItemKind::VARIABLE) => "variable",
        Some(CompletionItemKind::CLASS) => "class",
        Some(CompletionItemKind::INTERFACE) => "interface",
        Some(CompletionItemKind::MODULE) => "module",
        Some(CompletionItemKind::PROPERTY) => "property",
        Some(CompletionItemKind::UNIT) => "unit",
        Some(CompletionItemKind::VALUE) => "value",
        Some(CompletionItemKind::ENUM) => "enum",
        Some(CompletionItemKind::KEYWORD) => "keyword",
        Some(CompletionItemKind::SNIPPET) => "snippet",
        Some(CompletionItemKind::COLOR) => "color",
        Some(CompletionItemKind::FILE) => "file",
        Some(CompletionItemKind::REFERENCE) => "reference",
        Some(CompletionItemKind::FOLDER) => "folder",
        Some(CompletionItemKind::ENUM_MEMBER) => "enum-member",
        Some(CompletionItemKind::CONSTANT) => "constant",
        Some(CompletionItemKind::STRUCT) => "struct",
        Some(CompletionItemKind::EVENT) => "event",
        Some(CompletionItemKind::OPERATOR) => "operator",
        Some(CompletionItemKind::TYPE_PARAMETER) => "type-parameter",
        _ => "text",
    }
}

fn documentation_text(documentation: Documentation) -> String {
    match documentation {
        Documentation::String(text) => text,
        Documentation::MarkupContent(markup) => markup.value,
    }
}

/// Converts a definition response, dropping virtual documents.
pub(crate) fn definition_locations(response: GotoDefinitionResponse) -> Vec<SourceLocation> {
    let locations = match response {
        GotoDefinitionResponse::Scalar(location) => vec![location],
        GotoDefinitionResponse::Array(locations) => locations,
        GotoDefinitionResponse::Link(links) => links
            .into_iter()
            .map(|link| Location {
                uri: link.target_uri,
                range: link.target_selection_range,
            })
            .collect(),
    };
    locations.into_iter().filter_map(location_view).collect()
}

pub(crate) fn location_view(location: Location) -> Option<SourceLocation> {
    if let Ok(path) = uri_to_path(&location.uri) {
        return Some(SourceLocation {
            path,
            range: location.range.into(),
            uri: None,
        });
    }
    let uri = location.uri.as_str();
    if uri.starts_with("jdt:") {
        return Some(SourceLocation {
            path: PathBuf::new(),
            range: location.range.into(),
            uri: Some(uri.to_owned()),
        });
    }
    None
}

/// Converts LSP text edits into buffer edits.
pub(crate) fn text_edits(edits: Vec<TextEdit>) -> Vec<SourceTextEdit> {
    edits.into_iter().map(Into::into).collect()
}

/// Extracts the edits a workspace edit applies to `uri`.
///
/// Only the plain `changes` map is read. Versioned `documentChanges` go
/// through [`crate::text::plan_workspace_edit`].
pub(crate) fn workspace_text_edits(edit: &WorkspaceEdit, uri: &Uri) -> Vec<SourceTextEdit> {
    edit.changes
        .as_ref()
        .and_then(|changes| changes.get(uri))
        .map(|edits| text_edits(edits.clone()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use lsp_types::{
        Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Hover, HoverContents,
        Location, LocationLink, MarkupContent, MarkupKind, NumberOrString, Position,
        PublishDiagnosticsParams, Range, TextEdit, Uri, WorkspaceEdit,
    };

    use super::*;

    fn uri(value: &str) -> Uri {
        value.parse().unwrap()
    }

    fn range(start: (u32, u32), end: (u32, u32)) -> Range {
        Range {
            start: Position {
                line: start.0,
                character: start.1,
            },
            end: Position {
                line: end.0,
                character: end.1,
            },
        }
    }

    #[test]
    fn hover_keeps_markdown_and_range() {
        let hover = Hover {
            contents: HoverContents::Markup(MarkupContent {
                kind: MarkupKind::Markdown,
                value: "```java\nvoid run()\n```".to_owned(),
            }),
            range: Some(range((3, 4), (3, 9))),
        };
        let info = hover_info(hover);
        assert!(info.contents.contains("void run()"));
        assert_eq!(info.range.unwrap().start, SourcePosition::new(3, 4));
    }

    #[test]
    fn hover_joins_array_contents() {
        let hover = Hover {
            contents: HoverContents::Array(vec![
                MarkedString::String("first".to_owned()),
                MarkedString::LanguageString(lsp_types::LanguageString {
                    language: "java".to_owned(),
                    value: "code".to_owned(),
                }),
            ]),
            range: None,
        };
        let info = hover_info(hover);
        assert!(info.contents.starts_with("first"));
        assert!(info.range.is_none());
    }

    #[test]
    fn completion_is_capped_and_typed() {
        let items = (0..MAX_COMPLETION_CANDIDATES + 10)
            .map(|index| {
                serde_json::json!({
                    "label": format!("method{index}"),
                    "kind": 2,
                    "detail": "void",
                    "documentation": "docs",
                })
            })
            .collect::<Vec<_>>();
        // Building the response through JSON keeps the test independent of
        // every optional field on `CompletionItem`.
        let response: CompletionResponse = serde_json::from_value(serde_json::json!({
            "isIncomplete": false,
            "items": items,
        }))
        .expect("completion response");
        let candidates = completion_candidates(response);
        assert_eq!(candidates.len(), MAX_COMPLETION_CANDIDATES);
        assert_eq!(candidates[0].kind, "method");
        assert_eq!(candidates[0].insert_text.as_deref(), Some("method0"));
        assert_eq!(candidates[0].documentation.as_deref(), Some("docs"));
    }

    #[test]
    fn completion_derives_insert_text_from_display_labels() {
        let items = vec![
            serde_json::from_value(serde_json::json!({ "label": "out : PrintStream" }))
                .expect("field"),
            serde_json::from_value(serde_json::json!({ "label": "exit(int status) : void" }))
                .expect("method"),
            serde_json::from_value(serde_json::json!({ "label": "main" })).expect("plain"),
        ];
        let candidates = completion_candidates(CompletionResponse::Array(items));
        assert_eq!(candidates[0].insert_text.as_deref(), Some("out"));
        assert_eq!(candidates[1].insert_text.as_deref(), Some("exit"));
        assert_eq!(candidates[2].insert_text.as_deref(), Some("main"));
    }

    #[test]
    fn definition_links_use_target_selection() {
        let response = GotoDefinitionResponse::Link(vec![LocationLink {
            origin_selection_range: None,
            target_uri: uri("file:///tmp/com/example/App.java"),
            target_range: range((0, 0), (10, 0)),
            target_selection_range: range((3, 7), (3, 10)),
        }]);
        let locations = definition_locations(response);
        assert_eq!(locations.len(), 1);
        assert_eq!(
            locations[0].path,
            PathBuf::from("/tmp/com/example/App.java")
        );
        assert_eq!(locations[0].range.start, SourcePosition::new(3, 7));
    }

    #[test]
    fn definition_keeps_decompiled_documents() {
        let response = GotoDefinitionResponse::Scalar(Location {
            uri: uri("jdt://contents/java.base/java/lang/String.class"),
            range: range((0, 0), (0, 0)),
        });
        let locations = definition_locations(response);
        assert_eq!(locations.len(), 1);
        assert!(locations[0].path.as_os_str().is_empty());
        assert_eq!(
            locations[0].uri.as_deref(),
            Some("jdt://contents/java.base/java/lang/String.class")
        );
    }

    #[test]
    fn extracts_edits_for_the_requested_document() {
        let document = uri("file:///tmp/App.java");
        // See `apply_workspace_edit`: `Uri` interior mutability is a parse cache.
        #[allow(clippy::mutable_key_type)]
        let mut changes = std::collections::HashMap::new();
        changes.insert(
            document.clone(),
            vec![TextEdit {
                range: range((1, 0), (1, 4)),
                new_text: "void".to_owned(),
            }],
        );
        let workspace = WorkspaceEdit {
            changes: Some(changes),
            document_changes: None,
            change_annotations: None,
        };
        let edits = workspace_text_edits(&workspace, &document);
        assert_eq!(edits.len(), 1);
        assert_eq!(edits[0].new_text, "void");
        assert_eq!(edits[0].range.start, SourcePosition::new(1, 0));
        assert!(workspace_text_edits(&workspace, &uri("file:///tmp/Other.java")).is_empty());
    }

    #[test]
    fn diagnostics_map_severity_and_code() {
        let params = PublishDiagnosticsParams {
            uri: uri("file:///tmp/App.java"),
            diagnostics: vec![Diagnostic {
                range: range((1, 2), (1, 5)),
                severity: Some(DiagnosticSeverity::ERROR),
                code: Some(NumberOrString::String("unused".to_owned())),
                code_description: None,
                source: Some("Java".to_owned()),
                message: "The value is unused".to_owned(),
                related_information: Some(vec![
                    DiagnosticRelatedInformation {
                        location: Location {
                            uri: uri("file:///tmp/Other.java"),
                            range: range((4, 1), (4, 9)),
                        },
                        message: "declared here".to_owned(),
                    },
                    DiagnosticRelatedInformation {
                        location: Location {
                            uri: uri("jdt://contents/java.base/java/lang/String.class"),
                            range: range((0, 0), (0, 1)),
                        },
                        message: "virtual document".to_owned(),
                    },
                ]),
                tags: None,
                data: None,
            }],
            version: Some(7),
        };
        let view = document_diagnostics(&params).expect("file URI");
        assert_eq!(view.path, PathBuf::from("/tmp/App.java"));
        assert_eq!(view.version, Some(7));
        assert_eq!(view.diagnostics[0].severity, "error");
        assert_eq!(view.diagnostics[0].code.as_deref(), Some("unused"));
        assert_eq!(view.diagnostics[0].range.end, SourcePosition::new(1, 5));
        assert_eq!(view.diagnostics[0].related_information.len(), 1);
        assert_eq!(
            view.diagnostics[0].related_information[0].path,
            PathBuf::from("/tmp/Other.java")
        );
        assert_eq!(
            view.diagnostics[0].related_information[0].message,
            "declared here"
        );
    }

    #[test]
    fn diagnostics_drop_non_file_uris() {
        let params = PublishDiagnosticsParams {
            uri: uri("jdt://contents/java.base/java/lang/String.class"),
            diagnostics: Vec::new(),
            version: None,
        };
        assert!(document_diagnostics(&params).is_none());
    }
}
