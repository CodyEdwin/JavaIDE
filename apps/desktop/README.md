# JavaIDE desktop

The v1 desktop shell: Tauri 2 (Rust) + CodeMirror 6 (webview). The webview is
presentation only; every file, Gradle, and OpenCode operation goes through a
Tauri command backed by the Rust crates.

## What works

- Workspace explorer with a default fixture workspace. Directories start
  collapsed and expand/collapse on click.
- CodeMirror editor with Java/JSON highlighting, tabs, dirty state,
  `Ctrl/Cmd+S` save, and a second pane (`Ctrl/Cmd+\` or **View: Split Editor**).
- Command palette (`Ctrl/Cmd+Shift+P`) and quick open (`Ctrl/Cmd+P`).
- Workspace trust. A new folder starts untrusted: editing works, and Gradle,
  jdtls, and OpenCode do not run until **Trust folder**.
- **Compile**, **Run**, and **Test** in the toolbar, which run the Gradle
  `compileJava`, `run`, and `test` tasks and stream build output.
- Gradle sync, task execution, test discovery, and test runs through
  `crates/ide-gradle` and the Tooling API sidecar. The bridge is bound to the
  open workspace; opening another folder stops the old bridge and the next
  sync targets the new project.
- Java language server through `crates/ide-jdtls`: downloaded automatically
  (pinned snapshot, SHA-256 checked) when `JAVAIDE_JDTLS_HOME` is unset,
  auto-start when the first
  `.java` file opens in a trusted workspace, diagnostics (gutter, squiggles,
  problems grouped by file with severity filters and related locations), hover,
  completion, `F12` go-to-definition, `Shift+Alt+F` formatting, and
  `Shift+Alt+O` organize imports. Formatting and import edits apply to the
  in-memory buffer as one undo step. The Java panel shows the server state, the
  problem list, warn/error/info logs, and a bounded debug log. Settings for
  format, completion, and `java.jdt.ls.vmargs` are saved from that panel.
  Changing VM arguments requires a jdtls restart.
- OpenCode V2 connect, session list/create, context loading, prompt streaming,
  and interrupt through `crates/ide-opencode`.

## Prerequisites

- Rust 1.88+.
- Node 20+ and npm.
- Linux: `webkit2gtk-4.1`, GTK 3 development packages.
- Java 17+ for the Gradle sidecar (Java 21 recommended).
- A JDK **and** an extracted jdtls distribution for the Java panel. The shell
  looks for `JAVAIDE_JDTLS_HOME`, then versioned directories under
  `$XDG_DATA_HOME/javaide/jdtls/`, `/opt/jdtls`, and
  `/usr/local/lib/jdtls`. Set `JAVAIDE_JDTLS_JAVA_HOME` (or `JAVA_HOME`) to the
  JDK 21+ runtime for the server. The shell also scans `/usr/lib/jvm` and
  `/Library/Java/JavaVirtualMachines`. The project JDK is discovered separately
  by jdtls.

> The pinned jdtls snapshot used for the live adapter test fails to start on
> Temurin 21 and works on Temurin 25, so pick the JDK per pinned jdtls version
> instead of assuming any 21+ runtime works. The adapter test records one
> working pair: `crates/ide-jdtls/tests/live_server.rs`.
- A built sidecar:

  ```sh
  cd sidecar/gradle-bridge && ./gradlew installDist
  ```

- OpenCode V2 running locally for the AI panel (`opencode serve` or the
  desktop service). Discovery uses the normal OpenCode state/config files.

## Run

```sh
cd apps/desktop
npm install
npm run tauri dev
```

Set `JAVAIDE_WORKSPACE=/absolute/path` to open a different project at startup.
The explorer starts with every directory collapsed; click a directory row to
expand or collapse it. **Open Folder** switches the workspace, stops the old
Gradle bridge, and clears the Gradle panel for the new project.

Production assets:

```sh
npm run build
npm run tauri build
```

The backend looks for the sidecar at
`sidecar/gradle-bridge/build/install/gradle-bridge/bin/gradle-bridge` relative
to the repository root, or at `JAVAIDE_GRADLE_BRIDGE`. It prefers
`JAVA_HOME` when it is Java 17+, then common install paths and a scan of
`/usr/lib/jvm`.

## Layout

- `index.html`, `src/main.js`, `src/style.css`: the shell.
- `src-tauri/src/lib.rs`: Tauri commands and app state.
- `src-tauri/tauri.conf.json`: window and build configuration.
- `src-tauri/capabilities/default.json`: dialog and core permissions.

## Current limits

- Java intelligence covers diagnostics, hover, completion, go-to-definition,
  formatting, and organize imports. Rename, other code actions, references,
  signature help, and semantic tokens arrive in Phase 2. See
  `docs/PHASE1_STATUS.md`.
- Definitions that resolve to JDK or decompiled sources (`jdt://` documents) are
  reported in the status bar instead of being opened.
- OpenCode permissions are surfaced as event text but do not have a reply UI
  yet.
- Debug test runs are available in the Phase 0 harness but not in the GUI.
- Files are edited on disk; there is no in-memory multi-file transaction yet.
