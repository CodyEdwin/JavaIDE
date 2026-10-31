//! jdtls process lifecycle, LSP client, and server-request handling.

use std::collections::HashMap;
use std::fmt;
use std::io;
use std::path::PathBuf;
use std::process::ExitStatus;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, PoisonError, RwLock};
use std::time::Duration;

use ide_jsonrpc::{ErrorObject, Incoming, RequestId, RpcPeer};
use ide_platform::{IoMode, ManagedChild, ProcessSpec};
use lsp_types::{
    CodeActionContext, CodeActionKind, CodeActionOrCommand, CodeActionParams, CodeActionResponse,
    CompletionParams, CompletionResponse, DidChangeTextDocumentParams, DidCloseTextDocumentParams,
    DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentFormattingParams,
    ExecuteCommandParams, FormattingOptions, GotoDefinitionParams, GotoDefinitionResponse, Hover,
    HoverParams, InitializeResult, PartialResultParams, Position, PublishDiagnosticsParams, Range,
    TextDocumentContentChangeEvent, TextDocumentIdentifier, TextDocumentItem,
    TextDocumentPositionParams, TextEdit, Uri, VersionedTextDocumentIdentifier,
    WorkDoneProgressParams, WorkspaceEdit,
};
use serde::Deserialize;
use serde_json::{Value, json};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::ChildStderr;
use tokio::sync::{broadcast, mpsc, oneshot, watch};

use crate::JdtlsError;
use crate::config::{JdtlsConfig, file_uri};
use crate::features::{
    CompletionCandidate, DocumentDiagnostics, HoverInfo, SourceLocation, SourcePosition,
    SourceTextEdit, completion_candidates, definition_locations, document_diagnostics, hover_info,
    text_edits, workspace_text_edits,
};
use crate::text::apply_workspace_edit;

const EVENT_CAPACITY: usize = 1024;
const INCOMING_CAPACITY: usize = 256;
const LOG_LINE_LIMIT: usize = 4096;

/// An event emitted by the jdtls connection.
#[derive(Debug, Clone)]
pub enum JdtlsEvent {
    /// A `textDocument/publishDiagnostics` notification.
    Diagnostics(PublishDiagnosticsParams),
    /// A jdtls `language/status` notification.
    Status {
        /// Status kind, for example `ServiceReady` or `ProjectStatus`.
        kind: String,
        /// Human-readable status message.
        message: String,
    },
    /// A `window/logMessage` notification.
    LogMessage {
        /// LSP message type (`1` error, `2` warning, `3` info, `4` log).
        level: i32,
        /// Message text.
        message: String,
    },
    /// A `window/showMessage` notification.
    ShowMessage {
        /// LSP message type.
        level: i32,
        /// Message text.
        message: String,
    },
    /// A `$/progress` notification.
    Progress {
        /// Progress token.
        token: Value,
        /// Progress payload.
        value: Value,
    },
    /// Any notification this adapter does not normalize yet.
    Notification {
        /// Method name.
        method: String,
        /// Raw parameters.
        params: Option<Value>,
    },
    /// The transport closed.
    Closed {
        /// Transport error, or `None` for a clean EOF.
        reason: Option<String>,
    },
    /// The jdtls process exited.
    Exited {
        /// Exit status, if it could be collected.
        status: Option<ExitStatus>,
    },
}

impl JdtlsEvent {
    /// Returns the protocol-neutral diagnostic view for this event.
    ///
    /// Returns `None` for every other event, and for publications that use a
    /// non-`file:` URI (for example a jdtls `jdt://` virtual document), which
    /// the IDE cannot map to an editable document.
    #[must_use]
    pub fn diagnostics(&self) -> Option<DocumentDiagnostics> {
        match self {
            Self::Diagnostics(params) => document_diagnostics(params),
            _ => None,
        }
    }
}

impl fmt::Display for JdtlsEvent {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Diagnostics(diagnostics) => write!(
                formatter,
                "diagnostics for {} ({} items)",
                diagnostics.uri.as_str(),
                diagnostics.diagnostics.len()
            ),
            Self::Status { kind, message } => write!(formatter, "status {kind}: {message}"),
            Self::LogMessage { level, message } => {
                write!(formatter, "log({level}): {message}")
            }
            Self::ShowMessage { level, message } => {
                write!(formatter, "showMessage({level}): {message}")
            }
            Self::Progress { token, .. } => write!(formatter, "progress {token}"),
            Self::Notification { method, .. } => write!(formatter, "notification {method}"),
            Self::Closed { reason } => match reason {
                Some(reason) => write!(formatter, "closed: {reason}"),
                None => formatter.write_str("closed"),
            },
            Self::Exited { status } => write!(formatter, "exited ({status:?})"),
        }
    }
}

/// A running jdtls instance.
///
/// One client owns one language-server process and one workspace. The client is
/// not `Clone`; wrap it in the application's supervisor if shared access is
/// needed.
pub struct JdtlsClient {
    peer: RpcPeer,
    events: broadcast::Sender<JdtlsEvent>,
    ready: watch::Receiver<bool>,
    exit: watch::Receiver<Option<ExitStatus>>,
    kill: Mutex<Option<oneshot::Sender<()>>>,
    settings: Arc<RwLock<Value>>,
    diagnostics: Arc<Mutex<HashMap<String, PublishDiagnosticsParams>>>,
    config: JdtlsConfig,
    workspace_root: PathBuf,
    pid: Option<u32>,
    initialized: AtomicBool,
}

impl fmt::Debug for JdtlsClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("JdtlsClient")
            .field("pid", &self.pid)
            .field("workspace_root", &self.workspace_root)
            .field("closed", &self.peer.is_closed())
            .finish_non_exhaustive()
    }
}

impl JdtlsClient {
    /// Validates the configuration and starts jdtls.
    ///
    /// The process is started before any LSP request. Call
    /// [`JdtlsClient::initialize`] and then [`JdtlsClient::initialized`] to
    /// complete the handshake.
    ///
    /// # Errors
    ///
    /// Returns an error if the distribution, JDK, or workspace is invalid, if
    /// the process cannot be spawned, or if the Java version probe fails.
    pub async fn start(mut config: JdtlsConfig) -> Result<Self, JdtlsError> {
        config.validate()?;
        let java = config.java_executable();
        if !java.is_file() {
            return Err(JdtlsError::JavaMissing(java));
        }
        if !config.skip_java_version_check {
            let major = probe_java_major(&java).await?;
            if major < 21 {
                return Err(JdtlsError::JavaTooOld { found: major });
            }
        }

        let workspace_root =
            config
                .workspace_root
                .canonicalize()
                .map_err(|error| JdtlsError::PathIo {
                    path: config.workspace_root.clone(),
                    source: error,
                })?;
        config.workspace_root = workspace_root.clone();
        let root_uri = file_uri(&workspace_root)?;
        std::fs::create_dir_all(&config.data_dir).map_err(|error| JdtlsError::PathIo {
            path: config.data_dir.clone(),
            source: error,
        })?;

        let mut vm_args = vec![
            "-Xmx1G".to_owned(),
            "-XX:+UseParallelGC".to_owned(),
            "-XX:GCTimeRatio=4".to_owned(),
            "-XX:AdaptiveSizePolicyWeight=90".to_owned(),
            "--add-modules=ALL-SYSTEM".to_owned(),
            "--add-opens=java.base/java.util=ALL-UNNAMED".to_owned(),
            "--add-opens=java.base/java.lang=ALL-UNNAMED".to_owned(),
            "--add-opens=java.base/sun.nio.fs=ALL-UNNAMED".to_owned(),
            "--add-opens=java.base/java.io=ALL-UNNAMED".to_owned(),
        ];
        vm_args.extend(config.vm_args.iter().cloned());

        let spec = ProcessSpec::new(java)
            .arg("-Declipse.application=org.eclipse.jdt.ls.core.id1")
            .arg("-Dosgi.bundles.defaultStartLevel=4")
            .arg("-Declipse.product=org.eclipse.jdt.ls.core.product")
            .arg(format!("-Dlog.level={}", config.log_level))
            .args(vm_args)
            .arg("-jar")
            .arg(&config.installation.launcher_jar)
            .arg("-configuration")
            .arg(&config.installation.config_dir)
            .arg("-data")
            .arg(&config.data_dir)
            .args(config.extra_args.iter().map(String::as_str))
            .current_dir(&workspace_root)
            .env("JAVA_HOME", &config.java_home)
            .stdin(IoMode::Piped)
            .stdout(IoMode::Piped)
            .stderr(IoMode::Piped)
            .label("jdtls");

        let mut child = spec.spawn().map_err(JdtlsError::Spawn)?;
        let pid = child.id();
        let stdin = child
            .take_stdin()
            .ok_or_else(|| JdtlsError::Spawn(io::Error::other("jdtls stdin was not piped")))?;
        let stdout = child
            .take_stdout()
            .ok_or_else(|| JdtlsError::Spawn(io::Error::other("jdtls stdout was not piped")))?;
        if let Some(stderr) = child.take_stderr() {
            spawn_stderr_reader(stderr);
        }

        let (peer, incoming) = RpcPeer::spawn(stdout, stdin, INCOMING_CAPACITY);
        let (events, _) = broadcast::channel(EVENT_CAPACITY);
        let (ready_sender, ready) = watch::channel(false);
        let (exit_sender, exit) = watch::channel(None);
        let (kill_sender, kill_receiver) = oneshot::channel();
        let settings = Arc::new(RwLock::new(config.settings.clone()));
        let diagnostics = Arc::new(Mutex::new(HashMap::new()));

        spawn_process_monitor(child, kill_receiver, exit_sender, events.clone());

        let folder_name = workspace_root
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| "workspace".to_owned());
        let context = PumpContext {
            peer: peer.clone(),
            settings: Arc::clone(&settings),
            diagnostics: Arc::clone(&diagnostics),
            ready: ready_sender,
            events: events.clone(),
            workspace_root: workspace_root.clone(),
            root_uri,
            folder_name,
        };
        tokio::spawn(pump(context, incoming));

        Ok(Self {
            peer,
            events,
            ready,
            exit,
            kill: Mutex::new(Some(kill_sender)),
            settings,
            diagnostics,
            config,
            workspace_root,
            pid,
            initialized: AtomicBool::new(false),
        })
    }

    /// Returns the operating-system process id while jdtls is running.
    #[must_use]
    pub fn pid(&self) -> Option<u32> {
        self.pid
    }

    /// Returns the workspace root used for this server instance.
    #[must_use]
    pub fn workspace_root(&self) -> &std::path::Path {
        &self.workspace_root
    }

    /// Subscribes to normalized events.
    ///
    /// The broadcast channel is bounded. A slow subscriber receives
    /// [`broadcast::error::RecvError::Lagged`] rather than blocking the server,
    /// so consumers must tolerate gaps and rely on the diagnostic cache for the
    /// latest state.
    #[must_use]
    pub fn subscribe(&self) -> broadcast::Receiver<JdtlsEvent> {
        self.events.subscribe()
    }

    /// Sends the LSP `initialize` request and parses the result.
    ///
    /// May only be called once per connection.
    ///
    /// # Errors
    ///
    /// Returns a typed error if the server rejects initialization or the
    /// response does not match the LSP schema.
    pub async fn initialize(&self) -> Result<InitializeResult, JdtlsError> {
        if self
            .initialized
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(JdtlsError::Protocol(
                "initialize called more than once".to_owned(),
            ));
        }
        let params = self.config.initialize_params()?;
        let value = serde_json::to_value(params)?;
        let response = self
            .peer
            .request_with_timeout("initialize", Some(value), self.config.initialize_timeout)
            .await?;
        serde_json::from_value(response)
            .map_err(|error| JdtlsError::Protocol(format!("invalid initialize response: {error}")))
    }

    /// Sends the `initialized` notification.
    ///
    /// # Errors
    ///
    /// Returns an error if the notification cannot be written.
    pub async fn initialized(&self) -> Result<(), JdtlsError> {
        self.peer.notify("initialized", Some(json!({}))).await?;
        Ok(())
    }

    /// Waits for jdtls to report `ServiceReady` (or `Started`).
    ///
    /// Project import may continue after this status; diagnostics can be
    /// provisional until import completes.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if the status does not arrive, or
    /// [`JdtlsError::Exited`] if the process dies first.
    pub async fn wait_for_service_ready(&self, limit: Duration) -> Result<(), JdtlsError> {
        let mut ready = self.ready.clone();
        let mut exit = self.exit.clone();
        if *ready.borrow() {
            return Ok(());
        }
        if let Some(status) = *exit.borrow() {
            return Err(JdtlsError::Exited {
                status: Some(status),
            });
        }
        let wait = async {
            loop {
                tokio::select! {
                    result = ready.changed() => {
                        if result.is_err() {
                            return Err(JdtlsError::Closed);
                        }
                        if *ready.borrow() {
                            return Ok(());
                        }
                    }
                    result = exit.changed() => {
                        if result.is_err() {
                            return Err(JdtlsError::Closed);
                        }
                        if let Some(status) = *exit.borrow() {
                            return Err(JdtlsError::Exited { status: Some(status) });
                        }
                    }
                }
            }
        };
        tokio::time::timeout(limit, wait)
            .await
            .map_err(|_| JdtlsError::Timeout("language/status ServiceReady".to_owned()))?
    }

    /// Returns the current settings snapshot sent to jdtls.
    #[must_use]
    pub fn settings(&self) -> Value {
        self.settings
            .read()
            .unwrap_or_else(PoisonError::into_inner)
            .clone()
    }

    /// Replaces the settings snapshot and notifies jdtls.
    ///
    /// # Errors
    ///
    /// Returns an error if the `workspace/didChangeConfiguration` notification
    /// cannot be written.
    pub async fn set_settings(&self, settings: Value) -> Result<(), JdtlsError> {
        *self
            .settings
            .write()
            .unwrap_or_else(PoisonError::into_inner) = settings.clone();
        self.peer
            .notify(
                "workspace/didChangeConfiguration",
                Some(json!({ "settings": settings })),
            )
            .await?;
        Ok(())
    }

    /// Opens a Java document in jdtls.
    ///
    /// The caller owns the text; jdtls stores its own copy. Send changes with
    /// incremental or full synchronization as required by the server.
    ///
    /// # Errors
    ///
    /// Returns an error if the path is not absolute or the notification cannot
    /// be written.
    pub async fn open_document(
        &self,
        path: &std::path::Path,
        text: &str,
        version: i32,
    ) -> Result<Uri, JdtlsError> {
        let uri = file_uri(path)?;
        let params = DidOpenTextDocumentParams {
            text_document: TextDocumentItem {
                uri: uri.clone(),
                language_id: "java".to_owned(),
                version,
                text: text.to_owned(),
            },
        };
        self.peer
            .notify("textDocument/didOpen", Some(serde_json::to_value(params)?))
            .await?;
        Ok(uri)
    }

    /// Notifies jdtls that a document was saved.
    ///
    /// # Errors
    ///
    /// Returns an error if the notification cannot be written.
    pub async fn save_document(&self, uri: &Uri) -> Result<(), JdtlsError> {
        let params = DidSaveTextDocumentParams {
            text_document: TextDocumentIdentifier { uri: uri.clone() },
            text: None,
        };
        self.peer
            .notify("textDocument/didSave", Some(serde_json::to_value(params)?))
            .await?;
        Ok(())
    }

    /// Notifies jdtls that a document was closed.
    ///
    /// # Errors
    ///
    /// Returns an error if the notification cannot be written.
    pub async fn close_document(&self, uri: &Uri) -> Result<(), JdtlsError> {
        let params = DidCloseTextDocumentParams {
            text_document: TextDocumentIdentifier { uri: uri.clone() },
        };
        self.peer
            .notify("textDocument/didClose", Some(serde_json::to_value(params)?))
            .await?;
        Ok(())
    }

    /// Sends a full-document `textDocument/didChange` notification.
    ///
    /// The change carries no range, which LSP defines as a complete replacement
    /// of the document regardless of the server's synchronization kind. Keeping
    /// the IDE's buffer authoritative is simpler and less error-prone than
    /// maintaining a parallel incremental edit history for the server.
    ///
    /// `version` must increase monotonically for `path`. jdtls uses it to keep
    /// diagnostics and edits attached to the text they describe.
    ///
    /// # Errors
    ///
    /// Returns an error if the path is not absolute or the notification cannot
    /// be written.
    pub async fn change_document(
        &self,
        path: &std::path::Path,
        text: &str,
        version: i32,
    ) -> Result<Uri, JdtlsError> {
        let uri = file_uri(path)?;
        let params = DidChangeTextDocumentParams {
            text_document: VersionedTextDocumentIdentifier {
                uri: uri.clone(),
                version,
            },
            content_changes: vec![TextDocumentContentChangeEvent {
                range: None,
                range_length: None,
                text: text.to_owned(),
            }],
        };
        self.peer
            .notify(
                "textDocument/didChange",
                Some(serde_json::to_value(params)?),
            )
            .await?;
        Ok(uri)
    }

    /// Notifies jdtls that the document at `path` was saved.
    ///
    /// # Errors
    ///
    /// Returns an error if the path is not absolute or the notification cannot
    /// be written.
    pub async fn save_document_at(&self, path: &std::path::Path) -> Result<(), JdtlsError> {
        let uri = file_uri(path)?;
        self.save_document(&uri).await
    }

    /// Notifies jdtls that the document at `path` was closed.
    ///
    /// # Errors
    ///
    /// Returns an error if the path is not absolute or the notification cannot
    /// be written.
    pub async fn close_document_at(&self, path: &std::path::Path) -> Result<(), JdtlsError> {
        let uri = file_uri(path)?;
        self.close_document(&uri).await
    }

    /// Requests hover information at `position`.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no response arrives within `limit`, or
    /// [`JdtlsError::Protocol`] if the response does not match the LSP schema.
    pub async fn hover(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        limit: Duration,
    ) -> Result<Option<HoverInfo>, JdtlsError> {
        let params = HoverParams {
            text_document_position_params: text_document_position(path, position)?,
            work_done_progress_params: WorkDoneProgressParams {
                work_done_token: None,
            },
        };
        let response = self
            .peer
            .request_with_timeout(
                "textDocument/hover",
                Some(serde_json::to_value(params)?),
                limit,
            )
            .await?;
        let hover: Option<Hover> = serde_json::from_value(response)
            .map_err(|error| JdtlsError::Protocol(format!("invalid hover response: {error}")))?;
        Ok(hover.map(hover_info))
    }

    /// Requests completion candidates at `position`.
    ///
    /// The result is bounded by
    /// [`crate::MAX_COMPLETION_CANDIDATES`]; an empty vector means jdtls had no
    /// suggestions for this position.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no response arrives within `limit`, or
    /// [`JdtlsError::Protocol`] if the response does not match the LSP schema.
    pub async fn completion(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        limit: Duration,
    ) -> Result<Vec<CompletionCandidate>, JdtlsError> {
        let params = CompletionParams {
            text_document_position: text_document_position(path, position)?,
            work_done_progress_params: WorkDoneProgressParams {
                work_done_token: None,
            },
            partial_result_params: PartialResultParams {
                partial_result_token: None,
            },
            context: None,
        };
        let response = self
            .peer
            .request_with_timeout(
                "textDocument/completion",
                Some(serde_json::to_value(params)?),
                limit,
            )
            .await?;
        let completion: Option<CompletionResponse> =
            serde_json::from_value(response).map_err(|error| {
                JdtlsError::Protocol(format!("invalid completion response: {error}"))
            })?;
        Ok(completion.map(completion_candidates).unwrap_or_default())
    }

    /// Resolves the definitions at `position`.
    ///
    /// Locations whose URI is not a `file:` URI, such as jdtls `jdt://`
    /// class-file documents, are dropped; they have no source in the workspace.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no response arrives within `limit`, or
    /// [`JdtlsError::Protocol`] if the response does not match the LSP schema.
    pub async fn definition(
        &self,
        path: &std::path::Path,
        position: SourcePosition,
        limit: Duration,
    ) -> Result<Vec<SourceLocation>, JdtlsError> {
        let params = GotoDefinitionParams {
            text_document_position_params: text_document_position(path, position)?,
            work_done_progress_params: WorkDoneProgressParams {
                work_done_token: None,
            },
            partial_result_params: PartialResultParams {
                partial_result_token: None,
            },
        };
        let response = self
            .peer
            .request_with_timeout(
                "textDocument/definition",
                Some(serde_json::to_value(params)?),
                limit,
            )
            .await?;
        let definition: Option<GotoDefinitionResponse> =
            serde_json::from_value(response).map_err(|error| {
                JdtlsError::Protocol(format!("invalid definition response: {error}"))
            })?;
        Ok(definition.map(definition_locations).unwrap_or_default())
    }

    /// Waits for the next diagnostics publication for `uri`.
    ///
    /// Returns the cached publication if one already exists, so this is safe to
    /// call after the event was emitted.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no publication arrives in time.
    pub async fn wait_for_diagnostics(
        &self,
        uri: &Uri,
        limit: Duration,
    ) -> Result<PublishDiagnosticsParams, JdtlsError> {
        let key = uri.as_str().to_owned();
        let mut events = self.events.subscribe();
        if let Some(cached) = self
            .diagnostics
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .get(&key)
            .cloned()
        {
            return Ok(cached);
        }

        let deadline = tokio::time::Instant::now() + limit;
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                return Err(JdtlsError::Timeout(format!(
                    "diagnostics for {}",
                    uri.as_str()
                )));
            }
            match tokio::time::timeout(remaining, events.recv()).await {
                Err(_) => {
                    return Err(JdtlsError::Timeout(format!(
                        "diagnostics for {}",
                        uri.as_str()
                    )));
                }
                Ok(Err(broadcast::error::RecvError::Lagged(skipped))) => {
                    tracing::warn!(skipped, "diagnostic event stream lagged");
                }
                Ok(Err(broadcast::error::RecvError::Closed)) => {
                    return Err(JdtlsError::Closed);
                }
                Ok(Ok(JdtlsEvent::Diagnostics(diagnostics))) if diagnostics.uri.as_str() == key => {
                    return Ok(diagnostics);
                }
                Ok(Ok(_)) => {}
            }
        }
    }

    /// Executes a jdtls command through `workspace/executeCommand`.
    ///
    /// # Errors
    ///
    /// Returns the server's JSON-RPC error or a timeout.
    pub async fn execute_command(
        &self,
        command: &str,
        arguments: Vec<Value>,
        limit: Duration,
    ) -> Result<Value, JdtlsError> {
        let params = ExecuteCommandParams {
            command: command.to_owned(),
            arguments,
            work_done_progress_params: WorkDoneProgressParams::default(),
        };
        let value = serde_json::to_value(params)?;
        let response = self
            .peer
            .request_with_timeout("workspace/executeCommand", Some(value), limit)
            .await?;
        Ok(response)
    }

    /// Requests whole-document formatting.
    ///
    /// The returned edits target the caller's buffer: applying them to disk
    /// would discard unsaved changes. `tab_size` and `insert_spaces` come from
    /// the editor settings, mirroring the LSP formatting options.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no response arrives within `limit`, or
    /// [`JdtlsError::Protocol`] if the response does not match the LSP schema.
    pub async fn format_document(
        &self,
        path: &std::path::Path,
        tab_size: u32,
        insert_spaces: bool,
        limit: Duration,
    ) -> Result<Vec<SourceTextEdit>, JdtlsError> {
        let params = DocumentFormattingParams {
            text_document: TextDocumentIdentifier {
                uri: file_uri(path)?,
            },
            options: FormattingOptions {
                tab_size,
                insert_spaces,
                ..FormattingOptions::default()
            },
            work_done_progress_params: WorkDoneProgressParams {
                work_done_token: None,
            },
        };
        let response = self
            .peer
            .request_with_timeout(
                "textDocument/formatting",
                Some(serde_json::to_value(params)?),
                limit,
            )
            .await?;
        let edits: Option<Vec<TextEdit>> = serde_json::from_value(response).map_err(|error| {
            JdtlsError::Protocol(format!("invalid formatting response: {error}"))
        })?;
        Ok(edits.map(text_edits).unwrap_or_default())
    }

    /// Requests `source.organizeImports` and extracts the edits for `path`.
    ///
    /// Returns an empty vector when jdtls reports nothing to change or supplies
    /// an action without an edit. Edits for other files are ignored because the
    /// caller only owns the active buffer.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Timeout`] if no response arrives within `limit`, or
    /// [`JdtlsError::Protocol`] if the response does not match the LSP schema.
    pub async fn organize_imports(
        &self,
        path: &std::path::Path,
        limit: Duration,
    ) -> Result<Vec<SourceTextEdit>, JdtlsError> {
        let uri = file_uri(path)?;
        let params = CodeActionParams {
            text_document: TextDocumentIdentifier { uri: uri.clone() },
            // jdtls organizes the whole file regardless of the requested range;
            // a zero-width range keeps the request cheap and deterministic.
            range: Range {
                start: Position {
                    line: 0,
                    character: 0,
                },
                end: Position {
                    line: 0,
                    character: 0,
                },
            },
            context: CodeActionContext {
                diagnostics: Vec::new(),
                only: Some(vec![CodeActionKind::SOURCE_ORGANIZE_IMPORTS]),
                trigger_kind: None,
            },
            work_done_progress_params: WorkDoneProgressParams {
                work_done_token: None,
            },
            partial_result_params: PartialResultParams {
                partial_result_token: None,
            },
        };
        let response = self
            .peer
            .request_with_timeout(
                "textDocument/codeAction",
                Some(serde_json::to_value(params)?),
                limit,
            )
            .await?;
        let actions: Option<CodeActionResponse> =
            serde_json::from_value(response).map_err(|error| {
                JdtlsError::Protocol(format!("invalid code action response: {error}"))
            })?;
        for action in actions.unwrap_or_default() {
            let CodeActionOrCommand::CodeAction(action) = action else {
                continue;
            };
            let Some(edit) = action.edit else {
                continue;
            };
            let edits = workspace_text_edits(&edit, &uri);
            if !edits.is_empty() {
                return Ok(edits);
            }
        }
        Ok(Vec::new())
    }

    /// Returns whether the transport is closed.
    #[must_use]
    pub fn is_closed(&self) -> bool {
        self.peer.is_closed()
    }

    /// Waits for the process to exit, up to `limit`.
    ///
    /// Returns `Ok(None)` on timeout.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Closed`] if the exit watch is unavailable.
    pub async fn wait_for_exit(&self, limit: Duration) -> Result<Option<ExitStatus>, JdtlsError> {
        let mut exit = self.exit.clone();
        if let Some(status) = *exit.borrow() {
            return Ok(Some(status));
        }
        let wait = async {
            loop {
                if exit.changed().await.is_err() {
                    return Err(JdtlsError::Closed);
                }
                if let Some(status) = *exit.borrow() {
                    return Ok(Some(status));
                }
            }
        };
        match tokio::time::timeout(limit, wait).await {
            Ok(result) => result,
            Err(_) => Ok(None),
        }
    }

    /// Performs the LSP `shutdown`/`exit` handshake and waits for the process.
    ///
    /// If the process does not exit within `grace`, it is killed. This method
    /// is safe to call once; dropping the client afterwards is a no-op for the
    /// process.
    ///
    /// # Errors
    ///
    /// Returns the `shutdown` request error after still attempting to stop the
    /// process.
    pub async fn shutdown(&mut self, grace: Duration) -> Result<(), JdtlsError> {
        let shutdown = self
            .peer
            .request_with_timeout("shutdown", None, grace)
            .await;
        let _ = self.peer.notify("exit", None).await;
        if self.wait_for_exit(grace).await?.is_none() {
            self.request_kill();
            let _ = self.wait_for_exit(Duration::from_secs(2)).await;
        }
        self.peer.shutdown();
        shutdown?;
        Ok(())
    }

    fn request_kill(&self) {
        let mut guard = self.kill.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(sender) = guard.take() {
            let _ = sender.send(());
        }
    }
}

impl Drop for JdtlsClient {
    fn drop(&mut self) {
        self.request_kill();
    }
}

async fn probe_java_major(java: &std::path::Path) -> Result<u32, JdtlsError> {
    let mut command = tokio::process::Command::new(java);
    command.arg("-version");
    let output = tokio::time::timeout(Duration::from_secs(10), command.output())
        .await
        .map_err(|_| JdtlsError::Timeout("java -version".to_owned()))?
        .map_err(JdtlsError::Spawn)?;
    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    crate::config::parse_java_major(&combined).ok_or_else(|| {
        JdtlsError::JavaVersionUnknown(
            combined
                .chars()
                .take(200)
                .collect::<String>()
                .trim()
                .to_owned(),
        )
    })
}

fn text_document_position(
    path: &std::path::Path,
    position: SourcePosition,
) -> Result<TextDocumentPositionParams, JdtlsError> {
    Ok(TextDocumentPositionParams {
        text_document: TextDocumentIdentifier {
            uri: file_uri(path)?,
        },
        position: Position {
            line: position.line,
            character: position.character,
        },
    })
}

fn spawn_stderr_reader(stderr: ChildStderr) {
    tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    tracing::debug!(target: "jdtls.stderr", line = %truncate_for_log(&line), "jdtls stderr");
                }
                Ok(None) => break,
                Err(error) => {
                    tracing::debug!(%error, "jdtls stderr reader stopped");
                    break;
                }
            }
        }
    });
}

fn truncate_for_log(line: &str) -> String {
    if line.len() <= LOG_LINE_LIMIT {
        return line.to_owned();
    }
    let mut end = LOG_LINE_LIMIT;
    while end > 0 && !line.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}…", &line[..end])
}

fn spawn_process_monitor(
    mut child: ManagedChild,
    mut kill: oneshot::Receiver<()>,
    exit: watch::Sender<Option<ExitStatus>>,
    events: broadcast::Sender<JdtlsEvent>,
) {
    tokio::spawn(async move {
        let label = child.label().to_owned();
        let status = tokio::select! {
            result = child.wait() => result.ok(),
            _ = &mut kill => {
                let _ = child.kill().await;
                child.try_wait().ok().flatten()
            }
        };
        tracing::debug!(label = %label, ?status, "jdtls process exited");
        let _ = exit.send(status);
        let _ = events.send(JdtlsEvent::Exited { status });
    });
}

struct PumpContext {
    peer: RpcPeer,
    settings: Arc<RwLock<Value>>,
    diagnostics: Arc<Mutex<HashMap<String, PublishDiagnosticsParams>>>,
    ready: watch::Sender<bool>,
    events: broadcast::Sender<JdtlsEvent>,
    workspace_root: PathBuf,
    root_uri: Uri,
    folder_name: String,
}

async fn pump(context: PumpContext, mut incoming: mpsc::Receiver<Incoming>) {
    while let Some(message) = incoming.recv().await {
        match message {
            Incoming::Request { id, method, params } => {
                handle_server_request(&context, id, method, params).await;
            }
            Incoming::Notification { method, params } => {
                handle_notification(&context, &method, params);
            }
            Incoming::Closed { reason } => {
                let _ = context.events.send(JdtlsEvent::Closed { reason });
                break;
            }
        }
    }
}

fn handle_notification(context: &PumpContext, method: &str, params: Option<Value>) {
    match method {
        "textDocument/publishDiagnostics" => {
            let Some(params) = params else {
                tracing::warn!("publishDiagnostics without parameters");
                return;
            };
            match serde_json::from_value::<PublishDiagnosticsParams>(params) {
                Ok(diagnostics) => {
                    context
                        .diagnostics
                        .lock()
                        .unwrap_or_else(PoisonError::into_inner)
                        .insert(diagnostics.uri.as_str().to_owned(), diagnostics.clone());
                    let _ = context.events.send(JdtlsEvent::Diagnostics(diagnostics));
                }
                Err(error) => {
                    tracing::warn!(%error, "invalid publishDiagnostics payload");
                }
            }
        }
        "language/status" => {
            let Some(params) = params else {
                return;
            };
            match serde_json::from_value::<StatusParams>(params) {
                Ok(status) => {
                    if status.kind == "ServiceReady" || status.kind == "Started" {
                        let _ = context.ready.send(true);
                    }
                    let _ = context.events.send(JdtlsEvent::Status {
                        kind: status.kind,
                        message: status.message,
                    });
                }
                Err(error) => tracing::warn!(%error, "invalid language/status payload"),
            }
        }
        "window/logMessage" => {
            if let Some(params) = params
                && let Ok(message) = serde_json::from_value::<MessageParams>(params)
            {
                let _ = context.events.send(JdtlsEvent::LogMessage {
                    level: message.level,
                    message: message.message,
                });
            }
        }
        "window/showMessage" => {
            if let Some(params) = params
                && let Ok(message) = serde_json::from_value::<MessageParams>(params)
            {
                let _ = context.events.send(JdtlsEvent::ShowMessage {
                    level: message.level,
                    message: message.message,
                });
            }
        }
        "$/progress" => {
            if let Some(params) = params
                && let Ok(progress) = serde_json::from_value::<ProgressParams>(params)
            {
                let _ = context.events.send(JdtlsEvent::Progress {
                    token: progress.token,
                    value: progress.value,
                });
            }
        }
        _ => {
            let _ = context.events.send(JdtlsEvent::Notification {
                method: method.to_owned(),
                params,
            });
        }
    }
}

async fn handle_server_request(
    context: &PumpContext,
    id: RequestId,
    method: String,
    params: Option<Value>,
) {
    match method.as_str() {
        "workspace/configuration" => {
            let Some(params) = params else {
                respond_error(
                    context,
                    id,
                    ErrorObject::new(ErrorObject::INVALID_PARAMS, "missing params"),
                )
                .await;
                return;
            };
            match serde_json::from_value::<ConfigurationParams>(params) {
                Ok(params) => {
                    let settings = context
                        .settings
                        .read()
                        .unwrap_or_else(PoisonError::into_inner)
                        .clone();
                    let values: Vec<Value> = params
                        .items
                        .iter()
                        .map(|item| match item.section.as_deref() {
                            Some(section) => lookup_section(&settings, section),
                            None => settings.clone(),
                        })
                        .collect();
                    respond(context, id, Value::Array(values)).await;
                }
                Err(error) => {
                    respond_error(
                        context,
                        id,
                        ErrorObject::new(ErrorObject::INVALID_PARAMS, error.to_string()),
                    )
                    .await;
                }
            }
        }
        "workspace/applyEdit" => {
            let Some(params) = params else {
                respond_error(
                    context,
                    id,
                    ErrorObject::new(ErrorObject::INVALID_PARAMS, "missing params"),
                )
                .await;
                return;
            };
            let outcome = serde_json::from_value::<ApplyWorkspaceEditParams>(params)
                .map_err(|error| JdtlsError::Protocol(error.to_string()))
                .and_then(|params| apply_workspace_edit(&context.workspace_root, &params.edit));
            match outcome {
                Ok(outcome) => {
                    tracing::debug!(
                        files = outcome.files_changed,
                        edits = outcome.edits_applied,
                        "applied workspace edit from jdtls"
                    );
                    respond(context, id, json!({ "applied": true })).await;
                }
                Err(error) => {
                    tracing::warn!(%error, "rejected workspace edit from jdtls");
                    respond(
                        context,
                        id,
                        json!({ "applied": false, "failureReason": error.to_string() }),
                    )
                    .await;
                }
            }
        }
        "workspace/workspaceFolders" => {
            respond(
                context,
                id,
                json!([{ "uri": context.root_uri.as_str(), "name": context.folder_name }]),
            )
            .await;
        }
        "window/workDoneProgress/create"
        | "client/registerCapability"
        | "client/unregisterCapability"
        | "window/showMessageRequest" => {
            respond(context, id, Value::Null).await;
        }
        "window/showDocument" => {
            // Opening a URI is a UI concern; Phase 0 declines explicitly.
            respond(context, id, json!({ "success": false })).await;
        }
        _ => {
            tracing::warn!(%method, "unhandled jdtls server request");
            respond_error(context, id, ErrorObject::method_not_found(&method)).await;
        }
    }
}

async fn respond(context: &PumpContext, id: RequestId, result: Value) {
    if let Err(error) = context.peer.respond(id, result).await {
        tracing::debug!(%error, "failed to respond to jdtls request");
    }
}

async fn respond_error(context: &PumpContext, id: RequestId, error: ErrorObject) {
    if let Err(error) = context.peer.respond_error(id, error).await {
        tracing::debug!(%error, "failed to respond to jdtls request");
    }
}

fn lookup_section(settings: &Value, section: &str) -> Value {
    let mut current = settings;
    for part in section.split('.').filter(|part| !part.is_empty()) {
        match current.get(part) {
            Some(next) => current = next,
            None => return Value::Null,
        }
    }
    current.clone()
}

#[derive(Debug, Deserialize)]
struct StatusParams {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    message: String,
}

#[derive(Debug, Deserialize)]
struct MessageParams {
    #[serde(rename = "type")]
    level: i32,
    message: String,
}

#[derive(Debug, Deserialize)]
struct ProgressParams {
    token: Value,
    value: Value,
}

#[derive(Debug, Deserialize)]
struct ConfigurationParams {
    items: Vec<ConfigurationItem>,
}

#[derive(Debug, Deserialize)]
struct ConfigurationItem {
    #[serde(default)]
    section: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApplyWorkspaceEditParams {
    edit: WorkspaceEdit,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn looks_up_dotted_settings() {
        let settings = json!({
            "java": { "format": { "enabled": true }, "home": null }
        });
        assert_eq!(
            lookup_section(&settings, "java.format.enabled"),
            json!(true)
        );
        assert_eq!(lookup_section(&settings, "java.home"), Value::Null);
        assert_eq!(lookup_section(&settings, "java.missing"), Value::Null);
        assert_eq!(lookup_section(&settings, ""), settings);
    }

    #[test]
    fn truncates_long_log_lines_on_char_boundaries() {
        let short = "hello";
        assert_eq!(truncate_for_log(short), short);
        let long = "ä".repeat(LOG_LINE_LIMIT);
        let truncated = truncate_for_log(&long);
        assert!(truncated.ends_with('…'));
        assert!(truncated.len() <= LOG_LINE_LIMIT + '…'.len_utf8());
    }
}
