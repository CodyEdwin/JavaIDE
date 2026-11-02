//! Stable identifiers used across the IDE.
//!
//! Each ID is an opaque newtype around a UUID. The inner value is intentionally
//! not public so callers cannot accidentally treat one ID kind as another.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

/// Stable identifier for an open document.
///
/// Assigned when the document is registered; the URI remains the durable key
/// across restarts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DocumentId(Uuid);

impl DocumentId {
    /// Generates a random document ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

/// Stable identifier for a workspace/window.
///
/// A workspace is one or more roots.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WorkspaceId(Uuid);

impl WorkspaceId {
    /// Generates a random workspace ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

/// Stable identifier for a Java project reported by jdtls or Gradle.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ProjectId(Uuid);

impl ProjectId {
    /// Generates a random project ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

/// Stable identifier for an OpenCode assistant session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AssistantSessionId(Uuid);

impl AssistantSessionId {
    /// Generates a random session ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

/// Stable identifier for a permission request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PermissionRequestId(Uuid);

impl PermissionRequestId {
    /// Generates a random permission request ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

/// Stable identifier for a turn within an assistant session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TurnId(Uuid);

impl TurnId {
    /// Generates a random turn ID.
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}
