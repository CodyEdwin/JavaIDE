//! Explicit trust decisions for workspace roots.
//!
//! Gradle import and jdtls both execute project build scripts. Restricted mode
//! keeps the editor usable and refuses those integrations.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::{ConfigError, write_atomic};

/// Whether the user has allowed a workspace to run project code.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrustDecision {
    /// The folder has never been accepted or rejected.
    Unknown,
    /// jdtls, Gradle, and the assistant may run.
    Trusted,
    /// Editing is allowed. Project code does not run.
    Restricted,
}

impl TrustDecision {
    /// Stable name used by the desktop shell.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Trusted => "trusted",
            Self::Restricted => "restricted",
        }
    }

    /// Returns whether Gradle, jdtls, and the assistant may run.
    #[must_use]
    pub const fn allows_execution(self) -> bool {
        matches!(self, Self::Trusted)
    }
}

/// Path of `trust.json` inside the JavaIDE config directory.
#[must_use]
pub fn trust_path(config_dir: &Path) -> PathBuf {
    config_dir.join("trust.json")
}

/// Stable map key for a workspace root.
///
/// Existing directories are canonicalized so a symlink and its target share one
/// decision. A trailing slash is removed. The path does not have to exist.
#[must_use]
pub fn trust_key(path: &Path) -> String {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let text = canonical.to_string_lossy();
    text.trim_end_matches(['/', '\\']).to_owned()
}

#[derive(Debug, Serialize, Deserialize)]
struct TrustDocument {
    version: u32,
    #[serde(default)]
    workspaces: BTreeMap<String, bool>,
}

/// Persisted trust decisions.
#[derive(Debug, Clone)]
pub struct TrustStore {
    path: PathBuf,
    workspaces: BTreeMap<String, bool>,
}

impl TrustStore {
    /// Loads decisions from `path`.
    ///
    /// A missing file is an empty store.
    ///
    /// # Errors
    ///
    /// Returns [`ConfigError`] when the file exists but cannot be read or is
    /// not a version-1 trust document.
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        let text = match std::fs::read_to_string(path) {
            Ok(text) => text,
            Err(source) if source.kind() == std::io::ErrorKind::NotFound => {
                return Ok(Self {
                    path: path.to_path_buf(),
                    workspaces: BTreeMap::new(),
                });
            }
            Err(source) => {
                return Err(ConfigError::Read {
                    path: path.to_path_buf(),
                    source,
                });
            }
        };
        let document: TrustDocument =
            serde_json::from_str(&text).map_err(|error| ConfigError::Parse {
                path: path.to_path_buf(),
                message: error.to_string(),
            })?;
        if document.version != 1 {
            return Err(ConfigError::UnsupportedVersion {
                version: document.version,
                path: path.to_path_buf(),
            });
        }
        Ok(Self {
            path: path.to_path_buf(),
            workspaces: document.workspaces,
        })
    }

    /// Returns the decision recorded for `root`.
    #[must_use]
    pub fn decision(&self, root: &Path) -> TrustDecision {
        match self.workspaces.get(&trust_key(root)) {
            Some(true) => TrustDecision::Trusted,
            Some(false) => TrustDecision::Restricted,
            None => TrustDecision::Unknown,
        }
    }

    /// Records `trusted` for `root` and writes the file.
    ///
    /// # Errors
    ///
    /// Returns [`ConfigError::Write`] when the file cannot be replaced.
    pub fn set(&mut self, root: &Path, trusted: bool) -> Result<(), ConfigError> {
        self.workspaces.insert(trust_key(root), trusted);
        self.save()
    }

    fn save(&self) -> Result<(), ConfigError> {
        let document = TrustDocument {
            version: 1,
            workspaces: self.workspaces.clone(),
        };
        let text = serde_json::to_vec_pretty(&document).map_err(|error| ConfigError::Parse {
            path: self.path.clone(),
            message: error.to_string(),
        })?;
        write_atomic(&self.path, &text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_until_the_user_decides() {
        let dir = std::env::temp_dir().join(format!("javaide-trust-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let workspace = dir.join("workspace");
        std::fs::create_dir_all(&workspace).unwrap();
        let path = dir.join("trust.json");
        let mut store = TrustStore::load(&path).unwrap();
        assert_eq!(store.decision(&workspace), TrustDecision::Unknown);
        assert!(!store.decision(&workspace).allows_execution());
        store.set(&workspace, false).unwrap();
        let reloaded = TrustStore::load(&path).unwrap();
        assert_eq!(reloaded.decision(&workspace), TrustDecision::Restricted);
        store.set(&workspace, true).unwrap();
        let reloaded = TrustStore::load(&path).unwrap();
        assert_eq!(reloaded.decision(&workspace), TrustDecision::Trusted);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn canonical_paths_share_a_decision() {
        let dir = std::env::temp_dir().join(format!("javaide-trust-link-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("real")).unwrap();
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.join("real"), dir.join("link")).unwrap();
            let mut store = TrustStore::load(&dir.join("trust.json")).unwrap();
            store.set(&dir.join("link"), true).unwrap();
            assert_eq!(store.decision(&dir.join("real")), TrustDecision::Trusted);
        }
        let _ = std::fs::remove_dir_all(&dir);
    }
}
