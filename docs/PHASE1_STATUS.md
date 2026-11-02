# Phase 1 status

- **Last updated:** 2026-10-31
- **Phase goal:** a real window that opens a Java workspace, edits files,
  navigates, and hosts a streaming OpenCode conversation
  ([ROADMAP.md](ROADMAP.md#4-phase-1--ide-shell-basic-lsp-and-opencode-chat-46-weeks)).
- **Overall:** the usable core is in place. A trusted single-module Gradle
  project can be edited, compiled, run, and tested from the shell. Later
  phases continued from here; see [PHASE2_STATUS.md](PHASE2_STATUS.md).

This page is the working checklist for Phase 1. Update it with the code change
that changes the status, not afterwards.

## Done

| Area | What exists | Where |
| --- | --- | --- |
| Desktop shell | Tauri 2 window, explorer, tabs, save, status bar, activity panels | `apps/desktop/` |
| Editor | CodeMirror 6, Java/JSON highlighting, dirty tabs, `Ctrl/Cmd+S`, find/replace from `basicSetup` | `apps/desktop/src/main.js` |
| Workspace | Folder open, default fixture, external `JAVAIDE_WORKSPACE`, file tree with collapse | `apps/desktop/src-tauri/src/lib.rs` |
| Gradle | Sync, task list/run/cancel, test discovery/run, per-run settings, bridge restarts on workspace switch | `crates/ide-gradle`, `sidecar/gradle-bridge` |
| jdtls lifecycle | Discovery (`JAVAIDE_JDTLS_HOME`, `$XDG_DATA_HOME/javaide/jdtls/*`, `/opt/jdtls`), JDK 21+ discovery, per-workspace `-data`, auto-start on first Java document, restart, crash detection | `crates/ide-jdtls`, `apps/desktop/src-tauri/src/lib.rs` |
| Diagnostics | `publishDiagnostics` streamed to the editor gutter and squiggles, problems list with source navigation | `JdtlsEvent::diagnostics`, Java panel |
| Completion | `textDocument/completion` on typing, typed candidates with detail/documentation | `JdtlsClient::completion` |
| Hover | `textDocument/hover` tooltip at the pointer | `JdtlsClient::hover` |
| Go to definition | `textDocument/definition`, `F12`, opens the target file at the symbol | `JdtlsClient::definition` |
| Document sync | Full-text `didOpen`/`didChange` (debounced 350 ms), `didSave`, `didClose`, monotonic versions | `JdtlsClient::change_document` |
| Formatting | `textDocument/formatting`, applied to the buffer as one undo step (`Shift+Alt+F`) | `JdtlsClient::format_document` |
| Organize imports | `source.organizeImports` code action, applied to the buffer (`Shift+Alt+O`) | `JdtlsClient::organize_imports` |
| OpenCode chat | Connect, sessions, context, streaming, stop, reconnect-by-refetch. Connect and prompt are refused until the folder is trusted | `crates/ide-opencode`, AI panel |
| Problems | Grouped by file, severity filter with counts, related locations, clear on close | Java panel |
| jdtls log | Warn, error, and info stay in the panel. LSP log/debug (level ≥ 4) goes to a 200-line ring and is shown on demand | `java_debug_log` |
| Settings | `java.format.enabled`, completion favorites/import order/guess-arguments, and `java.jdt.ls.vmargs`. User file or workspace `.javaide/settings.toml`. VM arguments are marked restart-required and passed on the next jdtls launch | `crates/ide-config` |
| Trust | Unknown folders cannot start jdtls, Gradle, or OpenCode. Trust and restrict are persisted in `trust.json` | banner, `set_workspace_trust` |
| Commands | Palette (`Ctrl/Cmd+Shift+P`), quick open (`Ctrl/Cmd+P`), split editor (`Ctrl/Cmd+\`) | toolbar, command list in `main.js` |
| Compile / run / test | Toolbar buttons run Gradle `compileJava`, `run`, and `test` and stream task output | Gradle panel |
| Quality gates | `xtask check-architecture`, `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`, Gradle sidecar tests, webview build. Linux CI workflow | `crates/xtask`, `.github/workflows/ci.yml` |

### Verification performed

- `cargo test -p ide-jdtls`: 22 tests pass, including the hover, completion,
  definition, formatting, and diagnostic conversions plus insert-text
  derivation.
- **Live jdtls run** against a real server (jdtls snapshot, Temurin 25.0.5):
  `cargo test -p ide-jdtls --test live_server -- --ignored` passes in under 30
  seconds. It covers clean diagnostics for `App.java`, hover for `App.add`,
  completion after `System.`, go-to-definition of `add`, whole-document
  formatting of a messy file, and organize-imports removing an unused import.
- `cargo check -p javaide-desktop`, clippy on both crates, and `rustfmt --check`
  on every touched file.
- `npm run build` for the webview bundle.
- The sandbox has no GTK/WebKit development packages, so the Tauri build
  scripts were satisfied with stub pkg-config metadata. The crates typecheck,
  but a real desktop build and window still need those system packages.
- Environment finding: the current jdtls snapshot fails to resolve its OSGi
  bundles on Temurin 21.0.13 and works on Temurin 25.0.5. The “JDK 21+” runtime
  claim below needs a pinned version pair per release.

## Still ahead (not part of the usable core)

1. **`ide-ui-api` and `ts-rs` bindings.** The shell still serializes its own
   command structs. Introducing the command crate now would move types without
   changing what a user can do, so it stays with the Phase 2 boundary work.
2. **Workspace lint opt-in.** `cargo clippy --workspace --all-targets -- -D warnings`
   passes. Crates do not yet opt into the pedantic workspace lint table in
   [ENGINEERING.md](ENGINEERING.md); turning that on across the existing crates
   is a separate cleanup.
3. **macOS and Windows CI.** The GitHub workflow runs on Ubuntu. Those
   platforms are not built here.
4. **Remote/multi-root.** Single-root workspaces only; multi-root is Phase 2.
5. **Run configurations.** Compile, run, and test go through Gradle tasks.
   Args, env, cwd, and a main-class launcher that is not the Gradle `run` task
   are Phase 4.

## Phase 1 exit criteria

| Criterion | Status |
| --- | --- |
| Open a single-module Gradle fixture, edit and save `.java`, see diagnostics after jdtls is ready | Editor open/save verified in the running shell. Diagnostics were verified earlier by the live jdtls test; this environment has no extracted jdtls, so the panel correctly reports Java unavailable |
| Completion, hover, and go-to-definition for JDK and project types | Implemented. The opt-in `live_server` test is skipped unless `JAVAIDE_JDTLS_HOME` is set |
| Formatting and organize imports apply as one atomic, undoable step | Implemented; edits are one buffer transaction |
| A jdtls crash is visible and recoverable; unsaved buffers survive | Crash marks the session failed and offers Restart; buffers live in the webview |
| App runs on Linux and macOS; Windows builds in CI | Linux launch verified. macOS/Windows CI is not set up |
| OpenCode chat streams and can be stopped without freezing the UI | Implemented. Connect and prompt wait for workspace trust |
| A workspace with OpenCode disabled has no assistant errors | Connection failures stay in the AI panel. An untrusted folder does not connect |
| `xtask check-architecture`, clippy, and tests pass | `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test --workspace`, and `xtask check-architecture` pass. `ts-rs` bindings are not generated yet |

## How to verify locally

```sh
# Adapter and view-model tests
cargo test -p ide-jdtls

# Live jdtls run (opt-in; needs a JDK and an extracted jdtls)
JAVAIDE_JDTLS_HOME=/path/to/jdtls \
JAVAIDE_JDTLS_JAVA_HOME=/path/to/jdk \
  cargo test -p ide-jdtls --test live_server -- --ignored --nocapture

# Rust shell tests and compile check
cargo test -p javaide-desktop
cargo check -p javaide-desktop

# Webview bundle
cd apps/desktop && npm run build

# Live run (needs JDK 21+, an extracted jdtls, and GTK/WebKit dev packages)
export JAVAIDE_JDTLS_HOME=/path/to/extracted/jdtls
export JAVAIDE_JDTLS_JAVA_HOME=/path/to/jdk-21
cd sidecar/gradle-bridge && ./gradlew installDist && cd -
cd apps/desktop && npm run tauri dev
```

Then open a `.java` file: the Java panel reports `jdtls starting…`, then
`ready`; diagnostics appear in the gutter and problems list, hover shows
signatures, completion appears after `.`, and `F12` jumps to a definition.
`Shift+Alt+F` formats the buffer and `Shift+Alt+O` organizes imports; both
apply as one undo step and never touch the file until you save.

## Next phase preview

Phase 2 completes the jdtls feature matrix (signature help, references,
rename, code actions, semantic tokens, inlay hints, hierarchy, code lens),
hardens project import against multi-module and broken builds, and adds the
OpenCode permission reply flow. The command types should move into `ide-ui-api`
when that work starts, so the shell stops owning protocol-adjacent DTOs. See
[ROADMAP.md](ROADMAP.md#5-phase-2--complete-java-intelligence-46-weeks).
