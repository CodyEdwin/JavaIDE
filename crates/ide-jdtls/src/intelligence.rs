//! Phase 2 language features: rename, references, code actions, symbols, and
//! signature help.
//!
//! These types stay free of `lsp_types` at the crate boundary. Virtual
//! `jdt://` documents are dropped, matching the rest of the adapter.

use std::path::PathBuf;

use lsp_types::{
    CodeAction, CodeActionOrCommand, DocumentSymbol, DocumentSymbolResponse, Location, OneOf,
    ParameterInformation, ParameterLabel, PrepareRenameResponse, SignatureHelp,
    SignatureInformation, SymbolInformation, SymbolKind, WorkspaceEdit, WorkspaceSymbol,
    WorkspaceSymbolResponse,
};
use serde::{Deserialize, Serialize};

use crate::config::uri_to_path;
use crate::features::{SourceLocation, SourceRange, SourceTextEdit, location_view, text_edits};

/// Upper bound on reference locations returned from one request.
pub(crate) const MAX_REFERENCE_LOCATIONS: usize = 200;

/// Upper bound on code actions returned from one request.
pub(crate) const MAX_CODE_ACTIONS: usize = 40;

/// Edits for one file, applied together as a single undo step.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEdits {
    /// Absolute filesystem path.
    pub path: PathBuf,
    /// Edits for that file. Empty means the file is listed but unchanged.
    pub edits: Vec<SourceTextEdit>,
}

/// Result of `textDocument/prepareRename`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareRename {
    /// Range to replace, when jdtls reports one.
    pub range: Option<SourceRange>,
    /// Current name to show in the rename prompt.
    pub placeholder: Option<String>,
}

/// One parameter of a signature.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureParameter {
    /// Parameter label.
    pub label: String,
    /// Whether this is the active parameter.
    pub active: bool,
}

/// One callable signature.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaSignature {
    /// Full signature label.
    pub label: String,
    /// Documentation, when jdtls supplies it.
    pub documentation: Option<String>,
    /// Parameters, with the active one flagged.
    pub parameters: Vec<SignatureParameter>,
    /// Whether this signature is the active one.
    pub active: bool,
}

/// A document or workspace symbol.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaSymbol {
    /// Symbol name.
    pub name: String,
    /// Lowercase kind, for example `method` or `class`.
    pub kind: String,
    /// Detail such as a method signature.
    pub detail: Option<String>,
    /// Enclosing range.
    pub range: SourceRange,
    /// Range of the name itself.
    pub selection: SourceRange,
    /// File that contains the symbol. Set for workspace symbols.
    pub path: Option<PathBuf>,
    /// Nested symbols. Empty for workspace-symbol results.
    pub children: Vec<JavaSymbol>,
}

/// A code action the editor can apply.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaCodeAction {
    /// User-facing title.
    pub title: String,
    /// Kind such as `quickfix`, `refactor`, or `source.organizeImports`.
    pub kind: String,
    /// jdtls marked this as the preferred fix.
    pub preferred: bool,
    /// Why the action cannot be applied, when it is disabled.
    pub disabled_reason: Option<String>,
    /// Edits to apply. Empty when the action has no workspace edit.
    pub edits: Vec<FileEdits>,
}

/// Converts a workspace edit into per-file buffer edits.
///
/// Only plain `changes` are read. The client advertises `documentChanges:
/// false`, so jdtls is asked not to send resource operations.
// `Uri` caches a parse in a `Cell`. Hash and equality ignore that cache.
#[allow(clippy::mutable_key_type)]
pub(crate) fn workspace_file_edits(edit: &WorkspaceEdit) -> Vec<FileEdits> {
    let Some(changes) = edit.changes.as_ref() else {
        return Vec::new();
    };
    let mut files = Vec::new();
    for (uri, edits) in changes {
        let Ok(path) = uri_to_path(uri) else {
            continue;
        };
        files.push(FileEdits {
            path,
            edits: text_edits(edits.clone()),
        });
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    files
}

pub(crate) fn prepare_rename_view(response: PrepareRenameResponse) -> PrepareRename {
    match response {
        PrepareRenameResponse::Range(range) => PrepareRename {
            range: Some(range.into()),
            placeholder: None,
        },
        PrepareRenameResponse::RangeWithPlaceholder { range, placeholder } => PrepareRename {
            range: Some(range.into()),
            placeholder: Some(placeholder),
        },
        PrepareRenameResponse::DefaultBehavior { .. } => PrepareRename {
            range: None,
            placeholder: None,
        },
    }
}

pub(crate) fn signature_help_view(help: SignatureHelp) -> Vec<JavaSignature> {
    let active_signature = help.active_signature.unwrap_or(0);
    let fallback_parameter = help.active_parameter;
    help.signatures
        .into_iter()
        .enumerate()
        .map(|(index, signature)| {
            let active = index as u32 == active_signature;
            signature_view(signature, active, fallback_parameter)
        })
        .collect()
}

fn signature_view(
    signature: SignatureInformation,
    active: bool,
    fallback_parameter: Option<u32>,
) -> JavaSignature {
    let active_parameter = if active {
        signature.active_parameter.or(fallback_parameter)
    } else {
        None
    };
    let parameters = signature
        .parameters
        .unwrap_or_default()
        .into_iter()
        .enumerate()
        .map(|(index, parameter)| SignatureParameter {
            label: parameter_label(&signature.label, &parameter),
            active: active_parameter.is_some_and(|active| active == index as u32),
        })
        .collect();
    JavaSignature {
        label: signature.label,
        documentation: signature.documentation.map(documentation_plain),
        parameters,
        active,
    }
}

fn parameter_label(signature: &str, parameter: &ParameterInformation) -> String {
    match &parameter.label {
        ParameterLabel::Simple(label) => label.clone(),
        ParameterLabel::LabelOffsets([start, end]) => {
            let start = *start as usize;
            let end = *end as usize;
            signature.get(start..end).unwrap_or("").to_owned()
        }
    }
}

pub(crate) fn reference_locations(locations: Vec<Location>) -> Vec<SourceLocation> {
    locations
        .into_iter()
        .filter_map(location_view)
        .take(MAX_REFERENCE_LOCATIONS)
        .collect()
}

pub(crate) fn document_symbols(response: DocumentSymbolResponse) -> Vec<JavaSymbol> {
    match response {
        DocumentSymbolResponse::Nested(symbols) => symbols.into_iter().map(nested_symbol).collect(),
        DocumentSymbolResponse::Flat(symbols) => {
            symbols.into_iter().filter_map(flat_symbol).collect()
        }
    }
}

fn nested_symbol(symbol: DocumentSymbol) -> JavaSymbol {
    JavaSymbol {
        name: symbol.name,
        kind: symbol_kind_name(symbol.kind).to_owned(),
        detail: symbol.detail,
        range: symbol.range.into(),
        selection: symbol.selection_range.into(),
        path: None,
        children: symbol
            .children
            .unwrap_or_default()
            .into_iter()
            .map(nested_symbol)
            .collect(),
    }
}

fn flat_symbol(symbol: SymbolInformation) -> Option<JavaSymbol> {
    let location = location_view(symbol.location)?;
    Some(JavaSymbol {
        name: symbol.name,
        kind: symbol_kind_name(symbol.kind).to_owned(),
        detail: symbol.container_name,
        range: location.range,
        selection: location.range,
        path: Some(location.path),
        children: Vec::new(),
    })
}

pub(crate) fn workspace_symbols(response: WorkspaceSymbolResponse) -> Vec<JavaSymbol> {
    match response {
        WorkspaceSymbolResponse::Flat(symbols) => {
            symbols.into_iter().filter_map(flat_symbol).collect()
        }
        WorkspaceSymbolResponse::Nested(symbols) => {
            symbols.into_iter().filter_map(workspace_symbol).collect()
        }
    }
}

fn workspace_symbol(symbol: WorkspaceSymbol) -> Option<JavaSymbol> {
    let (path, range) = match symbol.location {
        OneOf::Left(location) => {
            let view = location_view(location)?;
            (view.path, view.range)
        }
        OneOf::Right(location) => {
            let path = uri_to_path(&location.uri).ok()?;
            (
                path,
                SourceRange {
                    start: crate::features::SourcePosition::new(0, 0),
                    end: crate::features::SourcePosition::new(0, 0),
                },
            )
        }
    };
    Some(JavaSymbol {
        name: symbol.name,
        kind: symbol_kind_name(symbol.kind).to_owned(),
        detail: symbol.container_name,
        range,
        selection: range,
        path: Some(path),
        children: Vec::new(),
    })
}

pub(crate) fn code_actions(actions: Vec<CodeActionOrCommand>) -> Vec<JavaCodeAction> {
    actions
        .into_iter()
        .map(|action| match action {
            CodeActionOrCommand::CodeAction(action) => code_action(action),
            CodeActionOrCommand::Command(command) => JavaCodeAction {
                title: command.title,
                kind: "command".to_owned(),
                preferred: false,
                disabled_reason: Some(
                    "This action runs a language-server command with no text edit.".to_owned(),
                ),
                edits: Vec::new(),
            },
        })
        .take(MAX_CODE_ACTIONS)
        .collect()
}

fn code_action(action: CodeAction) -> JavaCodeAction {
    let edits = action
        .edit
        .as_ref()
        .map(workspace_file_edits)
        .unwrap_or_default();
    JavaCodeAction {
        title: action.title,
        kind: action
            .kind
            .map(|kind| kind.as_str().to_owned())
            .unwrap_or_else(|| "quickfix".to_owned()),
        preferred: action.is_preferred.unwrap_or(false),
        disabled_reason: action.disabled.map(|disabled| disabled.reason),
        edits,
    }
}

fn documentation_plain(documentation: lsp_types::Documentation) -> String {
    match documentation {
        lsp_types::Documentation::String(text) => text,
        lsp_types::Documentation::MarkupContent(markup) => markup.value,
    }
}

fn symbol_kind_name(kind: SymbolKind) -> &'static str {
    if kind == SymbolKind::FILE {
        "file"
    } else if kind == SymbolKind::MODULE {
        "module"
    } else if kind == SymbolKind::NAMESPACE || kind == SymbolKind::PACKAGE {
        "package"
    } else if kind == SymbolKind::CLASS {
        "class"
    } else if kind == SymbolKind::METHOD || kind == SymbolKind::FUNCTION {
        "method"
    } else if kind == SymbolKind::CONSTRUCTOR {
        "constructor"
    } else if kind == SymbolKind::FIELD || kind == SymbolKind::PROPERTY {
        "field"
    } else if kind == SymbolKind::VARIABLE {
        "variable"
    } else if kind == SymbolKind::INTERFACE {
        "interface"
    } else if kind == SymbolKind::ENUM {
        "enum"
    } else if kind == SymbolKind::ENUM_MEMBER {
        "enum-member"
    } else if kind == SymbolKind::CONSTANT {
        "constant"
    } else if kind == SymbolKind::STRUCT {
        "struct"
    } else {
        "symbol"
    }
}

#[cfg(test)]
mod tests {
    use lsp_types::{
        CodeActionDisabled, CodeActionKind, Documentation, MarkupContent, MarkupKind, WorkspaceEdit,
    };
    use serde_json::json;

    use super::*;

    #[test]
    fn workspace_edits_group_by_file_and_drop_virtual_uris() {
        let edit: WorkspaceEdit = serde_json::from_value(json!({
            "changes": {
                "file:///tmp/A.java": [{
                    "range": {"start": {"line": 1, "character": 0}, "end": {"line": 1, "character": 3}},
                    "newText": "sum"
                }],
                "jdt://contents/java.base/java/lang/String.class": [{
                    "range": {"start": {"line": 0, "character": 0}, "end": {"line": 0, "character": 1}},
                    "newText": "x"
                }]
            }
        }))
        .expect("edit");
        let files = workspace_file_edits(&edit);
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, PathBuf::from("/tmp/A.java"));
        assert_eq!(files[0].edits[0].new_text, "sum");
    }

    #[test]
    fn signature_marks_the_active_parameter() {
        let help: SignatureHelp = serde_json::from_value(json!({
            "signatures": [{
                "label": "add(int left, int right)",
                "documentation": "Adds two integers.",
                "parameters": [
                    {"label": "int left"},
                    {"label": "int right"}
                ],
                "activeParameter": 1
            }],
            "activeSignature": 0
        }))
        .expect("help");
        let signatures = signature_help_view(help);
        assert!(signatures[0].active);
        assert!(!signatures[0].parameters[0].active);
        assert!(signatures[0].parameters[1].active);
        assert_eq!(
            signatures[0].documentation.as_deref(),
            Some("Adds two integers.")
        );
    }

    #[test]
    fn code_action_keeps_preferred_edits_and_disabled_reason() {
        let action = CodeAction {
            title: "Change to sum".to_owned(),
            kind: Some(CodeActionKind::QUICKFIX),
            diagnostics: None,
            edit: Some(
                serde_json::from_value(json!({
                    "changes": {
                        "file:///tmp/A.java": [{
                            "range": {"start": {"line": 0, "character": 0}, "end": {"line": 0, "character": 1}},
                            "newText": "sum"
                        }]
                    }
                }))
                .expect("edit"),
            ),
            command: None,
            is_preferred: Some(true),
            disabled: Some(CodeActionDisabled {
                reason: "preview".to_owned(),
            }),
            data: None,
        };
        let view = code_action(action);
        assert!(view.preferred);
        assert_eq!(view.kind, "quickfix");
        assert_eq!(view.disabled_reason.as_deref(), Some("preview"));
        assert_eq!(view.edits[0].edits[0].new_text, "sum");
    }

    #[test]
    fn document_symbol_tree_keeps_children() {
        let response: DocumentSymbolResponse = serde_json::from_value(json!([{
            "name": "App",
            "kind": 5,
            "range": {"start": {"line": 0, "character": 0}, "end": {"line": 10, "character": 1}},
            "selectionRange": {"start": {"line": 1, "character": 13}, "end": {"line": 1, "character": 16}},
            "children": [{
                "name": "add",
                "kind": 6,
                "detail": "int",
                "range": {"start": {"line": 4, "character": 0}, "end": {"line": 6, "character": 1}},
                "selectionRange": {"start": {"line": 4, "character": 4}, "end": {"line": 4, "character": 7}}
            }]
        }]))
        .expect("symbols");
        let symbols = document_symbols(response);
        assert_eq!(symbols[0].kind, "class");
        assert_eq!(symbols[0].children[0].name, "add");
        assert_eq!(symbols[0].children[0].kind, "method");
    }

    #[test]
    fn markup_documentation_is_preserved() {
        let text = documentation_plain(Documentation::MarkupContent(MarkupContent {
            kind: MarkupKind::Markdown,
            value: "`add`".to_owned(),
        }));
        assert_eq!(text, "`add`");
    }

    #[test]
    fn offset_parameter_labels_slice_the_signature() {
        let signature = SignatureInformation {
            label: "add(int left, int right)".to_owned(),
            documentation: None,
            parameters: Some(vec![ParameterInformation {
                label: ParameterLabel::LabelOffsets([4, 12]),
                documentation: None,
            }]),
            active_parameter: None,
        };
        let view = signature_view(signature, true, Some(0));
        assert_eq!(view.parameters[0].label, "int left");
        assert!(view.parameters[0].active);
    }
}
