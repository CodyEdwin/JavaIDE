# Phase 1 status

- **Last updated:** 2026-10-29
- **Phase goal:** a real window that opens a Java workspace, edits files,
  navigates, and hosts a streaming OpenCode conversation
  ([ROADMAP.md](ROADMAP.md#4-phase-1--ide-shell-basic-lsp-and-opencode-chat-46-weeks)).
- **Overall:** in progress. The shell, editor, Gradle panel, OpenCode chat, and
  the basic jdtls feature surface exist. Refactoring/navigation breadth and the
  quality gates are the remaining work.

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
| OpenCode chat | Connect, sessions, context, streaming, stop, reconnect-by-refetch | `crates/ide-opencode`, AI panel |

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

## Remaining Phase 1 work

Ordered so each item leaves the app usable.

1. **Problems panel depth.** Group by file/project, filter by severity, show
   related information, and clear publications for closed documents.
2. **jdtls log surface.** `window/logMessage` text is currently appended raw;
   route debug-level output to a bounded ring buffer and keep warn/error in the
   panel.
3. **Settings.** Persist `java.format.enabled`, `java.completion.*`, and
   `java.jdt.ls.vmargs`, map them through `workspace/configuration`, and mark
   restart-required settings.
4. **Workspace trust prompt.** Gate jdtls import and Gradle execution behind an
   explicit trust decision for the opened folder.
5. **Editor breadth.** Split editors and a command palette (tabs and
   multi-cursor already work through `basicSetup`).
6. **Quality gates.** `cargo xtask check-architecture`, rustdoc checks, and
   committed `ts-rs` bindings do not exist yet. At minimum, add
   formatting/clippy/doc CI and the `xtask` architecture allowlist described in
   [ENGINEERING.md](ENGINEERING.md). A workspace-wide
   `cargo clippy -- -D warnings` still reports two pre-existing lints outside
   this change: `clippy::while_let_loop` in `ide-opencode/src/event.rs` and
   `clippy::mutable_key_type` in `ide-jdtls/src/text.rs`.
7. **Remote/multi-root.** Single-root workspaces only; multi-root is Phase 2.

## Phase 1 exit criteria

| Criterion | Status |
| --- | --- |
| Open a single-module Gradle fixture, edit and save `.java`, see diagnostics after jdtls is ready | Verified live on the fixture sources (imported as a plain Java project); the editor save path is unchanged from Phase 0 |
| Completion, hover, and go-to-definition for JDK and project types | Verified live by the opt-in `live_server` test |
| Formatting and organize imports apply as one atomic, undoable step | Verified live: edits are applied in a single buffer transaction |
| A jdtls crash is visible and recoverable; unsaved buffers survive | Crash marks the session failed and offers Restart; buffers live in the webview and are untouched. Recoverable by design, not yet exercised live |
| App runs on Linux and macOS; Windows builds in CI | Linux is the development target; macOS/Windows CI is not set up |
| OpenCode chat streams and can be stopped without freezing the UI | Implemented in Phase 0 shell |
| A workspace with OpenCode disabled has no assistant errors | Connection failures are reported in the AI panel only |
| `xtask check-architecture`, clippy, rustdoc, TS binding checks pass | Not implemented (see item 7) |

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
OpenCode permission reply flow. See
[ROADMAP.md](ROADMAP.md#5-phase-2--complete-java-intelligence-46-weeks).
