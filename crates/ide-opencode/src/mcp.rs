//! Client-hosted MCP over the OpenCode experimental WebSocket.
//!
//! `GET /api/experimental/client-mcp?name=<name>&location.directory=<root>`
//! upgrades to a WebSocket where the IDE hosts an MCP server. Each text frame
//! is one JSON-RPC message. This module owns only the transport: MCP method
//! dispatch and the Java/Gradle tool schemas belong to `ide-mcp`.
//!
//! The endpoint is marked experimental. Callers must be prepared for a failed
//! upgrade and fall back to the plugin transport described in
//! `docs/OPENCODE.md` §6.2.

use std::fmt;
use std::path::Path;

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use url::Url;

use crate::OpenCodeError;
use crate::client::OpenCodeClient;

/// A live client-MCP WebSocket.
///
/// OpenCode sends MCP requests on this socket; the IDE answers on the same
/// socket. Keep the value alive for as long as the IDE tools should remain
/// available.
pub struct ClientMcp {
    socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
    name: String,
}

impl fmt::Debug for ClientMcp {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ClientMcp")
            .field("name", &self.name)
            .finish_non_exhaustive()
    }
}

impl ClientMcp {
    pub(crate) async fn attach(
        client: &OpenCodeClient,
        name: &str,
        directory: &Path,
    ) -> Result<Self, OpenCodeError> {
        let url = mcp_url(client.base_url(), name, directory)?;
        let mut request = url.as_str().into_client_request().map_err(|error| {
            OpenCodeError::Protocol(format!("invalid WebSocket request: {error}"))
        })?;
        if let Some(credentials) = client.credentials() {
            let value = credentials.authorization();
            let value = HeaderValue::from_str(&value).map_err(|error| {
                OpenCodeError::Protocol(format!("invalid Authorization header: {error}"))
            })?;
            request.headers_mut().insert(AUTHORIZATION, value);
        }
        let (socket, _response) = tokio_tungstenite::connect_async(request).await?;
        Ok(Self {
            socket,
            name: name.to_owned(),
        })
    }

    /// Returns the MCP server name registered with OpenCode.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Sends one JSON-RPC message as a text frame.
    ///
    /// # Errors
    ///
    /// Returns a WebSocket error if the frame cannot be sent.
    pub async fn send_json(&mut self, message: &Value) -> Result<(), OpenCodeError> {
        let text = serde_json::to_string(message)?;
        self.socket.send(Message::Text(text.into())).await?;
        Ok(())
    }

    /// Waits for the next JSON-RPC message.
    ///
    /// Ping/Pong control frames are handled by the WebSocket implementation and
    /// skipped. A clean close returns `Ok(None)`.
    ///
    /// # Errors
    ///
    /// Returns a WebSocket error, or [`OpenCodeError::Protocol`] for a binary or
    /// non-JSON text frame.
    pub async fn next_json(&mut self) -> Result<Option<Value>, OpenCodeError> {
        loop {
            match self.socket.next().await {
                None => return Ok(None),
                Some(Err(error)) => return Err(OpenCodeError::WebSocket(error)),
                Some(Ok(Message::Text(text))) => {
                    let value = serde_json::from_str(text.as_str()).map_err(|error| {
                        OpenCodeError::Protocol(format!("invalid MCP JSON frame: {error}"))
                    })?;
                    return Ok(Some(value));
                }
                Some(Ok(Message::Binary(_))) => {
                    return Err(OpenCodeError::Protocol(
                        "binary MCP frames are not supported".to_owned(),
                    ));
                }
                Some(Ok(Message::Close(_))) => return Ok(None),
                Some(Ok(Message::Ping(_) | Message::Pong(_) | Message::Frame(_))) => {}
            }
        }
    }

    /// Sends a WebSocket close frame and flushes it.
    ///
    /// # Errors
    ///
    /// Returns a WebSocket error if the close frame cannot be sent.
    pub async fn close(mut self) -> Result<(), OpenCodeError> {
        self.socket.send(Message::Close(None)).await?;
        let _ = self.socket.flush().await;
        Ok(())
    }
}

fn mcp_url(base: &Url, name: &str, directory: &Path) -> Result<Url, OpenCodeError> {
    if name.trim().is_empty() {
        return Err(OpenCodeError::InvalidArgument(
            "client-MCP name must not be empty".to_owned(),
        ));
    }
    if !directory.is_absolute() {
        return Err(OpenCodeError::InvalidArgument(format!(
            "client-MCP directory must be absolute: {}",
            directory.display()
        )));
    }
    let directory = directory.to_str().ok_or_else(|| {
        OpenCodeError::InvalidArgument(format!(
            "client-MCP directory is not valid UTF-8: {}",
            directory.display()
        ))
    })?;

    let mut url = base.clone();
    let scheme = match url.scheme() {
        "http" => "ws",
        "https" => "wss",
        other => {
            return Err(OpenCodeError::InvalidServiceUrl(format!(
                "cannot upgrade scheme {other:?} to WebSocket"
            )));
        }
    };
    url.set_scheme(scheme).map_err(|()| {
        OpenCodeError::InvalidServiceUrl(format!("cannot set WebSocket scheme for {url}"))
    })?;
    {
        let mut path = url.path_segments_mut().map_err(|()| {
            OpenCodeError::InvalidServiceUrl("service URL cannot be a base URL".to_owned())
        })?;
        path.pop_if_empty();
        path.extend(["api", "experimental", "client-mcp"]);
    }
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("name", name)
            .append_pair("location.directory", directory);
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_loopback_websocket_url() {
        let base = Url::parse("http://127.0.0.1:49374/").unwrap();
        let url = mcp_url(&base, "javaide", Path::new("/tmp/a b")).unwrap();
        assert_eq!(url.scheme(), "ws");
        assert_eq!(url.path(), "/api/experimental/client-mcp");
        assert_eq!(
            url.query(),
            Some("name=javaide&location.directory=%2Ftmp%2Fa+b")
        );
    }

    #[test]
    fn rejects_bad_names_and_directories() {
        let base = Url::parse("http://127.0.0.1:49374/").unwrap();
        assert!(mcp_url(&base, " ", Path::new("/tmp")).is_err());
        assert!(mcp_url(&base, "javaide", Path::new("relative")).is_err());
    }
}
