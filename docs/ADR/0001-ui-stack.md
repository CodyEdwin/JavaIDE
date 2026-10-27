# ADR 0001: UI stack for v1

- **Status:** Accepted (Phase 0 validated)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [ARCHITECTURE.md](../ARCHITECTURE.md), [ENGINEERING.md](../ENGINEERING.md)

## Context

The IDE needs a professional text-editing surface, not a form UI. The baseline
requirements are:

- low-latency typing, IME, multi-cursor, selections, undo/redo;
- syntax highlighting, folding, bracket matching, diagnostics decorations,
  inlay hints, and a large-document mode;
- tabs, splits, panels, a command palette, and keyboard-first workflows;
- accessible focus/labels and platform conventions;
- a chat panel, permission inbox, and diff viewer for OpenCode;
- a path to Linux, macOS, and Windows without three separate UI codebases.

The application core is Rust. We do not want the UI choice to leak into domain
or protocol crates: the core should expose a typed command/event API so the
shell can be replaced.

Two realistic options were considered:

1. **Tauri 2 + web frontend (TypeScript + CodeMirror 6).** Mature editing
   component, web tech for the assistant/diff UI, Rust backend with typed IPC.
2. **A native Rust UI (GPUI or similar).** One language, native rendering, no
   webview; but the editor, accessibility, IME, and ecosystem are much younger,
   and every editor feature must be built or integrated at a lower level.

## Decision

For v1, use **Tauri 2** as the desktop shell and **CodeMirror 6** as the editor,
with a TypeScript frontend under `ui/`.

- The Rust core remains UI-agnostic. `ide-ui-api` defines serializable
  commands, events, and view models; `ide-ui-tauri` adapts them to Tauri;
  `ui/` renders them.
- The UI never speaks LSP, DAP, Gradle, or OpenCode directly.
- TypeScript bindings are generated from Rust with `ts-rs` and checked in CI.
- A native UI remains possible later by implementing another adapter over
  `ide-ui-api`; it must not require changes to `ide-app` or adapters.
- If a native shell is pursued, it is a post-v1 project with its own ADR.

## Why this option

- CodeMirror 6 has a proven document model, viewport virtualization, IME
  support, accessibility work, and an extension ecosystem. Building equivalent
  behavior in a new native editor would consume a large part of the schedule.
- Tauri gives us a small Rust-owned backend, native menus/dialogs, process
  integration, and installers for the three target OSes.
- The assistant UI (markdown, tool cards, forms, diffs) is naturally
  web-rendered and can reuse mature components.
- The performance-critical state (text, LSP, Gradle, debug) stays in Rust; the
  webview renders a bounded viewport, not the whole document.

## Consequences

**Positive**

- Fastest credible path to a usable editor and a rich AI panel.
- The core can be tested headlessly without a UI toolkit.
- UI iteration does not require Rust rebuilds for every layout change.
- A future native UI has a clean contract to target.

**Negative**

- Two languages and two build systems (Cargo + Node/Tauri).
- Webview differences (WebKitGTK on Linux, WKWebView on macOS, WebView2 on
  Windows) must be tested.
- Large documents and semantic decorations need careful viewport budgeting.
- Webview memory is added to the app's footprint.
- Tauri IPC and event serialization become a performance-sensitive boundary.

## Alternatives considered

| Alternative | Why not for v1 |
| --- | --- |
| GPUI native Rust | Attractive long-term, but editor/IME/accessibility maturity and feature velocity are not yet at the level needed for a Java IDE; would dominate the schedule |
| egui | Immediate-mode UI is excellent for tools, but a code editor with large documents, IME, and accessibility is not its strength |
| Electron + Monaco | Mature, but a much larger runtime and a second Node process; Tauri keeps the backend Rust-first |
| VS Code extension | Would not be an independent IDE; jdtls/OpenCode hosting and Gradle ownership would remain constrained by VS Code |
| Web-only app | No native process supervision, file system authority, or installer story without a backend |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| WebKitGTK rendering/IME bugs on Linux | Test on the oldest supported distro; keep a fallback textarea/IME path; track upstream |
| Typing latency on 10k-line files | Benchmark in Phase 1; viewport-only rendering; avoid sending full text per keystroke; batch events |
| IPC serialization overhead | Send incremental edits and view models, not whole documents; coalesce events; measure |
| Accessibility gaps | Keyboard-only E2E tests; labels/roles; audit before beta |
| Two-language complexity | Generated bindings, one command/event contract, CI for both stacks |
| Lock-in to Tauri | Keep `ide-ui-api` independent; no Tauri types in domain/app crates |

## Follow-up

1. Build a Phase 1 spike with a 10k-line Java file, IME input, multi-cursor, and
   diagnostics decorations; measure keystroke-to-paint.
2. Confirm the minimum WebView versions for Linux/macOS/Windows.
3. Revisit a native shell only after v1, with measured pain points and a new
   ADR.
