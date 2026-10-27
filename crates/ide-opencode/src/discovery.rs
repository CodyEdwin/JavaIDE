//! Discovery of the running OpenCode V2 service.
//!
//! OpenCode publishes one registration per user under the platform state
//! directory and keeps the Basic-auth password under the configuration
//! directory:
//!
//! ```text
//! ~/.local/state/opencode/service.json   {"id","version","url","pid"}
//! ~/.config/opencode/service.json        {"password"}
//! ```
//!
//! `XDG_STATE_HOME` and `XDG_CONFIG_HOME` are honored. Both files are owned by
//! OpenCode; this module only reads them.
//!
//! # Safety rules
//!
//! - Only loopback `http`/`https` URLs are accepted. A corrupted registration
//!   must not be able to point the IDE at an arbitrary host with the user's
//!   service password.
//! - Userinfo and query/fragment components in the registered URL are
//!   rejected; authentication is carried separately.
//! - The password never appears in `Debug` output.
//! - Discovery performs no network I/O. [`crate::OpenCodeClient::connect`]
//!   validates `/api/info` before the rest of the API is used.

use std::fmt;
use std::path::{Path, PathBuf};

use ide_platform::{config_home, state_home};
use serde::Deserialize;
use url::{Host, Url};

use crate::OpenCodeError;

/// A service registration and its optional credentials.
pub struct DiscoveredService {
    registration: Registration,
    password: Option<String>,
    service_path: PathBuf,
    config_path: Option<PathBuf>,
}

impl fmt::Debug for DiscoveredService {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DiscoveredService")
            .field("id", &self.registration.id)
            .field("version", &self.registration.version)
            .field("url", &self.registration.url)
            .field("pid", &self.registration.pid)
            .field("authenticated", &self.password.is_some())
            .field("service_path", &self.service_path)
            .finish_non_exhaustive()
    }
}

impl DiscoveredService {
    /// Discovers the user's shared service.
    ///
    /// # Errors
    ///
    /// Returns [`OpenCodeError::NotRunning`] when there is no registration,
    /// [`OpenCodeError::InvalidServiceUrl`] when the URL is not a safe loopback
    /// endpoint, or a typed read/parse error for either file.
    pub fn discover() -> Result<Self, OpenCodeError> {
        let state = state_home().ok_or(OpenCodeError::HomeUnavailable)?;
        let config = config_home().ok_or(OpenCodeError::HomeUnavailable)?;
        let service_path = state.join("opencode").join("service.json");
        let config_path = config.join("opencode").join("service.json");
        Self::from_paths(service_path, config_path)
    }

    /// Reads a registration from explicit paths.
    ///
    /// This is primarily for tests and diagnostics. The missing credentials
    /// file is allowed (some deployments disable auth); a missing registration
    /// is not.
    ///
    /// # Errors
    ///
    /// As [`DiscoveredService::discover`].
    pub fn from_paths(
        service_path: impl Into<PathBuf>,
        config_path: impl Into<PathBuf>,
    ) -> Result<Self, OpenCodeError> {
        let service_path = service_path.into();
        let config_path = config_path.into();
        if !service_path.is_file() {
            return Err(OpenCodeError::NotRunning(service_path));
        }
        let registration: Registration = read_json(&service_path)?;
        let url = validate_service_url(&registration.url)?;
        validate_version(&registration.version)?;

        let password = if config_path.is_file() {
            let credentials: Credentials = read_json(&config_path)?;
            credentials.password.filter(|password| !password.is_empty())
        } else {
            None
        };

        Ok(Self {
            registration: Registration {
                url: url.to_string(),
                ..registration
            },
            password,
            service_path,
            config_path: config_path.is_file().then_some(config_path),
        })
    }

    /// Returns the validated base URL of the service.
    ///
    /// # Panics
    ///
    /// The URL was validated during construction, so parsing cannot fail.
    #[must_use]
    pub fn url(&self) -> Url {
        Url::parse(&self.registration.url).expect("validated service URL")
    }

    /// Returns the OpenCode service version.
    #[must_use]
    pub fn version(&self) -> &str {
        &self.registration.version
    }

    /// Returns the service registration id.
    #[must_use]
    pub fn id(&self) -> &str {
        &self.registration.id
    }

    /// Returns the service process id.
    #[must_use]
    pub const fn pid(&self) -> u32 {
        self.registration.pid
    }

    /// Returns the registration file path.
    #[must_use]
    pub fn service_path(&self) -> &Path {
        &self.service_path
    }

    /// Returns the credentials file path when it was present.
    #[must_use]
    pub fn config_path(&self) -> Option<&Path> {
        self.config_path.as_deref()
    }

    /// Returns whether a password was found.
    #[must_use]
    pub const fn has_password(&self) -> bool {
        self.password.is_some()
    }

    pub(crate) fn password(&self) -> Option<&str> {
        self.password.as_deref()
    }
}

#[derive(Debug, Deserialize)]
struct Registration {
    id: String,
    version: String,
    url: String,
    pid: u32,
}

#[derive(Debug, Deserialize)]
struct Credentials {
    #[serde(default)]
    password: Option<String>,
}

fn read_json<T>(path: &Path) -> Result<T, OpenCodeError>
where
    T: for<'de> Deserialize<'de>,
{
    let bytes = std::fs::read(path).map_err(|source| OpenCodeError::Read {
        path: path.to_path_buf(),
        source,
    })?;
    serde_json::from_slice(&bytes).map_err(|source| OpenCodeError::InvalidFile {
        path: path.to_path_buf(),
        source,
    })
}

/// Validates that a URL is a loopback HTTP(S) base URL.
///
/// # Errors
///
/// Returns [`OpenCodeError::IncompatibleVersion`] for a non-V2 version string
/// and [`OpenCodeError::InvalidServiceUrl`] for unsafe URLs.
pub(crate) fn validate_service_url(raw: &str) -> Result<Url, OpenCodeError> {
    let mut url = Url::parse(raw).map_err(|error| {
        OpenCodeError::InvalidServiceUrl(format!("{raw:?} does not parse: {error}"))
    })?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(OpenCodeError::InvalidServiceUrl(format!(
            "unsupported scheme {:?}",
            url.scheme()
        )));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(OpenCodeError::InvalidServiceUrl(
            "credentials must not be embedded in the service URL".to_owned(),
        ));
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err(OpenCodeError::InvalidServiceUrl(
            "service URL must not contain a query or fragment".to_owned(),
        ));
    }
    let loopback = match url.host() {
        Some(Host::Ipv4(address)) => address.is_loopback(),
        Some(Host::Ipv6(address)) => address.is_loopback(),
        Some(Host::Domain(name)) => name.eq_ignore_ascii_case("localhost"),
        None => false,
    };
    if !loopback {
        return Err(OpenCodeError::InvalidServiceUrl(format!(
            "{} is not a loopback address",
            url.host_str().unwrap_or("<missing host>")
        )));
    }

    // A base URL is joined with API segments; a trailing slash keeps `join`
    // semantics predictable and preserves a configured path prefix.
    if !url.path().ends_with('/') {
        let path = format!("{}/", url.path());
        url.set_path(&path);
    }
    Ok(url)
}

pub(crate) fn validate_version(version: &str) -> Result<(), OpenCodeError> {
    let major = version
        .split('.')
        .next()
        .and_then(|value| value.parse::<u32>().ok());
    if major == Some(2) {
        Ok(())
    } else {
        Err(OpenCodeError::IncompatibleVersion {
            found: version.to_owned(),
        })
    }
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use super::*;

    fn write_json(path: &Path, value: &str) {
        let mut file = std::fs::File::create(path).unwrap();
        file.write_all(value.as_bytes()).unwrap();
    }

    #[test]
    fn accepts_loopback_and_localhost() {
        for raw in [
            "http://127.0.0.1:49374",
            "http://127.0.0.1:49374/",
            "https://[::1]:49374",
            "http://localhost:49374/base",
        ] {
            let url = validate_service_url(raw).unwrap();
            assert!(url.path().ends_with('/'));
        }
    }

    #[test]
    fn rejects_non_loopback_and_userinfo() {
        for raw in [
            "http://192.168.1.10:49374",
            "http://0.0.0.0:49374",
            "http://example.com:49374",
            "http://user:pass@127.0.0.1:49374",
            "ftp://127.0.0.1:49374",
            "http://127.0.0.1:49374/?token=x",
        ] {
            assert!(
                validate_service_url(raw).is_err(),
                "{raw} should be rejected"
            );
        }
    }

    #[test]
    fn accepts_only_major_version_two() {
        assert!(validate_version("2.1.4").is_ok());
        assert!(matches!(
            validate_version("1.9.0"),
            Err(OpenCodeError::IncompatibleVersion { .. })
        ));
        assert!(validate_version("three").is_err());
    }

    #[test]
    fn reads_registration_and_optional_credentials() {
        let directory = tempfile::tempdir().unwrap();
        let service = directory.path().join("service.json");
        let config = directory.path().join("config.json");
        write_json(
            &service,
            r#"{"id":"svc_1","version":"2.1.4","url":"http://127.0.0.1:49374","pid":42}"#,
        );
        write_json(&config, r#"{"password":"secret"}"#);

        let discovered = DiscoveredService::from_paths(&service, &config).unwrap();
        assert_eq!(discovered.id(), "svc_1");
        assert_eq!(discovered.pid(), 42);
        assert_eq!(discovered.url().as_str(), "http://127.0.0.1:49374/");
        assert!(discovered.has_password());
        assert!(format!("{discovered:?}").contains("authenticated: true"));
        assert!(!format!("{discovered:?}").contains("secret"));
    }

    #[test]
    fn tolerates_missing_credentials_file() {
        let directory = tempfile::tempdir().unwrap();
        let service = directory.path().join("service.json");
        write_json(
            &service,
            r#"{"id":"svc_1","version":"2.0.0","url":"http://localhost:9000","pid":1}"#,
        );
        let discovered =
            DiscoveredService::from_paths(&service, directory.path().join("missing.json")).unwrap();
        assert!(!discovered.has_password());
        assert!(discovered.config_path().is_none());
    }

    #[test]
    fn missing_registration_is_not_running() {
        let directory = tempfile::tempdir().unwrap();
        let result = DiscoveredService::from_paths(
            directory.path().join("missing.json"),
            directory.path().join("config.json"),
        );
        assert!(matches!(result, Err(OpenCodeError::NotRunning(_))));
    }
}
