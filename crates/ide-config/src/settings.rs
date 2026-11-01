//! Java language settings and their jdtls JSON mapping.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::{ConfigError, write_atomic};

/// Schema version written by this crate.
pub const SETTINGS_VERSION: u32 = 1;

/// Where the effective settings document came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsOrigin {
    /// No file existed; built-in defaults are in use.
    Default,
    /// The user settings file under the config directory.
    User,
    /// `<workspace>/.javaide/settings.toml`, which replaces the user file.
    Workspace,
}

impl SettingsOrigin {
    /// Stable name used by the desktop shell.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::User => "user",
            Self::Workspace => "workspace",
        }
    }
}

/// Settings that change jdtls behavior.
///
/// Field names are the on-disk TOML keys. [`JavaSettings::to_language_server`]
/// is the only place that produces the nested JSON jdtls expects.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct JavaSettings {
    /// Document schema version. Missing files and missing fields use [`SETTINGS_VERSION`].
    #[serde(default = "current_version")]
    pub version: u32,
    /// `java.format.enabled`.
    pub format_enabled: bool,
    /// `java.completion.enabled`.
    pub completion_enabled: bool,
    /// `java.completion.favoriteStaticMembers`.
    pub completion_favorites: Vec<String>,
    /// `java.completion.importOrder`. An empty string is the catch-all group.
    pub completion_import_order: Vec<String>,
    /// `java.completion.guessMethodArguments`.
    pub completion_guess_method_arguments: bool,
    /// `java.jdt.ls.vmargs`. Extra JVM arguments for the jdtls process.
    ///
    /// Changing this does not affect a server that is already running.
    pub vmargs: String,
}

const fn current_version() -> u32 {
    SETTINGS_VERSION
}

impl Default for JavaSettings {
    fn default() -> Self {
        Self {
            version: SETTINGS_VERSION,
            format_enabled: true,
            completion_enabled: true,
            completion_favorites: vec![
                "org.junit.jupiter.api.Assertions.*".to_owned(),
                "org.junit.Assert.*".to_owned(),
                "org.mockito.Mockito.*".to_owned(),
                "org.mockito.ArgumentMatchers.*".to_owned(),
            ],
            completion_import_order: vec![
                "java".to_owned(),
                "javax".to_owned(),
                "org".to_owned(),
                "com".to_owned(),
                String::new(),
            ],
            completion_guess_method_arguments: true,
            vmargs: String::new(),
        }
    }
}

impl JavaSettings {
    /// Trims list entries and JVM arguments.
    ///
    /// Blank favorite members are dropped. A blank import-order line is kept
    /// once, because jdtls treats `""` as the group for every other package.
    pub fn normalize(&mut self) {
        self.completion_favorites = self
            .completion_favorites
            .iter()
            .map(|item| item.trim().to_owned())
            .filter(|item| !item.is_empty())
            .collect();
        let mut order = Vec::new();
        let mut saw_blank = false;
        for item in &self.completion_import_order {
            let item = item.trim();
            if item.is_empty() {
                if !saw_blank {
                    order.push(String::new());
                    saw_blank = true;
                }
            } else {
                order.push(item.to_owned());
            }
        }
        self.completion_import_order = order;
        self.vmargs = self.vmargs.trim().to_owned();
        self.version = SETTINGS_VERSION;
    }

    /// Nested settings object passed to jdtls `initializationOptions.settings`
    /// and `workspace/didChangeConfiguration`.
    #[must_use]
    pub fn to_language_server(&self) -> Value {
        json!({
            "java": {
                "format": { "enabled": self.format_enabled },
                "signatureHelp": { "enabled": true },
                "import": { "generatesMetadataFilesAtProjectRoot": false },
                "inlayHints": { "parameterNames": { "enabled": "all" } },
                "referencesCodeLens": { "enabled": true },
                "implementationsCodeLens": { "enabled": true },
                "completion": {
                    "enabled": self.completion_enabled,
                    "favoriteStaticMembers": self.completion_favorites,
                    "importOrder": self.completion_import_order,
                    "guessMethodArguments": self.completion_guess_method_arguments
                },
                "jdt": { "ls": { "vmargs": self.vmargs } }
            }
        })
    }
}

/// The settings document that should be sent to jdtls for one workspace.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EffectiveSettings {
    /// Parsed settings.
    pub settings: JavaSettings,
    /// Which file won.
    pub origin: SettingsOrigin,
}

/// Path of the user settings file inside the JavaIDE config directory.
#[must_use]
pub fn user_settings_path(config_dir: &Path) -> PathBuf {
    config_dir.join("settings.toml")
}

/// Path of the optional workspace settings file.
#[must_use]
pub fn workspace_settings_path(workspace: &Path) -> PathBuf {
    workspace.join(".javaide").join("settings.toml")
}

/// Loads settings for `workspace`.
///
/// A workspace file replaces the user file entirely. A missing file is the
/// built-in default, not an error. A present file that does not parse is an
/// error.
///
/// # Errors
///
/// Returns [`ConfigError`] when a present file cannot be read or parsed, or
/// when its `version` is newer than [`SETTINGS_VERSION`].
pub fn load_effective(
    config_dir: &Path,
    workspace: &Path,
) -> Result<EffectiveSettings, ConfigError> {
    if let Some(settings) = load_settings_file(&workspace_settings_path(workspace))? {
        return Ok(EffectiveSettings {
            settings,
            origin: SettingsOrigin::Workspace,
        });
    }
    if let Some(settings) = load_settings_file(&user_settings_path(config_dir))? {
        return Ok(EffectiveSettings {
            settings,
            origin: SettingsOrigin::User,
        });
    }
    Ok(EffectiveSettings {
        settings: JavaSettings::default(),
        origin: SettingsOrigin::Default,
    })
}

/// Reads one settings file.
///
/// # Errors
///
/// Returns [`ConfigError`] when the file exists but cannot be read or parsed.
pub fn load_settings_file(path: &Path) -> Result<Option<JavaSettings>, ConfigError> {
    let text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(source) if source.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(source) => {
            return Err(ConfigError::Read {
                path: path.to_path_buf(),
                source,
            });
        }
    };
    let mut settings: JavaSettings = toml::from_str(&text).map_err(|error| ConfigError::Parse {
        path: path.to_path_buf(),
        message: error.to_string(),
    })?;
    if settings.version == 0 || settings.version > SETTINGS_VERSION {
        return Err(ConfigError::UnsupportedVersion {
            version: settings.version,
            path: path.to_path_buf(),
        });
    }
    settings.normalize();
    Ok(Some(settings))
}

/// Writes `settings` after normalization and JVM-argument validation.
///
/// # Errors
///
/// Returns [`ConfigError::VmArgs`] when `vmargs` is not a list of `-` flags,
/// or [`ConfigError::Write`] when the file cannot be replaced.
pub fn save_settings_file(
    path: &Path,
    settings: &JavaSettings,
) -> Result<JavaSettings, ConfigError> {
    let mut settings = settings.clone();
    settings.normalize();
    parse_vm_args(&settings.vmargs)?;
    let text = toml::to_string_pretty(&settings).map_err(|error| ConfigError::Parse {
        path: path.to_path_buf(),
        message: error.to_string(),
    })?;
    write_atomic(path, text.as_bytes())?;
    Ok(settings)
}

/// Splits `text` into JVM arguments.
///
/// Tokens are separated by whitespace. Single or double quotes keep spaces
/// inside one argument. Every argument must start with `-`. Shell
/// metacharacters are rejected so the string cannot be executed by a shell
/// later.
///
/// # Errors
///
/// Returns [`ConfigError::VmArgs`] for quotes that do not close, tokens that
/// do not start with `-`, more than 32 arguments, or an argument longer than
/// 512 bytes.
pub fn parse_vm_args(text: &str) -> Result<Vec<String>, ConfigError> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut quote = None;
    for ch in text.chars() {
        if ch == '\0' {
            return Err(ConfigError::VmArgs(
                "arguments contain a NUL byte".to_owned(),
            ));
        }
        if let Some(expected) = quote {
            if ch == expected {
                quote = None;
            } else {
                current.push(ch);
            }
            continue;
        }
        match ch {
            '"' | '\'' => quote = Some(ch),
            ch if ch.is_whitespace() => push_vm_arg(&mut args, &mut current)?,
            _ => current.push(ch),
        }
    }
    if quote.is_some() {
        return Err(ConfigError::VmArgs("unclosed quote in vmargs".to_owned()));
    }
    push_vm_arg(&mut args, &mut current)?;
    if args.len() > 32 {
        return Err(ConfigError::VmArgs(
            "too many JVM arguments (maximum 32)".to_owned(),
        ));
    }
    Ok(args)
}

fn push_vm_arg(args: &mut Vec<String>, current: &mut String) -> Result<(), ConfigError> {
    if current.is_empty() {
        return Ok(());
    }
    if current.len() > 512 {
        return Err(ConfigError::VmArgs(
            "a JVM argument is longer than 512 bytes".to_owned(),
        ));
    }
    if !current.starts_with('-') {
        return Err(ConfigError::VmArgs(format!(
            "JVM arguments must start with '-': {current}"
        )));
    }
    if current
        .chars()
        .any(|ch| matches!(ch, ';' | '|' | '&' | '`' | '$' | '\n' | '\r'))
    {
        return Err(ConfigError::VmArgs(
            "JVM arguments cannot contain shell metacharacters".to_owned(),
        ));
    }
    args.push(std::mem::take(current));
    Ok(())
}

/// Returns the settings keys that do not apply until jdtls is restarted.
#[must_use]
pub fn requires_restart(before: &JavaSettings, after: &JavaSettings) -> Vec<&'static str> {
    let changed = match (parse_vm_args(&before.vmargs), parse_vm_args(&after.vmargs)) {
        (Ok(left), Ok(right)) => left != right,
        _ => before.vmargs.trim() != after.vmargs.trim(),
    };
    if changed {
        vec!["java.jdt.ls.vmargs"]
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_map_to_the_jdtls_document() {
        let settings = JavaSettings::default();
        let document = settings.to_language_server();
        assert_eq!(document["java"]["format"]["enabled"], true);
        assert_eq!(document["java"]["completion"]["enabled"], true);
        assert_eq!(
            document["java"]["completion"]["favoriteStaticMembers"][0],
            "org.junit.jupiter.api.Assertions.*"
        );
        assert_eq!(document["java"]["completion"]["importOrder"][4], "");
        assert_eq!(document["java"]["jdt"]["ls"]["vmargs"], "");
    }

    #[test]
    fn round_trip_preserves_normalized_settings() {
        let dir = tempfile_dir();
        let path = dir.join("settings.toml");
        let settings = JavaSettings {
            format_enabled: false,
            completion_favorites: vec!["  java.util.Objects.*  ".to_owned(), String::new()],
            vmargs: "  -Xmx2G  ".to_owned(),
            ..JavaSettings::default()
        };
        let saved = save_settings_file(&path, &settings).expect("save");
        assert!(!saved.format_enabled);
        assert_eq!(saved.completion_favorites, vec!["java.util.Objects.*"]);
        assert_eq!(saved.vmargs, "-Xmx2G");
        let loaded = load_settings_file(&path).expect("load").expect("present");
        assert_eq!(loaded, saved);
    }

    #[test]
    fn workspace_file_replaces_user_file() {
        let root = tempfile_dir();
        let config = root.join("config");
        let workspace = root.join("project");
        std::fs::create_dir_all(&workspace).unwrap();
        let user = JavaSettings {
            format_enabled: false,
            ..JavaSettings::default()
        };
        save_settings_file(&user_settings_path(&config), &user).unwrap();
        let workspace_settings = JavaSettings {
            completion_enabled: false,
            ..JavaSettings::default()
        };
        save_settings_file(&workspace_settings_path(&workspace), &workspace_settings).unwrap();
        let effective = load_effective(&config, &workspace).unwrap();
        assert_eq!(effective.origin, SettingsOrigin::Workspace);
        assert!(effective.settings.format_enabled);
        assert!(!effective.settings.completion_enabled);
    }

    #[test]
    fn missing_files_use_defaults() {
        let root = tempfile_dir();
        let effective = load_effective(&root.join("config"), &root.join("project")).unwrap();
        assert_eq!(effective.origin, SettingsOrigin::Default);
        assert!(effective.settings.format_enabled);
    }

    #[test]
    fn rejects_a_future_version() {
        let dir = tempfile_dir();
        let path = dir.join("settings.toml");
        std::fs::write(&path, "version = 9\nformat_enabled = true\n").unwrap();
        let error = load_settings_file(&path).expect_err("version");
        assert!(matches!(
            error,
            ConfigError::UnsupportedVersion { version: 9, .. }
        ));
    }

    #[test]
    fn parses_quoted_vm_args_and_rejects_shell_text() {
        assert_eq!(
            parse_vm_args(r#"-Xmx2G -Dname="Ada Lovelace""#).unwrap(),
            vec!["-Xmx2G".to_owned(), "-Dname=Ada Lovelace".to_owned()]
        );
        assert!(parse_vm_args("-Xmx1G; rm -rf /").is_err());
        assert!(parse_vm_args("Xmx1G").is_err());
        assert!(parse_vm_args("-Xmx1G \"").is_err());
        assert!(parse_vm_args("").unwrap().is_empty());
    }

    #[test]
    fn only_vm_args_require_a_restart() {
        let before = JavaSettings::default();
        let mut format = before.clone();
        format.format_enabled = false;
        assert!(requires_restart(&before, &format).is_empty());
        let mut heap = before.clone();
        heap.vmargs = "-Xmx2G".to_owned();
        assert_eq!(requires_restart(&before, &heap), vec!["java.jdt.ls.vmargs"]);
        let mut spaced = heap.clone();
        spaced.vmargs = "  -Xmx2G  ".to_owned();
        assert!(requires_restart(&heap, &spaced).is_empty());
    }

    fn tempfile_dir() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "javaide-config-{}-{}",
            std::process::id(),
            unique()
        ));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    fn unique() -> u64 {
        use std::sync::atomic::{AtomicU64, Ordering};
        static NEXT: AtomicU64 = AtomicU64::new(1);
        NEXT.fetch_add(1, Ordering::Relaxed)
    }
}
