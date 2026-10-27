//! JavaIDE desktop shell.
//!
//! Tauri commands are thin adapters over the Rust core crates. The webview
//! owns presentation only; files, Gradle, and OpenCode all go through these
//! commands.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::sync::RwLock;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use ide_gradle::{
    BuildSnapshot, GradleClient, GradleOptions, RunTaskRequest, RunTaskResult, RunTestsRequest,
    RunTestsResult, TestListing,
};
use ide_opencode::{CreateSession, DiscoveredService, OpenCodeClient, PromptInput};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

const MAX_FILE_BYTES: u64 = 8 * 1024 * 1024;
const MAX_TREE_ENTRIES: usize = 4000;
const MAX_GRADLE_ARGUMENTS: usize = 64;

struct AppState {
    workspace: RwLock<PathBuf>,
    gradle: Mutex<Option<Arc<GradleClient>>>,
    gradle_active: Mutex<Option<GradleOperation>>,
    gradle_next_id: AtomicU64,
    opencode: Mutex<Option<Arc<OpenCodeClient>>>,
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
async fn open_workspace(state: State<'_, AppState>, path: String) -> Result<WorkspaceView, String> {
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
    // Stop any running operation and the previous project's bridge before the
    // next sync starts. A run that is already unwinding only clears the active
    // slot when its own request id still matches, so it cannot clobber a newer
    // operation.
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
    Ok(WorkspaceView {
        root: root.to_string_lossy().into_owned(),
        files,
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
    state: State<'_, AppState>,
    arguments: Option<Vec<String>>,
) -> Result<BuildSnapshot, String> {
    let client = gradle_client(&state).await?;
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
    state: State<'_, AppState>,
    task: String,
    arguments: Option<Vec<String>>,
) -> Result<RunTaskResult, String> {
    let client = gradle_client(&state).await?;
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
    state: State<'_, AppState>,
    arguments: Option<Vec<String>>,
) -> Result<TestListing, String> {
    let client = gradle_client(&state).await?;
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
    state: State<'_, AppState>,
    class_name: Option<String>,
    arguments: Option<Vec<String>>,
) -> Result<RunTestsResult, String> {
    let client = gradle_client(&state).await?;
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

#[tauri::command]
async fn opencode_connect(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ServerSummary, String> {
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
    tauri::async_runtime::spawn(async move {
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

fn summary(client: &OpenCodeClient) -> ServerSummary {
    ServerSummary {
        version: client.info().version.clone(),
        pid: client.info().pid,
        url: client.base_url().to_string(),
    }
}

async fn ensure_gradle(state: &AppState) -> Result<(), String> {
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
    *guard = Some(Arc::new(client));
    Ok(())
}

/// Returns a shared handle to the bridge for the open workspace.
///
/// The handle is cloned out of the state mutex so long-running builds never
/// hold the mutex; otherwise the Stop command could not reach the client.
async fn gradle_client(state: &AppState) -> Result<Arc<GradleClient>, String> {
    ensure_gradle(state).await?;
    let guard = state.gradle.lock().await;
    guard
        .clone()
        .ok_or_else(|| "Gradle is not connected".to_owned())
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
    let mut candidates = Vec::new();
    if let Some(home) = std::env::var_os("JAVA_HOME") {
        candidates.push(PathBuf::from(home));
    }
    candidates.push(PathBuf::from("/usr/lib/jvm/temurin-21"));
    candidates.push(PathBuf::from("/usr/lib/jvm/temurin-25"));
    candidates.push(PathBuf::from("/opt/java/temurin-21"));
    for candidate in candidates {
        if candidate.join("bin").join("java").is_file()
            && java_major(&candidate).is_some_and(|major| major >= 17)
        {
            return candidate
                .canonicalize()
                .map_err(|error| format!("cannot resolve JAVA_HOME: {error}"));
        }
    }
    Err("no Java 17+ JDK found; set JAVA_HOME".to_owned())
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
            opencode_connect,
            opencode_sessions,
            opencode_create_session,
            opencode_context,
            opencode_prompt,
            opencode_interrupt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JavaIDE");
}
