//! Remaining Phase 2 language-server requests.
//!
//! Semantic tokens, inlay hints, folding, selection ranges, hierarchies, code
//! lens, and decompiled class contents. View types stay free of `lsp_types`.

use std::path::PathBuf;
use std::time::Duration;

use lsp_types::{
    CallHierarchyIncomingCallsParams, CallHierarchyItem, CallHierarchyOutgoingCallsParams,
    CallHierarchyPrepareParams, CodeLens, CodeLensParams, FoldingRange, FoldingRangeParams,
    InlayHint, InlayHintLabel, InlayHintParams, Position, Range, SelectionRange,
    SelectionRangeParams, SemanticTokens, SemanticTokensParams, TypeHierarchyPrepareParams,
    WorkDoneProgressParams,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::JdtlsClient;
use crate::JdtlsError;
use crate::client::text_document_position;
use crate::config::{file_uri, uri_to_path};
use crate::features::{SourcePosition, SourceRange};
use crate::intelligence::symbol_kind_name;

/// One semantic token in absolute line/character coordinates.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticToken {
    /// Zero-based line.
    pub line: u32,
    /// Zero-based UTF-16 start on that line.
    pub start: u32,
    /// Token length in UTF-16 code units.
    pub length: u32,
    /// Server legend name, or `token` when the legend has no such index.
    pub token_type: String,
}

/// A hint inserted into the editor without changing the buffer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InlayHintView {
    /// Zero-based line.
    pub line: u32,
    /// Zero-based UTF-16 character.
    pub character: u32,
    /// Text to show.
    pub label: String,
}

/// A foldable line range.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FoldRange {
    /// First line of the fold, zero-based.
    pub start_line: u32,
    /// Last line of the fold, zero-based.
    pub end_line: u32,
}

/// One node in a call or type hierarchy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HierarchyNode {
    /// Display name.
    pub name: String,
    /// Symbol kind.
    pub kind: String,
    /// File path when the URI is a `file:` URI.
    pub path: Option<PathBuf>,
    /// Original URI, including `jdt://` documents.
    pub uri: String,
    /// Selection line.
    pub line: u32,
    /// Selection character.
    pub character: u32,
}

/// A code lens title anchored to a line.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeLensView {
    /// Zero-based line.
    pub line: u32,
    /// Zero-based character.
    pub character: u32,
    /// Command title, when the lens resolved one.
    pub title: String,
}

impl JdtlsClient {
    /// Decodes a full semantic-token response for `path`.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn semantic_tokens(
        &self,
        path: &std::path::Path,
        limit: Duration,
    ) -> Result<Vec<SemanticToken>, JdtlsError> {
        let params = SemanticTokensParams {
            text_document: lsp_types::TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            work_done_progress_params: WorkDoneProgressParams::default(),
            partial_result_params: lsp_types::PartialResultParams::default(),
        };
        let tokens: Option<SemanticTokens> = self
            .lsp("textDocument/semanticTokens/full", params, limit)
            .await?;
        let legend = self
            .semantic_legend
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone();
        Ok(tokens
            .map(|tokens| decode_semantic_tokens(&tokens.data, &legend))
            .unwrap_or_default())
    }

    /// Returns inlay hints for `range`.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn inlay_hints(
        &self,
        path: &std::path::Path,
        range: SourceRange,
        limit: Duration,
    ) -> Result<Vec<InlayHintView>, JdtlsError> {
        let params = InlayHintParams {
            text_document: lsp_types::TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            range: lsp_range(range),
            work_done_progress_params: WorkDoneProgressParams::default(),
        };
        let hints: Option<Vec<InlayHint>> =
            self.lsp("textDocument/inlayHint", params, limit).await?;
        Ok(hints
            .unwrap_or_default()
            .into_iter()
            .map(inlay_view)
            .collect())
    }

    /// Returns folding ranges for a document.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn folding_ranges(
        &self,
        path: &std::path::Path,
        limit: Duration,
    ) -> Result<Vec<FoldRange>, JdtlsError> {
        let params = FoldingRangeParams {
            text_document: lsp_types::TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            work_done_progress_params: WorkDoneProgressParams::default(),
            partial_result_params: lsp_types::PartialResultParams::default(),
        };
        let ranges: Option<Vec<FoldingRange>> =
            self.lsp("textDocument/foldingRange", params, limit).await?;
        Ok(ranges
            .unwrap_or_default()
            .into_iter()
            .map(|range| FoldRange {
                start_line: range.start_line,
                end_line: range.end_line,
            })
            .collect())
    }

    /// Returns selection ranges from the cursor outward.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn selection_ranges(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        limit: Duration,
    ) -> Result<Vec<SourceRange>, JdtlsError> {
        let params = SelectionRangeParams {
            text_document: lsp_types::TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            positions: vec![Position {
                line: position.line,
                character: position.character,
            }],
            work_done_progress_params: WorkDoneProgressParams::default(),
            partial_result_params: lsp_types::PartialResultParams::default(),
        };
        let ranges: Option<Vec<SelectionRange>> = self
            .lsp("textDocument/selectionRange", params, limit)
            .await?;
        Ok(ranges
            .unwrap_or_default()
            .into_iter()
            .flat_map(flatten_selection)
            .collect())
    }

    /// Returns one level of call or type hierarchy.
    ///
    /// `direction` is `incoming`, `outgoing`, `supertypes`, or `subtypes`.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error, or [`JdtlsError::Protocol`] for
    /// an unknown direction.
    pub async fn hierarchy(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        direction: &str,
        limit: Duration,
    ) -> Result<Vec<HierarchyNode>, JdtlsError> {
        match direction {
            "incoming" | "outgoing" => self.call_hierarchy(path, position, direction, limit).await,
            "supertypes" | "subtypes" => {
                self.type_hierarchy(path, position, direction, limit).await
            }
            _ => Err(JdtlsError::Protocol(format!(
                "unknown hierarchy direction {direction}"
            ))),
        }
    }

    /// Returns code lenses for a document.
    ///
    /// Lenses that carry lazy `data` and no command are resolved.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn code_lens(
        &self,
        path: &std::path::Path,
        limit: Duration,
    ) -> Result<Vec<CodeLensView>, JdtlsError> {
        let params = CodeLensParams {
            text_document: lsp_types::TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            work_done_progress_params: WorkDoneProgressParams::default(),
            partial_result_params: lsp_types::PartialResultParams::default(),
        };
        let lenses: Option<Vec<CodeLens>> =
            self.lsp("textDocument/codeLens", params, limit).await?;
        let mut views = Vec::new();
        for lens in lenses.unwrap_or_default() {
            let lens = if lens.command.is_none() && lens.data.is_some() {
                self.lsp("codeLens/resolve", &lens, limit)
                    .await
                    .unwrap_or(lens)
            } else {
                lens
            };
            if let Some(title) = lens.command.as_ref().map(|command| command.title.clone()) {
                views.push(CodeLensView {
                    line: lens.range.start.line,
                    character: lens.range.start.character,
                    title,
                });
            }
        }
        Ok(views)
    }

    /// Reads decompiled or attached source for a `jdt://` URI.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error. An empty string means jdtls had
    /// no contents for that URI.
    pub async fn class_file_contents(
        &self,
        uri: &str,
        limit: Duration,
    ) -> Result<String, JdtlsError> {
        let value: Value = self
            .lsp("java/classFileContents", json!({ "uri": uri }), limit)
            .await?;
        Ok(class_file_text(&value))
    }

    /// Adds a workspace folder and tells jdtls about it.
    ///
    /// # Errors
    ///
    /// Returns an error if the path is not an absolute directory or the
    /// notification cannot be written.
    pub async fn add_workspace_folder(&self, path: &std::path::Path) -> Result<(), JdtlsError> {
        if !path.is_dir() {
            return Err(JdtlsError::WorkspaceEdit(format!(
                "{} is not a directory",
                path.display()
            )));
        }
        let uri = file_uri(path)?;
        let name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| "folder".to_owned());
        self.folders
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .push((uri.as_str().to_owned(), name.clone()));
        self.peer
            .notify(
                "workspace/didChangeWorkspaceFolders",
                Some(json!({
                    "event": {
                        "added": [{ "uri": uri.as_str(), "name": name }],
                        "removed": []
                    }
                })),
            )
            .await?;
        Ok(())
    }

    async fn call_hierarchy(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        direction: &str,
        limit: Duration,
    ) -> Result<Vec<HierarchyNode>, JdtlsError> {
        let params = CallHierarchyPrepareParams {
            text_document_position_params: text_document_position(path, position)?,
            work_done_progress_params: WorkDoneProgressParams::default(),
        };
        let items: Option<Vec<CallHierarchyItem>> = self
            .lsp("textDocument/prepareCallHierarchy", params, limit)
            .await?;
        let Some(item) = items.unwrap_or_default().into_iter().next() else {
            return Ok(Vec::new());
        };
        if direction == "incoming" {
            let calls: Option<Vec<lsp_types::CallHierarchyIncomingCall>> = self
                .lsp(
                    "callHierarchy/incomingCalls",
                    CallHierarchyIncomingCallsParams {
                        item,
                        work_done_progress_params: WorkDoneProgressParams::default(),
                        partial_result_params: lsp_types::PartialResultParams::default(),
                    },
                    limit,
                )
                .await?;
            Ok(calls
                .unwrap_or_default()
                .into_iter()
                .map(|call| hierarchy_node(&call.from))
                .collect())
        } else {
            let calls: Option<Vec<lsp_types::CallHierarchyOutgoingCall>> = self
                .lsp(
                    "callHierarchy/outgoingCalls",
                    CallHierarchyOutgoingCallsParams {
                        item,
                        work_done_progress_params: WorkDoneProgressParams::default(),
                        partial_result_params: lsp_types::PartialResultParams::default(),
                    },
                    limit,
                )
                .await?;
            Ok(calls
                .unwrap_or_default()
                .into_iter()
                .map(|call| hierarchy_node(&call.to))
                .collect())
        }
    }

    async fn type_hierarchy(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        direction: &str,
        limit: Duration,
    ) -> Result<Vec<HierarchyNode>, JdtlsError> {
        let params = TypeHierarchyPrepareParams {
            text_document_position_params: text_document_position(path, position)?,
            work_done_progress_params: WorkDoneProgressParams::default(),
        };
        // jdtls sends `tags` as an array. lsp-types 0.97 models that field as
        // one tag, so the typed struct cannot decode a real response. The
        // original item is forwarded so its `data` payload stays intact.
        let prepared: Value = self
            .lsp("textDocument/prepareTypeHierarchy", params, limit)
            .await?;
        let items = match &prepared {
            Value::Array(items) => items.clone(),
            Value::Object(_) => vec![prepared.clone()],
            _ => Vec::new(),
        };
        let Some(item) = items.into_iter().next() else {
            return Ok(Vec::new());
        };
        let method = if direction == "supertypes" {
            "typeHierarchy/supertypes"
        } else {
            "typeHierarchy/subtypes"
        };
        let types: Value = self.lsp(method, json!({ "item": item }), limit).await?;
        let listed = match &types {
            Value::Array(items) => items.as_slice(),
            Value::Object(_) => std::slice::from_ref(&types),
            _ => &[],
        };
        Ok(listed.iter().filter_map(type_node_value).collect())
    }
}

pub(crate) fn decode_semantic_tokens(
    data: &[lsp_types::SemanticToken],
    legend: &[String],
) -> Vec<SemanticToken> {
    let mut line = 0u32;
    let mut start = 0u32;
    let mut tokens = Vec::new();
    for token in data {
        line += token.delta_line;
        start = if token.delta_line == 0 {
            start + token.delta_start
        } else {
            token.delta_start
        };
        let token_type = legend
            .get(token.token_type as usize)
            .cloned()
            .unwrap_or_else(|| "token".to_owned());
        tokens.push(SemanticToken {
            line,
            start,
            length: token.length,
            token_type,
        });
    }
    tokens
}

fn inlay_view(hint: InlayHint) -> InlayHintView {
    InlayHintView {
        line: hint.position.line,
        character: hint.position.character,
        label: match hint.label {
            InlayHintLabel::String(text) => text,
            InlayHintLabel::LabelParts(parts) => {
                parts.into_iter().map(|part| part.value).collect::<String>()
            }
        },
    }
}

fn flatten_selection(range: SelectionRange) -> Vec<SourceRange> {
    let mut ranges = vec![range.range.into()];
    let mut parent = range.parent;
    while let Some(next) = parent {
        ranges.push(next.range.into());
        parent = next.parent;
    }
    ranges
}

fn hierarchy_node(item: &CallHierarchyItem) -> HierarchyNode {
    let path = uri_to_path(&item.uri).ok();
    HierarchyNode {
        name: item.name.clone(),
        kind: symbol_kind_name(item.kind).to_owned(),
        path,
        uri: item.uri.as_str().to_owned(),
        line: item.selection_range.start.line,
        character: item.selection_range.start.character,
    }
}

fn type_node_value(value: &Value) -> Option<HierarchyNode> {
    let name = value.get("name")?.as_str()?.to_owned();
    let uri = value.get("uri")?.as_str()?.to_owned();
    let kind = value
        .get("kind")
        .cloned()
        .and_then(|kind| serde_json::from_value::<lsp_types::SymbolKind>(kind).ok())
        .map(|kind| symbol_kind_name(kind).to_owned())
        .unwrap_or_else(|| "class".to_owned());
    let line = value
        .pointer("/selectionRange/start/line")
        .and_then(Value::as_u64)
        .unwrap_or(0) as u32;
    let character = value
        .pointer("/selectionRange/start/character")
        .and_then(Value::as_u64)
        .unwrap_or(0) as u32;
    let path = uri
        .parse()
        .ok()
        .and_then(|parsed| uri_to_path(&parsed).ok());
    Some(HierarchyNode {
        name,
        kind,
        path,
        uri,
        line,
        character,
    })
}

fn class_file_text(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_owned)
        .or_else(|| {
            value
                .get("content")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_default()
}

fn lsp_range(range: SourceRange) -> Range {
    Range {
        start: Position {
            line: range.start.line,
            character: range.start.character,
        },
        end: Position {
            line: range.end.line,
            character: range.end.character,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semantic_tokens_are_delta_decoded() {
        let legend = vec!["method".to_owned(), "class".to_owned()];
        let data = vec![
            lsp_types::SemanticToken {
                delta_line: 2,
                delta_start: 4,
                length: 3,
                token_type: 0,
                token_modifiers_bitset: 0,
            },
            lsp_types::SemanticToken {
                delta_line: 0,
                delta_start: 5,
                length: 2,
                token_type: 1,
                token_modifiers_bitset: 0,
            },
        ];
        let tokens = decode_semantic_tokens(&data, &legend);
        assert_eq!(tokens[0].line, 2);
        assert_eq!(tokens[0].start, 4);
        assert_eq!(tokens[0].token_type, "method");
        assert_eq!(tokens[1].line, 2);
        assert_eq!(tokens[1].start, 9);
        assert_eq!(tokens[1].token_type, "class");
    }

    #[test]
    fn type_hierarchy_items_keep_array_tags() {
        let node = type_node_value(&json!({
            "name": "Object",
            "kind": 5,
            "tags": [1],
            "uri": "jdt://contents/java.base/java/lang/Object.class",
            "selectionRange": { "start": { "line": 10, "character": 2 }, "end": { "line": 10, "character": 8 } }
        }))
        .expect("node");
        assert_eq!(node.name, "Object");
        assert_eq!(node.kind, "class");
        assert_eq!(node.line, 10);
        assert!(node.uri.starts_with("jdt:"));
    }

    #[test]
    fn class_file_text_accepts_a_string_or_object() {
        assert_eq!(class_file_text(&json!("class A {}")), "class A {}");
        assert_eq!(
            class_file_text(&json!({ "content": "class B {}" })),
            "class B {}"
        );
    }
}
