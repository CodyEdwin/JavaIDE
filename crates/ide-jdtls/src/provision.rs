//! Download and extract the pinned jdtls distribution.
//!
//! The desktop shell calls [`ensure_jdtls`] when no local installation is
//! configured. A directory that already contains a launcher is left untouched,
//! so development overrides and a second launch do not download again.

use std::path::{Path, PathBuf};
use std::time::Duration;

use sha2::{Digest, Sha256};

use crate::JdtlsError;
use crate::config::JdtlsInstallation;

/// Pinned jdtls snapshot. Bump this only with a live language-feature run.
pub const PINNED_JDTLS_VERSION: &str = "1.64.0-202610301801";

/// SHA-256 of the pinned archive.
pub const PINNED_JDTLS_SHA256: &str =
    "3bff77299e7449ddec5466e1c600a5f221312b057240b06162b7d9326bb9ca5e";

const PINNED_JDTLS_URL: &str =
    "https://download.eclipse.org/jdtls/snapshots/jdt-language-server-1.64.0-202610301801.tar.gz";

/// Returns `destination` when it is already a jdtls layout, otherwise downloads
/// the pinned archive, checks its SHA-256, and extracts it there.
///
/// # Errors
///
/// Returns [`JdtlsError::Download`] when the archive cannot be fetched,
/// [`JdtlsError::Checksum`] when the digest does not match, or
/// [`JdtlsError::Installation`] when the extracted tree is not a jdtls layout.
///
/// # Cancellation
///
/// Dropping the future abandons the download. A partial directory is named
/// `{destination}.partial` and is removed before a later attempt.
pub async fn ensure_jdtls(destination: &Path) -> Result<PathBuf, JdtlsError> {
    if JdtlsInstallation::discover(destination).is_ok() {
        return Ok(destination.to_path_buf());
    }
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent).map_err(|source| JdtlsError::PathIo {
            path: parent.to_path_buf(),
            source,
        })?;
    }
    let partial = partial_dir(destination);
    if partial.exists() {
        std::fs::remove_dir_all(&partial).map_err(|source| JdtlsError::PathIo {
            path: partial.clone(),
            source,
        })?;
    }
    std::fs::create_dir_all(&partial).map_err(|source| JdtlsError::PathIo {
        path: partial.clone(),
        source,
    })?;

    let archive = partial.join("jdtls.tar.gz");
    let bytes = download_archive().await?;
    let actual = sha256_hex(&bytes);
    if actual != PINNED_JDTLS_SHA256 {
        let _ = std::fs::remove_dir_all(&partial);
        return Err(JdtlsError::Checksum {
            expected: PINNED_JDTLS_SHA256.to_owned(),
            actual,
        });
    }
    std::fs::write(&archive, &bytes).map_err(|source| JdtlsError::PathIo {
        path: archive.clone(),
        source,
    })?;
    extract_archive(&archive, &partial)?;
    let _ = std::fs::remove_file(&archive);
    JdtlsInstallation::discover(&partial)?;
    if destination.exists() {
        std::fs::remove_dir_all(destination).map_err(|source| JdtlsError::PathIo {
            path: destination.to_path_buf(),
            source,
        })?;
    }
    std::fs::rename(&partial, destination).map_err(|source| JdtlsError::PathIo {
        path: destination.to_path_buf(),
        source,
    })?;
    Ok(destination.to_path_buf())
}

async fn download_archive() -> Result<Vec<u8>, JdtlsError> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|error| JdtlsError::Download(error.to_string()))?;
    let response = client
        .get(PINNED_JDTLS_URL)
        .send()
        .await
        .map_err(|error| JdtlsError::Download(error.to_string()))?;
    if !response.status().is_success() {
        return Err(JdtlsError::Download(format!(
            "HTTP {} from {PINNED_JDTLS_URL}",
            response.status()
        )));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| JdtlsError::Download(error.to_string()))?;
    Ok(bytes.to_vec())
}

fn extract_archive(archive: &Path, destination: &Path) -> Result<(), JdtlsError> {
    let status = std::process::Command::new("tar")
        .arg("-xzf")
        .arg(archive)
        .arg("-C")
        .arg(destination)
        .status()
        .map_err(|error| JdtlsError::Download(format!("cannot run tar: {error}")))?;
    if status.success() {
        Ok(())
    } else {
        Err(JdtlsError::Download(format!(
            "tar exited with {status} while extracting {}",
            archive.display()
        )))
    }
}

fn partial_dir(destination: &Path) -> PathBuf {
    let mut name = destination
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| "jdtls".into());
    name.push(".partial");
    destination.with_file_name(name)
}

fn sha256_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let digest = Sha256::digest(bytes);
    let mut encoded = String::with_capacity(digest.len() * 2);
    for byte in digest {
        encoded.push(HEX[(byte >> 4) as usize] as char);
        encoded.push(HEX[(byte & 0x0f) as usize] as char);
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha256_of_empty_input_is_stable() {
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[tokio::test]
    async fn existing_layout_is_not_replaced() {
        let root =
            std::env::temp_dir().join(format!("javaide-jdtls-layout-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let plugins = root.join("plugins");
        std::fs::create_dir_all(&plugins).unwrap();
        std::fs::write(plugins.join("org.eclipse.equinox.launcher_1.0.jar"), b"jar").unwrap();
        std::fs::create_dir_all(root.join("config_linux")).unwrap();
        let found = ensure_jdtls(&root).await.expect("existing layout");
        assert_eq!(found, root);
        let _ = std::fs::remove_dir_all(&root);
    }
}
