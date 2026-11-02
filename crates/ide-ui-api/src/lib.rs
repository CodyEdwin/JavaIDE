//! Serializable UI commands, events, and view models with TypeScript bindings.
//!
//! # Boundary
//!
//! This crate owns the wire shape of every request that flows between the UI
//! shell and the Rust core. Protocol types (`lsp_types`, Gradle DTOs, OpenCode
//! schemas) never appear here; they stay inside their adapter crates.
//!
//! Every public type derives [`ts_rs::TS`] so TypeScript bindings can be
//! generated and committed to `ui/src/generated/`.
use ide_domain::{SourceEdit, SourceLocation, TextRange};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The protocol version for the UI command/event envelope.
///
/// Bumped for incompatible command/event changes. Additive changes keep the
/// same version.
pub const PROTOCOL_VERSION: u16 = 1;

/// Every UI request carries a client-generated id and a protocol version so the
/// core can correlate responses with optimistic updates and reject stale
/// envelopes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Envelope<T> {
    pub protocol: u16,
    pub request_id: String,
    pub payload: T,
}

impl<T> Envelope<T> {
    /// Creates a new envelope for `payload` with the current protocol version.
    #[must_use]
    pub fn new(request_id: impl Into<String>, payload: T) -> Self {
        Self {
            protocol: PROTOCOL_VERSION,
            request_id: request_id.into(),
            payload,
        }
    }
}

/// Commands the UI can send to the core.
///
/// These are serializable requests, not trait method calls. The core dispatches
/// each variant to the appropriate use case.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase", tag = "command", content = "args")]
#[ts(export)]
pub enum Command {
    OpenWorkspace(OpenWorkspace),
    CloseWorkspace,
    TrustWorkspace(TrustWorkspace),
    OpenDocument(OpenDocument),
    ChangeDocument(ChangeDocument),
    SaveDocument(SaveDocument),
    ReloadDocument(ReloadDocument),
    RequestCompletion(RequestCompletion),
    RequestHover(RequestHover),
    RequestDefinition(RequestDefinition),
    RequestReferences(RequestReferences),
    RequestSignatureHelp(RequestSignatureHelp),
    RequestCodeActions(RequestCodeActions),
    ApplyCodeAction(ApplyCodeAction),
    RenameSymbol(RenameSymbol),
    FormatDocument(FormatDocument),
    OrganizeImports(OrganizeImports),
    SyncBuild(SyncBuild),
    RunTask(RunTask),
    RunTests(RunTests),
    StartDebug(StartDebug),
    CreateAssistantSession(CreateAssistantSession),
    SendAssistantPrompt(SendAssistantPrompt),
    ApprovePermission(ApprovePermission),
    ShowAssistantDiff(ShowAssistantDiff),
    RevertAssistantTurn(RevertAssistantTurn),
    UpdateSettings(UpdateSettings),
    RevealInExplorer(RevealInExplorer),
    OpenLocation(OpenLocation),
}

// ----- Commands -----

/// Opens a workspace folder.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OpenWorkspace {
    pub path: String,
}

/// Records a trust decision for the open workspace.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TrustWorkspace {
    pub trusted: bool,
}

/// Opens a document in the language server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OpenDocument {
    pub uri: String,
    pub text: String,
    pub version: i32,
}

/// Sends an incremental full-document change to the language server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ChangeDocument {
    pub uri: String,
    pub text: String,
    pub version: i32,
}

/// Marks a document as saved.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SaveDocument {
    pub uri: String,
}

/// Reloads a document from disk.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ReloadDocument {
    pub uri: String,
}

/// Requests completion candidates at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestCompletion {
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

/// Requests hover information at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestHover {
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

/// Requests definitions for the symbol at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestDefinition {
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

/// Requests references to the symbol at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestReferences {
    pub uri: String,
    pub line: u32,
    pub character: u32,
    pub include_declaration: bool,
}

/// Requests signature help at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestSignatureHelp {
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

/// Requests code actions for a range.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RequestCodeActions {
    pub uri: String,
    pub start_line: u32,
    pub start_character: u32,
    pub end_line: u32,
    pub end_character: u32,
}

/// Applies a code action.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ApplyCodeAction {
    pub uri: String,
    pub action_index: usize,
}

/// Renames the symbol at a position.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RenameSymbol {
    pub uri: String,
    pub line: u32,
    pub character: u32,
    pub new_name: String,
}

/// Formats a document.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FormatDocument {
    pub uri: String,
    pub tab_size: u32,
    pub insert_spaces: bool,
}

/// Organizes imports in a document.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OrganizeImports {
    pub uri: String,
}

/// Synchronizes the Gradle project model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SyncBuild {
    pub arguments: Vec<String>,
}

/// Runs a Gradle task.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RunTask {
    pub task: String,
    pub arguments: Vec<String>,
}

/// Runs tests.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RunTests {
    pub classes: Vec<String>,
    pub arguments: Vec<String>,
}

/// Starts a debug session.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct StartDebug {
    pub config: String,
}

/// Creates an assistant session.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CreateAssistantSession {
    pub directory: String,
}

/// Sends a prompt to the assistant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SendAssistantPrompt {
    pub session_id: String,
    pub text: String,
}

/// Approves or rejects a permission request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ApprovePermission {
    pub session_id: String,
    pub request_id: String,
    pub decision: String,
}

/// Shows the diff for an assistant turn.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ShowAssistantDiff {
    pub session_id: String,
    pub turn_id: String,
}

/// Reverts an assistant turn.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RevertAssistantTurn {
    pub session_id: String,
    pub turn_id: String,
}

/// Updates Java settings.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UpdateSettings {
    pub format_enabled: bool,
    pub completion_enabled: bool,
    pub completion_favorites: Vec<String>,
    pub completion_import_order: Vec<String>,
    pub completion_guess_method_arguments: bool,
    pub vmargs: String,
    pub scope: String,
}

/// Reveals a file in the explorer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RevealInExplorer {
    pub path: String,
}

/// Opens a location in the editor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OpenLocation {
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

// ----- Events -----

/// Immutable facts emitted by the core. The UI reacts to these; it never
/// constructs them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
#[ts(export)]
pub enum Event {
    WorkspaceOpened(WorkspaceOpened),
    WorkspaceClosed,
    TrustChanged(TrustChanged),
    DocumentOpened(DocumentOpened),
    DocumentChanged(DocumentChanged),
    DocumentSaved(DocumentSaved),
    DocumentClosed(DocumentClosed),
    DiagnosticsPublished(DiagnosticsPublished),
    CompletionResult(CompletionResult),
    HoverResult(HoverResult),
    DefinitionResult(DefinitionResult),
    ReferencesResult(ReferencesResult),
    SignatureHelpResult(SignatureHelpResult),
    CodeActionsResult(CodeActionsResult),
    RenameResult(RenameResult),
    FormatResult(FormatResult),
    OrganizeImportsResult(OrganizeImportsResult),
    BuildSynced(BuildSynced),
    TaskResult(TaskResultEvent),
    TestResults(TestResultsEvent),
    DebugState(DebugState),
    AssistantStatus(AssistantStatusEvent),
    AssistantEvent(AssistantEvent),
    PermissionRequested(PermissionRequested),
    PermissionResolved(PermissionResolved),
    AssistantDiff(AssistantDiff),
    SettingsSaved(SettingsSaved),
    JavaStatus(JavaStatusEvent),
}

// ----- Event payloads -----

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WorkspaceOpened {
    pub root: String,
    pub trust: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TrustChanged {
    pub root: String,
    pub trust: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DocumentOpened {
    pub uri: String,
    pub version: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DocumentChanged {
    pub uri: String,
    pub version: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DocumentSaved {
    pub uri: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DocumentClosed {
    pub uri: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DiagnosticsPublished {
    pub uri: String,
    pub version: Option<i32>,
    pub diagnostics: Vec<DiagnosticView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DiagnosticView {
    pub range: TextRange,
    pub severity: String,
    pub message: String,
    pub source: Option<String>,
    pub code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CompletionResult {
    pub uri: String,
    pub candidates: Vec<CompletionCandidateView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CompletionCandidateView {
    pub label: String,
    pub kind: String,
    pub detail: Option<String>,
    pub documentation: Option<String>,
    pub insert_text: Option<String>,
    pub sort_text: Option<String>,
    pub deprecated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HoverResult {
    pub uri: String,
    pub contents: Option<String>,
    pub range: Option<TextRange>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DefinitionResult {
    pub uri: String,
    pub locations: Vec<SourceLocation>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ReferencesResult {
    pub uri: String,
    pub locations: Vec<SourceLocation>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SignatureHelpResult {
    pub uri: String,
    pub signatures: Vec<SignatureView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SignatureView {
    pub label: String,
    pub documentation: Option<String>,
    pub active: bool,
    pub parameters: Vec<SignatureParameterView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SignatureParameterView {
    pub label: String,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CodeActionsResult {
    pub uri: String,
    pub actions: Vec<CodeActionView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CodeActionView {
    pub title: String,
    pub kind: String,
    pub preferred: bool,
    pub disabled_reason: Option<String>,
    pub edits: Vec<FileEditsView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FileEditsView {
    pub path: std::path::PathBuf,
    pub edits: Vec<SourceEdit>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RenameResult {
    pub uri: String,
    pub edits: Vec<FileEditsView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FormatResult {
    pub uri: String,
    pub edits: Vec<SourceEdit>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct OrganizeImportsResult {
    pub uri: String,
    pub edits: Vec<SourceEdit>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BuildSynced {
    pub gradle_version: String,
    pub projects: Vec<BuildProjectView>,
    pub problems: Vec<BuildProblemView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BuildProjectView {
    pub path: String,
    pub tasks: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BuildProblemView {
    pub project: String,
    pub message: String,
    pub severity: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TaskResultEvent {
    pub request_id: String,
    pub task: String,
    pub outcome: String,
    pub duration_ms: u64,
    pub output: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TestResultsEvent {
    pub results: Vec<TestRunView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TestRunView {
    pub id: String,
    pub name: String,
    pub class_name: String,
    pub method_name: Option<String>,
    pub state: String,
    pub duration_ms: u64,
    pub failures: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DebugState {
    pub session_id: Option<String>,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AssistantStatusEvent {
    pub connected: bool,
    pub version: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AssistantEvent {
    pub session_id: String,
    pub kind: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PermissionRequested {
    pub session_id: String,
    pub request_id: String,
    pub action: String,
    pub message: String,
    pub resources: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PermissionResolved {
    pub session_id: String,
    pub request_id: String,
    pub decision: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AssistantDiff {
    pub session_id: String,
    pub turn_id: String,
    pub files: Vec<FileDiffView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FileDiffView {
    pub file: String,
    pub patch: String,
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SettingsSaved {
    pub origin: String,
    pub restart_required: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JavaStatusEvent {
    pub state: String,
    pub message: String,
    pub pid: Option<u32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn envelope_round_trips() {
        let cmd = Command::OpenWorkspace(OpenWorkspace {
            path: "/tmp/project".to_owned(),
        });
        let envelope = Envelope::new("req-1", cmd.clone());
        let json = serde_json::to_value(&envelope).expect("serialize");
        let back: Envelope<Command> = serde_json::from_value(json).expect("deserialize");
        assert_eq!(back.protocol, PROTOCOL_VERSION);
        assert_eq!(back.request_id, "req-1");
        match back.payload {
            Command::OpenWorkspace(ow) => assert_eq!(ow.path, "/tmp/project"),
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[test]
    fn protocol_version_is_one() {
        assert_eq!(PROTOCOL_VERSION, 1);
    }

    #[test]
    fn trust_workspace_serializes() {
        let trust = TrustWorkspace { trusted: true };
        let json = serde_json::to_value(&trust).expect("serialize");
        assert_eq!(json["trusted"], true);
    }

    #[test]
    fn command_tag_is_discriminated() {
        let cmd = Command::CloseWorkspace;
        let json = serde_json::to_value(&cmd).expect("serialize");
        assert_eq!(json["command"], "closeWorkspace");
    }
}
