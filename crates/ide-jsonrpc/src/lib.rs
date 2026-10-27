//! JSON-RPC 2.0 message types and `Content-Length` framing.
//!
//! This crate is intentionally protocol-agnostic: it knows nothing about LSP,
//! DAP, Gradle, or OpenCode. Adapters build typed request/response types on top
//! of [`Message`] and use [`RpcPeer`] for transport.
//!
//! # Framing
//!
//! LSP-style framing is used:
//!
//! ```text
//! Content-Length: 42\r\n
//! \r\n
//! {"jsonrpc":"2.0",...}
//! ```
//!
//! Headers are ASCII, names are case-insensitive, and unknown headers are
//! ignored. Frames are bounded by [`JsonRpcCodec::DEFAULT_MAX_FRAME_BYTES`] to
//! avoid unbounded allocation from a corrupt or hostile peer.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

pub mod codec;
pub mod message;
pub mod peer;

pub use codec::{CodecError, JsonRpcCodec};
pub use message::{
    ErrorObject, Message, MessageError, MessageKind, RequestId, Response, ResponsePayload,
};
pub use peer::{Incoming, RpcFailure, RpcPeer, RpcPeerError};
