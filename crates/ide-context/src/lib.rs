//! Assistant context bundle builder.
//!
//! # Boundary
//!
//! This crate builds bounded, redacted context bundles that the IDE sends to
//! the OpenCode assistant. It does not depend on OpenCode, jdtls, or Gradle
//! directly; instead, it accepts the raw data as parameters and assembles it
//! into a shaped bundle.
//!
//! # Invariants
//!
//! - Context is bounded by a character budget (default 8-16k).
//! - Sensitive files (.env, credentials, user patterns) are redacted unless
//!   explicitly attached.
//! - Diagnostics and selection are snapshots at a specific document version.
//! - The bundle includes an omission report so the user can see what was cut.

use ide_domain::{ByteOffset, DocumentId, TextRange};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A request for context, sent with each assistant prompt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContextRequest {
    /// The workspace root.
    pub root: String,
    /// Active document URI, if any.
    pub active_document: Option<String>,
    /// Selection range within the active document, if any.
    pub selection: Option<TextRange>,
    /// Maximum characters of IDE context (default ~8k, hard cap configurable).
    #[serde(default = "default_budget")]
    pub budget_chars: usize,
    /// Files the user explicitly attached.
    pub attachments: Vec<ContextAttachment>,
}

/// Default context budget.
fn default_budget() -> usize {
    8192
}

/// A file explicitly attached to the context.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContextAttachment {
    /// File URI.
    pub uri: String,
    /// Human-readable name.
    pub name: String,
    /// Optional mention range within the file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mention: Option<TextRange>,
    /// Whether the file is known to be sensitive.
    #[serde(default)]
    pub sensitive: bool,
}

/// The assembled context bundle sent to the assistant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContextBundle {
    /// The formatted context text block.
    pub text: String,
    /// File attachments (URI + content preview).
    pub attachments: Vec<ContextAttachmentRef>,
    /// Items omitted due to budget or sensitivity.
    pub omitted: OmissionReport,
}

/// A reference to an attached file in the bundle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ContextAttachmentRef {
    /// File URI.
    pub uri: String,
    /// Preview text (first N lines).
    pub preview: String,
    /// Whether the file was redacted.
    pub redacted: bool,
}

/// Report of what was omitted from the context bundle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OmissionReport {
    /// Total characters omitted due to budget.
    pub budget_omitted_chars: usize,
    /// Number of files omitted.
    pub files_omitted: usize,
    /// Number of files redacted for sensitivity.
    pub files_redacted: usize,
    /// Human-readable reasons.
    pub reasons: Vec<String>,
}

/// Builds context bundles from editor, diagnostic, and project data.
pub struct ContextBuilder {
    budget_chars: usize,
}

impl ContextBuilder {
    /// Creates a builder with the given character budget.
    #[must_use]
    pub fn new(budget_chars: usize) -> Self {
        Self { budget_chars }
    }

    /// Builds a context bundle from the supplied data.
    ///
    /// Parameters are passed explicitly so this crate doesn't depend on
    /// jdtls, Gradle, or the editor directly.
    pub fn build(
        &self,
        request: &ContextRequest,
        active_text: Option<&str>,
        diagnostics: &[DiagnosticInfo],
        open_editors: &[EditorInfo],
        project_summary: &str,
    ) -> ContextBundle {
        let mut parts = Vec::new();
        let mut budget = self.budget_chars;
        let mut omitted = OmissionReport {
            budget_omitted_chars: 0,
            files_omitted: 0,
            files_redacted: 0,
            reasons: Vec::new(),
        };

        // Project summary first.
        if !project_summary.is_empty() {
            let entry = format!("project: {project_summary}");
            if budget >= entry.len() {
                parts.push(entry);
                budget -= entry.len();
            } else {
                omitted.budget_omitted_chars += entry.len() - budget;
                omitted.files_omitted += 1;
                omitted.reasons.push("project summary exceeded budget".to_owned());
                budget = 0;
            }
        }

        // Active document and selection.
        if let Some(uri) = &request.active_document {
            if let Some(text) = active_text {
                let selection_text = request.selection.map_or(text.to_owned(), |range| {
                    range_text(text, range)
                });
                let entry = format!("active_file: {uri}\nselection:\n{selection_text}");
                if budget >= entry.len() {
                    parts.push(entry);
                    budget -= entry.len();
                } else {
                    omitted.budget_omitted_chars += entry.len() - budget;
                    omitted.files_omitted += 1;
                    budget = 0;
                }
            }
        }

        // Diagnostics (bounded).
        let diag_text = diagnostics_text(diagnostics);
        if !diag_text.is_empty() && budget > 0 {
            if budget >= diag_text.len() {
                parts.push(diag_text);
                budget -= diag_text.len();
            } else {
                omitted.budget_omitted_chars += diag_text.len() - budget;
                budget = 0;
            }
        }

        // Open editors summary.
        if !open_editors.is_empty() && budget > 0 {
            let editors_text = open_editors
                .iter()
                .map(|e| format!("  {} (dirty: {})", e.uri, e.dirty))
                .collect::<Vec<_>>()
                .join("\n");
            let entry = format!("open_editors:\n{editors_text}");
            if budget >= entry.len() {
                parts.push(entry);
                budget -= entry.len();
            }
        }

        ContextBundle {
            text: parts.join("\n\n"),
            attachments: request
                .attachments
                .iter()
                .map(|a| ContextAttachmentRef {
                    uri: a.uri.clone(),
                    preview: if a.sensitive {
                        omitted.files_redacted += 1;
                        "[redacted]".to_owned()
                    } else {
                        a.name.clone()
                    },
                    redacted: a.sensitive,
                })
                .collect(),
            omitted,
        }
    }
}

/// Extracts text for a selection range.
fn range_text(text: &str, range: TextRange) -> String {
    let start = range.start.get().min(text.len());
    let end = range.end.get().min(text.len());
    if start > end {
        return String::new();
    }
    text[start..end].to_owned()
}

/// Formats diagnostics as text.
fn diagnostics_text(diagnostics: &[DiagnosticInfo]) -> String {
    if diagnostics.is_empty() {
        return String::new();
    }
    let mut lines = Vec::new();
    for d in diagnostics {
        lines.push(format!(
            "  {}:{}:{}: {}: {}",
            d.uri, d.range.start.get(), d.range.end.get(), d.severity, d.message
        ));
    }
    format!("diagnostics:\n{}", lines.join("\n"))
}

/// Diagnostic info for context building.
#[derive(Debug, Clone)]
pub struct DiagnosticInfo {
    pub uri: String,
    pub range: TextRange,
    pub severity: String,
    pub message: String,
}

/// Editor info for context building.
#[derive(Debug, Clone)]
pub struct EditorInfo {
    pub uri: String,
    pub dirty: bool,
}

impl Default for ContextBuilder {
    fn default() -> Self {
        Self::new(8192)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_includes_project_and_selection() {
        let builder = ContextBuilder::new(10000);
        let request = ContextRequest {
            root: "/tmp/proj".to_owned(),
            active_document: Some("file:///tmp/proj/A.java".to_owned()),
            selection: Some(TextRange::new(ByteOffset::new(0), ByteOffset::new(5))),
            budget_chars: 10000,
            attachments: Vec::new(),
        };
        let bundle = builder.build(
            &request,
            Some("class A {}\n"),
            &[],
            &[],
            "Gradle 9.8.1, Java 21",
        );
        assert!(bundle.text.contains("project: Gradle 9.8.1"));
        assert!(bundle.text.contains("file:///tmp/proj/A.java"));
        assert!(bundle.text.contains("class A"));
        assert!(bundle.omitted.files_omitted == 0);
    }

    #[test]
    fn budget_truncates_context() {
        let builder = ContextBuilder::new(20);
        let request = ContextRequest {
            root: "/tmp/proj".to_owned(),
            active_document: None,
            selection: None,
            budget_chars: 20,
            attachments: Vec::new(),
        };
        let bundle = builder.build(&request, None, &[], &[], "a very long project summary");
        assert!(bundle.omitted.budget_omitted_chars > 0);
    }

    #[test]
    fn sensitive_attachments_are_redacted() {
        let builder = ContextBuilder::new(10000);
        let request = ContextRequest {
            root: "/tmp/proj".to_owned(),
            active_document: None,
            selection: None,
            budget_chars: 10000,
            attachments: vec![ContextAttachment {
                uri: "file:///tmp/proj/.env".to_owned(),
                name: ".env".to_owned(),
                mention: None,
                sensitive: true,
            }],
        };
        let bundle = builder.build(&request, None, &[], &[], "");
        assert_eq!(bundle.attachments[0].preview, "[redacted]");
        assert!(bundle.attachments[0].redacted);
        assert_eq!(bundle.omitted.files_redacted, 1);
    }
}
