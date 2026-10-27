# JavaIDE desktop

The v1 desktop shell: Tauri 2 (Rust) + CodeMirror 6 (webview). The webview is
presentation only; every file, Gradle, and OpenCode operation goes through a
Tauri command backed by the Rust crates.

## What works

- Workspace explorer with a default fixture workspace. Directories start
  collapsed and expand/collapse on click.
- CodeMirror editor with Java/JSON highlighting, tabs, dirty state, and
  `Ctrl/Cmd+S` save.
- Gradle sync, task execution, test discovery, and test runs through
  `crates/ide-gradle` and the Tooling API sidecar. The bridge is bound to the
  open workspace; opening another folder stops the old bridge and the next
  sync targets the new project.
- OpenCode V2 connect, session list/create, context loading, prompt streaming,
  and interrupt through `crates/ide-opencode`.

## Prerequisites

- Rust 1.88+.
- Node 20+ and npm.
- Linux: `webkit2gtk-4.1`, GTK 3 development packages.
- Java 17+ for the Gradle sidecar (Java 21 recommended).
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
`JAVA_HOME` when it is Java 17+, then common Temurin install paths.

## Layout

- `index.html`, `src/main.js`, `src/style.css`: the shell.
- `src-tauri/src/lib.rs`: Tauri commands and app state.
- `src-tauri/tauri.conf.json`: window and build configuration.
- `src-tauri/capabilities/default.json`: dialog and core permissions.

## Current limits

- jdtls diagnostics are not wired into the GUI yet; the adapter exists and is
  validated in `crates/ide-jdtls`.
- OpenCode permissions are surfaced as event text but do not have a reply UI
  yet.
- Debug test runs are available in the Phase 0 harness but not in the GUI.
- Files are edited on disk; there is no in-memory multi-file transaction yet.
