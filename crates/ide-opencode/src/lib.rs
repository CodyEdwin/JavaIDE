//! OpenCode V2 integration.
//!
//! This crate is the only place that knows OpenCode's wire protocol. It owns:
//!
//! - discovery of the user's shared service (`~/.local/state/opencode` and
//!   `~/.config/opencode`);
//! - authenticated HTTP calls for health, sessions, prompts, interrupts,
//!   permissions, and diffs;
//! - the live SSE event subscription;
//! - the client-MCP WebSocket transport.
//!
//! It does not own UI state, prompt templates, context assembly, or MCP tool
//! implementations. Those live in `ide-domain` and `ide-mcp` so the assistant
//! can be disabled without affecting Java/Gradle features.
//!
//! # Failure model
//!
//! A missing or incompatible service is a normal, typed condition. Callers
//! should show setup guidance and keep the IDE usable; they should not retry in
//! a tight loop. SSE is live-only, so reconnect logic must refetch context and
//! pending permission/form state before accepting new events.
//!
//! # Security
//!
//! The service is loopback-only and authenticated with a generated password.
//! Prompts and file contents leave the machine through the user's configured
//! model provider; this crate never logs payloads, tool output, or auth headers.
//!
//! See `docs/OPENCODE.md` for the behavioral contract.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod client;
mod discovery;
mod error;
mod event;
mod mcp;

pub use client::{
    BasicCredentials, CreateSession, DiffQuery, FileDiff, ModelRef, OpenCodeClient,
    PermissionReply, PermissionRequest, PromptFile, PromptInput, ServerInfo, ServerPaths, Session,
    SessionCursor, SessionLocation, SessionPage, SessionTime,
};
pub use discovery::DiscoveredService;
pub use error::OpenCodeError;
pub use event::{EventStream, OpenCodeEvent};
pub use mcp::ClientMcp;

/// The OpenCode V2 protocol major version supported by this crate.
pub const SUPPORTED_MAJOR: u32 = 2;
