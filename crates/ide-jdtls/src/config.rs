//! Configuration and launch layout for the Eclipse JDT Language Server.

use std::ffi::OsStr;
use std::path::{Path, PathBuf};

use lsp_types::{
    ClientCapabilities, ClientInfo, CodeActionClientCapabilities, CodeActionKindLiteralSupport,
    CodeActionLiteralSupport, DocumentFormattingClientCapabilities, FailureHandlingKind,
    GeneralClientCapabilities, InitializeParams, PositionEncodingKind,
    PublishDiagnosticsClientCapabilities, TextDocumentClientCapabilities,
    TextDocumentSyncClientCapabilities, Uri, WindowClientCapabilities, WorkspaceClientCapabilities,
    WorkspaceEditClientCapabilities, WorkspaceFolder,
};
use serde_json::{Map, Value, json};
use url::Url;

use crate::JdtlsError;

/// A validated jdtls distribution layout.
#[derive(Debug, Clone)]
pub struct JdtlsInstallation {
    /// The extracted distribution root (the directory containing `plugins/`).
    pub root: PathBuf,
    /// The Equinox launcher jar under `plugins/`.
    pub launcher_jar: PathBuf,
    /// The platform configuration directory (`config_linux`, `config_mac`, or
    /// `config_win`).
    pub config_dir: PathBuf,
}

impl JdtlsInstallation {
    /// Builds an installation from explicit paths.
    ///
    /// Use [`JdtlsInstallation::discover`] when the standard distribution
    /// layout is available.
    #[must_use]
    pub fn new(
        root: impl Into<PathBuf>,
        launcher_jar: impl Into<PathBuf>,
        config_dir: impl Into<PathBuf>,
    ) -> Self {
        Self {
            root: root.into(),
            launcher_jar: launcher_jar.into(),
            config_dir: config_dir.into(),
        }
    }

    /// Discovers the launcher and configuration directory under `root`.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::Installation`] when the layout is not a jdtls
    /// distribution.
    pub fn discover(root: impl Into<PathBuf>) -> Result<Self, JdtlsError> {
        let root = root.into();
        let plugins = root.join("plugins");
        if !plugins.is_dir() {
            return Err(JdtlsError::Installation(format!(
                "{} has no plugins directory",
                root.display()
            )));
        }
        let launcher_jar = find_launcher(&plugins)?;
        let config_dir = find_config_dir(&root)?;
        Ok(Self::new(root, launcher_jar, config_dir))
    }

    /// Checks that the launcher jar and configuration directory exist.
    ///
    /// # Errors
    ///
    /// Returns [`JdtlsError::MissingFile`] for the first missing component.
    pub fn verify(&self) -> Result<(), JdtlsError> {
        require_file(&self.launcher_jar)?;
        require_dir(&self.config_dir)?;
        Ok(())
    }
}

/// Configuration for one jdtls workspace instance.
#[derive(Debug, Clone)]
pub struct JdtlsConfig {
    /// A JDK 21+ installation used to run jdtls (independent of project JDKs).
    pub java_home: PathBuf,
    /// The jdtls distribution.
    pub installation: JdtlsInstallation,
    /// Writable jdtls `-data` directory. Created if absent.
    pub data_dir: PathBuf,
    /// Workspace root that becomes the initial LSP workspace folder.
    pub workspace_root: PathBuf,
    /// Extension bundles (java-debug, java-test) passed through
    /// `initializationOptions.bundles`.
    pub bundles: Vec<PathBuf>,
    /// Additional JVM arguments appended after the defaults.
    pub vm_args: Vec<String>,
    /// Additional jdtls arguments appended after `-data`.
    pub extra_args: Vec<String>,
    /// OSGi log level passed as `-Dlog.level` (for example `WARN`).
    pub log_level: String,
    /// Deadline for the LSP `initialize` request.
    pub initialize_timeout: std::time::Duration,
    /// Skip the Java version probe. Only for tests with a fake launcher.
    pub skip_java_version_check: bool,
}

impl JdtlsConfig {
    /// Creates a configuration with conservative defaults.
    #[must_use]
    pub fn new(
        java_home: impl Into<PathBuf>,
        installation: JdtlsInstallation,
        data_dir: impl Into<PathBuf>,
        workspace_root: impl Into<PathBuf>,
    ) -> Self {
        Self {
            java_home: java_home.into(),
            installation,
            data_dir: data_dir.into(),
            workspace_root: workspace_root.into(),
            bundles: Vec::new(),
            vm_args: Vec::new(),
            extra_args: Vec::new(),
            log_level: "WARN".to_owned(),
            initialize_timeout: std::time::Duration::from_secs(120),
            skip_java_version_check: false,
        }
    }

    /// Adds an extension bundle.
    #[must_use]
    pub fn with_bundle(mut self, bundle: impl Into<PathBuf>) -> Self {
        self.bundles.push(bundle.into());
        self
    }

    /// Returns the java executable for this JDK.
    #[must_use]
    pub fn java_executable(&self) -> PathBuf {
        java_executable(&self.java_home)
    }

    /// Validates paths without creating directories.
    ///
    /// # Errors
    ///
    /// Returns a typed error naming the first missing or invalid path.
    pub fn validate(&self) -> Result<(), JdtlsError> {
        self.installation.verify()?;
        let java = self.java_executable();
        require_file(&java)?;
        require_dir(&self.workspace_root)?;
        for bundle in &self.bundles {
            require_file(bundle)?;
        }
        if !self.data_dir.is_absolute() {
            return Err(JdtlsError::Installation(format!(
                "jdtls data directory must be absolute: {}",
                self.data_dir.display()
            )));
        }
        Ok(())
    }

    /// Builds the LSP `initialize` parameters for this workspace.
    ///
    /// # Errors
    ///
    /// Returns an error if the workspace root cannot be converted to a file
    /// URI.
    pub fn initialize_params(&self) -> Result<InitializeParams, JdtlsError> {
        let root_uri = file_uri(&self.workspace_root)?;
        let folder_name = self
            .workspace_root
            .file_name()
            .and_then(OsStr::to_str)
            .unwrap_or("workspace")
            .to_owned();

        let mut params = InitializeParams::default();
        // `root_uri` is deprecated in favor of workspace folders, but jdtls
        // still uses it during startup and many clients send it.
        #[allow(deprecated)]
        {
            params.root_uri = Some(root_uri.clone());
        }
        params.process_id = Some(std::process::id());
        params.client_info = Some(ClientInfo {
            name: "JavaIDE".to_owned(),
            version: Some(env!("CARGO_PKG_VERSION").to_owned()),
        });
        params.locale = Some("en".to_owned());
        params.capabilities = client_capabilities();
        params.workspace_folders = Some(vec![WorkspaceFolder {
            uri: root_uri,
            name: folder_name,
        }]);

        let mut options = Map::new();
        if !self.bundles.is_empty() {
            let bundles: Vec<String> = self
                .bundles
                .iter()
                .map(|bundle| bundle.display().to_string())
                .collect();
            options.insert("bundles".to_owned(), json!(bundles));
        }
        params.initialization_options = Some(Value::Object(options));
        Ok(params)
    }
}

/// Converts an absolute filesystem path to an LSP document URI.
///
/// The path does not need to exist, but it must be absolute. No canonicalization
/// is performed; callers that care about symlinks canonicalize first.
///
/// # Errors
///
/// Returns [`JdtlsError::Uri`] when the path cannot be represented as a file
/// URI.
pub fn file_uri(path: &Path) -> Result<Uri, JdtlsError> {
    let url = Url::from_file_path(path)
        .map_err(|()| JdtlsError::Uri(format!("not an absolute path: {}", path.display())))?;
    match url.as_str().parse::<Uri>() {
        Ok(uri) => Ok(uri),
        Err(error) => Err(JdtlsError::Uri(error.to_string())),
    }
}

/// Converts an LSP `file:` URI to a filesystem path.
///
/// # Errors
///
/// Returns [`JdtlsError::Uri`] for non-file schemes or malformed URIs.
pub fn uri_to_path(uri: &Uri) -> Result<PathBuf, JdtlsError> {
    let url = Url::parse(uri.as_str()).map_err(|error| JdtlsError::Uri(error.to_string()))?;
    if url.scheme() != "file" {
        return Err(JdtlsError::Uri(format!(
            "expected a file URI, got {}",
            url.scheme()
        )));
    }
    url.to_file_path()
        .map_err(|()| JdtlsError::Uri(format!("URI is not a local path: {uri:?}")))
}

fn client_capabilities() -> ClientCapabilities {
    let workspace = WorkspaceClientCapabilities {
        apply_edit: Some(true),
        workspace_edit: Some(WorkspaceEditClientCapabilities {
            // Phase 0 applies plain `changes` edits. Resource operations and
            // documentChanges are advertised as unsupported so jdtls does not
            // send operations the client cannot apply atomically yet.
            document_changes: Some(false),
            resource_operations: None,
            failure_handling: Some(FailureHandlingKind::Abort),
            normalizes_line_endings: Some(false),
            change_annotation_support: None,
        }),
        workspace_folders: Some(true),
        configuration: Some(true),
        ..WorkspaceClientCapabilities::default()
    };

    let text_document = TextDocumentClientCapabilities {
        synchronization: Some(TextDocumentSyncClientCapabilities {
            dynamic_registration: Some(false),
            will_save: Some(false),
            will_save_wait_until: Some(false),
            did_save: Some(true),
        }),
        publish_diagnostics: Some(PublishDiagnosticsClientCapabilities {
            related_information: Some(true),
            version_support: Some(true),
            ..PublishDiagnosticsClientCapabilities::default()
        }),
        formatting: Some(DocumentFormattingClientCapabilities {
            dynamic_registration: Some(false),
        }),
        // jdtls only returns literal code actions (with an embedded edit) when
        // the client advertises the kinds it understands.
        code_action: Some(CodeActionClientCapabilities {
            dynamic_registration: Some(false),
            code_action_literal_support: Some(CodeActionLiteralSupport {
                code_action_kind: CodeActionKindLiteralSupport {
                    value_set: vec!["source.organizeImports".to_owned()],
                },
            }),
            ..CodeActionClientCapabilities::default()
        }),
        ..TextDocumentClientCapabilities::default()
    };

    let window = WindowClientCapabilities {
        work_done_progress: Some(true),
        ..WindowClientCapabilities::default()
    };

    let general = GeneralClientCapabilities {
        position_encodings: Some(vec![PositionEncodingKind::UTF16]),
        ..GeneralClientCapabilities::default()
    };

    ClientCapabilities {
        workspace: Some(workspace),
        text_document: Some(text_document),
        window: Some(window),
        general: Some(general),
        ..ClientCapabilities::default()
    }
}

/// Returns the java executable inside a JDK home.
#[must_use]
pub fn java_executable(java_home: &Path) -> PathBuf {
    let executable = if cfg!(windows) { "java.exe" } else { "java" };
    java_home.join("bin").join(executable)
}

fn find_launcher(plugins: &Path) -> Result<PathBuf, JdtlsError> {
    let mut candidates = Vec::new();
    let entries = std::fs::read_dir(plugins).map_err(|error| JdtlsError::PathIo {
        path: plugins.to_path_buf(),
        source: error,
    })?;
    for entry in entries {
        let entry = entry.map_err(|error| JdtlsError::PathIo {
            path: plugins.to_path_buf(),
            source: error,
        })?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("org.eclipse.equinox.launcher_") && name.ends_with(".jar") {
            candidates.push(entry.path());
        }
    }
    candidates.sort();
    candidates.pop().ok_or_else(|| {
        JdtlsError::Installation(format!(
            "no org.eclipse.equinox.launcher_*.jar under {}",
            plugins.display()
        ))
    })
}

fn find_config_dir(root: &Path) -> Result<PathBuf, JdtlsError> {
    #[cfg(target_os = "macos")]
    let preferred = ["config_mac", "config_linux", "config_win"];
    #[cfg(target_os = "windows")]
    let preferred = ["config_win", "config_linux", "config_mac"];
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let preferred = ["config_linux", "config_mac", "config_win"];

    for name in preferred {
        let candidate = root.join(name);
        if candidate.is_dir() {
            return Ok(candidate);
        }
    }
    Err(JdtlsError::Installation(format!(
        "no jdtls configuration directory ({}*) under {}",
        preferred[0],
        root.display()
    )))
}

fn require_file(path: &Path) -> Result<(), JdtlsError> {
    if path.is_file() {
        Ok(())
    } else {
        Err(JdtlsError::MissingFile(path.to_path_buf()))
    }
}

fn require_dir(path: &Path) -> Result<(), JdtlsError> {
    if path.is_dir() {
        Ok(())
    } else {
        Err(JdtlsError::MissingDirectory(path.to_path_buf()))
    }
}

/// Extracts the major version from the output of `java -version`.
///
/// Accepts modern (`21.0.8`) and legacy (`1.8.0_402`) version strings.
#[must_use]
pub fn parse_java_major(version_output: &str) -> Option<u32> {
    let start = version_output.find("version \"")? + "version \"".len();
    let tail = &version_output[start..];
    let end = tail.find('"')?;
    let version = &tail[..end];
    let mut parts = version.split('.');
    let first = parts.next()?;
    let major = if first == "1" { parts.next()? } else { first };
    let digits: String = major
        .chars()
        .take_while(|character| character.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

/// A platform- and Windows-aware helper for a jdtls launcher path.
///
/// Kept public because diagnostics and packaging need to explain the expected
/// layout without duplicating the naming rule.
#[must_use]
pub fn is_launcher_jar(path: &Path) -> bool {
    path.file_name()
        .and_then(OsStr::to_str)
        .is_some_and(|name| {
            name.starts_with("org.eclipse.equinox.launcher_") && name.ends_with(".jar")
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_modern_and_legacy_versions() {
        assert_eq!(
            parse_java_major("openjdk version \"21.0.8\" 2026-07-21"),
            Some(21)
        );
        assert_eq!(parse_java_major("java version \"1.8.0_402\""), Some(8));
        assert_eq!(parse_java_major("no version here"), None);
    }

    #[test]
    fn detects_launcher_names() {
        assert!(is_launcher_jar(Path::new(
            "org.eclipse.equinox.launcher_1.6.900.v20240613-2117.jar"
        )));
        assert!(!is_launcher_jar(Path::new(
            "org.eclipse.equinox.launcher.jar"
        )));
    }

    #[test]
    fn file_uri_round_trips() {
        let path = Path::new("/tmp/a b/Ünïcode.java");
        let uri = file_uri(path).unwrap();
        assert!(uri.as_str().starts_with("file:///tmp/"));
        // Url percent-encodes; converting back must recover the original path.
        assert_eq!(uri_to_path(&uri).unwrap(), path);
    }
}
