//! Rust client for the `gradle-bridge` Tooling API sidecar.
//!
//! The sidecar speaks JSON-RPC 2.0 over Content-Length framed stdio. This
//! crate spawns it, owns its lifecycle, exposes typed methods, and fans
//! notifications out to subscribers.
//!
//! ```no_run
//! use ide_gradle::{GradleClient, GradleOptions};
//!
//! # async fn run() -> Result<(), Box<dyn std::error::Error>> {
//! let mut client = GradleClient::start(GradleOptions {
//!     bridge: "/opt/javaide/gradle-bridge/bin/gradle-bridge".into(),
//!     root: "/work/project".into(),
//!     java_home: Some("/usr/lib/jvm/temurin-21".into()),
//!     ..GradleOptions::default()
//! })
//! .await?;
//! let sync = client.sync(std::time::Duration::from_secs(120)).await?;
//! println!("Gradle {}", sync.snapshot.gradle_version);
//! client.shutdown().await?;
//! # Ok(())
//! # }
//! ```

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use ide_jsonrpc::{ErrorObject, Incoming, RpcPeer, RpcPeerError};
use ide_platform::{ManagedChild, ProcessSpec};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::{Mutex, broadcast};
use tokio::task::JoinHandle;

pub mod model;

pub use model::*;

/// Default timeout for a build operation.
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(300);

/// Options for launching the sidecar.
#[derive(Debug, Clone)]
pub struct GradleOptions {
    /// Path to the `gradle-bridge` launcher.
    pub bridge: PathBuf,
    /// Root directory of the Gradle build.
    pub root: PathBuf,
    /// JDK used to run the sidecar (Java 17 or newer).
    pub java_home: Option<PathBuf>,
    /// Optional append-only sidecar log file.
    pub log_file: Option<PathBuf>,
    /// Optional `GRADLE_USER_HOME`.
    pub gradle_user_home: Option<PathBuf>,
    /// Capacity of the event broadcast channel.
    pub event_capacity: usize,
}

impl Default for GradleOptions {
    fn default() -> Self {
        Self {
            bridge: PathBuf::from("gradle-bridge"),
            root: PathBuf::from("."),
            java_home: None,
            log_file: None,
            gradle_user_home: None,
            event_capacity: 1024,
        }
    }
}

/// A notification from the bridge.
#[derive(Debug, Clone)]
pub enum GradleEvent {
    /// Gradle configuration/model progress.
    SyncProgress {
        /// Correlated operation id, when supplied.
        request_id: Option<String>,
        /// Human-readable progress message.
        message: String,
    },
    /// Gradle task progress.
    TaskProgress {
        /// Correlated operation id, when supplied.
        request_id: Option<String>,
        /// Human-readable progress message.
        message: String,
    },
    /// One line of build output.
    TaskOutput {
        /// Correlated operation id, when supplied.
        request_id: Option<String>,
        /// `stdout` or `stderr`.
        stream: String,
        /// Line text without the trailing newline.
        text: String,
    },
    /// A task started.
    TaskStarted {
        /// Correlated operation id.
        request_id: Option<String>,
        /// Task information.
        task: TaskOutcome,
    },
    /// A task finished.
    TaskFinished {
        /// Correlated operation id.
        request_id: Option<String>,
        /// Task information, including the outcome.
        task: TaskOutcome,
    },
    /// A test started.
    TestStarted {
        /// Correlated operation id.
        request_id: Option<String>,
        /// Test information.
        test: TestResult,
    },
    /// A test finished.
    TestFinished {
        /// Correlated operation id.
        request_id: Option<String>,
        /// Test information, including the state.
        test: TestResult,
    },
    /// Output produced by a test.
    TestOutput {
        /// Correlated operation id.
        request_id: Option<String>,
        /// Test id, when known.
        test: Option<String>,
        /// `stdout` or `stderr`.
        stream: String,
        /// Output text.
        text: String,
    },
    /// An unrecognized notification.
    Unknown {
        /// Method name.
        method: String,
        /// Raw parameters.
        params: Option<Value>,
    },
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct ProgressParams {
    request_id: Option<String>,
    message: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct OutputParams {
    request_id: Option<String>,
    stream: String,
    text: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct TaskParams {
    request_id: Option<String>,
    #[serde(flatten)]
    task: TaskOutcome,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct TestParams {
    request_id: Option<String>,
    test: TestResult,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct TestOutputParams {
    request_id: Option<String>,
    test: Option<String>,
    stream: String,
    text: String,
}

impl GradleEvent {
    fn from_notification(method: &str, params: Option<Value>) -> Self {
        let params = params.unwrap_or(Value::Null);
        match method {
            "sync.progress" => parse::<ProgressParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::SyncProgress {
                    request_id: value.request_id,
                    message: value.message,
                },
            ),
            "task.progress" => parse::<ProgressParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TaskProgress {
                    request_id: value.request_id,
                    message: value.message,
                },
            ),
            "task.output" => parse::<OutputParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TaskOutput {
                    request_id: value.request_id,
                    stream: value.stream,
                    text: value.text,
                },
            ),
            "task.started" => parse::<TaskParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TaskStarted {
                    request_id: value.request_id,
                    task: value.task,
                },
            ),
            "task.finished" => parse::<TaskParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TaskFinished {
                    request_id: value.request_id,
                    task: value.task,
                },
            ),
            "test.started" => parse::<TestParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TestStarted {
                    request_id: value.request_id,
                    test: value.test,
                },
            ),
            "test.finished" => parse::<TestParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TestFinished {
                    request_id: value.request_id,
                    test: value.test,
                },
            ),
            "test.output" => parse::<TestOutputParams>(&params).map_or_else(
                |_| Self::unknown(method, params),
                |value| Self::TestOutput {
                    request_id: value.request_id,
                    test: value.test,
                    stream: value.stream,
                    text: value.text,
                },
            ),
            other => Self::Unknown {
                method: other.to_owned(),
                params: Some(params),
            },
        }
    }

    fn unknown(method: &str, params: Value) -> Self {
        Self::Unknown {
            method: method.to_owned(),
            params: Some(params),
        }
    }
}

fn parse<T: for<'de> Deserialize<'de>>(value: &Value) -> Result<T, serde_json::Error> {
    serde_json::from_value(value.clone())
}

/// A class/method test selection.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestRef {
    /// Binary class name, for example `com.example.AppTest`.
    pub class_name: String,
    /// Method name without parentheses.
    pub method_name: String,
}

/// Request to enable a JDWP server in the test worker.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugOptions {
    /// Whether debugging is enabled.
    pub enabled: bool,
    /// Loopback host. Defaults to `127.0.0.1`.
    pub host: String,
    /// Port the IDE allocated. `0` lets the bridge allocate one.
    pub port: u16,
    /// Suspend the test worker until a debugger resumes it.
    pub suspend: bool,
}

impl Default for DebugOptions {
    fn default() -> Self {
        Self {
            enabled: true,
            host: "127.0.0.1".to_owned(),
            port: 0,
            suspend: true,
        }
    }
}

/// Request for `runTask`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskRequest {
    /// Caller-supplied id for cancellation. Generated when absent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    /// Task paths, for example `:app:test`.
    pub tasks: Vec<String>,
    /// Extra Gradle arguments.
    pub arguments: Vec<String>,
    /// Extra environment variables.
    pub environment: BTreeMap<String, String>,
}

/// Request for `runTests`.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTestsRequest {
    /// Caller-supplied id for cancellation. Generated when absent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    /// Project path. Defaults to `:`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    /// Test task path. Defaults to the project's first test task.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_path: Option<String>,
    /// Classes to run. Ignored when `methods` is non-empty.
    pub classes: Vec<String>,
    /// Methods to run.
    pub methods: Vec<TestRef>,
    /// Optional debug listener.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub debug: Option<DebugOptions>,
    /// Extra Gradle arguments.
    pub arguments: Vec<String>,
    /// Extra environment variables.
    pub environment: BTreeMap<String, String>,
}

/// Errors from the Gradle bridge.
#[derive(Debug, thiserror::Error)]
pub enum GradleError {
    /// The sidecar could not be spawned.
    #[error("cannot start the Gradle bridge: {0}")]
    Spawn(#[source] std::io::Error),
    /// The sidecar violated the protocol.
    #[error("Gradle bridge protocol error: {0}")]
    Protocol(String),
    /// JSON-RPC transport failure.
    #[error(transparent)]
    Rpc(#[from] RpcPeerError),
    /// Response or request decoding failure.
    #[error("cannot decode Gradle bridge JSON: {0}")]
    Json(#[from] serde_json::Error),
    /// The sidecar returned a structured error.
    #[error("Gradle bridge error {code}: {message}")]
    Remote {
        /// JSON-RPC error code.
        code: i32,
        /// Short message.
        message: String,
        /// Stable bridge detail, when present.
        detail: Option<String>,
    },
}

/// A running Gradle bridge.
pub struct GradleClient {
    peer: RpcPeer,
    child: Mutex<Option<ManagedChild>>,
    root: PathBuf,
    next_id: AtomicU64,
    events: broadcast::Sender<GradleEvent>,
    pump: Option<JoinHandle<()>>,
    info: InitializeResult,
}

impl GradleClient {
    /// Spawns the sidecar and performs the `initialize` handshake.
    ///
    /// # Errors
    ///
    /// Returns an error if the process cannot be spawned, the handshake fails,
    /// or the sidecar reports an incompatible protocol version.
    pub async fn start(options: GradleOptions) -> Result<Self, GradleError> {
        let mut spec = ProcessSpec::new(&options.bridge)
            .current_dir(&options.root)
            .label("gradle-bridge");
        if let Some(log_file) = &options.log_file {
            spec = spec.arg("--log").arg(log_file);
        }
        if let Some(java_home) = &options.java_home {
            let path = std::env::var_os("PATH").unwrap_or_default();
            let mut entries = vec![java_home.join("bin").into_os_string()];
            entries.extend(std::env::split_paths(&path).map(std::path::PathBuf::into_os_string));
            if let Ok(joined) = std::env::join_paths(entries) {
                spec = spec.env("PATH", joined);
            }
            spec = spec.env("JAVA_HOME", java_home);
        }
        if let Some(gradle_user_home) = &options.gradle_user_home {
            spec = spec.env("GRADLE_USER_HOME", gradle_user_home);
        }
        let mut child = spec.spawn().map_err(GradleError::Spawn)?;
        let stdin = child
            .take_stdin()
            .ok_or_else(|| GradleError::Protocol("sidecar stdin was not piped".to_owned()))?;
        let stdout = child
            .take_stdout()
            .ok_or_else(|| GradleError::Protocol("sidecar stdout was not piped".to_owned()))?;
        if let Some(stderr) = child.take_stderr() {
            tokio::spawn(async move {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let mut lines = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    tracing::debug!(target: "ide_gradle", "sidecar: {line}");
                }
            });
        }

        let (peer, mut incoming) = RpcPeer::spawn(stdout, stdin, 512);
        let (events, _) = broadcast::channel(options.event_capacity.max(16));
        let pump_peer = peer.clone();
        let pump_events = events.clone();
        let pump = tokio::spawn(async move {
            while let Some(message) = incoming.recv().await {
                match message {
                    Incoming::Notification { method, params } => {
                        let _ = pump_events.send(GradleEvent::from_notification(&method, params));
                    }
                    Incoming::Request { id, method, .. } => {
                        let error = ErrorObject {
                            code: -32601,
                            message: format!("unsupported sidecar request: {method}"),
                            data: None,
                        };
                        let _ = pump_peer.respond_error(id, error).await;
                    }
                    Incoming::Closed { .. } => break,
                }
            }
        });

        let mut client = Self {
            peer,
            child: Mutex::new(Some(child)),
            root: options.root,
            next_id: AtomicU64::new(1),
            events,
            pump: Some(pump),
            info: InitializeResult::default(),
        };
        let raw = client
            .raw_request("initialize", json!({}), Duration::from_secs(15))
            .await;
        let value = match raw {
            Ok(value) => value,
            Err(error) => {
                client.abort().await;
                return Err(error);
            }
        };
        let info: InitializeResult = serde_json::from_value(value)?;
        if info.protocol_version != "1" {
            client.abort().await;
            return Err(GradleError::Protocol(format!(
                "unsupported bridge protocol version {}",
                info.protocol_version
            )));
        }
        client.info = info;
        Ok(client)
    }

    /// Handshake information returned by the sidecar.
    #[must_use]
    pub const fn info(&self) -> &InitializeResult {
        &self.info
    }

    /// Root directory of the Gradle build this client is connected to.
    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Subscribes to bridge notifications.
    #[must_use]
    pub fn subscribe(&self) -> broadcast::Receiver<GradleEvent> {
        self.events.subscribe()
    }

    /// Synchronizes the project and task model.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn sync(&self, timeout: Duration) -> Result<SyncResult, GradleError> {
        self.sync_with_id(None, &[], timeout).await
    }

    /// Synchronizes with an explicit request id and extra Gradle arguments.
    ///
    /// The request id can be passed to [`Self::cancel`] while the sync is in
    /// flight.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn sync_with_id(
        &self,
        request_id: Option<&str>,
        arguments: &[String],
        timeout: Duration,
    ) -> Result<SyncResult, GradleError> {
        let value = self
            .request(
                "sync",
                json!({ "arguments": arguments }),
                timeout,
                request_id,
            )
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    /// Runs Gradle tasks.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn run_task(
        &self,
        request: &RunTaskRequest,
        timeout: Duration,
    ) -> Result<RunTaskResult, GradleError> {
        let value = self
            .request(
                "runTask",
                serde_json::to_value(request)?,
                timeout,
                request.request_id.as_deref(),
            )
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    /// Lists compiled test classes and methods.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn list_tests(
        &self,
        project_path: Option<&str>,
        task_path: Option<&str>,
        compile: bool,
        timeout: Duration,
    ) -> Result<TestListing, GradleError> {
        self.list_tests_with_id(project_path, task_path, compile, None, &[], timeout)
            .await
    }

    /// Lists tests with an explicit request id and extra Gradle arguments.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn list_tests_with_id(
        &self,
        project_path: Option<&str>,
        task_path: Option<&str>,
        compile: bool,
        request_id: Option<&str>,
        arguments: &[String],
        timeout: Duration,
    ) -> Result<TestListing, GradleError> {
        let value = self
            .request(
                "listTests",
                json!({
                    "projectPath": project_path,
                    "taskPath": task_path,
                    "compile": compile,
                    "arguments": arguments,
                }),
                timeout,
                request_id,
            )
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    /// Runs tests, optionally with a JDWP server in the worker.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn run_tests(
        &self,
        request: &RunTestsRequest,
        timeout: Duration,
    ) -> Result<RunTestsResult, GradleError> {
        let value = self
            .request(
                "runTests",
                serde_json::to_value(request)?,
                timeout,
                request.request_id.as_deref(),
            )
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    /// Resolves one source set's classpaths.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn resolve_classpath(
        &self,
        project_path: Option<&str>,
        source_set: &str,
        timeout: Duration,
    ) -> Result<ClasspathResult, GradleError> {
        let value = self
            .request(
                "resolveClasspath",
                json!({ "projectPath": project_path, "sourceSet": source_set }),
                timeout,
                None,
            )
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    /// Resolves a dependency graph for one configuration.
    ///
    /// # Errors
    ///
    /// Returns a transport, protocol, or Gradle error.
    pub async fn dependency_report(
        &self,
        project_path: Option<&str>,
        configuration: &str,
        timeout: Duration,
    ) -> Result<DependencyReport, GradleError> {
        let value = self
            .request(
                "dependencyReport",
                json!({
                    "projectPath": project_path,
                    "configuration": configuration,
                }),
                timeout,
                None,
            )
            .await?;
        let result: DependencyReportResult = serde_json::from_value(value)?;
        Ok(result.report)
    }

    /// Requests cancellation of a running operation.
    ///
    /// Returns `true` when the bridge found an operation with this request id
    /// and signalled its cancellation token. A completed operation returns
    /// `false` instead of failing.
    ///
    /// # Errors
    ///
    /// Returns a transport or protocol error.
    pub async fn cancel(&self, request_id: &str) -> Result<bool, GradleError> {
        let value = self
            .raw_request(
                "cancel",
                json!({ "requestId": request_id }),
                Duration::from_secs(15),
            )
            .await?;
        Ok(value
            .get("cancelled")
            .and_then(Value::as_bool)
            .unwrap_or(false))
    }

    /// Sends `shutdown`, closes the transport, and reaps the process.
    ///
    /// # Errors
    ///
    /// Returns an error if the process cannot be reaped.
    pub async fn shutdown(&self) -> Result<(), GradleError> {
        let _ = self
            .raw_request("shutdown", json!({}), Duration::from_secs(10))
            .await;
        self.abort().await;
        Ok(())
    }

    async fn abort(&self) {
        self.peer.shutdown();
        if let Some(pump) = &self.pump {
            pump.abort();
        }
        let mut child = self.child.lock().await;
        if let Some(child) = child.as_mut() {
            let _ = child.kill().await;
        }
    }

    async fn request(
        &self,
        method: &str,
        params: Value,
        timeout: Duration,
        request_id: Option<&str>,
    ) -> Result<Value, GradleError> {
        let Value::Object(mut map) = params else {
            return Err(GradleError::Protocol(format!(
                "{method} params must be an object"
            )));
        };
        let id = request_id.map_or_else(
            || format!("{method}-{}", self.next_id.fetch_add(1, Ordering::Relaxed)),
            str::to_owned,
        );
        map.insert("requestId".to_owned(), Value::String(id));
        map.insert(
            "root".to_owned(),
            Value::String(self.root.to_string_lossy().into_owned()),
        );
        map.insert(
            "timeoutMs".to_owned(),
            json!(u64::try_from(timeout.as_millis()).unwrap_or(u64::MAX)),
        );
        self.raw_request(
            method,
            Value::Object(map),
            timeout.saturating_add(Duration::from_secs(10)),
        )
        .await
    }

    async fn raw_request(
        &self,
        method: &str,
        params: Value,
        timeout: Duration,
    ) -> Result<Value, GradleError> {
        self.peer
            .request_with_timeout(method, Some(params), timeout)
            .await
            .map_err(map_rpc_error)
    }
}

impl Drop for GradleClient {
    fn drop(&mut self) {
        self.peer.shutdown();
        if let Some(pump) = &self.pump {
            pump.abort();
        }
    }
}

fn map_rpc_error(error: RpcPeerError) -> GradleError {
    match error {
        RpcPeerError::Remote(object) => {
            let detail = object
                .data
                .as_ref()
                .and_then(|data| data.get("detail"))
                .and_then(Value::as_str)
                .map(str::to_owned);
            let message = match &detail {
                Some(detail) if !detail.is_empty() => {
                    format!("{}: {detail}", object.message)
                }
                _ => object.message,
            };
            GradleError::Remote {
                code: object.code,
                message,
                detail,
            }
        }
        other => GradleError::Rpc(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_task_finished_event() {
        let event = GradleEvent::from_notification(
            "task.finished",
            Some(json!({
                "requestId": "task-1",
                "taskPath": ":test",
                "displayName": "Task :test",
                "outcome": "SUCCESS",
                "startTime": 10,
                "endTime": 20,
                "durationMs": 10,
                "failures": []
            })),
        );
        let GradleEvent::TaskFinished { request_id, task } = event else {
            panic!("unexpected event: {event:?}");
        };
        assert_eq!(request_id.as_deref(), Some("task-1"));
        assert_eq!(task.task_path, ":test");
        assert_eq!(task.outcome, "SUCCESS");
    }

    #[test]
    fn decodes_test_finished_event() {
        let event = GradleEvent::from_notification(
            "test.finished",
            Some(json!({
                "requestId": "tests-1",
                "test": {
                    "id": "class#method",
                    "name": "method()",
                    "className": "com.example.AppTest",
                    "methodName": "method",
                    "atomic": true,
                    "state": "passed",
                    "durationMs": 3,
                    "failures": []
                }
            })),
        );
        let GradleEvent::TestFinished { test, .. } = event else {
            panic!("unexpected event: {event:?}");
        };
        assert!(test.atomic);
        assert_eq!(test.method_name.as_deref(), Some("method"));
    }

    #[test]
    fn unknown_notifications_are_preserved() {
        let event = GradleEvent::from_notification("future.event", Some(json!({"a": 1})));
        let GradleEvent::Unknown { method, .. } = event else {
            panic!("unexpected event: {event:?}");
        };
        assert_eq!(method, "future.event");
    }

    #[test]
    fn snapshot_defaults_missing_fields() {
        let snapshot: BuildSnapshot = serde_json::from_value(json!({
            "gradleVersion": "9.8.1",
            "projects": [{"path": ":", "tasks": []}]
        }))
        .expect("snapshot");
        assert_eq!(snapshot.gradle_version, "9.8.1");
        assert_eq!(snapshot.projects.len(), 1);
        assert!(snapshot.problems.is_empty());
    }

    #[test]
    fn run_task_request_carries_caller_id_and_arguments() {
        let request = RunTaskRequest {
            request_id: Some("task-7".to_owned()),
            tasks: vec![":slow".to_owned()],
            arguments: vec!["--info".to_owned()],
            ..RunTaskRequest::default()
        };
        let value = serde_json::to_value(&request).expect("request");
        assert_eq!(value["requestId"], "task-7");
        assert_eq!(value["arguments"][0], "--info");
    }
}
