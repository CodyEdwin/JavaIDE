//! Typed HTTP client for the OpenCode V2 service.
//!
//! Only the endpoints needed by Phase 0 are wrapped here. The rest of the V2
//! surface is intentionally added when a feature needs it, so wire types stay
//! reviewable instead of importing a generated client wholesale.
//!
//! # Security
//!
//! - Every request carries Basic auth read from OpenCode's own credentials
//!   file. The password is never logged or included in `Debug` output.
//! - `connect_to` revalidates the loopback URL; a caller cannot accidentally
//!   point this client at a remote host.
//! - JSON error bodies are truncated before they reach a user-visible error.

use std::fmt;
use std::path::{Path, PathBuf};
use std::time::Duration;

use base64::Engine;
use reqwest::{Client, RequestBuilder, Response, StatusCode};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use tokio::sync::mpsc;
use url::Url;

use crate::discovery::{DiscoveredService, validate_service_url, validate_version};
use crate::error::OpenCodeError;
use crate::event::{EVENT_CHANNEL_CAPACITY, EventStream, read_stream};
use crate::mcp::ClientMcp;

const DEFAULT_REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_ERROR_BODY: usize = 8 * 1024;
const ERROR_MESSAGE_LIMIT: usize = 512;

/// Basic-auth credentials used for the local service.
///
/// OpenCode uses the username `opencode` and a generated password. The password
/// is redacted from `Debug` output.
#[derive(Clone)]
pub struct BasicCredentials {
    username: String,
    password: String,
}

impl BasicCredentials {
    /// Creates credentials for the OpenCode service.
    #[must_use]
    pub fn opencode(password: impl Into<String>) -> Self {
        Self {
            username: "opencode".to_owned(),
            password: password.into(),
        }
    }

    /// Creates credentials with an explicit username.
    #[must_use]
    pub fn new(username: impl Into<String>, password: impl Into<String>) -> Self {
        Self {
            username: username.into(),
            password: password.into(),
        }
    }

    pub(crate) fn authorization(&self) -> String {
        let value = format!("{}:{}", self.username, self.password);
        format!(
            "Basic {}",
            base64::engine::general_purpose::STANDARD.encode(value)
        )
    }
}

impl fmt::Debug for BasicCredentials {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("BasicCredentials")
            .field("username", &self.username)
            .field("password", &"<redacted>")
            .finish()
    }
}

/// Health and version information from `GET /api/info`.
#[derive(Debug, Clone, Deserialize)]
pub struct ServerInfo {
    /// Running service version, for example `2.1.4`.
    pub version: String,
    /// Service process id.
    pub pid: u32,
    /// URLs the service advertises.
    pub urls: Vec<String>,
    /// Service-owned paths.
    pub paths: ServerPaths,
    /// Optional capability flags. Kept as JSON because the set is experimental.
    #[serde(default)]
    pub capabilities: Option<Value>,
}

/// Paths advertised by the service.
#[derive(Debug, Clone, Deserialize)]
pub struct ServerPaths {
    /// OpenCode's temporary directory.
    pub tmp: String,
}

/// A session as returned by `GET/POST /api/session`.
///
/// Only fields needed for project filtering and tab restoration are typed.
/// Unknown fields are ignored so additive V2 changes do not break the IDE.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// Session id (`ses_…`).
    pub id: String,
    /// Human-readable title, if one was generated.
    #[serde(default)]
    pub title: Option<String>,
    /// Parent session for forks.
    #[serde(default, rename = "parentID")]
    pub parent_id: Option<String>,
    /// Project id assigned by OpenCode.
    #[serde(default, rename = "projectID")]
    pub project_id: Option<String>,
    /// Selected agent id.
    #[serde(default)]
    pub agent: Option<String>,
    /// Selected model.
    #[serde(default)]
    pub model: Option<ModelRef>,
    /// Session location; normally the workspace root.
    #[serde(default)]
    pub location: Option<SessionLocation>,
    /// Creation/update timestamps in milliseconds.
    #[serde(default)]
    pub time: Option<SessionTime>,
    /// Cost accumulator. Shape is service-owned and not interpreted yet.
    #[serde(default)]
    pub cost: Option<Value>,
    /// Token usage. Shape is service-owned and not interpreted yet.
    #[serde(default)]
    pub tokens: Option<Value>,
}

/// The directory a session is bound to.
#[derive(Debug, Clone, Deserialize)]
pub struct SessionLocation {
    /// Absolute directory.
    pub directory: String,
}

/// Session timestamps, in JavaScript milliseconds.
#[derive(Debug, Clone, Deserialize)]
pub struct SessionTime {
    /// Creation time.
    #[serde(default)]
    pub created: Option<i64>,
    /// Last update time.
    #[serde(default)]
    pub updated: Option<i64>,
    /// Time the session last became idle.
    #[serde(default)]
    pub idle: Option<i64>,
}

/// A model reference.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRef {
    /// Model id.
    pub id: String,
    /// Provider id.
    #[serde(rename = "providerID")]
    pub provider_id: String,
    /// Optional model variant.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
}

/// Pagination cursors from `GET /api/session`.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct SessionCursor {
    /// Cursor for the previous page.
    #[serde(default)]
    pub previous: Option<String>,
    /// Cursor for the next page.
    #[serde(default)]
    pub next: Option<String>,
}

/// One page of sessions.
#[derive(Debug, Clone, Deserialize)]
pub struct SessionPage {
    /// Sessions in the requested order.
    pub data: Vec<Session>,
    /// Pagination cursors.
    #[serde(default)]
    pub cursor: Option<SessionCursor>,
}

/// A request to create a session bound to a workspace.
#[derive(Debug, Clone)]
pub struct CreateSession {
    /// Absolute workspace directory.
    pub directory: PathBuf,
    /// Optional title. OpenCode generates one when omitted.
    pub title: Option<String>,
    /// Optional initial agent.
    pub agent: Option<String>,
    /// Optional initial model.
    pub model: Option<ModelRef>,
}

impl CreateSession {
    /// Creates a request for `directory` with service-selected defaults.
    #[must_use]
    pub fn new(directory: impl Into<PathBuf>) -> Self {
        Self {
            directory: directory.into(),
            title: None,
            agent: None,
            model: None,
        }
    }
}

/// A file attachment sent with a prompt.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptFile {
    /// File URI.
    pub uri: String,
    /// Display name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Why the file is attached.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Text and attachments for `POST /api/session/{id}/prompt`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptInput {
    /// Prompt text. IDE context belongs in this string inside a delimited block.
    pub text: String,
    /// Files the agent should read.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub files: Vec<PromptFile>,
    /// Optional free-form metadata. Never put secrets here.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

impl PromptInput {
    /// Creates a text-only prompt.
    #[must_use]
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            files: Vec::new(),
            metadata: None,
        }
    }
}

/// A reply to a pending permission request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PermissionReply {
    /// Allow this request only.
    Once,
    /// Allow and remember the proposed patterns.
    Always,
    /// Reject this request and the session's other pending requests.
    Reject,
}

/// A structured file diff from `GET /api/session/{id}/diff`.
#[derive(Debug, Clone, Deserialize)]
pub struct FileDiff {
    /// Workspace-relative or absolute path as reported by OpenCode.
    pub file: String,
    /// Unified patch text.
    pub patch: String,
    /// Added line count.
    pub additions: u64,
    /// Removed line count.
    pub deletions: u64,
    /// Change kind.
    pub status: String,
}

/// Optional range for a session diff request.
#[derive(Debug, Clone, Default)]
pub struct DiffQuery {
    /// User message whose turn to diff.
    pub from: Option<String>,
    /// Later user message ending the range.
    pub to: Option<String>,
    /// Unchanged lines around each hunk.
    pub context: Option<u32>,
}

/// A connected OpenCode V2 service.
#[derive(Clone)]
pub struct OpenCodeClient {
    http: Client,
    stream_http: Client,
    base_url: Url,
    credentials: Option<BasicCredentials>,
    info: ServerInfo,
}

impl fmt::Debug for OpenCodeClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OpenCodeClient")
            .field("version", &self.info.version)
            .field("pid", &self.info.pid)
            .field("authenticated", &self.credentials.is_some())
            .finish_non_exhaustive()
    }
}

impl OpenCodeClient {
    /// Discovers the shared service and verifies `/api/info`.
    ///
    /// # Errors
    ///
    /// Returns a discovery error when the service is missing, unsafe, or not
    /// V2-compatible, and a transport/HTTP error when health verification
    /// fails.
    pub async fn connect(service: &DiscoveredService) -> Result<Self, OpenCodeError> {
        let credentials = service.password().map(BasicCredentials::opencode);
        Self::connect_to(service.url(), credentials).await
    }

    /// Connects to an explicit loopback service URL.
    ///
    /// This supports the future `ExternalServer` mode and integration tests.
    /// The URL is revalidated, including the loopback restriction.
    ///
    /// # Errors
    ///
    /// As [`OpenCodeClient::connect`], plus [`OpenCodeError::InvalidServiceUrl`]
    /// if the URL is not loopback or uses embedded credentials.
    pub async fn connect_to(
        base_url: Url,
        credentials: Option<BasicCredentials>,
    ) -> Result<Self, OpenCodeError> {
        let base_url = validate_service_url(base_url.as_str())?;
        let http = build_http(Some(DEFAULT_REQUEST_TIMEOUT))?;
        let stream_http = build_http(None)?;
        let url = endpoint(&base_url, &["api", "info"])?;
        let request = authorize(http.get(url), &credentials);
        let info: ServerInfo = decode_json(request.send().await?).await?;
        validate_version(&info.version)?;
        Ok(Self {
            http,
            stream_http,
            base_url,
            credentials,
            info,
        })
    }

    /// Returns the `/api/info` response received at connect time.
    #[must_use]
    pub const fn info(&self) -> &ServerInfo {
        &self.info
    }

    /// Returns the validated service base URL.
    #[must_use]
    pub const fn base_url(&self) -> &Url {
        &self.base_url
    }

    /// Lists sessions, optionally filtered by workspace directory.
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error. A relative directory is rejected
    /// before a request is made.
    pub async fn list_sessions(
        &self,
        directory: Option<&Path>,
        limit: Option<u32>,
    ) -> Result<SessionPage, OpenCodeError> {
        let mut url = endpoint(&self.base_url, &["api", "session"])?;
        {
            let mut query = url.query_pairs_mut();
            if let Some(directory) = directory {
                query.append_pair("directory", &absolute_directory(directory)?);
            }
            if let Some(limit) = limit {
                query.append_pair("limit", &limit.to_string());
            }
        }
        let request = authorize(self.http.get(url), &self.credentials);
        decode_json(request.send().await?).await
    }

    /// Creates a session bound to a workspace directory.
    ///
    /// # Errors
    ///
    /// Returns [`OpenCodeError::InvalidArgument`] for a relative or non-UTF-8
    /// directory, or an HTTP/transport error.
    pub async fn create_session(&self, request: &CreateSession) -> Result<Session, OpenCodeError> {
        let directory = absolute_directory(&request.directory)?;
        let url = endpoint(&self.base_url, &["api", "session"])?;
        let body = json!({
            "title": request.title,
            "agent": request.agent,
            "model": request.model,
            "location": { "directory": directory },
        });
        let request = authorize(self.http.post(url).json(&body), &self.credentials);
        let response: Data<Session> = decode_json(request.send().await?).await?;
        Ok(response.data)
    }

    /// Fetches the active context after the last compaction.
    ///
    /// Message payloads stay as JSON until `ide-domain` normalizes them. This
    /// method exists for reconnect rehydration, where the exact union variant
    /// matters less than preserving the server's order and content.
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error.
    pub async fn session_context(&self, session_id: &str) -> Result<Vec<Value>, OpenCodeError> {
        let url = endpoint(&self.base_url, &["api", "session", session_id, "context"])?;
        let request = authorize(self.http.get(url), &self.credentials);
        let response: Data<Vec<Value>> = decode_json(request.send().await?).await?;
        Ok(response.data)
    }

    /// Sends a prompt to a session.
    ///
    /// The response is the queued user inbox item. Streaming output arrives on
    /// [`OpenCodeClient::subscribe_events`].
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error, including `409` when the session is
    /// busy in a way that rejects the prompt.
    pub async fn send_prompt(
        &self,
        session_id: &str,
        prompt: &PromptInput,
    ) -> Result<Value, OpenCodeError> {
        let url = endpoint(&self.base_url, &["api", "session", session_id, "prompt"])?;
        let request = authorize(self.http.post(url).json(prompt), &self.credentials);
        let response: Data<Value> = decode_json(request.send().await?).await?;
        Ok(response.data)
    }

    /// Interrupts the session's active execution.
    ///
    /// Returns whether an execution was actually interrupted (`false` is a
    /// no-op for an idle session).
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error.
    pub async fn interrupt(&self, session_id: &str) -> Result<bool, OpenCodeError> {
        let url = endpoint(&self.base_url, &["api", "session", session_id, "interrupt"])?;
        let request = authorize(self.http.post(url), &self.credentials);
        let response: InterruptResponse = decode_json(request.send().await?).await?;
        Ok(response.interrupted)
    }

    /// Replies to a pending permission request.
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error. A `404` usually means the request
    /// was already settled; callers should refresh the inbox.
    pub async fn reply_permission(
        &self,
        session_id: &str,
        request_id: &str,
        decision: PermissionReply,
        message: Option<&str>,
    ) -> Result<(), OpenCodeError> {
        let url = endpoint(
            &self.base_url,
            &[
                "api",
                "session",
                session_id,
                "permission",
                request_id,
                "reply",
            ],
        )?;
        let body = json!({ "decision": decision, "message": message });
        let request = authorize(self.http.post(url).json(&body), &self.credentials);
        ensure_empty(request.send().await?).await
    }

    /// Fetches structured per-file diffs for one turn.
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error.
    pub async fn diff(
        &self,
        session_id: &str,
        query: &DiffQuery,
    ) -> Result<Vec<FileDiff>, OpenCodeError> {
        let mut url = endpoint(&self.base_url, &["api", "session", session_id, "diff"])?;
        {
            let mut pairs = url.query_pairs_mut();
            if let Some(from) = &query.from {
                pairs.append_pair("from", from);
            }
            if let Some(to) = &query.to {
                pairs.append_pair("to", to);
            }
            if let Some(context) = query.context {
                pairs.append_pair("context", &context.to_string());
            }
        }
        let request = authorize(self.http.get(url), &self.credentials);
        let response: Data<Vec<FileDiff>> = decode_json(request.send().await?).await?;
        Ok(response.data)
    }

    /// Opens the live SSE subscription.
    ///
    /// The stream has no replay. After reconnecting, callers must refetch
    /// [`OpenCodeClient::session_context`] and pending permissions/forms.
    ///
    /// # Errors
    ///
    /// Returns an HTTP or transport error while establishing the stream.
    pub async fn subscribe_events(&self) -> Result<EventStream, OpenCodeError> {
        let url = endpoint(&self.base_url, &["api", "event"])?;
        let request = authorize(
            self.stream_http
                .get(url)
                .header(reqwest::header::ACCEPT, "text/event-stream"),
            &self.credentials,
        );
        let response = request.send().await?;
        if !response.status().is_success() {
            return Err(http_error(response).await);
        }
        let (sender, receiver) = mpsc::channel(EVENT_CHANNEL_CAPACITY);
        tokio::spawn(read_stream(response.bytes_stream(), sender));
        Ok(EventStream::new(receiver))
    }

    /// Attaches an IDE-hosted MCP server to OpenCode over a WebSocket.
    ///
    /// Tools are available for as long as the returned [`ClientMcp`] is alive
    /// and its messages are serviced.
    ///
    /// # Errors
    ///
    /// Returns [`OpenCodeError::InvalidArgument`] for an empty name or relative
    /// directory, a WebSocket upgrade error, or an HTTP/transport error.
    pub async fn attach_client_mcp(
        &self,
        name: &str,
        directory: &Path,
    ) -> Result<ClientMcp, OpenCodeError> {
        ClientMcp::attach(self, name, directory).await
    }

    pub(crate) fn credentials(&self) -> Option<&BasicCredentials> {
        self.credentials.as_ref()
    }
}

#[derive(Debug, Deserialize)]
struct Data<T> {
    data: T,
}

#[derive(Debug, Deserialize)]
struct InterruptResponse {
    interrupted: bool,
}

fn build_http(timeout: Option<Duration>) -> Result<Client, OpenCodeError> {
    let mut builder = Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .user_agent(concat!("JavaIDE/", env!("CARGO_PKG_VERSION")));
    if let Some(timeout) = timeout {
        builder = builder.timeout(timeout);
    }
    builder.build().map_err(OpenCodeError::Transport)
}

fn authorize(request: RequestBuilder, credentials: &Option<BasicCredentials>) -> RequestBuilder {
    match credentials {
        Some(credentials) => request.basic_auth(&credentials.username, Some(&credentials.password)),
        None => request,
    }
}

fn endpoint(base: &Url, segments: &[&str]) -> Result<Url, OpenCodeError> {
    let mut url = base.clone();
    {
        let mut path = url.path_segments_mut().map_err(|()| {
            OpenCodeError::InvalidServiceUrl("service URL cannot be a base URL".to_owned())
        })?;
        path.pop_if_empty();
        for segment in segments {
            path.push(segment);
        }
    }
    Ok(url)
}

fn absolute_directory(directory: &Path) -> Result<String, OpenCodeError> {
    if !directory.is_absolute() {
        return Err(OpenCodeError::InvalidArgument(format!(
            "directory must be absolute: {}",
            directory.display()
        )));
    }
    directory.to_str().map(ToOwned::to_owned).ok_or_else(|| {
        OpenCodeError::InvalidArgument(format!(
            "directory is not valid UTF-8: {}",
            directory.display()
        ))
    })
}

async fn decode_json<T>(response: Response) -> Result<T, OpenCodeError>
where
    T: DeserializeOwned,
{
    if !response.status().is_success() {
        return Err(http_error(response).await);
    }
    let bytes = response.bytes().await?;
    Ok(serde_json::from_slice(&bytes)?)
}

async fn ensure_empty(response: Response) -> Result<(), OpenCodeError> {
    if response.status().is_success() {
        return Ok(());
    }
    Err(http_error(response).await)
}

async fn http_error(response: Response) -> OpenCodeError {
    let status = response.status();
    if status == StatusCode::UNAUTHORIZED {
        return OpenCodeError::Unauthorized;
    }
    let body = match response.bytes().await {
        Ok(body) => body,
        Err(error) => return OpenCodeError::Transport(error),
    };
    let bounded = &body[..body.len().min(MAX_ERROR_BODY)];
    let envelope = serde_json::from_slice::<ErrorEnvelope>(bounded).unwrap_or_default();
    let mut message = envelope
        .message
        .unwrap_or_else(|| String::from_utf8_lossy(bounded).trim().to_owned());
    if message.len() > ERROR_MESSAGE_LIMIT {
        let mut end = ERROR_MESSAGE_LIMIT;
        while end > 0 && !message.is_char_boundary(end) {
            end -= 1;
        }
        message.truncate(end);
        message.push('…');
    }
    if message.is_empty() {
        message = status
            .canonical_reason()
            .unwrap_or("request failed")
            .to_owned();
    }
    OpenCodeError::Http {
        status: status.as_u16(),
        tag: envelope
            .tag
            .map(|tag| format!(" ({tag})"))
            .unwrap_or_default(),
        message,
    }
}

#[derive(Debug, Default, Deserialize)]
struct ErrorEnvelope {
    #[serde(rename = "_tag")]
    tag: Option<String>,
    message: Option<String>,
}

#[cfg(test)]
mod tests {
    use std::net::{Ipv4Addr, SocketAddr};
    use std::sync::{Arc, Mutex};

    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use tokio::task::JoinHandle;

    use super::*;

    const INFO: &str = r#"{"version":"2.1.4","pid":99,"urls":["http://127.0.0.1"],"paths":{"tmp":"/tmp/opencode"},"capabilities":{"persistentPty":true}}"#;

    async fn serve_once(
        listener: TcpListener,
        response: String,
        seen: Arc<Mutex<Vec<String>>>,
    ) -> JoinHandle<()> {
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            let mut buffer = [0u8; 4096];
            loop {
                let read = socket.read(&mut buffer).await.unwrap();
                if read == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..read]);
                if let Some(end) = find_header_end(&request) {
                    let headers = String::from_utf8_lossy(&request[..end]).to_owned();
                    let content_length = headers
                        .lines()
                        .find_map(|line| {
                            let (name, value) = line.split_once(':')?;
                            name.eq_ignore_ascii_case("content-length")
                                .then(|| value.trim().parse::<usize>().ok())
                                .flatten()
                        })
                        .unwrap_or(0);
                    let body_have = request.len().saturating_sub(end + 4);
                    if body_have >= content_length {
                        seen.lock().unwrap().push(headers.to_string());
                        break;
                    }
                }
            }
            socket.write_all(response.as_bytes()).await.unwrap();
        })
    }

    fn find_header_end(request: &[u8]) -> Option<usize> {
        request.windows(4).position(|window| window == b"\r\n\r\n")
    }

    async fn start(response: String) -> (SocketAddr, Arc<Mutex<Vec<String>>>, JoinHandle<()>) {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).await.unwrap();
        let address = listener.local_addr().unwrap();
        let seen = Arc::new(Mutex::new(Vec::new()));
        let task = serve_once(listener, response, Arc::clone(&seen)).await;
        (address, seen, task)
    }

    #[tokio::test]
    async fn connects_and_fetches_info_without_auth() {
        let (address, seen, task) = start(format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            INFO.len(),
            INFO
        ))
        .await;
        let url = Url::parse(&format!("http://{address}")).unwrap();
        let client = OpenCodeClient::connect_to(url, None).await.unwrap();
        assert_eq!(client.info().version, "2.1.4");
        assert_eq!(client.info().pid, 99);
        task.await.unwrap();
        let seen = seen.lock().unwrap();
        assert_eq!(seen.len(), 1);
        assert!(seen[0].starts_with("GET /api/info HTTP/1.1"));
    }

    #[tokio::test]
    async fn maps_unauthorized_responses() {
        let (address, _seen, task) = start(
            "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nContent-Length: 64\r\nConnection: close\r\n\r\n{\"_tag\":\"UnauthorizedError\",\"message\":\"Authentication required\"}   ".to_owned(),
        )
        .await;
        let url = Url::parse(&format!("http://{address}")).unwrap();
        let error = OpenCodeClient::connect_to(url, None).await.unwrap_err();
        assert!(matches!(error, OpenCodeError::Unauthorized));
        task.await.unwrap();
    }

    #[tokio::test]
    async fn rejects_non_v2_service() {
        let info = r#"{"version":"1.0.0","pid":1,"urls":[],"paths":{"tmp":"/tmp"}}"#;
        let (address, _seen, task) = start(format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            info.len(),
            info
        ))
        .await;
        let url = Url::parse(&format!("http://{address}")).unwrap();
        let error = OpenCodeClient::connect_to(url, None).await.unwrap_err();
        assert!(matches!(error, OpenCodeError::IncompatibleVersion { .. }));
        task.await.unwrap();
    }

    #[test]
    fn endpoints_are_joined_under_a_path_prefix() {
        let base = validate_service_url("http://127.0.0.1:9000/prefix").unwrap();
        let url = endpoint(&base, &["api", "session", "ses_1"]).unwrap();
        assert_eq!(
            url.as_str(),
            "http://127.0.0.1:9000/prefix/api/session/ses_1"
        );
    }

    #[test]
    fn absolute_directory_is_required() {
        assert!(absolute_directory(Path::new("relative")).is_err());
        assert!(absolute_directory(Path::new("/tmp/work")).is_ok());
    }

    #[test]
    fn credentials_debug_is_redacted() {
        let debug = format!("{:?}", BasicCredentials::opencode("hunter2"));
        assert!(debug.contains("redacted"));
        assert!(!debug.contains("hunter2"));
    }
}
