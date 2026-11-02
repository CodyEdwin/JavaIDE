//! JavaIDE desktop shell.
//!
//! Tauri commands are thin adapters over the Rust core crates. The webview
//! owns presentation only; files, Gradle, and OpenCode all go through these
//! commands.

use std::collections::VecDeque;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::sync::RwLock;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use ide_gradle::{
    BuildSnapshot, GradleClient, GradleEvent, GradleOptions, RunTaskRequest, RunTaskResult,
    RunTestsRequest, RunTestsResult, TestListing,
};
use ide_jdtls::{
    CodeLensView, CompletionCandidate, FileEdits, FoldRange, HierarchyNode, HoverInfo,
    InlayHintView, JavaCodeAction, JavaSignature, JavaSymbol, JdtlsClient, JdtlsConfig, JdtlsEvent,
    JdtlsInstallation, PINNED_JDK_VERSION, PINNED_JDTLS_VERSION, PrepareRename, SemanticToken,
    SourceLocation, SourcePosition, SourceRange, SourceTextEdit, ensure_jdk, ensure_jdtls,
};
use ide_opencode::{
    CreateSession, DiscoveredService, OpenCodeClient, PermissionReply, PromptInput,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::{Mutex, broadcast};

const MAX_FILE_BYTES: u64 = 8 * 1024 * 1024;
const MAX_TREE_ENTRIES: usize = 4000;
const MAX_GRADLE_ARGUMENTS: usize = 64;
const DEBUG_LOG_CAPACITY: usize = 200;

struct AppState {
    workspace: RwLock<PathBuf>,
    gradle: Mutex<Option<Arc<GradleClient>>>,
    gradle_active: Mutex<Option<GradleOperation>>,
    gradle_next_id: AtomicU64,
    opencode: Mutex<Option<Arc<OpenCodeClient>>>,
    java: Mutex<JavaSession>,
    /// `window/logMessage` lines at LSP level 4 (log/debug). Warn and error
    /// stay on the Java panel; this ring keeps the panel from filling with
    /// server chatter.
    debug_log: std::sync::Mutex<VecDeque<String>>,
}

/// Lifecycle state of the Java language server for the open workspace.
///
/// The client is reachable through an [`Arc`] so concurrent hover/completion
/// requests never queue behind a running request. Shutdown takes the `Arc` out
/// of this state and unwraps it; if a request is still in flight the process is
/// stopped by [`JdtlsClient`]'s `Drop` instead of hanging the UI.
struct JavaSession {
    client: Option<Arc<JdtlsClient>>,
    state: String,
    message: String,
    pid: Option<u32>,
    jdtls_root: Option<PathBuf>,
    java_home: Option<PathBuf>,
}

impl JavaSession {
    fn stopped() -> Self {
        Self {
            client: None,
            state: "stopped".to_owned(),
            message: "Java language server is not running.".to_owned(),
            pid: None,
            jdtls_root: None,
            java_home: None,
        }
    }

    fn status(&self) -> JavaStatus {
        JavaStatus {
            state: self.state.clone(),
            message: self.message.clone(),
            pid: self.pid,
            jdtls_root: self.jdtls_root.as_deref().map(path_text),
            java_home: self.java_home.as_deref().map(path_text),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JavaStatus {
    state: String,
    message: String,
    pid: Option<u32>,
    jdtls_root: Option<String>,
    java_home: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JavaEvent {
    name: String,
    data: Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GradleOperation {
    request_id: String,
    label: String,
    kind: String,
}

impl AppState {
    fn new() -> Self {
        Self {
            workspace: RwLock::new(default_workspace_path()),
            gradle: Mutex::new(None),
            gradle_active: Mutex::new(None),
            gradle_next_id: AtomicU64::new(1),
            opencode: Mutex::new(None),
            java: Mutex::new(JavaSession::stopped()),
            debug_log: std::sync::Mutex::new(VecDeque::new()),
        }
    }

    fn next_gradle_request_id(&self, prefix: &str) -> String {
        format!(
            "{prefix}-{}",
            self.gradle_next_id.fetch_add(1, Ordering::Relaxed)
        )
    }

    async fn begin_gradle(
        &self,
        request_id: String,
        label: String,
        kind: &str,
    ) -> Result<(), String> {
        let mut active = self.gradle_active.lock().await;
        if let Some(current) = active.as_ref() {
            return Err(format!(
                "Gradle is already running {} {} ({})",
                current.kind, current.label, current.request_id
            ));
        }
        *active = Some(GradleOperation {
            request_id,
            label,
            kind: kind.to_owned(),
        });
        Ok(())
    }

    async fn finish_gradle(&self, request_id: &str) {
        let mut active = self.gradle_active.lock().await;
        if active
            .as_ref()
            .is_some_and(|current| current.request_id == request_id)
        {
            *active = None;
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    path: String,
    name: String,
    is_dir: bool,
    depth: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceView {
    root: String,
    files: Vec<FileEntry>,
    trust: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerSummary {
    version: String,
    pid: u32,
    url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionSummary {
    id: String,
    title: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiEvent {
    name: String,
    data: Value,
}

#[tauri::command]
fn default_workspace() -> Result<String, String> {
    let path = default_workspace_path();
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn open_workspace(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<WorkspaceView, String> {
    let root = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| format!("cannot open workspace: {error}"))?;
    if !root.is_dir() {
        return Err(format!("not a directory: {}", root.display()));
    }
    let mut files = Vec::new();
    collect_entries(&root, &root, 0, &mut files);
    *state
        .workspace
        .write()
        .map_err(|_| "workspace lock poisoned")? = root.clone();
    // The language server indexes one workspace. Stop it before the explorer
    // and the Gradle bridge describe the new project, otherwise diagnostics
    // from the previous root keep arriving for paths that are no longer open.
    stop_java(&app, &state).await;
    // Stop any running operation and the previous project's bridge before the
    // next sync starts. A run that is already unwinding only clears the active
    // slot when its own request id still matches, so it cannot clobber a newer
    // operation.
    stop_gradle(&state).await;
    let trust = trust_label(&root);
    Ok(WorkspaceView {
        root: root.to_string_lossy().into_owned(),
        files,
        trust,
    })
}

#[tauri::command]
async fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let path = PathBuf::from(path);
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("cannot open file: {error}"))?;
    let root = state
        .workspace
        .read()
        .map_err(|_| "workspace lock poisoned")?
        .clone();
    if !canonical.starts_with(&root) {
        return Err("file is outside the workspace".to_owned());
    }
    let metadata = std::fs::metadata(&canonical).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_FILE_BYTES {
        return Err(format!(
            "file is larger than {} MiB",
            MAX_FILE_BYTES / 1024 / 1024
        ));
    }
    std::fs::read_to_string(&canonical).map_err(|error| format!("cannot read file: {error}"))
}

#[tauri::command]
async fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), String> {
    let path = PathBuf::from(path);
    let root = state
        .workspace
        .read()
        .map_err(|_| "workspace lock poisoned")?
        .clone();
    let parent = path
        .parent()
        .ok_or_else(|| "file has no parent directory".to_owned())?
        .canonicalize()
        .map_err(|error| format!("cannot resolve parent directory: {error}"))?;
    if !parent.starts_with(&root) {
        return Err("file is outside the workspace".to_owned());
    }
    let name = path
        .file_name()
        .ok_or_else(|| "file has no name".to_owned())?;
    let target = parent.join(name);
    let temporary = parent.join(format!(".{}.javaide.tmp", name.to_string_lossy()));
    std::fs::write(&temporary, content).map_err(|error| format!("cannot write file: {error}"))?;
    std::fs::rename(&temporary, &target).map_err(|error| {
        let _ = std::fs::remove_file(&temporary);
        format!("cannot replace file: {error}")
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GradleCancelResult {
    request_id: String,
    cancelled: bool,
}

#[tauri::command]
async fn gradle_sync(
    app: AppHandle,
    state: State<'_, AppState>,
    arguments: Option<Vec<String>>,
) -> Result<BuildSnapshot, String> {
    let client = gradle_client(&app, &state).await?;
    let request_id = state.next_gradle_request_id("sync");
    state
        .begin_gradle(request_id.clone(), "project sync".to_owned(), "sync")
        .await?;
    let arguments = gradle_arguments(arguments);
    let result = client
        .sync_with_id(Some(&request_id), &arguments, Duration::from_secs(300))
        .await;
    state.finish_gradle(&request_id).await;
    let sync = result.map_err(|error| format!("Gradle sync failed: {error}"))?;
    Ok(sync.snapshot)
}

#[tauri::command]
async fn gradle_run_task(
    app: AppHandle,
    state: State<'_, AppState>,
    task: String,
    arguments: Option<Vec<String>>,
) -> Result<RunTaskResult, String> {
    let client = gradle_client(&app, &state).await?;
    let request_id = state.next_gradle_request_id("task");
    state
        .begin_gradle(request_id.clone(), task.clone(), "task")
        .await?;
    let request = RunTaskRequest {
        request_id: Some(request_id.clone()),
        tasks: vec![task],
        arguments: gradle_arguments(arguments),
        ..RunTaskRequest::default()
    };
    let result = client.run_task(&request, Duration::from_secs(300)).await;
    state.finish_gradle(&request_id).await;
    result.map_err(|error| format!("Gradle task failed: {error}"))
}

#[tauri::command]
async fn gradle_list_tests(
    app: AppHandle,
    state: State<'_, AppState>,
    arguments: Option<Vec<String>>,
) -> Result<TestListing, String> {
    let client = gradle_client(&app, &state).await?;
    let request_id = state.next_gradle_request_id("tests");
    state
        .begin_gradle(
            request_id.clone(),
            "test discovery".to_owned(),
            "test discovery",
        )
        .await?;
    let arguments = gradle_arguments(arguments);
    let result = client
        .list_tests_with_id(
            None,
            None,
            true,
            Some(&request_id),
            &arguments,
            Duration::from_secs(180),
        )
        .await;
    state.finish_gradle(&request_id).await;
    result.map_err(|error| format!("Test discovery failed: {error}"))
}

#[tauri::command]
async fn gradle_run_tests(
    app: AppHandle,
    state: State<'_, AppState>,
    class_name: Option<String>,
    arguments: Option<Vec<String>>,
) -> Result<RunTestsResult, String> {
    let client = gradle_client(&app, &state).await?;
    let label = class_name.clone().unwrap_or_else(|| "all tests".to_owned());
    let request_id = state.next_gradle_request_id("test");
    state
        .begin_gradle(request_id.clone(), label, "test run")
        .await?;
    let request = RunTestsRequest {
        request_id: Some(request_id.clone()),
        classes: class_name.into_iter().collect(),
        arguments: gradle_arguments(arguments),
        ..RunTestsRequest::default()
    };
    let result = client.run_tests(&request, Duration::from_secs(300)).await;
    state.finish_gradle(&request_id).await;
    result.map_err(|error| format!("Test run failed: {error}"))
}

/// Cancels the Gradle operation that is currently running, if any.
#[tauri::command]
async fn gradle_cancel(state: State<'_, AppState>) -> Result<GradleCancelResult, String> {
    let active = state.gradle_active.lock().await.clone();
    let Some(active) = active else {
        return Err("no Gradle operation is running".to_owned());
    };
    let client = state
        .gradle
        .lock()
        .await
        .clone()
        .ok_or_else(|| "Gradle is not connected".to_owned())?;
    let cancelled = client
        .cancel(&active.request_id)
        .await
        .map_err(|error| format!("cannot cancel Gradle operation: {error}"))?;
    Ok(GradleCancelResult {
        request_id: active.request_id,
        cancelled,
    })
}

/// Returns the operation that is currently running, if any.
#[tauri::command]
async fn gradle_active(state: State<'_, AppState>) -> Result<Option<GradleOperation>, String> {
    Ok(state.gradle_active.lock().await.clone())
}

/* ---------------- java language server ---------------- */

/// Returns the Java language-server state without starting it.
#[tauri::command]
async fn java_status(state: State<'_, AppState>) -> Result<JavaStatus, String> {
    Ok(java_status_snapshot(&state).await)
}

/// Starts jdtls for the open workspace; safe to call repeatedly.
#[tauri::command]
async fn java_start(app: AppHandle, state: State<'_, AppState>) -> Result<JavaStatus, String> {
    Ok(start_java(&app, &state).await)
}

/// Stops and restarts the Java language server.
#[tauri::command]
async fn java_restart(app: AppHandle, state: State<'_, AppState>) -> Result<JavaStatus, String> {
    stop_java(&app, &state).await;
    Ok(start_java(&app, &state).await)
}

/// Opens a document in jdtls, starting the server if needed.
#[tauri::command]
async fn java_open_document(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    text: String,
    version: i32,
) -> Result<JavaStatus, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = ensure_java(&app, &state).await?;
    client
        .open_document(&file, &text, version)
        .await
        .map_err(|error| format!("cannot open {} in jdtls: {error}", file.display()))?;
    Ok(java_status_snapshot(&state).await)
}

/// Sends full document contents to jdtls. Ignored when the server is stopped.
#[tauri::command]
async fn java_change_document(
    state: State<'_, AppState>,
    path: String,
    text: String,
    version: i32,
) -> Result<(), String> {
    let Some(client) = java_client_if_ready(&state).await else {
        return Ok(());
    };
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    client
        .change_document(&file, &text, version)
        .await
        .map(|_| ())
        .map_err(|error| format!("cannot update {} in jdtls: {error}", file.display()))
}

/// Notifies jdtls that a document was saved. Ignored when the server is stopped.
#[tauri::command]
async fn java_save_document(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let Some(client) = java_client_if_ready(&state).await else {
        return Ok(());
    };
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    client
        .save_document_at(&file)
        .await
        .map_err(|error| format!("cannot mark {} saved in jdtls: {error}", file.display()))
}

/// Notifies jdtls that a document was closed. Ignored when the server is stopped.
#[tauri::command]
async fn java_close_document(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let Some(client) = java_client_if_ready(&state).await else {
        return Ok(());
    };
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    client
        .close_document_at(&file)
        .await
        .map_err(|error| format!("cannot close {} in jdtls: {error}", file.display()))
}

/// Requests hover information. Returns `None` when there is nothing to show.
#[tauri::command]
async fn java_hover(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Option<HoverInfo>, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = java_client(&state).await?;
    client
        .hover(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(10),
        )
        .await
        .map_err(|error| format!("Hover failed: {error}"))
}

/// Requests completion candidates for a position.
#[tauri::command]
async fn java_completion(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<CompletionCandidate>, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = java_client(&state).await?;
    client
        .completion(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(15),
        )
        .await
        .map_err(|error| format!("Completion failed: {error}"))
}

/// Resolves definitions for the symbol at a position.
#[tauri::command]
async fn java_definition(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<SourceLocation>, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = java_client(&state).await?;
    client
        .definition(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(10),
        )
        .await
        .map_err(|error| format!("Go to definition failed: {error}"))
}

/// Requests signature help at a position.
#[tauri::command]
async fn java_signature_help(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<JavaSignature>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .signature_help(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(8),
        )
        .await
        .map_err(|error| format!("Signature help failed: {error}"))
}

/// Finds references, optionally including the declaration.
#[tauri::command]
async fn java_references(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<SourceLocation>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .references(
            &file,
            SourcePosition::new(line, character),
            true,
            Duration::from_secs(20),
        )
        .await
        .map_err(|error| format!("Find references failed: {error}"))
}

/// Finds implementations of the symbol at a position.
#[tauri::command]
async fn java_implementation(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<SourceLocation>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .implementation(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(20),
        )
        .await
        .map_err(|error| format!("Find implementations failed: {error}"))
}

/// Finds the type definition of the symbol at a position.
#[tauri::command]
async fn java_type_definition(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<SourceLocation>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .type_definition(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(15),
        )
        .await
        .map_err(|error| format!("Go to type definition failed: {error}"))
}

/// Checks whether the symbol at a position can be renamed.
#[tauri::command]
async fn java_prepare_rename(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Option<PrepareRename>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .prepare_rename(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(10),
        )
        .await
        .map_err(|error| format!("Prepare rename failed: {error}"))
}

/// Renames the symbol at a position. Edits are returned and not written.
#[tauri::command]
async fn java_rename(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
    new_name: String,
) -> Result<Vec<FileEdits>, String> {
    let new_name = new_name.trim().to_owned();
    if new_name.is_empty() || new_name.len() > 256 || new_name.contains('\0') {
        return Err("Enter a rename target".to_owned());
    }
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .rename(
            &file,
            SourcePosition::new(line, character),
            &new_name,
            Duration::from_secs(30),
        )
        .await
        .map_err(|error| format!("Rename failed: {error}"))
}

/// Requests code actions for a selection.
#[tauri::command]
async fn java_code_actions(
    state: State<'_, AppState>,
    path: String,
    start_line: u32,
    start_character: u32,
    end_line: u32,
    end_character: u32,
) -> Result<Vec<JavaCodeAction>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .code_actions(
            &file,
            SourceRange {
                start: SourcePosition::new(start_line, start_character),
                end: SourcePosition::new(end_line, end_character),
            },
            Duration::from_secs(20),
        )
        .await
        .map_err(|error| format!("Code actions failed: {error}"))
}

/// Returns the document outline.
#[tauri::command]
async fn java_document_symbols(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<JavaSymbol>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .document_symbols(&file, Duration::from_secs(15))
        .await
        .map_err(|error| format!("Document symbols failed: {error}"))
}

/// Searches symbols in the open workspace.
#[tauri::command]
async fn java_workspace_symbols(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<JavaSymbol>, String> {
    let query = query.trim();
    if query.len() > 200 {
        return Err("Symbol query is too long".to_owned());
    }
    let client = java_client(&state).await?;
    client
        .workspace_symbols(query, Duration::from_secs(20))
        .await
        .map_err(|error| format!("Workspace symbols failed: {error}"))
}

async fn java_file(state: &AppState, path: &str) -> Result<std::path::PathBuf, String> {
    let root = workspace_root(state)?;
    resolve_workspace_file(&root, path)
}

/// Formats the document in the active buffer.
///
/// Edits are returned to the caller and applied to the buffer, so formatting
/// never rewrites the file or discards unsaved changes.
#[tauri::command]
async fn java_format_document(
    state: State<'_, AppState>,
    path: String,
    tab_size: Option<u32>,
    insert_spaces: Option<bool>,
) -> Result<Vec<SourceTextEdit>, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = java_client(&state).await?;
    client
        .format_document(
            &file,
            tab_size.unwrap_or(4).clamp(1, 16),
            insert_spaces.unwrap_or(true),
            Duration::from_secs(15),
        )
        .await
        .map_err(|error| format!("Formatting failed: {error}"))
}

/// Returns the `source.organizeImports` edits for the active buffer.
#[tauri::command]
async fn java_organize_imports(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<SourceTextEdit>, String> {
    let root = workspace_root(&state)?;
    let file = resolve_workspace_file(&root, &path)?;
    let client = java_client(&state).await?;
    client
        .organize_imports(&file, Duration::from_secs(15))
        .await
        .map_err(|error| format!("Organize imports failed: {error}"))
}

/// Returns semantic tokens for an open Java file.
#[tauri::command]
async fn java_semantic_tokens(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<SemanticToken>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .semantic_tokens(&file, Duration::from_secs(20))
        .await
        .map_err(|error| format!("Semantic tokens failed: {error}"))
}

/// Returns inlay hints for the whole buffer.
#[tauri::command]
async fn java_inlay_hints(
    state: State<'_, AppState>,
    path: String,
    end_line: u32,
    end_character: u32,
) -> Result<Vec<InlayHintView>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .inlay_hints(
            &file,
            SourceRange {
                start: SourcePosition::new(0, 0),
                end: SourcePosition::new(end_line, end_character),
            },
            Duration::from_secs(20),
        )
        .await
        .map_err(|error| format!("Inlay hints failed: {error}"))
}

/// Returns folding ranges for a Java file.
#[tauri::command]
async fn java_folding_ranges(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<FoldRange>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .folding_ranges(&file, Duration::from_secs(20))
        .await
        .map_err(|error| format!("Folding ranges failed: {error}"))
}

/// Returns selection ranges growing outward from the cursor.
#[tauri::command]
async fn java_selection_ranges(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
) -> Result<Vec<SourceRange>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .selection_ranges(
            &file,
            SourcePosition::new(line, character),
            Duration::from_secs(15),
        )
        .await
        .map_err(|error| format!("Selection ranges failed: {error}"))
}

/// Returns one level of call or type hierarchy.
#[tauri::command]
async fn java_hierarchy(
    state: State<'_, AppState>,
    path: String,
    line: u32,
    character: u32,
    direction: String,
) -> Result<Vec<HierarchyNode>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .hierarchy(
            &file,
            SourcePosition::new(line, character),
            &direction,
            Duration::from_secs(20),
        )
        .await
        .map_err(|error| format!("Hierarchy failed: {error}"))
}

/// Returns resolved code lenses for a Java file.
#[tauri::command]
async fn java_code_lens(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<CodeLensView>, String> {
    let file = java_file(&state, &path).await?;
    let client = java_client(&state).await?;
    client
        .code_lens(&file, Duration::from_secs(20))
        .await
        .map_err(|error| format!("Code lens failed: {error}"))
}

/// Reads decompiled source for a `jdt://` URI.
#[tauri::command]
async fn java_class_file(state: State<'_, AppState>, uri: String) -> Result<String, String> {
    if !uri.starts_with("jdt:") || uri.len() > 8_192 || uri.contains('\0') {
        return Err("only jdt: documents can be opened".to_owned());
    }
    let client = java_client(&state).await?;
    client
        .class_file_contents(&uri, Duration::from_secs(20))
        .await
        .map_err(|error| format!("Could not read the decompiled document: {error}"))
}

/// Imports another folder into the running language server.
#[tauri::command]
async fn java_add_folder(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let folder = PathBuf::from(&path)
        .canonicalize()
        .map_err(|error| format!("cannot add folder: {error}"))?;
    if !folder.is_dir() {
        return Err("choose a directory".to_owned());
    }
    let client = java_client(&state).await?;
    client
        .add_workspace_folder(&folder)
        .await
        .map_err(|error| format!("Could not add the folder: {error}"))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TrustView {
    root: String,
    trust: String,
}

#[tauri::command]
fn workspace_trust(state: State<'_, AppState>) -> Result<TrustView, String> {
    let root = workspace_root(&state)?;
    Ok(TrustView {
        root: path_text(&root),
        trust: trust_label(&root),
    })
}

#[tauri::command]
async fn set_workspace_trust(
    app: AppHandle,
    state: State<'_, AppState>,
    trusted: bool,
) -> Result<TrustView, String> {
    let root = workspace_root(&state)?;
    let mut store = ide_config::TrustStore::load(&ide_config::trust_path(&config_dir()))
        .map_err(|error| error.to_string())?;
    store
        .set(&root, trusted)
        .map_err(|error| error.to_string())?;
    if !trusted {
        stop_java(&app, &state).await;
        stop_gradle(&state).await;
        *state.opencode.lock().await = None;
    }
    Ok(TrustView {
        root: path_text(&root),
        trust: trust_label(&root),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct JavaSettingsView {
    format_enabled: bool,
    completion_enabled: bool,
    completion_favorites: Vec<String>,
    completion_import_order: Vec<String>,
    completion_guess_method_arguments: bool,
    vmargs: String,
    origin: String,
}

#[tauri::command]
fn java_settings(state: State<'_, AppState>) -> Result<JavaSettingsView, String> {
    let root = workspace_root(&state)?;
    let loaded =
        ide_config::load_effective(&config_dir(), &root).map_err(|error| error.to_string())?;
    Ok(settings_view(loaded))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveSettingsResult {
    restart_required: bool,
    reasons: Vec<String>,
    origin: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JavaSettingsInput {
    format_enabled: bool,
    completion_enabled: bool,
    completion_favorites: Vec<String>,
    completion_import_order: Vec<String>,
    completion_guess_method_arguments: bool,
    vmargs: String,
    scope: String,
}

#[tauri::command]
async fn save_java_settings(
    state: State<'_, AppState>,
    settings: JavaSettingsInput,
) -> Result<SaveSettingsResult, String> {
    let root = workspace_root(&state)?;
    let previous =
        ide_config::load_effective(&config_dir(), &root).map_err(|error| error.to_string())?;
    let incoming = ide_config::JavaSettings {
        version: ide_config::SETTINGS_VERSION,
        format_enabled: settings.format_enabled,
        completion_enabled: settings.completion_enabled,
        completion_favorites: settings.completion_favorites,
        completion_import_order: settings.completion_import_order,
        completion_guess_method_arguments: settings.completion_guess_method_arguments,
        vmargs: settings.vmargs,
    };
    let path = match settings.scope.as_str() {
        "workspace" => ide_config::workspace_settings_path(&root),
        "user" => ide_config::user_settings_path(&config_dir()),
        _ => return Err("scope must be \"user\" or \"workspace\"".to_owned()),
    };
    ide_config::save_settings_file(&path, &incoming).map_err(|error| error.to_string())?;
    let effective =
        ide_config::load_effective(&config_dir(), &root).map_err(|error| error.to_string())?;
    let reasons: Vec<String> =
        ide_config::requires_restart(&previous.settings, &effective.settings)
            .into_iter()
            .map(str::to_owned)
            .collect();
    if let Some(client) = java_client_if_ready(&state).await {
        client
            .set_settings(effective.settings.to_language_server())
            .await
            .map_err(|error| format!("could not apply settings to jdtls: {error}"))?;
    }
    Ok(SaveSettingsResult {
        restart_required: !reasons.is_empty(),
        reasons,
        origin: effective.origin.as_str().to_owned(),
    })
}

#[tauri::command]
fn java_debug_log(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let log = state
        .debug_log
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    Ok(log.iter().cloned().collect())
}

#[tauri::command]
fn java_clear_debug_log(state: State<'_, AppState>) -> Result<(), String> {
    clear_debug_log(&state);
    Ok(())
}

fn path_text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn workspace_root(state: &AppState) -> Result<PathBuf, String> {
    state
        .workspace
        .read()
        .map(|workspace| workspace.clone())
        .map_err(|_| "workspace lock poisoned".to_owned())
}

fn resolve_workspace_file(root: &Path, path: &str) -> Result<PathBuf, String> {
    let canonical = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| format!("cannot open file: {error}"))?;
    if !canonical.starts_with(root) {
        return Err("file is outside the workspace".to_owned());
    }
    Ok(canonical)
}

async fn java_client(state: &AppState) -> Result<Arc<JdtlsClient>, String> {
    let session = state.java.lock().await;
    session
        .client
        .clone()
        .ok_or_else(|| session.message.clone())
}

async fn java_client_if_ready(state: &AppState) -> Option<Arc<JdtlsClient>> {
    state.java.lock().await.client.clone()
}

/// Returns the live session status, or a discovery summary when stopped.
async fn java_status_snapshot(state: &AppState) -> JavaStatus {
    let live = {
        let session = state.java.lock().await;
        if session.client.is_none() && session.state == "stopped" {
            None
        } else {
            Some(session.status())
        }
    };
    live.unwrap_or_else(discovery_status)
}

/// Describes whether jdtls could be started, without spawning a JVM.
fn discovery_status() -> JavaStatus {
    let root = discover_jdtls_root();
    let java_home = find_jdtls_java_home();
    let (state, message) = match (&root, &java_home) {
        (Some(root), Some(java)) => (
            "stopped",
            format!("jdtls at {} · JDK {}", root.display(), java.display()),
        ),
        (Some(_), None) => (
            "stopped",
            format!(
                "No JDK 25 was found. Starting the language server downloads Temurin {PINNED_JDK_VERSION}, or set JAVAIDE_JDTLS_JAVA_HOME."
            ),
        ),
        (None, _) => (
            "unavailable",
            "jdtls was not found. Set JAVAIDE_JDTLS_HOME to an extracted jdtls distribution."
                .to_owned(),
        ),
    };
    JavaStatus {
        state: state.to_owned(),
        message,
        pid: None,
        jdtls_root: root.as_deref().map(path_text),
        java_home: java_home.as_deref().map(path_text),
    }
}

/// Starts jdtls unless a start is already in flight or a session is live.
///
/// A failed start is reported through the returned status instead of an error:
/// a machine without jdtls is a supported configuration, and the rest of the
/// IDE keeps working.
async fn start_java(app: &AppHandle, state: &AppState) -> JavaStatus {
    if let Err(message) = ensure_trusted(state) {
        return set_java_session(app, state, None, "restricted", message, None, None).await;
    }
    {
        let mut session = state.java.lock().await;
        if session.client.is_some() || session.state == "starting" {
            return session.status();
        }
        // Claim the start while the lock is held so two concurrent document
        // opens cannot spawn two servers against the same data directory.
        session.state = "starting".to_owned();
        session.message = "Locating jdtls…".to_owned();
    }
    let Ok(root) = workspace_root(state) else {
        return discovery_status();
    };
    let installation_root = match discover_jdtls_root() {
        Some(root) => root,
        None => {
            let destination = app_data_dir().join("jdtls").join(PINNED_JDTLS_VERSION);
            set_java_session(
                app,
                state,
                None,
                "starting",
                format!("Downloading jdtls {PINNED_JDTLS_VERSION}…"),
                None,
                None,
            )
            .await;
            match ensure_jdtls(&destination).await {
                Ok(root) => root,
                Err(error) => {
                    return set_java_session(
                        app,
                        state,
                        None,
                        "unavailable",
                        format!(
                            "jdtls was not found and could not be downloaded: {error}. Set JAVAIDE_JDTLS_HOME to an extracted distribution."
                        ),
                        None,
                        None,
                    )
                    .await;
                }
            }
        }
    };
    let java_home = match resolve_jdtls_java(app, state, &installation_root).await {
        Ok(home) => home,
        Err(status) => return status,
    };
    let installation = match JdtlsInstallation::discover(&installation_root) {
        Ok(installation) => installation,
        Err(error) => {
            return set_java_session(
                app,
                state,
                None,
                "unavailable",
                format!("Invalid jdtls installation: {error}"),
                Some(installation_root),
                Some(java_home),
            )
            .await;
        }
    };
    let loaded = match ide_config::load_effective(&config_dir(), &root) {
        Ok(loaded) => loaded,
        Err(error) => {
            return java_failed(
                app,
                state,
                format!("Java settings could not be read: {error}"),
                installation_root,
                java_home,
            )
            .await;
        }
    };
    let vm_args = match ide_config::parse_vm_args(&loaded.settings.vmargs) {
        Ok(args) => args,
        Err(error) => {
            return java_failed(
                app,
                state,
                format!("Invalid java.jdt.ls.vmargs: {error}"),
                installation_root,
                java_home,
            )
            .await;
        }
    };
    let language_settings = loaded.settings.to_language_server();
    let mut config = JdtlsConfig::new(&java_home, installation, workspace_data_dir(&root), &root);
    config.vm_args = vm_args;
    config.settings = language_settings.clone();
    clear_debug_log(state);
    set_java_session(
        app,
        state,
        None,
        "starting",
        format!("Starting jdtls for {}…", root.display()),
        Some(installation_root.clone()),
        Some(java_home.clone()),
    )
    .await;

    let client = match JdtlsClient::start(config).await {
        Ok(client) => Arc::new(client),
        Err(error) => {
            return java_failed(
                app,
                state,
                format!("jdtls failed to start: {error}"),
                installation_root,
                java_home,
            )
            .await;
        }
    };
    // Subscribe before the handshake so status and log events during indexing
    // reach the UI instead of being lost.
    spawn_java_events(app.clone(), client.subscribe());
    if let Err(error) = client.initialize().await {
        return java_failed(
            app,
            state,
            format!("jdtls initialize failed: {error}"),
            installation_root,
            java_home,
        )
        .await;
    }
    if let Err(error) = client.initialized().await {
        return java_failed(
            app,
            state,
            format!("jdtls setup failed: {error}"),
            installation_root,
            java_home,
        )
        .await;
    }
    if let Err(error) = client.set_settings(language_settings).await {
        return java_failed(
            app,
            state,
            format!("jdtls rejected settings: {error}"),
            installation_root,
            java_home,
        )
        .await;
    }
    if let Err(error) = client
        .wait_for_service_ready(Duration::from_secs(120))
        .await
    {
        return java_failed(
            app,
            state,
            format!("jdtls did not become ready: {error}"),
            installation_root,
            java_home,
        )
        .await;
    }
    let message = client.pid().map_or_else(
        || "jdtls ready".to_owned(),
        |pid| format!("jdtls ready · pid {pid}"),
    );
    set_java_session(
        app,
        state,
        Some(client),
        "ready",
        message,
        Some(installation_root),
        Some(java_home),
    )
    .await
}

async fn java_failed(
    app: &AppHandle,
    state: &AppState,
    message: String,
    jdtls_root: PathBuf,
    java_home: PathBuf,
) -> JavaStatus {
    set_java_session(
        app,
        state,
        None,
        "failed",
        message,
        Some(jdtls_root),
        Some(java_home),
    )
    .await
}

async fn ensure_java(app: &AppHandle, state: &AppState) -> Result<Arc<JdtlsClient>, String> {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(180);
    loop {
        if let Some(client) = state.java.lock().await.client.clone() {
            return Ok(client);
        }
        let status = start_java(app, state).await;
        if status.state == "starting" {
            if tokio::time::Instant::now() > deadline {
                return Err("Timed out waiting for jdtls to start".to_owned());
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
            continue;
        }
        if let Some(client) = state.java.lock().await.client.clone() {
            return Ok(client);
        }
        return Err(status.message);
    }
}

async fn set_java_session(
    app: &AppHandle,
    state: &AppState,
    client: Option<Arc<JdtlsClient>>,
    session_state: &str,
    message: String,
    jdtls_root: Option<PathBuf>,
    java_home: Option<PathBuf>,
) -> JavaStatus {
    let pid = client.as_ref().and_then(|client| client.pid());
    let status = {
        let mut session = state.java.lock().await;
        session.client = client;
        session.state = session_state.to_owned();
        session.message = message;
        session.pid = pid;
        session.jdtls_root = jdtls_root;
        session.java_home = java_home;
        session.status()
    };
    emit_java_status(app, &status);
    status
}

/// Stops jdtls for the current workspace and records the stopped state.
///
/// The `Arc` is unwrapped so the protocol-level shutdown can run; when a
/// request still holds a handle, dropping the last handle kills the process,
/// which still leaves no orphan behind.
async fn stop_java(app: &AppHandle, state: &AppState) {
    let client = {
        let mut session = state.java.lock().await;
        session.state = "stopping".to_owned();
        session.client.take()
    };
    if let Some(client) = client
        && let Ok(mut owned) = Arc::try_unwrap(client)
    {
        let _ = owned.shutdown(Duration::from_secs(10)).await;
    }
    set_java_session(
        app,
        state,
        None,
        "stopped",
        "Java language server is stopped.".to_owned(),
        None,
        None,
    )
    .await;
}

fn emit_java_status(app: &AppHandle, status: &JavaStatus) {
    let data = serde_json::to_value(status).unwrap_or(Value::Null);
    let _ = app.emit(
        "java://event",
        JavaEvent {
            name: "status".to_owned(),
            data,
        },
    );
}

fn spawn_java_events(app: AppHandle, mut events: broadcast::Receiver<JdtlsEvent>) {
    tauri::async_runtime::spawn(async move {
        loop {
            match events.recv().await {
                Ok(event) => {
                    let diagnostics = event.diagnostics();
                    let terminal = matches!(
                        &event,
                        JdtlsEvent::Closed { .. } | JdtlsEvent::Exited { .. }
                    );
                    if let Some(diagnostics) = diagnostics {
                        let data = serde_json::to_value(diagnostics).unwrap_or(Value::Null);
                        let _ = app.emit("java://diagnostics", data);
                    } else if let Some((name, data)) = java_event_payload(&app, &event) {
                        let _ = app.emit("java://event", JavaEvent { name, data });
                    }
                    if terminal {
                        mark_java_dead(&app).await;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });
}

fn java_event_payload(app: &AppHandle, event: &JdtlsEvent) -> Option<(String, Value)> {
    match event {
        JdtlsEvent::Status { kind, message } => Some((
            "status-message".to_owned(),
            serde_json::json!({ "kind": kind, "message": message }),
        )),
        JdtlsEvent::LogMessage { level, message } => route_server_log(app, *level, message),
        JdtlsEvent::ShowMessage { level, message } => Some((
            "log".to_owned(),
            serde_json::json!({ "level": level, "message": message }),
        )),
        JdtlsEvent::Progress { token, value } => Some((
            "progress".to_owned(),
            serde_json::json!({ "token": token, "value": value }),
        )),
        JdtlsEvent::Closed { reason } => {
            Some(("closed".to_owned(), serde_json::json!({ "reason": reason })))
        }
        JdtlsEvent::Exited { status } => Some((
            "closed".to_owned(),
            serde_json::json!({ "reason": format!("process exited: {status:?}") }),
        )),
        JdtlsEvent::WorkspaceEdit { files } => Some((
            "workspace-edit".to_owned(),
            serde_json::to_value(files).unwrap_or(Value::Null),
        )),
        JdtlsEvent::WorkspaceEditRejected { reason } => Some((
            "workspace-edit-rejected".to_owned(),
            serde_json::json!({ "reason": reason }),
        )),
        JdtlsEvent::Diagnostics(_) | JdtlsEvent::Notification { .. } => None,
    }
}

/// Marks the session failed after the process disappears without a stop request.
async fn mark_java_dead(app: &AppHandle) {
    let state = app.state::<AppState>();
    let status = {
        let mut session = state.java.lock().await;
        if session.client.is_none() {
            return;
        }
        session.client = None;
        session.pid = None;
        session.state = "failed".to_owned();
        session.message = "jdtls stopped unexpectedly. Restart it from the Java panel.".to_owned();
        session.status()
    };
    emit_java_status(app, &status);
}

fn discover_jdtls_root() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("JAVAIDE_JDTLS_HOME") {
        let path = PathBuf::from(path);
        if JdtlsInstallation::discover(path.clone()).is_ok() {
            return Some(path.canonicalize().unwrap_or(path));
        }
    }
    let mut candidates = vec![
        repo_root().join("sidecar").join("jdtls"),
        PathBuf::from("/opt/jdtls"),
        PathBuf::from("/usr/local/lib/jdtls"),
    ];
    let installed = app_data_dir().join("jdtls");
    candidates.extend(version_directories(&installed));
    candidates.push(installed);
    candidates
        .into_iter()
        .find(|candidate| JdtlsInstallation::discover(candidate.clone()).is_ok())
        .map(|candidate| candidate.canonicalize().unwrap_or(candidate))
}

fn find_jdtls_java_home() -> Option<PathBuf> {
    find_jdk(ide_jdtls::JDTLS_MIN_JAVA)
}

/// Uses an installed JDK 25, or downloads the pinned Temurin runtime.
async fn resolve_jdtls_java(
    app: &AppHandle,
    state: &AppState,
    installation_root: &Path,
) -> Result<PathBuf, JavaStatus> {
    if let Some(home) = find_jdtls_java_home() {
        return Ok(home);
    }
    let destination = app_data_dir()
        .join("runtimes")
        .join(format!("jdk-{PINNED_JDK_VERSION}"));
    set_java_session(
        app,
        state,
        None,
        "starting",
        format!("jdtls needs JDK 25. Downloading Temurin {PINNED_JDK_VERSION} (about 135 MB)…"),
        Some(installation_root.to_path_buf()),
        None,
    )
    .await;
    match ensure_jdk(&destination).await {
        Ok(home) => Ok(home),
        Err(error) => Err(set_java_session(
            app,
            state,
            None,
            "unavailable",
            format!(
                "jdtls needs JDK 25. None was found, and Temurin {PINNED_JDK_VERSION} could not be downloaded: {error}. Install a JDK 25 and set JAVAIDE_JDTLS_JAVA_HOME."
            ),
            Some(installation_root.to_path_buf()),
            None,
        )
        .await),
    }
}

fn version_directories(root: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(root) else {
        return Vec::new();
    };
    let mut directories = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    // Newest version last in lexicographic order becomes first.
    directories.sort();
    directories.reverse();
    directories
}

/// Per-workspace jdtls state. jdtls requires a writable `-data` directory that
/// is unique per workspace and never inside the project.
fn workspace_data_dir(root: &Path) -> PathBuf {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    root.to_string_lossy().hash(&mut hasher);
    app_data_dir()
        .join("jdtls-data")
        .join(format!("{:016x}", hasher.finish()))
}

fn app_data_dir() -> PathBuf {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME")
        && !xdg.is_empty()
    {
        return PathBuf::from(xdg).join("javaide");
    }
    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home).join(".local/share/javaide");
    }
    std::env::temp_dir().join("javaide")
}

#[tauri::command]
async fn opencode_connect(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ServerSummary, String> {
    ensure_trusted(&state)?;
    if let Some(client) = state.opencode.lock().await.clone() {
        return Ok(summary(&client));
    }
    let service = DiscoveredService::discover()
        .map_err(|error| format!("OpenCode discovery failed: {error}"))?;
    let client = Arc::new(
        OpenCodeClient::connect(&service)
            .await
            .map_err(|error| format!("OpenCode connection failed: {error}"))?,
    );
    let result = summary(&client);
    let mut stream = client
        .subscribe_events()
        .await
        .map_err(|error| format!("OpenCode event subscription failed: {error}"))?;
    let handle = app.clone();
    let stream_client = Arc::clone(&client);
    tauri::async_runtime::spawn(async move {
        loop {
            while let Some(event) = stream.recv().await {
                let Ok(event) = event else { break };
                let _ = handle.emit(
                    "opencode://event",
                    AiEvent {
                        name: event.name,
                        data: event.data,
                    },
                );
            }
            let _ = handle.emit(
                "opencode://event",
                AiEvent {
                    name: "stream.closed".to_owned(),
                    data: Value::Null,
                },
            );
            tokio::time::sleep(Duration::from_secs(1)).await;
            match stream_client.subscribe_events().await {
                Ok(next) => {
                    stream = next;
                    let _ = handle.emit(
                        "opencode://event",
                        AiEvent {
                            name: "stream.reconnected".to_owned(),
                            data: Value::Null,
                        },
                    );
                }
                Err(_) => break,
            }
        }
    });
    *state.opencode.lock().await = Some(client);
    Ok(result)
}

#[tauri::command]
async fn opencode_sessions(state: State<'_, AppState>) -> Result<Vec<SessionSummary>, String> {
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    let root = state
        .workspace
        .read()
        .map_err(|_| "workspace lock poisoned")?
        .clone();
    let page = client
        .list_sessions(Some(&root), Some(100))
        .await
        .map_err(|error| format!("cannot list sessions: {error}"))?;
    Ok(page
        .data
        .into_iter()
        .map(|session| SessionSummary {
            title: session.title.unwrap_or_else(|| session.id.clone()),
            id: session.id,
        })
        .collect())
}

#[tauri::command]
async fn opencode_create_session(state: State<'_, AppState>) -> Result<SessionSummary, String> {
    ensure_trusted(&state)?;
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    let root = state
        .workspace
        .read()
        .map_err(|_| "workspace lock poisoned")?
        .clone();
    let session = client
        .create_session(&CreateSession::new(root))
        .await
        .map_err(|error| format!("cannot create session: {error}"))?;
    Ok(SessionSummary {
        title: session.title.unwrap_or_else(|| session.id.clone()),
        id: session.id,
    })
}

#[tauri::command]
async fn opencode_context(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<Value>, String> {
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    client
        .session_context(&session_id)
        .await
        .map_err(|error| format!("cannot load session context: {error}"))
}

#[tauri::command]
async fn opencode_prompt(
    state: State<'_, AppState>,
    session_id: String,
    text: String,
) -> Result<(), String> {
    ensure_trusted(&state)?;
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    client
        .send_prompt(&session_id, &PromptInput::text(text))
        .await
        .map_err(|error| format!("cannot send prompt: {error}"))?;
    Ok(())
}

#[tauri::command]
async fn opencode_interrupt(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<bool, String> {
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    client
        .interrupt(&session_id)
        .await
        .map_err(|error| format!("cannot interrupt session: {error}"))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PermissionView {
    id: String,
    session_id: String,
    action: String,
    message: String,
    resources: String,
}

#[tauri::command]
async fn opencode_permissions(state: State<'_, AppState>) -> Result<Vec<PermissionView>, String> {
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    let requests = client
        .list_permission_requests()
        .await
        .map_err(|error| format!("cannot list permissions: {error}"))?;
    Ok(requests
        .into_iter()
        .map(|request| PermissionView {
            id: request.id,
            session_id: request.session_id,
            action: request.action,
            message: request.message,
            resources: request.resources.to_string(),
        })
        .collect())
}

#[tauri::command]
async fn opencode_reply_permission(
    state: State<'_, AppState>,
    session_id: String,
    request_id: String,
    decision: String,
) -> Result<(), String> {
    ensure_trusted(&state)?;
    let reply = match decision.as_str() {
        "once" => PermissionReply::Once,
        "always" => PermissionReply::Always,
        "reject" => PermissionReply::Reject,
        _ => return Err("decision must be once, always, or reject".to_owned()),
    };
    let client = state.opencode.lock().await.clone();
    let client = client.ok_or_else(|| "OpenCode is not connected".to_owned())?;
    client
        .reply_permission(&session_id, &request_id, reply, None)
        .await
        .map_err(|error| format!("cannot reply to the permission request: {error}"))
}

fn summary(client: &OpenCodeClient) -> ServerSummary {
    ServerSummary {
        version: client.info().version.clone(),
        pid: client.info().pid,
        url: client.base_url().to_string(),
    }
}

async fn ensure_gradle(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let mut guard = state.gradle.lock().await;
    let root = state
        .workspace
        .read()
        .map_err(|_| "workspace lock poisoned")?
        .clone();
    // The bridge is bound to one build root. Never reuse a client that was
    // started for the previously opened project.
    if guard.as_ref().is_some_and(|client| client.root() == root) {
        return Ok(());
    }
    if let Some(client) = guard.take() {
        let _ = client.shutdown().await;
    }
    let bridge = find_bridge()?;
    let java_home = find_java_home()?;
    let client = GradleClient::start(GradleOptions {
        bridge,
        root,
        java_home: Some(java_home),
        ..GradleOptions::default()
    })
    .await
    .map_err(|error| format!("cannot start the Gradle bridge: {error}"))?;
    let mut events = client.subscribe();
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            match events.recv().await {
                Ok(GradleEvent::TaskOutput { stream, text, .. })
                | Ok(GradleEvent::TestOutput { stream, text, .. }) => {
                    let _ = handle.emit(
                        "gradle://output",
                        serde_json::json!({ "stream": stream, "text": text }),
                    );
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
                Ok(_) => {}
            }
        }
    });
    *guard = Some(Arc::new(client));
    Ok(())
}

/// Returns a shared handle to the bridge for the open workspace.
///
/// The handle is cloned out of the state mutex so long-running builds never
/// hold the mutex; otherwise the Stop command could not reach the client.
/// Gradle is refused until the workspace is trusted.
async fn gradle_client(app: &AppHandle, state: &AppState) -> Result<Arc<GradleClient>, String> {
    ensure_trusted(state)?;
    ensure_gradle(app, state).await?;
    let guard = state.gradle.lock().await;
    guard
        .clone()
        .ok_or_else(|| "Gradle is not connected".to_owned())
}

/// Cancels the active Gradle operation, if any, and stops the bridge.
async fn stop_gradle(state: &AppState) {
    let active = state.gradle_active.lock().await.clone();
    let previous = state.gradle.lock().await.take();
    if let Some(active) = active {
        if let Some(client) = previous.as_ref() {
            let _ = client.cancel(&active.request_id).await;
        }
        *state.gradle_active.lock().await = None;
    }
    if let Some(client) = previous {
        let _ = client.shutdown().await;
    }
}

/// Normalizes user-supplied Gradle arguments.
///
/// The UI tokenizes the settings text before invoking the command. This
/// boundary still trims, drops empty values, and caps the list so a malformed
/// request cannot create an unbounded command line.
fn gradle_arguments(arguments: Option<Vec<String>>) -> Vec<String> {
    arguments
        .unwrap_or_default()
        .into_iter()
        .filter_map(|argument| {
            let argument = argument.trim().to_owned();
            (!argument.is_empty() && argument.len() <= 4096 && !argument.contains('\0'))
                .then_some(argument)
        })
        .take(MAX_GRADLE_ARGUMENTS)
        .collect()
}

fn default_workspace_path() -> PathBuf {
    if let Some(path) = std::env::var_os("JAVAIDE_WORKSPACE") {
        let path = PathBuf::from(path);
        if path.is_dir() {
            return path.canonicalize().unwrap_or(path);
        }
    }
    let repo = repo_root();
    let fixture = repo.join("fixtures").join("java-gradle");
    if fixture.is_dir() {
        return fixture.canonicalize().unwrap_or(fixture);
    }
    std::env::var_os("HOME").map_or_else(|| PathBuf::from("."), PathBuf::from)
}

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
}

fn find_bridge() -> Result<PathBuf, String> {
    if let Some(path) = std::env::var_os("JAVAIDE_GRADLE_BRIDGE") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Ok(path);
        }
    }
    let relative = Path::new("sidecar")
        .join("gradle-bridge")
        .join("build")
        .join("install")
        .join("gradle-bridge")
        .join("bin")
        .join("gradle-bridge");
    let mut candidates = vec![repo_root().join(&relative)];
    if let Ok(current) = std::env::current_dir() {
        candidates.push(current.join(&relative));
        candidates.push(current.join("..").join(&relative));
        candidates.push(current.join("..").join("..").join(&relative));
    }
    for candidate in candidates {
        if candidate.is_file() {
            return candidate
                .canonicalize()
                .map_err(|error| format!("cannot resolve bridge path: {error}"));
        }
    }
    Err(
        "gradle-bridge is not built. Run `cd sidecar/gradle-bridge && ./gradlew installDist`."
            .to_owned(),
    )
}

fn find_java_home() -> Result<PathBuf, String> {
    find_jdk(17).ok_or_else(|| "no Java 17+ JDK found; set JAVA_HOME".to_owned())
}

/// Environment variables, well-known install roots, and a scan of JDK directories.
fn jdk_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    for variable in ["JAVAIDE_JDTLS_JAVA_HOME", "JAVA_HOME"] {
        if let Some(home) = std::env::var_os(variable) {
            candidates.push(PathBuf::from(home));
        }
    }
    candidates.push(PathBuf::from("/usr/lib/jvm/temurin-21"));
    candidates.push(PathBuf::from("/usr/lib/jvm/temurin-25"));
    candidates.push(PathBuf::from("/opt/java/temurin-21"));
    candidates.extend(version_directories(&app_data_dir().join("runtimes")));
    candidates.extend(scan_jdk_homes(&[
        PathBuf::from("/usr/lib/jvm"),
        PathBuf::from("/usr/lib/jvm/default-java"),
        PathBuf::from("/Library/Java/JavaVirtualMachines"),
    ]));
    candidates
}

fn scan_jdk_homes(roots: &[PathBuf]) -> Vec<PathBuf> {
    let mut found = Vec::new();
    for root in roots {
        if root.join("bin").join("java").is_file() {
            found.push(root.clone());
            continue;
        }
        let Ok(entries) = std::fs::read_dir(root) else {
            continue;
        };
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let home = path.join("Contents").join("Home");
            if home.join("bin").join("java").is_file() {
                found.push(home);
            } else if path.join("bin").join("java").is_file() {
                found.push(path);
            }
        }
    }
    found.sort();
    found.reverse();
    found
}

/// Picks the newest JDK at or above `minimum_major`.
///
/// The pinned jdtls build needs a current JDK (25 for 1.64). Choosing the
/// first match would keep an older `JAVA_HOME` and fail OSGi resolution.
fn find_jdk(minimum_major: u32) -> Option<PathBuf> {
    let mut best: Option<(u32, PathBuf)> = None;
    for home in jdk_candidates() {
        if !home.join("bin").join("java").is_file() {
            continue;
        }
        let Some(major) = java_major(&home) else {
            continue;
        };
        if major < minimum_major {
            continue;
        }
        let replace = best.as_ref().is_none_or(|(current, _)| major > *current);
        if replace {
            best = Some((major, home.canonicalize().unwrap_or(home)));
        }
    }
    best.map(|(_, home)| home)
}

fn java_major(home: &Path) -> Option<u32> {
    let output = Command::new(home.join("bin").join("java"))
        .arg("-version")
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stderr);
    let start = text.find('"')? + 1;
    let end = text[start..].find('"')? + start;
    let version = &text[start..end];
    let major = version.strip_prefix("1.").unwrap_or(version);
    major.split('.').next()?.parse().ok()
}

fn collect_entries(root: &Path, directory: &Path, depth: usize, files: &mut Vec<FileEntry>) {
    if depth > 10 || files.len() >= MAX_TREE_ENTRIES {
        return;
    }
    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };
    let mut entries = entries.filter_map(Result::ok).collect::<Vec<_>>();
    entries.sort_by(|a, b| {
        let a_dir = a.file_type().is_ok_and(|kind| kind.is_dir());
        let b_dir = b.file_type().is_ok_and(|kind| kind.is_dir());
        b_dir.cmp(&a_dir).then_with(|| {
            a.file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase())
        })
    });
    for entry in entries {
        if files.len() >= MAX_TREE_ENTRIES {
            return;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || is_skipped(&name) {
            continue;
        }
        let path = entry.path();
        let Ok(kind) = entry.file_type() else {
            continue;
        };
        let relative = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .into_owned();
        files.push(FileEntry {
            path: relative,
            name: name.clone(),
            is_dir: kind.is_dir(),
            depth,
        });
        if kind.is_dir() {
            collect_entries(root, &path, depth + 1, files);
        }
    }
}

fn is_skipped(name: &str) -> bool {
    matches!(
        name,
        "build" | "out" | "bin" | "target" | "node_modules" | "dist" | ".gradle"
    )
}

fn config_dir() -> PathBuf {
    if let Some(path) = std::env::var_os("JAVAIDE_CONFIG_DIR") {
        let path = PathBuf::from(path);
        if !path.as_os_str().is_empty() {
            return path;
        }
    }
    ide_platform::config_home()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("javaide")
}

fn trust_label(root: &Path) -> String {
    ide_config::TrustStore::load(&ide_config::trust_path(&config_dir()))
        .map(|store| store.decision(root).as_str().to_owned())
        .unwrap_or_else(|_| "unknown".to_owned())
}

fn ensure_trusted(state: &AppState) -> Result<(), String> {
    let root = workspace_root(state)?;
    let store = ide_config::TrustStore::load(&ide_config::trust_path(&config_dir()))
        .map_err(|error| error.to_string())?;
    match store.decision(&root) {
        ide_config::TrustDecision::Trusted => Ok(()),
        ide_config::TrustDecision::Restricted => Err(
            "This folder is restricted. Trust it before using Java language features, Gradle, or OpenCode.".to_owned(),
        ),
        ide_config::TrustDecision::Unknown => Err(
            "This folder is not trusted yet. Trust it before using Java language features, Gradle, or OpenCode.".to_owned(),
        ),
    }
}

fn settings_view(loaded: ide_config::EffectiveSettings) -> JavaSettingsView {
    let settings = loaded.settings;
    JavaSettingsView {
        format_enabled: settings.format_enabled,
        completion_enabled: settings.completion_enabled,
        completion_favorites: settings.completion_favorites,
        completion_import_order: settings.completion_import_order,
        completion_guess_method_arguments: settings.completion_guess_method_arguments,
        vmargs: settings.vmargs,
        origin: loaded.origin.as_str().to_owned(),
    }
}

/// LSP `MessageType`: 1 error, 2 warning, 3 info, 4 log.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ServerLogRoute {
    Panel,
    DebugBuffer,
}

fn server_log_route(level: i32) -> ServerLogRoute {
    if level >= 4 {
        ServerLogRoute::DebugBuffer
    } else {
        ServerLogRoute::Panel
    }
}

fn route_server_log(app: &AppHandle, level: i32, message: &str) -> Option<(String, Value)> {
    if server_log_route(level) == ServerLogRoute::DebugBuffer {
        push_debug_log(&app.state::<AppState>(), message);
        None
    } else {
        Some((
            "log".to_owned(),
            serde_json::json!({ "level": level, "message": message }),
        ))
    }
}

fn push_debug_log(state: &AppState, message: &str) {
    let mut log = state
        .debug_log
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if log.len() == DEBUG_LOG_CAPACITY {
        log.pop_front();
    }
    log.push_back(truncate_log_line(message));
}

fn clear_debug_log(state: &AppState) {
    let mut log = state
        .debug_log
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    log.clear();
}

fn truncate_log_line(message: &str) -> String {
    const LIMIT: usize = 2_000;
    if message.chars().count() <= LIMIT {
        return message.to_owned();
    }
    let mut truncated: String = message.chars().take(LIMIT).collect();
    truncated.push('…');
    truncated
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            default_workspace,
            open_workspace,
            read_file,
            write_file,
            gradle_sync,
            gradle_run_task,
            gradle_list_tests,
            gradle_run_tests,
            gradle_cancel,
            gradle_active,
            java_status,
            java_start,
            java_restart,
            java_open_document,
            java_change_document,
            java_save_document,
            java_close_document,
            java_hover,
            java_completion,
            java_definition,
            java_signature_help,
            java_references,
            java_implementation,
            java_type_definition,
            java_prepare_rename,
            java_rename,
            java_code_actions,
            java_document_symbols,
            java_workspace_symbols,
            java_format_document,
            java_organize_imports,
            java_semantic_tokens,
            java_inlay_hints,
            java_folding_ranges,
            java_selection_ranges,
            java_hierarchy,
            java_code_lens,
            java_class_file,
            java_add_folder,
            java_settings,
            save_java_settings,
            java_debug_log,
            java_clear_debug_log,
            workspace_trust,
            set_workspace_trust,
            opencode_connect,
            opencode_sessions,
            opencode_create_session,
            opencode_context,
            opencode_prompt,
            opencode_interrupt,
            opencode_permissions,
            opencode_reply_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JavaIDE");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gradle_arguments_trim_and_drop_invalid_values() {
        let args = gradle_arguments(Some(vec![
            " --info ".to_owned(),
            String::new(),
            "   ".to_owned(),
            "--console=plain".to_owned(),
            "bad\0argument".to_owned(),
        ]));
        assert_eq!(args, vec!["--info", "--console=plain"]);
    }

    #[test]
    fn gradle_arguments_are_capped() {
        let args = gradle_arguments(Some(vec![
            "-Pkey=value".to_owned();
            MAX_GRADLE_ARGUMENTS + 5
        ]));
        assert_eq!(args.len(), MAX_GRADLE_ARGUMENTS);
    }

    #[test]
    fn gradle_operation_uses_camel_case_wire_names() {
        let value = serde_json::to_value(GradleOperation {
            request_id: "task-7".to_owned(),
            label: ":slow".to_owned(),
            kind: "task".to_owned(),
        })
        .expect("operation");
        assert_eq!(value["requestId"], "task-7");
        assert_eq!(value["kind"], "task");
    }

    #[test]
    fn debug_log_messages_stay_out_of_the_panel() {
        assert_eq!(server_log_route(1), ServerLogRoute::Panel);
        assert_eq!(server_log_route(2), ServerLogRoute::Panel);
        assert_eq!(server_log_route(3), ServerLogRoute::Panel);
        assert_eq!(server_log_route(4), ServerLogRoute::DebugBuffer);
    }

    #[test]
    fn debug_log_ring_drops_the_oldest_line() {
        let state = AppState::new();
        for index in 0..(DEBUG_LOG_CAPACITY + 3) {
            push_debug_log(&state, &format!("line {index}"));
        }
        let log = state.debug_log.lock().expect("log");
        assert_eq!(log.len(), DEBUG_LOG_CAPACITY);
        let newest = format!("line {}", DEBUG_LOG_CAPACITY + 2);
        assert_eq!(log.front().map(String::as_str), Some("line 3"));
        assert_eq!(log.back().map(String::as_str), Some(newest.as_str()));
    }

    #[test]
    fn jdk_scan_finds_a_home_with_a_java_binary() {
        let root = std::env::temp_dir().join(format!("javaide-jdk-scan-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let home = root.join("jdk-21");
        std::fs::create_dir_all(home.join("bin")).unwrap();
        std::fs::write(home.join("bin").join("java"), b"").unwrap();
        let found = scan_jdk_homes(&[root.clone()]);
        assert_eq!(found, vec![home]);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn log_lines_truncate_on_char_boundaries() {
        assert_eq!(truncate_log_line("ok"), "ok");
        let long = "ä".repeat(2_001);
        let truncated = truncate_log_line(&long);
        assert!(truncated.ends_with('…'));
        assert!(truncated.chars().count() <= 2_001);
    }
}
