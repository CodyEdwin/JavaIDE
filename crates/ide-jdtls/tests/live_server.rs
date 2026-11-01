//! Live jdtls integration test for the language feature surface.
//!
//! Ignored by default because it needs an extracted jdtls distribution and a
//! JDK new enough for that build (the pinned 1.64 snapshot needs JDK 25).
//! Run it explicitly:
//!
//! ```sh
//! JAVAIDE_JDTLS_HOME=/path/to/jdtls \
//! JAVAIDE_JDTLS_JAVA_HOME=/path/to/jdk-25 \
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
#[ignore = "requires JDK 25+ and an extracted jdtls distribution"]
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

    let signature_positions = [
        SourcePosition::new(call_line, call_character + "add(".len() as u32),
        SourcePosition::new(call_line, call_character + "add".len() as u32),
        hover_position,
    ];
    let mut signatures = Vec::new();
    let mut signature_note = String::new();
    for position in signature_positions {
        match client
            .signature_help(&file, position, REQUEST_TIMEOUT)
            .await
        {
            Ok(found)
                if found
                    .iter()
                    .any(|signature| signature.label.contains("add")) =>
            {
                signatures = found;
                break;
            }
            Ok(found) => signature_note = format!("empty at {position:?}: {found:?}"),
            Err(error) => signature_note = format!("error at {position:?}: {error}"),
        }
    }
    assert!(
        signatures
            .iter()
            .any(|signature| signature.label.contains("add")),
        "signature help did not describe add ({signature_note})"
    );

    let references = client
        .references(&file, hover_position, true, REQUEST_TIMEOUT)
        .await
        .expect("references");
    assert!(
        references.len() >= 2,
        "expected the declaration and the call of add, got {references:?}"
    );

    let symbols = client
        .document_symbols(&file, REQUEST_TIMEOUT)
        .await
        .expect("document symbols");
    let names = flatten_names(&symbols);
    assert!(
        names.iter().any(|name| name.starts_with("add"))
            && names.iter().any(|name| name.starts_with("main")),
        "outline missing add/main: {names:?}"
    );

    let renamed = client
        .rename(&file, hover_position, "sum", REQUEST_TIMEOUT)
        .await
        .expect("rename");
    assert!(
        renamed
            .iter()
            .any(|file| { file.edits.iter().any(|edit| edit.new_text.contains("sum")) }),
        "rename did not produce a `sum` edit: {renamed:?}"
    );

    let broken = project.join("src/main/java/com/example/Broken.java");
    let broken_source =
        "package com.example;\npublic class Broken {\n  void m() {\n    int value = 1\n  }\n}\n";
    std::fs::write(&broken, broken_source).expect("write broken file");
    client
        .open_document(&broken, broken_source, 1)
        .await
        .expect("open broken file");
    let mut actions = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && actions.is_empty() {
        if let Ok(found) = client
            .code_actions(
                &broken,
                ide_jdtls::SourceRange {
                    start: SourcePosition::new(3, 4),
                    end: SourcePosition::new(3, 16),
                },
                REQUEST_TIMEOUT,
            )
            .await
            && !found.is_empty()
        {
            actions = found;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    assert!(
        actions.iter().any(|action| !action.title.is_empty()),
        "expected a code action for the broken file, got {actions:?}"
    );

    let folds = client
        .folding_ranges(&file, REQUEST_TIMEOUT)
        .await
        .expect("folding ranges");
    assert!(!folds.is_empty(), "expected at least one fold");

    let tokens = client
        .semantic_tokens(&file, REQUEST_TIMEOUT)
        .await
        .expect("semantic tokens");
    assert!(
        tokens.iter().any(|token| token.length > 0),
        "semantic tokens were empty: {tokens:?}"
    );

    let end_line = text.lines().count().saturating_sub(1) as u32;
    let hints = client
        .inlay_hints(
            &file,
            ide_jdtls::SourceRange {
                start: SourcePosition::new(0, 0),
                end: SourcePosition::new(end_line, 200),
            },
            REQUEST_TIMEOUT,
        )
        .await
        .expect("inlay hints");
    assert!(
        hints.iter().any(|hint| !hint.label.is_empty()),
        "expected parameter-name hints, got {hints:?}"
    );

    let selections = client
        .selection_ranges(&file, hover_position, REQUEST_TIMEOUT)
        .await
        .expect("selection ranges");
    assert!(!selections.is_empty(), "expected selection ranges");

    let (main_line, main_character) = position_of(&text, "void main").expect("main");
    let outgoing = client
        .hierarchy(
            &file,
            SourcePosition::new(main_line, main_character + 5),
            "outgoing",
            REQUEST_TIMEOUT,
        )
        .await
        .expect("outgoing calls");
    assert!(
        outgoing
            .iter()
            .any(|node| node.name.contains("add") || node.name.contains("println")),
        "outgoing calls missing add/println: {outgoing:?}"
    );
    let incoming = client
        .hierarchy(&file, hover_position, "incoming", REQUEST_TIMEOUT)
        .await
        .expect("incoming calls");
    assert!(
        incoming.iter().any(|node| node.name.contains("main")),
        "incoming calls missing main: {incoming:?}"
    );

    let types_path = project.join("src/main/java/com/example/Types.java");
    let types_source =
        "package com.example;\ninterface Named {}\nclass Person implements Named {}\n";
    std::fs::write(&types_path, types_source).expect("write types");
    client
        .open_document(&types_path, types_source, 1)
        .await
        .expect("open types");
    let (person_line, person_character) =
        position_of(types_source, "class Person").expect("Person");
    let person = SourcePosition::new(person_line, person_character + "class ".len() as u32);
    let mut supertypes = Vec::new();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    while Instant::now() < deadline && supertypes.is_empty() {
        if let Ok(found) = client
            .hierarchy(&types_path, person, "supertypes", REQUEST_TIMEOUT)
            .await
            && found.iter().any(|node| node.name.contains("Named"))
        {
            supertypes = found;
            break;
        }
        tokio::time::sleep(RETRY_INTERVAL).await;
    }
    assert!(
        supertypes.iter().any(|node| node.name.contains("Named")),
        "supertypes of Person missing Named: {supertypes:?}"
    );

    // This plain project resolves user symbols, but JDK definitions come back
    // empty until a source attachment exists. A `jdt://` result must decompile;
    // a direct class-file read must not be a protocol error.
    let (system_line, system_character) = position_of(&text, "System.out").expect("System");
    let system_locations = client
        .definition(
            &file,
            SourcePosition::new(system_line, system_character + 1),
            REQUEST_TIMEOUT,
        )
        .await
        .expect("definition of System");
    if let Some(uri) = system_locations
        .iter()
        .find_map(|location| location.uri.clone().filter(|uri| uri.starts_with("jdt:")))
    {
        let contents = client
            .class_file_contents(&uri, REQUEST_TIMEOUT)
            .await
            .expect("class file contents");
        assert!(
            !contents.trim().is_empty(),
            "empty decompiled document {uri}"
        );
    } else {
        client
            .class_file_contents(
                "jdt://contents/java.base/java/lang/System.class",
                REQUEST_TIMEOUT,
            )
            .await
            .expect("class file request");
    }

    let lenses = client
        .code_lens(&file, REQUEST_TIMEOUT)
        .await
        .expect("code lens");
    assert!(
        lenses.iter().any(|lens| !lens.title.is_empty()),
        "expected a code lens, got {lenses:?}"
    );

    let extra = temporary.path().join("extra-root");
    std::fs::create_dir_all(&extra).expect("extra root");
    client
        .add_workspace_folder(&extra)
        .await
        .expect("add workspace folder");

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

fn flatten_names(symbols: &[ide_jdtls::JavaSymbol]) -> Vec<String> {
    let mut names = Vec::new();
    for symbol in symbols {
        names.push(symbol.name.clone());
        names.extend(flatten_names(&symbol.children));
    }
    names
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
    if let Ok(entries) = std::fs::read_dir("/usr/lib/jvm") {
        candidates.extend(entries.filter_map(Result::ok).map(|entry| entry.path()));
    }
    candidates
        .into_iter()
        .filter(|home| home.join("bin").join("java").is_file())
        .max_by_key(|home| java_major(home).unwrap_or(0))
}

fn java_major(home: &Path) -> Option<u32> {
    let output = std::process::Command::new(home.join("bin").join("java"))
        .arg("-version")
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stderr);
    let start = text.find('"')? + 1;
    let end = text[start..].find('"')? + start;
    let version = &text[start..end];
    let major = version.strip_prefix("1.").unwrap_or(version);
    major.split('.').next()?.parse().ok()
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
