//! A JSON-RPC peer with request correlation and server-request delivery.
//!
//! [`RpcPeer`] owns one framed transport. It performs three jobs:
//!
//! 1. Correlate responses with pending requests.
//! 2. Deliver incoming requests and notifications to the owner through a
//!    bounded channel.
//! 3. Serialize writes so concurrent callers cannot interleave frames.
//!
//! # Direction and ownership
//!
//! The owner of the peer is responsible for *handling* [`Incoming`] messages.
//! The peer never invokes a callback while holding internal locks; server
//! requests are queued and answered with [`RpcPeer::respond`] or
//! [`RpcPeer::respond_error`]. This keeps slow handlers from blocking response
//! correlation.
//!
//! # Cancellation
//!
//! Dropping a request future removes its pending entry. A response that arrives
//! afterwards is ignored (and logged at debug level). This is intentional: the
//! transport stays usable, and a late response cannot complete a newer request
//! because request ids are never reused.
//!
//! [`RpcPeer::shutdown`] aborts the read task and fails all pending requests
//! with [`RpcFailure::Closed`]. Dropping the last peer handle does the same.
//!
//! # Backpressure
//!
//! Incoming messages use a bounded channel. If the owner stops reading, the
//! reader task stops consuming the transport when the channel fills. Bounded
//! backpressure is preferable to unbounded memory growth from a chatty server.

use std::collections::HashMap;
use std::fmt;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::sync::{mpsc, oneshot};
use tokio::task::AbortHandle;
use tokio_util::codec::{FramedRead, FramedWrite};

use crate::codec::{CodecError, JsonRpcCodec};
use crate::message::{ErrorObject, Message, RequestId, ResponsePayload};

type RequestSender = oneshot::Sender<Result<Value, RpcFailure>>;
type RequestReceiver = oneshot::Receiver<Result<Value, RpcFailure>>;
type PendingMap = HashMap<RequestId, RequestSender>;

/// An incoming server-initiated message.
#[derive(Debug, Clone, PartialEq)]
pub enum Incoming {
    /// The server is calling the client. It expects a response with this id.
    Request {
        /// Id assigned by the server. Echo it when responding.
        id: RequestId,
        /// Method name.
        method: String,
        /// Parameters.
        params: Option<Value>,
    },
    /// The server sent a one-way notification.
    Notification {
        /// Method name.
        method: String,
        /// Parameters.
        params: Option<Value>,
    },
    /// The read side closed. No further messages will be delivered.
    Closed {
        /// Transport error, or `None` for a clean EOF or deliberate shutdown.
        reason: Option<String>,
    },
}

/// Why a pending request did not produce a successful value.
#[derive(Debug, Clone, thiserror::Error)]
pub enum RpcFailure {
    /// The transport closed before a response arrived.
    #[error("connection closed before a response arrived")]
    Closed,
    /// The server returned a JSON-RPC error.
    #[error("remote error: {0}")]
    Remote(ErrorObject),
}

/// Errors from sending a request or notification.
#[derive(Debug, thiserror::Error)]
pub enum RpcPeerError {
    /// The transport is closed.
    #[error("JSON-RPC connection is closed")]
    Closed,
    /// The server returned a JSON-RPC error.
    #[error("remote error: {0}")]
    Remote(ErrorObject),
    /// No response arrived within the caller's deadline.
    ///
    /// The request may still be executing on the server. JSON-RPC has no
    /// cancellation method; protocols that support cancellation send a
    /// notification separately (for example LSP's `$/cancelRequest`).
    #[error("request timed out after {0:?}")]
    Timeout(Duration),
    /// Framing or JSON encoding failed.
    #[error(transparent)]
    Codec(#[from] CodecError),
    /// The transport failed.
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl From<RpcFailure> for RpcPeerError {
    fn from(failure: RpcFailure) -> Self {
        match failure {
            RpcFailure::Closed => Self::Closed,
            RpcFailure::Remote(error) => Self::Remote(error),
        }
    }
}

/// Shared state used by the reader task and all peer handles.
struct Pending {
    map: Mutex<PendingMap>,
    closed: AtomicBool,
    next_id: AtomicI64,
}

impl Pending {
    fn new() -> Self {
        Self {
            map: Mutex::new(HashMap::new()),
            closed: AtomicBool::new(false),
            next_id: AtomicI64::new(1),
        }
    }

    fn lock(&self) -> MutexGuard<'_, PendingMap> {
        // A panic in one request handler must not make the transport
        // permanently unusable; the map contains no data whose invariants can
        // be violated by a panic.
        self.map
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn is_closed(&self) -> bool {
        self.closed.load(Ordering::SeqCst)
    }

    /// Inserts a pending request. Returns `false` if the peer is already closed.
    ///
    /// The closed check and insertion happen under the same lock as
    /// [`Self::close`], so a request can never be registered after the map was
    /// drained.
    fn register(&self, id: RequestId, sender: RequestSender) -> bool {
        let mut map = self.lock();
        if self.is_closed() {
            return false;
        }
        map.insert(id, sender);
        true
    }

    fn take(&self, id: &RequestId) -> Option<RequestSender> {
        self.lock().remove(id)
    }

    fn complete(&self, id: &RequestId, outcome: Result<Value, RpcFailure>) -> bool {
        let Some(sender) = self.take(id) else {
            return false;
        };
        let _ = sender.send(outcome);
        true
    }

    /// Marks the peer closed and fails every waiter exactly once.
    fn close(&self) {
        let mut map = self.lock();
        self.closed.store(true, Ordering::SeqCst);
        for (_, sender) in map.drain() {
            let _ = sender.send(Err(RpcFailure::Closed));
        }
    }
}

/// Removes a pending entry if a request future is dropped before completion.
struct RequestGuard {
    pending: Arc<Pending>,
    id: RequestId,
}

impl Drop for RequestGuard {
    fn drop(&mut self) {
        self.pending.take(&self.id);
    }
}

struct Inner {
    pending: Arc<Pending>,
    writer: tokio::sync::Mutex<FramedWrite<Box<dyn AsyncWrite + Send + Unpin>, JsonRpcCodec>>,
    reader: AbortHandle,
}

impl Drop for Inner {
    fn drop(&mut self) {
        // The reader task holds an `Arc<Pending>` but not `Inner`, so aborting
        // here cannot create a reference cycle.
        self.reader.abort();
        self.pending.close();
    }
}

/// A cloneable handle to a JSON-RPC connection.
///
/// Clones share one transport, one pending-request table, and one id sequence.
/// Use [`RpcPeer::spawn`] to create a peer from an async read/write pair.
#[derive(Clone)]
pub struct RpcPeer {
    inner: Arc<Inner>,
}

impl fmt::Debug for RpcPeer {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RpcPeer")
            .field("closed", &self.inner.pending.is_closed())
            .finish_non_exhaustive()
    }
}

impl RpcPeer {
    /// Starts a peer over a read/write pair.
    ///
    /// The returned receiver yields server requests, notifications, and a final
    /// [`Incoming::Closed`] when the read side ends. `incoming_capacity` is
    /// clamped to at least one.
    ///
    /// The read and write halves may come from the same transport, for example
    /// `tokio::io::split(child_stdio)` or two halves of a TCP stream.
    pub fn spawn<R, W>(
        reader: R,
        writer: W,
        incoming_capacity: usize,
    ) -> (Self, mpsc::Receiver<Incoming>)
    where
        R: AsyncRead + Send + Unpin + 'static,
        W: AsyncWrite + Send + Unpin + 'static,
    {
        let pending = Arc::new(Pending::new());
        let (incoming_tx, incoming_rx) = mpsc::channel(incoming_capacity.max(1));

        let framed_reader = FramedRead::new(reader, JsonRpcCodec::default());
        let framed_writer: FramedWrite<Box<dyn AsyncWrite + Send + Unpin>, JsonRpcCodec> =
            FramedWrite::new(Box::new(writer), JsonRpcCodec::default());

        let reader_pending = Arc::clone(&pending);
        let reader_task = tokio::spawn(reader_loop(framed_reader, reader_pending, incoming_tx));

        let peer = Self {
            inner: Arc::new(Inner {
                pending,
                writer: tokio::sync::Mutex::new(framed_writer),
                reader: reader_task.abort_handle(),
            }),
        };
        (peer, incoming_rx)
    }

    /// Sends a request and waits for its response without a timeout.
    ///
    /// Prefer [`RpcPeer::request_with_timeout`] unless the protocol operation is
    /// genuinely unbounded and the caller has its own cancellation path.
    ///
    /// # Errors
    ///
    /// Returns [`RpcPeerError::Remote`] for a JSON-RPC error response,
    /// [`RpcPeerError::Closed`] if the transport ends first, or an I/O/codec
    /// error if the request cannot be written.
    pub async fn request(
        &self,
        method: impl Into<String>,
        params: Option<Value>,
    ) -> Result<Value, RpcPeerError> {
        let (receiver, _guard) = self.begin_request(method, params).await?;
        match receiver.await {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(failure)) => Err(failure.into()),
            Err(_) => Err(RpcPeerError::Closed),
        }
    }

    /// Sends a request and waits up to `limit` for its response.
    ///
    /// On timeout the pending entry is removed and the connection stays open.
    /// The server may still be running the operation; callers that need
    /// cancellation must use the protocol's own mechanism.
    ///
    /// # Errors
    ///
    /// As [`RpcPeer::request`], plus [`RpcPeerError::Timeout`].
    pub async fn request_with_timeout(
        &self,
        method: impl Into<String>,
        params: Option<Value>,
        limit: Duration,
    ) -> Result<Value, RpcPeerError> {
        let (receiver, _guard) = self.begin_request(method, params).await?;
        match tokio::time::timeout(limit, receiver).await {
            Ok(Ok(Ok(value))) => Ok(value),
            Ok(Ok(Err(failure))) => Err(failure.into()),
            Ok(Err(_)) => Err(RpcPeerError::Closed),
            Err(_) => Err(RpcPeerError::Timeout(limit)),
        }
    }

    async fn begin_request(
        &self,
        method: impl Into<String>,
        params: Option<Value>,
    ) -> Result<(RequestReceiver, RequestGuard), RpcPeerError> {
        let id = RequestId::Number(self.inner.pending.next_id.fetch_add(1, Ordering::SeqCst));
        let (sender, receiver) = oneshot::channel();
        if !self.inner.pending.register(id.clone(), sender) {
            return Err(RpcPeerError::Closed);
        }
        let guard = RequestGuard {
            pending: Arc::clone(&self.inner.pending),
            id: id.clone(),
        };
        self.send_message(Message::request(id, method, params))
            .await?;
        Ok((receiver, guard))
    }

    /// Sends a one-way notification.
    ///
    /// # Errors
    ///
    /// Returns [`RpcPeerError::Closed`] or an I/O/codec error if the message
    /// cannot be written.
    pub async fn notify(
        &self,
        method: impl Into<String>,
        params: Option<Value>,
    ) -> Result<(), RpcPeerError> {
        self.send_message(Message::notification(method, params))
            .await
    }

    /// Responds successfully to a server request.
    ///
    /// # Errors
    ///
    /// Returns an error if the response cannot be written.
    pub async fn respond(&self, id: RequestId, result: Value) -> Result<(), RpcPeerError> {
        self.send_message(Message::success(id, result)).await
    }

    /// Responds to a server request with an error.
    ///
    /// # Errors
    ///
    /// Returns an error if the response cannot be written.
    pub async fn respond_error(
        &self,
        id: RequestId,
        error: ErrorObject,
    ) -> Result<(), RpcPeerError> {
        self.send_message(Message::error(id, error)).await
    }

    /// Returns whether the transport has been marked closed.
    #[must_use]
    pub fn is_closed(&self) -> bool {
        self.inner.pending.is_closed()
    }

    /// Stops the reader, fails pending requests, and marks the peer closed.
    ///
    /// This does not wait for the reader task to finish and does not send a
    /// protocol-level goodbye; callers that need a graceful shutdown must send
    /// the protocol's shutdown request first.
    pub fn shutdown(&self) {
        self.inner.reader.abort();
        self.inner.pending.close();
    }

    async fn send_message(&self, message: Message) -> Result<(), RpcPeerError> {
        if self.inner.pending.is_closed() {
            return Err(RpcPeerError::Closed);
        }
        let mut writer = self.inner.writer.lock().await;
        if self.inner.pending.is_closed() {
            return Err(RpcPeerError::Closed);
        }
        if let Err(error) = writer.send(message).await {
            // A framing or I/O failure leaves the stream in an unknown state.
            // Close the peer so no caller waits forever for a response.
            self.inner.pending.close();
            return Err(error.into());
        }
        Ok(())
    }
}

async fn reader_loop<R>(
    mut reader: FramedRead<R, JsonRpcCodec>,
    pending: Arc<Pending>,
    incoming: mpsc::Sender<Incoming>,
) where
    R: AsyncRead + Unpin,
{
    let mut reason = None;
    while let Some(item) = reader.next().await {
        match item {
            Ok(message) => dispatch(message, &pending, &incoming).await,
            Err(error) => {
                reason = Some(error.to_string());
                break;
            }
        }
    }
    pending.close();
    let _ = incoming.send(Incoming::Closed { reason }).await;
}

async fn dispatch(message: Message, pending: &Pending, incoming: &mpsc::Sender<Incoming>) {
    match message {
        Message::Response(response) => {
            let Some(id) = response.id else {
                tracing::debug!("ignoring JSON-RPC response with null id");
                return;
            };
            let outcome = match response.payload {
                ResponsePayload::Result(value) => Ok(value),
                ResponsePayload::Error(error) => Err(RpcFailure::Remote(error)),
            };
            if !pending.complete(&id, outcome) {
                tracing::debug!(request_id = %id, "ignoring response for unknown or cancelled request");
            }
        }
        Message::Request { id, method, params } => {
            let message = Incoming::Request { id, method, params };
            if incoming.send(message).await.is_err() {
                tracing::debug!("incoming request receiver dropped; request will go unanswered");
            }
        }
        Message::Notification { method, params } => {
            let message = Incoming::Notification { method, params };
            if incoming.send(message).await.is_err() {
                tracing::debug!("incoming notification receiver dropped");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use serde_json::json;
    use tokio::time::timeout;

    use super::*;

    type TestPeer = (RpcPeer, mpsc::Receiver<Incoming>);

    fn connected(capacity: usize) -> (TestPeer, TestPeer) {
        let (first, second) = tokio::io::duplex(1024 * 1024);
        let (first_read, first_write) = tokio::io::split(first);
        let (second_read, second_write) = tokio::io::split(second);
        (
            RpcPeer::spawn(first_read, first_write, capacity),
            RpcPeer::spawn(second_read, second_write, capacity),
        )
    }

    async fn recv_request(
        events: &mut mpsc::Receiver<Incoming>,
    ) -> (RequestId, String, Option<Value>) {
        match timeout(Duration::from_secs(2), events.recv())
            .await
            .expect("timed out waiting for request")
            .expect("channel closed")
        {
            Incoming::Request { id, method, params } => (id, method, params),
            other => panic!("expected request, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn correlates_request_and_response() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let server_task = tokio::spawn(async move {
            let (id, method, params) = recv_request(&mut server_events).await;
            assert_eq!(method, "add");
            let params = params.unwrap();
            let sum = params["a"].as_i64().unwrap() + params["b"].as_i64().unwrap();
            server.respond(id, json!(sum)).await.unwrap();
        });

        let value = timeout(
            Duration::from_secs(2),
            client.request("add", Some(json!({ "a": 2, "b": 40 }))),
        )
        .await
        .expect("request timed out")
        .expect("request failed");
        assert_eq!(value, json!(42));
        server_task.await.unwrap();
    }

    #[tokio::test]
    async fn concurrent_requests_can_complete_out_of_order() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let server_task = tokio::spawn(async move {
            let (first_id, first_method, _) = recv_request(&mut server_events).await;
            let (second_id, second_method, _) = recv_request(&mut server_events).await;
            assert_eq!(first_method, "first");
            assert_eq!(second_method, "second");
            // Complete the newer request first.
            server.respond(second_id, json!("second")).await.unwrap();
            server.respond(first_id, json!("first")).await.unwrap();
        });

        let (first, second) = tokio::join!(
            client.request("first", None),
            client.request("second", None)
        );
        assert_eq!(first.unwrap(), json!("first"));
        assert_eq!(second.unwrap(), json!("second"));
        server_task.await.unwrap();
    }

    #[tokio::test]
    async fn delivers_notifications() {
        let ((client, _client_events), (_server, mut server_events)) = connected(8);
        client
            .notify(
                "textDocument/didOpen",
                Some(json!({ "uri": "file:///A.java" })),
            )
            .await
            .unwrap();

        let incoming = timeout(Duration::from_secs(2), server_events.recv())
            .await
            .unwrap()
            .unwrap();
        match incoming {
            Incoming::Notification { method, params } => {
                assert_eq!(method, "textDocument/didOpen");
                assert_eq!(params.unwrap()["uri"], "file:///A.java");
            }
            other => panic!("expected notification, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn supports_server_initiated_requests() {
        let ((client, mut client_events), (server, _server_events)) = connected(8);
        let client_task = tokio::spawn(async move {
            let (id, method, _) = recv_request(&mut client_events).await;
            assert_eq!(method, "client/registerCapability");
            client.respond(id, json!(null)).await.unwrap();
        });

        let value = timeout(
            Duration::from_secs(2),
            server.request("client/registerCapability", None),
        )
        .await
        .unwrap()
        .unwrap();
        assert_eq!(value, json!(null));
        client_task.await.unwrap();
    }

    #[tokio::test]
    async fn remote_errors_are_returned() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let server_task = tokio::spawn(async move {
            let (id, _, _) = recv_request(&mut server_events).await;
            server
                .respond_error(id, ErrorObject::new(ErrorObject::INVALID_PARAMS, "bad"))
                .await
                .unwrap();
        });

        let result = timeout(Duration::from_secs(2), client.request("explode", None))
            .await
            .unwrap();
        match result {
            Err(RpcPeerError::Remote(error)) => {
                assert_eq!(error.code, ErrorObject::INVALID_PARAMS);
                assert_eq!(error.message, "bad");
            }
            other => panic!("expected remote error, got {other:?}"),
        }
        server_task.await.unwrap();
    }

    #[tokio::test]
    async fn times_out_without_closing_the_connection() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let result = client
            .request_with_timeout("slow", None, Duration::from_millis(30))
            .await;
        assert!(matches!(result, Err(RpcPeerError::Timeout(_))));
        assert!(!client.is_closed());

        // The server saw the request; a later request still works.
        let (id, method, _) = recv_request(&mut server_events).await;
        assert_eq!(method, "slow");
        let server_task = tokio::spawn(async move {
            server.respond(id, json!("late response")).await.unwrap();
            let (second_id, second_method, _) = recv_request(&mut server_events).await;
            assert_eq!(second_method, "fast");
            server.respond(second_id, json!("ok")).await.unwrap();
        });
        let value = client.request("fast", None).await.unwrap();
        assert_eq!(value, json!("ok"));
        server_task.await.unwrap();
    }

    #[tokio::test]
    async fn pending_request_fails_when_remote_closes() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let client_task = tokio::spawn(async move { client.request("hang", None).await });

        let _ = recv_request(&mut server_events).await;
        drop(server);

        let result = timeout(Duration::from_secs(2), client_task)
            .await
            .unwrap()
            .unwrap();
        assert!(matches!(result, Err(RpcPeerError::Closed)));
    }

    #[tokio::test]
    async fn closed_event_is_delivered_on_eof() {
        let ((client, _client_events), (_server, mut server_events)) = connected(8);
        drop(client);
        loop {
            let event = timeout(Duration::from_secs(2), server_events.recv())
                .await
                .unwrap()
                .unwrap();
            match event {
                Incoming::Closed { reason } => {
                    assert!(reason.is_none(), "clean EOF should not have a reason");
                    break;
                }
                Incoming::Notification { .. } | Incoming::Request { .. } => {}
            }
        }
    }

    #[tokio::test]
    async fn shutdown_fails_pending_requests() {
        let ((client, _client_events), (server, mut server_events)) = connected(8);
        let client_task = tokio::spawn(async move { client.request("hang", None).await });
        let (_id, _method, _) = recv_request(&mut server_events).await;
        drop(server);
        let result = timeout(Duration::from_secs(2), client_task)
            .await
            .unwrap()
            .unwrap();
        assert!(matches!(result, Err(RpcPeerError::Closed)));
    }
}
