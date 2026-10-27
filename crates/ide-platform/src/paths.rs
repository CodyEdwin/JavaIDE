//! Host path discovery.
//!
//! These helpers exist so adapters agree on where the user's state lives. They
//! never create directories; callers decide when a directory is needed.

use std::path::PathBuf;

/// Returns the current user's home directory.
///
/// Uses `HOME` on Unix and `USERPROFILE` on Windows. Returns `None` when the
/// variable is absent or empty rather than guessing from the passwd database.
#[must_use]
pub fn user_home() -> Option<PathBuf> {
    #[cfg(windows)]
    let variable = "USERPROFILE";
    #[cfg(not(windows))]
    let variable = "HOME";

    non_empty_env(variable).map(PathBuf::from)
}

/// Returns the platform state directory for application data.
///
/// Honors `XDG_STATE_HOME` when set, otherwise falls back to
/// `~/.local/state`, which is also where OpenCode stores its service
/// registration on Linux and macOS. Windows applications that need
/// `LOCALAPPDATA` should pass it explicitly until a dedicated helper exists.
#[must_use]
pub fn state_home() -> Option<PathBuf> {
    if let Some(value) = non_empty_env("XDG_STATE_HOME") {
        return Some(PathBuf::from(value));
    }
    user_home().map(|home| home.join(".local").join("state"))
}

/// Returns the platform configuration directory.
///
/// Honors `XDG_CONFIG_HOME` when set, otherwise falls back to
/// `~/.config`, matching OpenCode's registration location on Linux and macOS.
/// It never creates the directory.
#[must_use]
pub fn config_home() -> Option<PathBuf> {
    if let Some(value) = non_empty_env("XDG_CONFIG_HOME") {
        return Some(PathBuf::from(value));
    }
    user_home().map(|home| home.join(".config"))
}

fn non_empty_env(name: &str) -> Option<std::ffi::OsString> {
    std::env::var_os(name).filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_home_ends_with_local_state_without_xdg() {
        // Environment variables are process-global; do not mutate them in
        // tests. Only assert the shape when XDG_STATE_HOME is not set.
        if std::env::var_os("XDG_STATE_HOME").is_some() {
            return;
        }
        let Some(home) = user_home() else {
            return;
        };
        assert_eq!(state_home().unwrap(), home.join(".local").join("state"));
    }

    #[test]
    fn config_home_ends_with_dot_config_without_xdg() {
        if std::env::var_os("XDG_CONFIG_HOME").is_some() {
            return;
        }
        let Some(home) = user_home() else {
            return;
        };
        assert_eq!(config_home().unwrap(), home.join(".config"));
    }
}
