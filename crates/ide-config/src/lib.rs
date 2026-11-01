//! Settings and workspace trust for JavaIDE.
//!
//! # Boundary
//!
//! This crate owns the on-disk shape of user settings and the trust decision
//! for a workspace root. It maps the Java settings the IDE exposes onto the
//! JSON document jdtls reads. It does not launch jdtls, talk to Gradle, or
//! draw UI.
//!
//! # Invariants
//!
//! - Settings files are TOML, schema version [`SETTINGS_VERSION`].
//! - JVM arguments are a whitespace-separated list of tokens that each start
//!   with `-`. There is no shell.
//! - Trust is an explicit decision. A missing entry is [`TrustDecision::Unknown`],
//!   which does not permit Gradle or jdtls.
//! - Writes are atomic (temporary file, then rename).
//!
//! # Errors
//!
//! [`ConfigError`] covers missing files that were expected to parse, invalid
//! TOML, unsupported versions, and rejected JVM arguments. A missing settings
//! or trust file is not an error: callers receive defaults.

#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

mod settings;
mod trust;

pub use settings::{
    EffectiveSettings, JavaSettings, SETTINGS_VERSION, SettingsOrigin, load_effective,
    load_settings_file, parse_vm_args, requires_restart, save_settings_file, user_settings_path,
    workspace_settings_path,
};
pub use trust::{TrustDecision, TrustStore, trust_key, trust_path};

use std::path::PathBuf;

/// Failure while reading or writing configuration.
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    /// The file could not be read.
    #[error("cannot read {path}: {source}")]
    Read {
        /// File that could not be read.
        path: PathBuf,
        /// Underlying I/O error.
        #[source]
        source: std::io::Error,
    },
    /// The file could not be written.
    #[error("cannot write {path}: {source}")]
    Write {
        /// File that could not be written.
        path: PathBuf,
        /// Underlying I/O error.
        #[source]
        source: std::io::Error,
    },
    /// The file was not valid TOML or JSON for its schema.
    #[error("invalid configuration in {path}: {message}")]
    Parse {
        /// File that failed to parse.
        path: PathBuf,
        /// Parser message.
        message: String,
    },
    /// The document version is newer than this crate understands.
    #[error("unsupported configuration version {version} in {path}")]
    UnsupportedVersion {
        /// Version found in the file.
        version: u32,
        /// File that declared it.
        path: PathBuf,
    },
    /// JVM arguments failed validation.
    #[error("invalid JVM arguments: {0}")]
    VmArgs(String),
}

pub(crate) fn write_atomic(path: &std::path::Path, bytes: &[u8]) -> Result<(), ConfigError> {
    if let Some(parent) = path.parent()
        && !parent.as_os_str().is_empty()
    {
        std::fs::create_dir_all(parent).map_err(|source| ConfigError::Write {
            path: parent.to_path_buf(),
            source,
        })?;
    }
    let mut temporary_name = path
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| "settings".into());
    temporary_name.push(".tmp");
    let temporary = path.with_file_name(temporary_name);
    std::fs::write(&temporary, bytes).map_err(|source| ConfigError::Write {
        path: temporary.clone(),
        source,
    })?;
    std::fs::rename(&temporary, path).map_err(|source| {
        let _ = std::fs::remove_file(&temporary);
        ConfigError::Write {
            path: path.to_path_buf(),
            source,
        }
    })
}
