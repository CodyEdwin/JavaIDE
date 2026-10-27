# Architecture

This document defines the module boundaries and contracts. If code and this
document disagree, treat the document as the design intent and either fix the
code or update the document in the same pull request.

## 1. Design principles

1. **One reason to change per crate.** A crate that parses LSP must not know
   about Gradle tasks; a crate that renders tabs must not know about JSON-RPC.
2. **Dependencies point inward.** Domain types and ports have no dependency on
   transports, the UI, or concrete tools. Adapters depend on the domain, never
   the other way around.
3. **One owner per fact.** jdtls owns Java semantics; Gradle owns the build
   model; OpenCode owns AI sessions and permissions; the app owns editor and
   workspace state.
4. **Protocols stop at the adapter boundary.** `lsp_types`, DAP types, Gradle
   DTOs, and OpenCode API types never reach the UI or the domain.
5. **Explicit over implicit.** Typed commands/events, newtype IDs, explicit
   units in type names (`ByteOffset`, `Utf16Position`), explicit error types.
6. **No global mutable state.** Services are constructed in the composition
   root and passed as dependencies. No `lazy_static` singletons.
7. **Test seams are ports, not mocks everywhere.** Abstract side effects only
   where substitution matters (language server, build system, assistant,
   process spawn, clock for timing-sensitive logic).

## 2. Crate map

| Crate | Responsibility | May depend on | Must not depend on |
| --- | --- | --- | --- |
| `ide-domain` | IDs, URIs/paths, text ranges, workspace/project/build/test/debug models, typed events/commands, port traits, error taxonomy | std, `serde`, `async-trait` | tokio, UI, LSP/DAP/OpenCode/Gradle SDKs |
| `ide-jsonrpc` | JSON-RPC 2.0 envelope, framing, request correlation, cancellation, progress | serde, tokio-util | LSP, DAP, jdtls, Gradle |
| `ide-lsp` | Generic LSP client, capabilities, document sync, feature request/response types, dynamic registration | `ide-jsonrpc`, `lsp-types` | Java, jdtls-specific settings, UI |
| `ide-dap` | Generic Debug Adapter Protocol client | `ide-jsonrpc` | Java, DAP UI |
| `ide-jdtls` | jdtls provisioning/launch, lifecycle, settings mapping, jdtls custom requests/notifications, Java project model | `ide-lsp`, `ide-platform`, `ide-config`, `ide-domain` | app, UI, Gradle bridge |
| `ide-gradle` | Sidecar client, Gradle model/task/test DTOs, sync orchestration, classpath resolution | `ide-jsonrpc`, `ide-platform`, `ide-domain` | app, UI, jdtls internals |
| `ide-debug` | Java debug orchestration, launch configs, breakpoints, DAP feature mapping | `ide-dap`, `ide-domain`, `ide-platform` | UI, app |
| `ide-editor` | Rope buffer, edits, line index, UTF-8/UTF-16 conversion, selections, syntax tree, folding | std, ropey, tree-sitter | LSP, UI |
| `ide-workspace` | Document store, file tree index, watcher, save/atomic write, external changes, search | `ide-domain`, `ide-editor`, `ide-platform` | LSP, Gradle, UI |
| `ide-config` | Settings schema/defaults/validation, launch config schema, paths, migrations | serde, schemars | UI, concrete adapters |
| `ide-platform` | OS paths, JDK discovery, process groups, downloads, archives, terminal PTY | std/tokio only | domain semantics |
| `ide-context` | Builds bounded/redacted assistant context from editor, diagnostics, projects, tasks, tests | `ide-domain`, `ide-editor` | OpenCode client, UI |
| `ide-opencode` | OpenCode V2 service discovery/lifecycle, HTTP client, SSE events, session/permission/form/diff API | `ide-jsonrpc`, `ide-platform`, `ide-domain` | UI, app, jdtls |
| `ide-mcp` | MCP server over WebSocket/stdio; typed IDE tool schemas and dispatch | `ide-jsonrpc`, `ide-domain` | OpenCode client, UI |
| `ide-app` | Use cases, command dispatch, state aggregation, policy (trust, autosave, context) | `ide-domain`, `ide-editor`, `ide-workspace`, `ide-config`, `ide-context` | concrete adapters, UI |
| `ide-runtime` | Composition root: builds adapters, supervises actors, wires ports, exposes app handle | all backend crates | UI toolkit |
| `ide-ui-api` | Serializable UI commands/events/view models; TypeScript generation | `ide-domain` | UI toolkit, protocol crates |
| `ide-ui-tauri` | Tauri commands/events, window/menu/dialog integration | `ide-runtime`, `ide-ui-api` | jdtls/Gradle/OpenCode internals |
| `ide-desktop` | Binary entry point; chooses UI adapter and starts runtime | `ide-ui-tauri`, `ide-runtime` | — |
| `ide-testkit` | Fakes, fixture loaders, recorded protocol traces, test harnesses | domain + test deps | production code must not depend on it |
| `xtask` | Architecture checks, codegen checks, packaging, CI helpers | any dev deps | shipped binary |

Non-Rust components:

| Path | Responsibility |
| --- | --- |
| `sidecar/gradle-bridge/` | Java 21 process using the Gradle Tooling API |
| `opencode-plugin/` | Optional first-party OpenCode V2 TypeScript plugin (commands, skills, MCP fallback) |
| `ui/` | Tauri frontend: TypeScript, CodeMirror 6, chat panel, diff view |
| `fixtures/` | Gradle/Maven/plain Java fixture projects used by tests |
| `docs/` | This plan, ADRs, protocol notes |

> **Do not create all crates on day one.** Create a crate when its first real
> responsibility appears. The map is a boundary contract, not a suggestion to
> generate empty directories.

## 3. Dependency rules

```text
                 ┌────────────────────┐
                 │      ide-domain    │  no I/O, no concrete protocols
                 └─────────┬──────────┘
        ┌──────────────────┼───────────────────┐
        │                  │                   │
  ide-editor         ide-config          ports/traits
        │                  │                   │
  ide-workspace ─────► ide-app ◄────── ide-context
        │                  │
        │            ide-runtime (composition)
        │           /      |       |       \
     ide-jdtls  ide-gradle ide-debug ide-opencode
        │           │          │           │
     ide-lsp     sidecar     ide-dap      ide-mcp
        │
   ide-jsonrpc

  ide-ui-api ──► ide-ui-tauri ──► ide-desktop
        ▲                              │
        └──────── command/event ───────┘
```

Rules enforced in CI by `xtask check-architecture` (reads `cargo metadata` and
checks an allowlist of edges):

- `ide-domain` has no workspace-internal dependencies.
- `ide-app` never depends on `ide-jdtls`, `ide-gradle`, `ide-debug`,
  `ide-opencode`, `ide-mcp`, `ide-ui-*`, or `ide-runtime`.
- Concrete adapters never depend on `ide-app`, `ide-runtime`, or UI crates.
- UI crates never depend on `ide-lsp`, `ide-dap`, `ide-jsonrpc`, or
  `ide-opencode`.
- `ide-testkit` is only a dev-dependency.
- No cycles. `cargo tree -d` is reviewed for accidental duplicate major
  versions.

## 4. Domain model

### 4.1 Identity and units

```rust
/// Stable identifier for an open document. Assigned when the document is
/// registered; the URI remains the durable key across restarts.
pub struct DocumentId(Uuid);

/// Stable identifier for a workspace/window. A workspace is one or more roots.
pub struct WorkspaceId(Uuid);

/// Stable identifier for a Java project reported by jdtls or Gradle.
pub struct ProjectId(Uuid);

/// Byte offset into a UTF-8 document. This is the canonical offset unit inside
/// the IDE. Never pass this to LSP; convert through `LineIndex`.
pub struct ByteOffset(usize);

/// A range in UTF-8 byte offsets, half-open: `start..end`.
pub struct TextRange { start: ByteOffset, end: ByteOffset }

/// A position in LSP's negotiated encoding (UTF-16 for jdtls). Only protocol
/// adapters and the line index should construct this type.
pub struct LspPosition { line: u32, character: u32 }
```

**Rule:** the core never stores line/column positions. It stores byte offsets
and a cached `LineIndex`. Conversion happens at the LSP/DAP/UI boundary. This
eliminates a whole class of CRLF, Unicode, and stale-line bugs.

### 4.2 Core aggregates

- `Workspace`: roots, trust state, settings, document store, projects, build
  model, active run/debug sessions, assistant sessions.
- `DocumentSnapshot`: URI, version, text, language ID, dirty flag, line index.
- `JavaProject`: name, root, source paths, output paths, classpath entries,
  JDK version, module info.
- `BuildProject`: Gradle project path, tasks, source sets, configurations,
  dependencies, included builds, problems.
- `RunConfiguration`: main class/artifact/task, args, VM args, env, cwd,
  classpath/module path source, debug settings.
- `TestRun`: framework, selection, state, cases, output, duration, failures.
- `DebugSession`: adapter, config, state, threads, current frame, breakpoints.
- `AssistantSession`: OpenCode session ID, agent/model, status, token usage,
  pending permission/form, last diff revision.

### 4.3 Ports

Ports are traits in `ide-domain`. Keep them capability-oriented and explicit.
Avoid one generic `request()` method that forces callers back into protocol
types.

```rust
/// Java language intelligence. Implemented by `ide-jdtls`; faked in tests.
#[async_trait]
pub trait LanguageService: Send + Sync {
    /// Must be idempotent. The app replays open documents after a restart.
    async fn open_document(&self, doc: DocumentSnapshot) -> Result<(), LanguageError>;
    async fn change_document(&self, change: DocumentChange) -> Result<(), LanguageError>;
    async fn close_document(&self, uri: &DocumentUri) -> Result<(), LanguageError>;
    async fn completion(&self, req: CompletionRequest) -> Result<CompletionResponse, LanguageError>;
    async fn code_action(&self, req: CodeActionRequest) -> Result<CodeActionResponse, LanguageError>;
    async fn apply_workspace_edit(&self, edit: WorkspaceEdit) -> Result<ApplyEditResult, LanguageError>;
    async fn status(&self) -> LanguageStatus;
}
```

```rust
/// Build/task/test operations. Implemented by `ide-gradle`; a no-op adapter is
/// used for non-Gradle projects. The trait deliberately does not expose Gradle
/// model types.
#[async_trait]
pub trait BuildSystem: Send + Sync {
    async fn sync(&self, reason: SyncReason) -> Result<BuildSnapshot, BuildError>;
    async fn run_task(&self, req: RunTaskRequest) -> Result<TaskHandle, BuildError>;
    async fn cancel(&self, task: TaskId) -> Result<(), BuildError>;
    async fn resolve_classpath(&self, req: ClasspathRequest) -> Result<Classpath, BuildError>;
}
```

```rust
/// AI collaboration. Implemented by `ide-opencode`; a disabled adapter keeps
/// the IDE fully functional without OpenCode.
#[async_trait]
pub trait AssistantService: Send + Sync {
    async fn status(&self) -> AssistantStatus;
    async fn create_session(&self, workspace: WorkspaceId, root: &Path) -> Result<AssistantSession, AssistantError>;
    async fn prompt(&self, session: &AssistantSessionId, prompt: AssistantPrompt) -> Result<(), AssistantError>;
    async fn interrupt(&self, session: &AssistantSessionId) -> Result<(), AssistantError>;
    async fn reply_permission(&self, session: &AssistantSessionId, request: &PermissionRequestId, reply: PermissionReply) -> Result<(), AssistantError>;
    async fn diff(&self, session: &AssistantSessionId, turn: Option<TurnId>) -> Result<Vec<FileDiff>, AssistantError>;
    async fn revert(&self, session: &AssistantSessionId, turn: TurnId) -> Result<(), AssistantError>;
    fn subscribe(&self) -> AssistantEventStream;
}
```

```rust
/// The only interface exposed to an AI agent. Implemented by the runtime and
/// served through `ide-mcp`; every method returns structured data, never a
/// raw protocol payload. Mutating methods are permission-gated.
#[async_trait]
pub trait IdeToolHost: Send + Sync {
    async fn workspace_info(&self) -> Result<WorkspaceInfo, ToolError>;
    async fn open_editors(&self) -> Result<Vec<EditorInfo>, ToolError>;
    async fn selection(&self, document: &DocumentUri) -> Result<Option<SelectionInfo>, ToolError>;
    async fn diagnostics(&self, req: DiagnosticsQuery) -> Result<Vec<Diagnostic>, ToolError>;
    async fn gradle_model(&self) -> Result<BuildSnapshot, ToolError>;
    async fn run_gradle_task(&self, req: RunTaskRequest) -> Result<TaskResult, ToolError>;
    async fn test_results(&self, req: TestQuery) -> Result<Vec<TestRun>, ToolError>;
    async fn open_location(&self, location: Location) -> Result<(), ToolError>;
}
```

**Port design rules**

- All methods are cancellation-safe. Long operations accept a
  `CancellationToken` or return a handle with `cancel`.
- Errors are typed per capability and carry a user-facing message plus a
  machine-readable code. No `anyhow` in port signatures.
- Ports do not expose `serde_json::Value`, `lsp_types`, Gradle classes, or
  OpenCode schemas.
- Add a method only when a use case needs it. Do not mirror an entire external
  API.

## 5. Application layer and UI boundary

`ide-app` contains use cases, not a god object:

- `OpenWorkspace`, `CloseWorkspace`, `TrustWorkspace`
- `OpenDocument`, `ChangeDocument`, `SaveDocument`, `ReloadDocument`
- `RequestCompletion`, `RequestHover`, `ApplyCodeAction`, `RenameSymbol`
- `SyncBuild`, `RunTask`, `RunApplication`, `RunTests`, `StartDebug`
- `CreateAssistantSession`, `SendAssistantPrompt`, `ApprovePermission`,
  `ShowAssistantDiff`, `RevertAssistantTurn`
- `UpdateSettings`, `RevealInExplorer`, `OpenLocation`

Commands are serializable requests. Events are immutable facts. Both are
defined in `ide-ui-api`, not in `ide-domain` (the domain may reuse the same
structs, but UI compatibility is an explicit boundary).

```rust
/// Every UI request carries a client-generated id so the UI can correlate a
/// response with its optimistic update. The protocol version is checked at
/// startup and on every reconnect.
pub struct Envelope<T> {
    pub protocol: u16,
    pub request_id: RequestId,
    pub payload: T,
}
```

- The UI never calls `workspace/executeCommand`, `java.projectConfiguration.update`,
  `/api/session/...`, or DAP directly.
- The UI may optimistically update local text, but the Rust document store is
  authoritative after the next event.
- Events are coalesced and versioned. A stale response (document version or
  generation mismatch) is dropped, not applied.
- TypeScript types are generated from `ide-ui-api` with `ts-rs`; CI fails if
  `ui/src/generated/` is stale.

## 6. Concurrency and lifecycle

- One Tokio runtime for backend work. UI thread(s) never block on backend I/O.
- One actor owns each mutable state machine:
  - `WorkspaceActor`: document store, file tree, watchers, save queue.
  - `JdtlsActor`: process, LSP client, lifecycle, restart generation.
  - `GradleActor`: sidecar connection, sync/task queue, cancellation.
  - `DebugActor`: one per debug session.
  - `AssistantActor`: OpenCode service connection, event fan-out, permission
    inbox.
- Actors communicate through bounded channels and typed messages. No mutex is
  held across `.await`.
- **Cancellation:** every request has a `CancellationToken`; LSP sends
  `$/cancelRequest`, Gradle uses `CancellationTokenSource`, OpenCode uses
  `AbortSignal` equivalent (drop the HTTP body/request).
- **Staleness:** document versions guard edits and diagnostics; request
  generations guard completion/hover.
- **Backpressure:** debounce document changes (16–50 ms), coalesce watcher
  events (300–500 ms), cap completion/diagnostic queues, drop outdated hover.
- **Crash policy:** supervisors restart jdtls with backoff, replay `didOpen`
  and workspace folders, and mark diagnostics stale. The Gradle sidecar is
  restarted on demand. OpenCode service failures degrade the assistant panel
  without affecting editing.
- **Shutdown:** LSP `shutdown`/`exit`, Gradle disconnect (do not kill the
  shared daemon), OpenCode WebSocket/SSE close, then kill owned process
  groups after a timeout.

## 7. Key data flows

### 7.1 Open a Gradle workspace

```text
UI: OpenWorkspace(path)
  → App: canonicalize, load settings, trust prompt
  → WorkspaceActor: index files, start watchers, create doc store
  → Runtime: JdtlsActor.start(workspaceFolders)
  → Runtime: GradleActor.start(root) + sync
  → JdtlsActor: initialize, wait ServiceReady
  → GradleActor: import models, publish BuildSnapshot
  → App: correlate Java projects ↔ Gradle projects
  → JdtlsActor: trigger projectConfiguration.update if needed
  → UI: progress, problems, project tree, status bar
```

OpenCode is not started here. It starts lazily when the assistant panel or an
AI command is used, unless the user has disabled it.

### 7.2 Edit and save

```text
UI: ChangeDocument(version, bytes)
  → WorkspaceActor: apply to rope, update line index, mark dirty
  → JdtlsActor: didChange (incremental, UTF-16 ranges)
  → jdtls: diagnostics/code lenses (async)
  → UI: render diagnostics for the latest version only
UI: Save
  → WorkspaceActor: atomic write (temp + fsync + rename)
  → JdtlsActor: didSave
  → GradleActor: notify build-file watcher if applicable
  → OpenCode: external-change watcher updates any open buffers
```

### 7.3 AI turn

```text
UI: SendAssistantPrompt(session, text, context request)
  → App: ensure workspace trusted; autosave/prepare buffers
  → Context: collect selection/diagnostics/project/build/test data
  → AssistantActor: POST /api/session/{id}/prompt with attachments
  → OpenCode service: agent loop
  → SSE events → AssistantActor → UI: stream text/tool calls
  → MCP tool calls → IdeToolHost → jdtls/Gradle/workspace
  → Permission events → UI modal → POST /permission/{id}/reply
  → Agent edits files on disk → watcher reloads -> diff view
  → UI: fetch /api/session/{id}/diff; accept or revert
```

## 8. Persistence

```text
$XDG_DATA_HOME/javaide/                  (Linux; equivalents on macOS/Windows)
  runtimes/jdk-21.0.x/                   provisioned runtime for jdtls
  jdtls/1.61.0/                          pinned server + extension bundles
  workspaces/<slug>-<hash>/
    state.json                           schema-versioned UI/session state
    jdtls-data/                          jdtls -data directory
    gradle/model.json                    last good Gradle model
    assistant.json                       OpenCode session IDs + UI state
    logs/                                rotated logs
    cache/                               source/classpath caches
  downloads/                             verified archives

$XDG_CONFIG_HOME/javaide/
  settings.toml                          user settings
  keybindings.toml
  trust.json                             trusted workspace keys
```

- Project-local `.javaide/settings.toml` and `.javaide/launch.json` are
  optional and committed by the user.
- Never use the project root as the jdtls `-data` directory.
- Write state atomically. Keep a `.bak` of the previous settings file.
- Schema version every persisted document; migrations live in `ide-config`.
- OpenCode owns its own database/logs/service files. The IDE only stores
  session IDs and UI preferences; it never edits OpenCode's database.

## 9. Errors, logging, observability

- Per-crate `thiserror` enums. `anyhow` only in binaries/`xtask`.
- User-facing errors have `title`, `detail`, `actions`, and a stable code.
- Every long-running operation has a `tracing` span with workspace/project/
  document IDs. Never log full file contents, prompts, tokens, or env values.
- LSP/DAP/OpenCode wire logs are opt-in and redacted. Keep a ring buffer for
  bug reports.
- Health model: `Starting → Ready → Degraded → Stopped/Failed`, surfaced in the
  status bar with a details popover.
- Collect no telemetry by default. Crash reports are local unless the user
  explicitly exports them.

## 10. Security and trust

- **Workspace trust** gates: jdtls import (Gradle scripts execute code), Gradle
  tasks, test/debug launches, terminals, and OpenCode. Restricted mode is a
  syntax-highlighted editor only.
- **OpenCode permissions** are separate from IDE trust. The IDE renders and
  replies to permission requests; it never silently chooses “always”.
- **Agent edits** are external writes. Warn/autosave dirty buffers before a
  prompt; detect conflicts; provide session diff/revert.
- **Context redaction** is the IDE's responsibility: `.env`, credential files,
  and user-defined patterns are omitted unless explicitly attached.
- **No shell interpolation.** Spawn processes with argument arrays, explicit
  cwd/env, and process-group cleanup on Unix/Job Objects on Windows.
- **Local service security:** OpenCode binds to loopback; use the service's
  auth headers; never expose its port. MCP WebSocket is authenticated by the
  OpenCode connection and scoped to one location.
- **Supply chain:** lockfiles, checksums for downloaded jdtls/JDK, `cargo-deny`,
  SBOM, signed installers, third-party notices.

## 11. How to add a feature (checklist)

1. Write the use case and the domain type/port. If an existing port grows
   awkwardly, discuss splitting it before adding a method.
2. Add the adapter mapping and a contract test. Record real protocol traffic
   into `fixtures/traces/` when possible.
3. Add the app command/event and the UI DTO. Regenerate TypeScript bindings.
4. Implement the UI without protocol knowledge.
5. Add failure, cancellation, and stale-response tests.
6. Document the public API with rustdoc, update the relevant doc, and add an
   ADR if the change alters a boundary or ownership rule.
7. Update the architecture allowlist if a new crate edge is introduced.

## 12. Open architectural questions

- Does OpenCode's Java LSP need to be disabled to avoid a second jdtls? Decide
  in Phase 0 and record it in `OPENCODE.md`.
- Should agent edits eventually be routed through IDE tools to preserve undo?
  Defer until disk-edit + diff/revert is measured in real use.
- Do we need a local symbol/text index beyond jdtls and ripgrep? Measure first.
- Is a second Gradle daemon (jdtls Buildship + sidecar) acceptable on 8 GB
  machines? Add memory guardrails and a “low memory” profile if needed.
