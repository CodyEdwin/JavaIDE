//! Application use cases and command dispatch.
//!
//! # Boundary
//!
//! This crate owns use cases: command handling, state aggregation, and policy
//! (trust, autosave, context). It depends only on domain ports and other
//! domain crates, never on concrete adapters or the UI.
//!
//! # Cancellation
//!
//! All use cases accept a [`CancellationToken`] from [`ide_domain`].

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

use async_trait::async_trait;
use ide_domain::{CancellationToken, DomainError};
use serde::{Deserialize, Serialize};

/// Errors from application use cases.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// A domain port returned an error.
    #[error("domain error: {0}")]
    Domain(#[from] Box<dyn DomainError + Send + Sync>),
    /// A requested resource was not found.
    #[error("not found: {0}")]
    NotFound(String),
    /// The operation was cancelled.
    #[error("cancelled")]
    Cancelled,
}

/// A command dispatched from the UI to the application core.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppCommand {
    /// Open a workspace folder.
    OpenWorkspace { path: String },
    /// Set trust for the open workspace.
    TrustWorkspace { trusted: bool },
    /// Open a document.
    OpenDocument { uri: String, text: String, version: i32 },
    /// Change a document's contents.
    ChangeDocument { uri: String, text: String, version: i32 },
    /// Save a document.
    SaveDocument { uri: String },
    /// Request completion candidates.
    RequestCompletion { uri: String, line: u32, character: u32 },
    /// Request hover information.
    RequestHover { uri: String, line: u32, character: u32 },
    /// Request definitions.
    RequestDefinition { uri: String, line: u32, character: u32 },
}

/// A use case handler that dispatches commands to port implementations.
#[async_trait]
pub trait CommandHandler: Send + Sync {
    /// Dispatch a command and return an event.
    async fn handle(
        &self,
        command: AppCommand,
        token: CancellationToken,
    ) -> Result<AppEvent, AppError>;
}

/// An event emitted by the application core.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppEvent {
    WorkspaceOpened { root: String, trust: String },
    DocumentOpened { uri: String, version: i32 },
    DocumentChanged { uri: String, version: i32 },
    CompletionResult { uri: String, candidates: Vec<String> },
    HoverResult { uri: String, contents: Option<String> },
    DefinitionResult { uri: String, locations: Vec<String> },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_serialization() {
        let cmd = AppCommand::OpenWorkspace {
            path: "/tmp/project".to_owned(),
        };
        let json = serde_json::to_value(&cmd).unwrap();
        assert_eq!(json["command"], "openWorkspace");
    }
}
