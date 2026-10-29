//! Live jdtls integration test for the language feature surface.
//!
//! Ignored by default because it needs a JDK 21+ and an extracted jdtls
//! distribution. Run it explicitly:
//!
//! ```sh
//! JAVAIDE_JDTLS_HOME=/path/to/jdtls \
//! JAVAIDE_JDTLS_JAVA_HOME=/path/to/jdk-21 \
//! cargo test -p ide-jdtls --test live_server -- --ignored --nocapture
//! ```
//!
//! When the variables are absent the test looks in the provisioning layout the
//! desktop shell uses: `$XDG_DATA_HOME/javaide/jdtls/*` and
//! `$XDG_DATA_HOME/javaide/runtimes/*` (or `~/.local/share/javaide/...`).
//!
//! The test copies the fixture's Java sources into a temporary plain Java
//! project so jdtls never writes Eclipse metadata into the repository. Gradle
//! import is deliberately excluded: it depends on toolchain provisioning,
//! which is covered by the Gradle sidecar harness instead.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use ide_jdtls::{JdtlsClient, JdtlsConfig, JdtlsInstallation, SourcePosition, SourceTextEdit};

const READY_TIMEOUT: Duration = Duration::from_secs(180);
// The first Gradle import on a cold dependency cache can take a minute or two
// before any diagnostic is published.
const DIAGNOSTICS_TIMEOUT: Duration = Duration::from_secs(240);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const RETRY_INTERVAL: Duration = Duration::from_millis(500);

#[tokio::test]
#[ignore = "requires JDK 21+ and an extracted jdtls distribution"]
async fn jdtls_serves_diagnostics_hover_completion_and_definition() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/java-gradle")
        .canonicalize()
        .expect("fixture project exists");
    let java_home = find_java_home().expect("a JDK 21+ (set JAVAIDE_JDTLS_JAVA_HOME)");
    let installation_root = find_jdtls_root().expect("jdtls (set JAVAIDE_JDTLS_HOME)");
    let installation =
        JdtlsInstallation::discover(installation_root).expect("extracted jdtls layout");

    let temporary = tempfile::tempdir().expect("temporary workspace");
    let project = temporary.path().join("project");
    copy_tree(&fixture.join("src"), &project.join("src")).expect("copy fixture sources");
    write_plain_project(&project).expect("write Eclipse project descriptors");
    let config = JdtlsConfig::new(
        &java_home,
        installation,
        temporary.path().join("jdtls-data"),
        &project,
    );

    let mut client = JdtlsClient::start(config).await.expect("start jdtls");
    client.initialize().await.expect("initialize");
    client.initialized().await.expect("initialized");
    client
        .wait_for_service_ready(READY_TIMEOUT)
        .await
        .expect("language/status ServiceReady");

    let file = project.join("src/main/java/com/example/App.java");
    let text = std::fs::read_to_string(&file).expect("read fixture source");
    let uri = client
        .open_document(&file, &text, 1)
        .await
        .expect("textDocument/didOpen");
    let published = client
        .wait_for_diagnostics(&uri, DIAGNOSTICS_TIMEOUT)
        .await
        .expect("publishDiagnostics");
    assert!(
        published.diagnostics.is_empty(),
        "clean fixture reported {:?}",
        published.diagnostics
    );

    // Inside the `add` call in `main`: `add(2, 40)`.
    let (call_line, call_character) = position_of(&text, "add(2, 40)").expect("call site");
    let hover_position = SourcePosition::new(call_line, call_character + 1);
    let mut hover = None;
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && hover.is_none() {
        if let Ok(Some(info)) = client.hover(&file, hover_position, REQUEST_TIMEOUT).await {
            hover = Some(info);
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    let hover = hover.expect("hover result for `add`");
    assert!(
        hover.contents.contains("add"),
        "hover does not describe `add`: {}",
        hover.contents
    );

    // After `System.` in `System.out.println`.
    let (system_line, system_character) = position_of(&text, "System.out").expect("System usage");
    let completion_position =
        SourcePosition::new(system_line, system_character + "System.".len() as u32);
    let mut completion = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && completion.is_empty() {
        if let Ok(candidates) = client
            .completion(&file, completion_position, REQUEST_TIMEOUT)
            .await
            && !candidates.is_empty()
        {
            completion = candidates;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    let labels = completion
        .iter()
        .map(|candidate| candidate.label.as_str())
        .take(20)
        .collect::<Vec<_>>();
    // jdtls labels fields as `out : PrintStream`, so match the identifier part.
    assert!(
        labels
            .iter()
            .any(|label| label.split(' ').next() == Some("out")),
        "completion after `System.` has no `out` member: {labels:?}"
    );

    // Definition of `add` from the call site.
    let mut definitions = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && definitions.is_empty() {
        if let Ok(locations) = client
            .definition(&file, hover_position, REQUEST_TIMEOUT)
            .await
            && !locations.is_empty()
        {
            definitions = locations;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    assert!(
        definitions.iter().any(|location| location
            .path
            .file_name()
            .is_some_and(|name| name == "App.java")),
        "definition of `add` does not point at App.java: {definitions:?}"
    );

    // Formatting and organize imports on a deliberately messy document.
    let messy = project.join("src/main/java/com/example/Messy.java");
    let messy_source = "package com.example;\n\nimport java.util.List;\n\npublic class Messy {\npublic static void main(String[] args){ System.out.println( \"hello\" ); }\n}\n";
    std::fs::write(&messy, messy_source).expect("write messy document");
    client
        .open_document(&messy, messy_source, 1)
        .await
        .expect("open messy document");

    let mut format_edits = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && format_edits.is_empty() {
        if let Ok(edits) = client
            .format_document(&messy, 4, true, REQUEST_TIMEOUT)
            .await
            && !edits.is_empty()
        {
            format_edits = edits;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    assert!(
        !format_edits.is_empty(),
        "formatting returned no edits for a messy document"
    );
    let formatted = apply_edits(messy_source, &format_edits);
    assert_ne!(
        formatted, messy_source,
        "formatting did not change the text"
    );

    // jdtls must see the formatted text before ranges for organize imports are
    // meaningful, mirroring the editor's change sync.
    client
        .change_document(&messy, &formatted, 2)
        .await
        .expect("didChange formatted document");

    let mut import_edits = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && import_edits.is_empty() {
        if let Ok(edits) = client.organize_imports(&messy, REQUEST_TIMEOUT).await
            && !edits.is_empty()
        {
            import_edits = edits;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    let organized = apply_edits(&formatted, &import_edits);
    assert!(
        !organized.contains("java.util.List"),
        "organize imports kept the unused import: {organized}"
    );

    client
        .shutdown(Duration::from_secs(15))
        .await
        .expect("shutdown");
}

/// Applies buffer edits to `text`.
///
/// The fixture is ASCII, so a UTF-16 character offset is also a byte offset;
/// non-ASCII text would need a conversion before `replace_range`.
fn apply_edits(text: &str, edits: &[SourceTextEdit]) -> String {
    let mut ordered = edits.to_vec();
    ordered.sort_by_key(|edit| (edit.range.start.line, edit.range.start.character));
    let mut result = text.to_owned();
    for edit in ordered.iter().rev() {
        let start = offset_in(text, edit.range.start);
        let end = offset_in(text, edit.range.end);
        if start <= end && end <= text.len() {
            result.replace_range(start..end, &edit.new_text);
        }
    }
    result
}

fn offset_in(text: &str, position: SourcePosition) -> usize {
    let mut offset = 0;
    for (index, line) in text.split_inclusive('\n').enumerate() {
        if index as u32 == position.line {
            return (offset + position.character as usize).min(offset + line.len());
        }
        offset += line.len();
    }
    text.len()
}

/// Returns the zero-based line and UTF-16 character offset of `needle`.
fn position_of(text: &str, needle: &str) -> Option<(u32, u32)> {
    let index = text.find(needle)?;
    let prefix = &text[..index];
    let line = prefix.matches('\n').count() as u32;
    let line_start = prefix.rfind('\n').map_or(0, |offset| offset + 1);
    let character = text[line_start..index].encode_utf16().count() as u32;
    Some((line, character))
}

fn find_jdtls_root() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(value) = std::env::var_os("JAVAIDE_JDTLS_HOME") {
        candidates.push(PathBuf::from(value));
    }
    candidates.extend(version_directories(&data_dir().join("jdtls")));
    candidates
        .into_iter()
        .find(|candidate| JdtlsInstallation::discover(candidate.clone()).is_ok())
}

fn find_java_home() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    for variable in ["JAVAIDE_JDTLS_JAVA_HOME", "JAVA_HOME"] {
        if let Some(value) = std::env::var_os(variable) {
            candidates.push(PathBuf::from(value));
        }
    }
    candidates.extend(version_directories(&data_dir().join("runtimes")));
    candidates
        .into_iter()
        .find(|home| home.join("bin").join("java").is_file())
}

fn version_directories(root: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(root) else {
        return Vec::new();
    };
    let mut directories = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    directories.sort();
    directories.reverse();
    directories
}

fn data_dir() -> PathBuf {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME") {
        return PathBuf::from(xdg).join("javaide");
    }
    std::env::var_os("HOME")
        .map_or_else(|| PathBuf::from("."), PathBuf::from)
        .join(".local/share/javaide")
}

/// Declares a minimal Eclipse Java project so jdtls imports it deterministically.
fn write_plain_project(project: &Path) -> std::io::Result<()> {
    std::fs::write(
        project.join(".project"),
        r#"<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
    <name>javaide-live-fixture</name>
    <comment></comment>
    <projects></projects>
    <buildSpec></buildSpec>
    <natures>
        <nature>org.eclipse.jdt.core.javanature</nature>
    </natures>
</projectDescription>
"#,
    )?;
    std::fs::write(
        project.join(".classpath"),
        r#"<?xml version="1.0" encoding="UTF-8"?>
<classpath>
    <classpathentry kind="src" path="src/main/java"/>
    <classpathentry kind="con" path="org.eclipse.jdt.launching.JRE_CONTAINER"/>
    <classpathentry kind="output" path="bin"/>
</classpath>
"#,
    )
}

/// Copies a source tree.
fn copy_tree(from: &Path, to: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_tree(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}
