//! Port traits: capability-oriented interfaces that adapters implement.
//!
//! All methods are cancellation-safe. Long-running operations accept a
//! [`CancellationToken`] or return a handle with `cancel`.
//!
//! Ports do not expose `serde_json::Value`, `lsp_types`, Gradle classes, or
//! OpenCode schemas. They return domain types only.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{
    AssistantSessionId, ByteOffset, DocumentId, LanguageError, PermissionRequestId,
    ProjectId, TextRange, TurnId, WorkspaceId,
};

/// A cancellation token for long-running operations.
///
/// Cloning the token shares the cancellation state. Setting `cancelled` to
/// `true` requests cancellation; adapters should observe it and stop promptly.
#[derive(Debug, Clone, Default)]
pub struct CancellationToken {
    pub(crate) cancelled: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl CancellationToken {
    /// Creates a token that is not cancelled.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns `true` if cancellation has been requested.
    #[must_use]
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(std::sync::atomic::Ordering::Acquire)
    }

    /// Requests cancellation. All clones observe the change.
    pub fn cancel(&self) {
        self.cancelled.store(true, std::sync::atomic::Ordering::Release);
    }
}

/// Java language intelligence. Implemented by `ide-jdtls`; faked in tests.
#[async_trait]
pub trait LanguageService: Send + Sync {
    /// Must be idempotent. The app replays open documents after a restart.
    async fn open_document(
        &self,
        document: DocumentId,
        uri: &str,
        text: String,
        version: i32,
        token: CancellationToken,
    ) -> Result<(), LanguageError>;

    async fn change_document(
        &self,
        document: DocumentId,
        uri: &str,
        text: String,
        version: i32,
        token: CancellationToken,
    ) -> Result<(), LanguageError>;

    async fn close_document(&self, document: DocumentId) -> Result<(), LanguageError>;

    async fn completion(
        &self,
        document: DocumentId,
        position: crate::LspPosition,
        token: CancellationToken,
    ) -> Result<Vec<CompletionCandidate>, LanguageError>;

    async fn hover(
        &self,
        document: DocumentId,
        position: crate::LspPosition,
        token: CancellationToken,
    ) -> Result<Option<HoverInfo>, LanguageError>;

    async fn definition(
        &self,
        document: DocumentId,
        position: crate::LspPosition,
        token: CancellationToken,
    ) -> Result<Vec<SourceLocation>, LanguageError>;

    async fn references(
        &self,
        document: DocumentId,
        position: crate::LspPosition,
        include_declaration: bool,
        token: CancellationToken,
    ) -> Result<Vec<SourceLocation>, LanguageError>;

    async fn rename(
        &self,
        document: DocumentId,
        position: crate::LspPosition,
        new_name: &str,
        token: CancellationToken,
    ) -> Result<Vec<FileEdits>, LanguageError>;

    async fn code_actions(
        &self,
        document: DocumentId,
        range: TextRange,
        token: CancellationToken,
    ) -> Result<Vec<CodeAction>, LanguageError>;

    async fn formatting(
        &self,
        document: DocumentId,
        token: CancellationToken,
    ) -> Result<Vec<SourceEdit>, LanguageError>;

    async fn status(&self) -> LanguageStatus;
}

/// Build/task/test operations. Implemented by `ide-gradle`.
#[async_trait]
pub trait BuildSystem: Send + Sync {
    async fn sync(&self, reason: &str, token: CancellationToken) -> Result<BuildSnapshot, BuildError>;

    async fn run_task(
        &self,
        task: &str,
        arguments: Vec<String>,
        token: CancellationToken,
    ) -> Result<TaskResult, BuildError>;

    async fn cancel(&self, request_id: &str) -> Result<(), BuildError>;

    async fn resolve_classpath(
        &self,
        project_path: Option<&str>,
        source_set: &str,
        token: CancellationToken,
    ) -> Result<Classpath, BuildError>;
}

/// AI collaboration. Implemented by `ide-opencode`; a disabled adapter keeps
/// the IDE fully functional without OpenCode.
#[async_trait]
pub trait AssistantService: Send + Sync {
    async fn status(&self) -> AssistantStatus;

    async fn create_session(
        &self,
        workspace: WorkspaceId,
        directory: &std::path::Path,
    ) -> Result<AssistantSessionId, AssistantError>;

    async fn prompt(
        &self,
        session: &AssistantSessionId,
        text: &str,
        token: CancellationToken,
    ) -> Result<(), AssistantError>;

    async fn interrupt(&self, session: &AssistantSessionId) -> Result<(), AssistantError>;

    async fn reply_permission(
        &self,
        session: &AssistantSessionId,
        request: &PermissionRequestId,
        reply: PermissionReply,
    ) -> Result<(), AssistantError>;

    async fn diff(&self, session: &AssistantSessionId) -> Result<Vec<FileDiff>, AssistantError>;

    async fn revert(&self, session: &AssistantSessionId, turn: TurnId) -> Result<(), AssistantError>;
}

/// The only interface exposed to an AI agent. Implemented by the runtime and
/// served through `ide-mcp`; every method returns structured data, never a
/// raw protocol payload. Mutating methods are permission-gated.
#[async_trait]
pub trait IdeToolHost: Send + Sync {
    async fn workspace_info(&self) -> Result<WorkspaceInfo, crate::DomainError>;

    async fn open_editors(&self) -> Result<Vec<EditorInfo>, crate::DomainError>;

    async fn selection(
        &self,
        document: &str,
    ) -> Result<Option<SelectionInfo>, crate::DomainError>;

    async fn diagnostics(
        &self,
        document: Option<&str>,
    ) -> Result<Vec<DiagnosticInfo>, crate::DomainError>;

    async fn gradle_model(&self) -> Result<BuildSnapshot, crate::DomainError>;

    async fn run_gradle_task(
        &self,
        task: &str,
        arguments: Vec<String>,
    ) -> Result<TaskResult, crate::DomainError>;

    async fn test_results(&self) -> Result<Vec<TestRun>, crate::DomainError>;

    async fn open_location(&self, uri: &str, line: u32, character: u32) -> Result<(), crate::DomainError>;
}

// ----- View types shared across ports -----

/// One completion candidate.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CompletionCandidate {
    pub label: String,
    pub kind: String,
    pub detail: Option<String>,
    pub documentation: Option<String>,
    pub insert_text: Option<String>,
    pub sort_text: Option<String>,
    pub deprecated: bool,
}

/// Hover text for a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct HoverInfo {
    pub contents: String,
    pub range: Option<TextRange>,
}

/// A source location another file can be opened at.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SourceLocation {
    pub path: std::path::PathBuf,
    pub range: TextRange,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
}

/// Edits for one file, applied together as a single undo step.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FileEdits {
    pub path: std::path::PathBuf,
    pub edits: Vec<SourceEdit>,
}

/// A text edit: replace `range` with `new_text`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SourceEdit {
    pub range: TextRange,
    pub new_text: String,
}

/// A code action the editor can apply.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CodeAction {
    pub title: String,
    pub kind: String,
    pub preferred: bool,
    pub disabled_reason: Option<String>,
    pub edits: Vec<FileEdits>,
}

/// Language server status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LanguageStatus {
    pub state: String,
    pub message: String,
    pub pid: Option<u32>,
}

/// Build system snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BuildSnapshot {
    pub gradle_version: String,
    pub projects: Vec<BuildProject>,
    pub problems: Vec<BuildProblem>,
}

/// One Gradle project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BuildProject {
    pub path: String,
    pub tasks: Vec<String>,
    pub source_sets: Vec<String>,
}

/// One build problem.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BuildProblem {
    pub project: String,
    pub message: String,
    pub severity: String,
}

/// Task execution result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TaskResult {
    pub request_id: String,
    pub task: String,
    pub outcome: String,
    pub duration_ms: u64,
    pub output: String,
}

/// Classpath entries for one source set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Classpath {
    pub project_path: String,
    pub source_set: String,
    pub entries: Vec<String>,
}

/// Assistant service status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AssistantStatus {
    pub connected: bool,
    pub version: Option<String>,
    pub message: String,
}

/// Permission reply from the user.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum PermissionReply {
    Once,
    Always,
    Reject,
}

/// One file diff from an assistant turn.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FileDiff {
    pub file: String,
    pub patch: String,
    pub additions: usize,
    pub deletions: usize,
    pub status: String,
}

/// Workspace information exposed to the agent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WorkspaceInfo {
    pub roots: Vec<std::path::PathBuf>,
    pub project_type: String,
    pub gradle_version: Option<String>,
    pub jdk_version: Option<String>,
    pub trust_state: String,
}

/// Information about one open editor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EditorInfo {
    pub uri: String,
    pub dirty: bool,
    pub active: bool,
}

/// Current selection info.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SelectionInfo {
    pub uri: String,
    pub range: TextRange,
    pub text: String,
}

/// One diagnostic.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DiagnosticInfo {
    pub uri: String,
    pub range: TextRange,
    pub severity: String,
    pub message: String,
    pub source: Option<String>,
}

/// One test run result.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TestRun {
    pub id: String,
    pub name: String,
    pub class_name: String,
    pub method_name: Option<String>,
    pub state: String,
    pub duration_ms: u64,
    pub failures: Vec<String>,
}
