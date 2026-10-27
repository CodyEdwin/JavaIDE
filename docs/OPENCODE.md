# OpenCode V2 Integration

OpenCode is a first-class collaborator, not a chat sidebar bolted onto an
editor. The IDE must be able to show what the agent is doing, give it accurate
Java/Gradle context, route its tool calls through IDE capabilities, ask the user
for permission, and review or revert its changes.

The integration is deliberately isolated in `ide-opencode` and `ide-mcp` so the
IDE still works when OpenCode is missing, disabled, or broken.

> Source of truth: <https://opencode.ai/v2/docs/> and the live
> `/openapi.json` of the running V2 service. Do not design against V1 APIs.

## 1. Integration choice

**Use the OpenCode V2 HTTP/SSE service, not the embedded TypeScript SDK.**

| Option | Verdict |
| --- | --- |
| HTTP/SSE service + Rust client | **Chosen.** Language-agnostic, shared sessions/auth, service lifecycle is OpenCode's, works with any UI, preserves Rust ownership |
| `@opencode/sdk` embedded in a Node/Bun sidecar | Rejected for v1: adds a second runtime and an IPC hop; useful only for a future fully embedded mode |
| `@opencode/client` in the Tauri frontend | Rejected: duplicates state and ties the assistant to the web UI; an eventual native UI would need a rewrite |
| Shell out to `opencode run` | Rejected: no streaming UI, permissions, tool events, or session control |

The IDE's Rust client is the single source of assistant state. The Tauri UI
talks to Rust through `ide-ui-api`.

## 2. Service lifecycle

OpenCode V2 is client-server. The server owns sessions, providers, plugins,
permissions, and tool execution. Clients connect to it.

### 2.1 Discovery

Standard service registration and state:

```text
~/.local/state/opencode/service.json      # running service registration
~/.config/opencode/service.json           # private service configuration
~/.local/share/opencode/opencode.db       # sessions/history (OpenCode owns it)
~/.local/share/opencode/log/opencode.log  # OpenCode logs
```

Discovered service flow:

1. Read the registration file (path may move; verify in Phase 0).
2. Verify the reported version is V2-compatible (`/api/info`).
3. Connect with the service's authentication context. Never construct an
   unauthenticated URL from a guessed port.
4. Call `GET /api/info`; validate `version`, `pid`, and `urls`.
5. If no compatible service exists, start one using the documented
   `opencode serve --service` flow, or offer “Start OpenCode” to the user.

Use `opencode service status` / `opencode service restart` only for diagnostics.
Do not edit or delete service files or the database.

### 2.2 Modes

| Mode | Behavior |
| --- | --- |
| `SharedService` (default) | Use the user's healthy V2 service; sessions persist across IDE restarts |
| `ManagedServer` (fallback) | Start an IDE-owned `opencode serve` on loopback with a generated password and app-specific data dir; show it clearly |
| `ExternalServer` | Connect to a user-configured URL/token (future/remote) |
| `Disabled` | No assistant UI; all Java/Gradle features remain |

- Prefer the shared service. Do not restart or replace the user's service
  without consent.
- If the installed service is V1 or too old, show a migration/upgrade message;
  do not silently fall back to V1 APIs.
- Bundle the OpenCode binary in a later release phase; for the beta, require a
  user-installed V2 CLI and show the exact version/path.
- One service can host multiple locations; do not spawn one service per
  workspace. Sessions are created with a `location.directory`.

## 3. Rust client

`ide-opencode` owns:

- service registration discovery and health,
- auth headers / connection context,
- a typed HTTP client generated from the V2 OpenAPI snapshot,
- SSE event subscription and normalization,
- session/permission/form/diff orchestration,
- the client-MCP WebSocket connection.

### 3.1 API surface used in v1

| Endpoint | Use |
| --- | --- |
| `GET /api/info` | Health/version |
| `GET /api/agent` | Agent picker |
| `GET /api/model` | Model picker |
| `GET/POST /api/session` | List/create sessions |
| `GET /api/session/{id}/context` | Rehydrate messages after reconnect |
| `POST /api/session/{id}/prompt` | Send text + attachments |
| `POST /api/session/{id}/command` | Invoke a configured OpenCode command |
| `POST /api/session/{id}/interrupt` | Stop button |
| `POST /api/session/{id}/agent` | Switch agent |
| `POST /api/session/{id}/model` | Switch model |
| `POST /api/session/{id}/fork` | Fork a conversation |
| `POST /api/session/{id}/compact` | Compact context |
| `GET /api/session/{id}/diff` | Review turn changes |
| `POST /api/session/{id}/revert/stage` | Stage a revert |
| `DELETE /api/session/{id}/revert` | Clear a staged revert |
| `POST /api/session/{id}/revert/commit` | Commit a revert |
| `GET /api/permission/request` | Pending permission fallback |
| `POST /api/session/{id}/permission/{rid}/reply` | Allow once/always/reject |
| `GET /api/permission/saved` | Saved approval management |
| `GET /api/session/{id}/form` | Agent questions/forms |
| `POST /api/session/{id}/form/{fid}/reply` | Answer a form |
| `GET /api/event` | SSE event stream |
| `GET /api/experimental/client-mcp` | Attach IDE MCP server (WebSocket) |
| `POST /api/experimental/client-mcp/token` | Browser-only ticket; not needed for the native client |

The API is marked experimental in places. Treat the OpenAPI document as a
versioned contract snapshot, not a stable public standard. Isolate all wire
types in `ide-opencode`.

### 3.2 SSE behavior

`GET /api/event` is a live-only stream:

- No replay. A late subscriber sees only future events (plus a connection
  marker).
- A slow consumer can overflow and fail the stream.
- Breaking iteration cancels the subscription.

Therefore:

- On reconnect, resubscribe **and** refetch `/api/session/{id}/context` and
  pending permissions/forms. Do not assume the UI is current.
- Coalesce token deltas and UI updates at 30–60 Hz. Do not render every token.
- Parse `event.type` defensively; unknown event types are logged and ignored.
- Keep a bounded in-memory event log for the active session; never store full
  prompts by default.

## 4. Sessions and UI model

### 4.1 Session binding

- A chat tab maps to one OpenCode session.
- Create with `location: { directory: <workspace root> }` so OpenCode discovers
  the project's `opencode.json`, `.opencode/`, agents, skills, commands, MCP
  servers, and references.
- Persist the mapping in `workspace/assistant.json` (session ID, title, agent,
  model, draft state). OpenCode remains the source of truth for transcript.
- On workspace reopen, list sessions filtered by directory and restore recent
  ones; do not duplicate transcripts.
- Status: `disconnected | connecting | ready | busy | waiting_permission |
  waiting_form | error`. Show it in the status bar and chat header.

### 4.2 Normalized domain model

`ide-domain` exposes IDE-friendly types; raw OpenAPI shapes stay private:

```text
AssistantSession
  id, workspaceID, directory, title, agent, model, status,
  createdAt, lastActivity, tokenUsage, pendingPermissionCount

AssistantEvent
  SessionUpdated | MessageStarted | MessageDelta | ReasoningDelta |
  ToolCallStarted | ToolCallProgress | ToolCallFinished | FileChanged |
  PermissionRequested | PermissionResolved | FormRequested | TurnFinished |
  SessionError | ServiceStateChanged

AssistantPart
  Text | Reasoning | CodeBlock | ToolCall | FileEdit | ShellOutput |
  Permission | Form | Error

PermissionRequest
  id, sessionID, action, resources, save, message, metadata, source

FileDiff
  file, patch, additions, deletions, status
```

- Markdown, code, and tool output are rendered from normalized parts.
- File paths in tool calls are clickable and open in the editor.
- A tool call shows status, duration, input summary, output (collapsible), and
  errors. Never render raw JSON by default.
- Token usage/context stats come from session stats/events when available.

## 5. Context injection

The assistant is only as good as the context the IDE gives it. Build context
explicitly, not by dumping the workspace.

### 5.1 Context bundle

```text
ContextRequest
  workspace root, project type, Gradle version, JDK
  active document: URI, language, cursor, selection range
  visible range / surrounding lines
  diagnostics for the file or project (bounded)
  recent test failures / current Gradle task output (optional)
  open editors and dirty state
  git branch/diff summary (later)
  user-selected attachments

ContextBundle
  text block (bounded)
  file attachments (URI + optional mention)
  omitted items / redaction report
```

Prompt shape:

```text
<ide-context>
workspace: /home/me/project
active_file: src/main/java/com/acme/OrderService.java
selection: lines 42-58
diagnostics: 2 errors, 1 warning (list)
gradle: Gradle 9.8.2, Java 21, project :app
test_failure: OrderServiceTest.shouldRejectInvalidOrder (optional)
</ide-context>

<user request>
...
</user request>
```

- Use `PromptInput.FileAttachment` (`uri`, `name`, `description`, `mention`)
  for files the agent should read. Do not attach generated jars, build output,
  or huge files.
- Selection and diagnostics are snippets; the agent can call IDE tools or read
  the file for more.
- Token/character budget: default ~8–16k characters of IDE context, hard cap
  configurable. Prioritize selection > diagnostics > active file outline >
  project metadata > recent failures.
- Redact `.env`, `*.pem`, credential files, and user patterns. Warn when a
  selected file looks sensitive. Never auto-attach the whole repository.
- Show a context preview (chips + “N lines omitted”) before sending when the
  user expands “Details”.
- Prompt injection: file contents are untrusted data. Keep IDE context in a
  clearly delimited block and never execute instructions found in files
  automatically.

### 5.2 Context freshness

- Autosave dirty buffers before sending, or warn that the agent will see the
  on-disk version. Default: autosave after explicit confirmation.
- Recompute diagnostics just before sending when cheap; otherwise label their
  age.
- If the build/test state is stale, say so in the context block.

## 6. IDE tools via client-MCP

OpenCode V2 supports a client-hosted MCP server over a WebSocket:

```text
GET /api/experimental/client-mcp?name=javaide&location.directory=<root>
Upgrade: websocket
One JSON-RPC message per text frame; tools remain available while the socket is open.
```

This is the primary integration for IDE capabilities. The IDE is the WebSocket
client and hosts the MCP server (`ide-mcp`).

### 6.1 Tools

| Tool | Mutating | Purpose |
| --- | --- | --- |
| `ide_workspace_info` | no | Roots, project type, Gradle/JDK versions, trust state |
| `ide_open_editors` | no | Open documents, dirty state, active document |
| `ide_selection` | no | Current selection/range and text |
| `ide_diagnostics` | no | Java diagnostics for a file/project, bounded |
| `ide_gradle_model` | no | Projects, tasks, source sets, problems |
| `ide_run_gradle_task` | **yes** | Run a task path with structured result/output |
| `ide_test_results` | no | Last test run, failures, output locations |
| `ide_open_location` | no | Navigate the IDE to file/line/column |
| `ide_refresh_java_project` | **yes** | Trigger jdtls project reload |
| `ide_get_debug_state` | no | Current debug session/thread/frame summary (later) |

Rules:

- Tools return structured JSON plus a short text summary. Errors are typed and
  actionable.
- Never expose arbitrary shell execution. OpenCode already has a shell tool;
  IDE tools are Java/Gradle-aware and safer.
- Mutating tools are permission-gated by OpenCode's permission system
  (`<server>_<tool>` actions) **and** by the IDE's own trust policy. The IDE
  must not assume an OpenCode “allow” is sufficient for a destructive action.
- Tool calls have a timeout; long tasks stream progress via MCP progress
  notifications and can be cancelled.
- Tool schemas are versioned; additive changes only within a major version.

### 6.2 Fallback

If client-MCP is unstable:

1. `opencode-plugin/` registers an MCP server via `ctx.mcp.transform` pointing
   at a loopback IDE MCP endpoint with a short-lived token.
2. The plugin can also register Java-specific commands/skills.
3. Keep the same `IdeToolHost` and tool schemas; only the transport changes.

Do not require a plugin for the primary path. Client-MCP keeps setup zero-config
and scopes tools to the workspace connection.

## 7. Permissions and forms

OpenCode decides whether a tool action is allowed, denied, or requires
confirmation, based on ordered rules. The IDE is a first-class permission
client.

### 7.1 Permission flow

```text
OpenCode permission request
  → SSE event / pending list
  → IDE modal or permission inbox
  → user chooses once / always / reject (+ optional message)
  → POST /api/session/{id}/permission/{requestID}/reply
  → OpenCode continues or stops
```

- Show action, affected resources, proposed saved patterns, metadata, and
  source tool.
- “Allow always” saves the patterns OpenCode proposes; explain the scope.
- “Reject” rejects that request and other pending requests in the session, per
  OpenCode semantics. Show the consequence.
- Saved approvals are managed in settings; show project scope and remove
  entries. A configured `deny` can never be overridden by a saved approval.
- If the request is already settled (race), dismiss gracefully.
- If the IDE reconnects, refetch pending permissions; do not lose the inbox.

### 7.2 Forms/questions

- Agent questions/forms arrive via session form endpoints/events.
- Render supported field types (string, number, integer, boolean, multiselect,
  external) with validation.
- Reply with the form ID; handle cancellation/expiry.
- Do not auto-answer. If the user ignores a form, the agent waits.

### 7.3 Trust model

| IDE state | Assistant behavior |
| --- | --- |
| Untrusted workspace | Assistant disabled; no service connection, no tools, no shell |
| Trusted, conservative (default) | Assistant available; OpenCode asks for edits/shell; IDE confirms mutating IDE tools |
| Trusted, autonomous (opt-in) | OpenCode rules may allow more; IDE still blocks secret/out-of-workspace access unless explicitly allowed |

Workspace trust gates the ability of build scripts and agents to execute code.
Do not conflate “the user opened the folder” with “the user trusts the agent to
modify it”.

## 8. Edits, diffs, and revert

v1 policy: OpenCode's native edit/write/patch tools write files on disk; the IDE
treats this as an external change.

Why: agent-native editing is robust, supports multi-file changes, and works
with OpenCode's snapshots. Routing every edit through the IDE is a later
optimization.

### 8.1 Before a turn

- Autosave or warn about dirty buffers.
- Ensure the workspace is trusted.
- If the agent is likely to edit, suggest closing/committing unrelated changes.
- Record the current editor generation.

### 8.2 During/after a turn

- File watcher notices changes; if a document is clean, reload it; if dirty,
  show a conflict dialog (keep mine / load disk / show diff).
- After the turn reaches idle, fetch
  `GET /api/session/{id}/diff?from=<turn>&context=3`.
- Show a review surface: per-file diff, additions/deletions, open in editor.
- “Revert this turn”:
  1. `POST /api/session/{id}/revert/stage` with the turn's message ID.
  2. Review staged file changes.
  3. `POST /api/session/{id}/revert/commit` or `DELETE .../revert`.
- Do not delete files or rewrite unrelated changes outside the staged diff.
- Keep the IDE undo stack separate from agent changes; make the distinction
  visible in the UI.

### 8.3 Later optimization

If disk-edit conflicts are painful, add an `ide_apply_edit` tool and a
first-party plugin that prefers it. That can preserve IDE undo groups and
unsaved buffers, but it must remain compatible with agent-native edits.

## 9. Chat UI

### 9.1 Layout

- Right-side assistant panel, dockable/resizable, with session tabs.
- Header: session title, agent picker, model picker, status, new/fork/compact,
  stop.
- Transcript: user messages, assistant markdown, collapsible reasoning, tool
  cards, file links, diffs, errors, token usage.
- Composer: multiline editor, attachment/context chips, slash-command menu,
  send/queue/steer toggle, stop.
- Permission inbox: badge + modal/side panel; keyboard accessible.
- Diff review: dedicated tab or panel with accept/revert actions.

### 9.2 IDE actions

Provide commands (command palette + context menu + problems/test panels):

- **Explain selection**
- **Fix diagnostic with OpenCode**
- **Refactor selection**
- **Generate tests for this class**
- **Review my changes**
- **Diagnose Gradle failure**
- **Explain test failure**
- **Ask OpenCode about this file**
- **New chat / resume chat**

These compose an `AssistantPrompt` with a context bundle and the appropriate
agent/command. Keep prompt templates in configuration, not hard-coded strings
scattered through the UI.

### 9.3 Session management

- New/resume/fork/compact/export (OpenCode supports export/import).
- Search session history via `GET /api/session` pagination.
- Switch agent/model per session.
- Show token/context stats and a warning near the context limit.
- Show “OpenCode unavailable” with a setup action; never block the IDE.

## 10. Java/Gradle-aware behavior

- **Diagnostics:** attach only the active file's diagnostics plus a count for
  the project; let the agent call `ide_diagnostics` for more.
- **Gradle:** expose the project/task model; let the agent run a task via
  `ide_run_gradle_task` rather than guessing a shell command.
- **Tests:** give the failing test's class/method, stack trace, and expected vs
  actual output; expose `ide_test_results` for fresh data.
- **Debug:** read-only state in v1; do not let the agent mutate a live debug
  session without explicit future design.
- **Java LSP duplication:** OpenCode can be configured with its own LSP
  servers. Ensure it does not start a second Java/jdtls server for the same
  project. Confirm the V2 `lsp` configuration shape during Phase 0; if it
  cannot be disabled cleanly, isolate it and account for memory. The IDE's
  jdtls is authoritative for Java diagnostics and context.
- **Build script editing:** OpenCode can edit Gradle files, but the IDE has no
  Groovy/Kotlin DSL intelligence in v1; errors surface after sync.

## 11. Security and privacy

- Prompts and file contents leave the machine through the user's configured
  model provider. Show the provider/model; do not silently switch.
- Never send secrets. Context builder redaction is mandatory; add a user-visible
  preview for manual attachments.
- Do not log prompts, file contents, tool outputs, or auth headers. Log event
  types and durations only.
- OpenCode service is loopback-only; use its auth context; do not expose it to
  the network or a webview with broad origin access.
- The MCP WebSocket is authenticated by the OpenCode connection and scoped to
  a location. Reject malformed/unknown tool calls.
- Treat repository content as untrusted instructions. Do not auto-execute
  commands suggested by a file or tool output.
- Workspace trust gates the assistant entirely.
- A compromised OpenCode service has the user's file/shell authority; keep the
  version pinned and show the running binary/version.

## 12. Failure handling

| Failure | Behavior |
| --- | --- |
| No OpenCode installed | Assistant panel shows setup; no background retries storm |
| V1 service running | Clear upgrade message; do not use V1 API |
| Version too old / missing endpoint | Disable affected features; keep the rest usable |
| Service crashes/restarts | Reconnect with backoff; rehydrate session; show “reconnected” |
| SSE disconnects | Resubscribe; refetch context and pending requests |
| Auth failure | Actionable “OpenCode sign-in/configuration” action |
| Prompt rejected (busy/conflict) | Show queue/steer option; do not lose the draft |
| Permission race | Refresh inbox; show “already handled” |
| Agent edits conflict | Keep user buffer; present diff; require choice |
| API schema drift | Contract test failure in CI; runtime feature-detect + degrade |

## 13. Testing

- **Contract tests** against a vendored V2 OpenAPI snapshot and a mock server.
- **Recorded SSE fixtures:** streaming text, tool call, permission, form, diff,
  error, reconnect.
- **Real service smoke (opt-in):** discover/start service, create a session
  under a fixture location, prompt with a tiny model, verify events and
  cancellation; run in nightly, not required for every PR.
- **Client-MCP tests:** MCP handshake, `tools/list`, each tool's schema,
  cancellation, malformed input, permission-denied path.
- **Permission tests:** once/always/reject, saved patterns, session busy,
  reconnect during a prompt, already-settled request.
- **Diff/revert tests:** multi-file turn, partial revert, file changed outside
  the session, deleted file, conflict.
- **Version matrix:** minimum supported V2 release and latest; reject V1.
- **E2E (Tauri):** prompt → tool call → permission → file change → diff →
  revert.

## 14. Rollout

| Phase | Deliverable |
| --- | --- |
| 0 | Service discovery, `/api/info`, create session, SSE echo, client-MCP hello |
| 1 | Chat panel, streaming markdown, stop, model/agent picker |
| 2 | Context bundle, file attachments, permissions, forms, session restore |
| 3 | IDE MCP tools, Gradle/test tools, diff/revert |
| 4 | Inline actions, saved approvals, fork/compact/export, reconnect polish |
| 5 | Bundled OpenCode, worktrees, skills/commands, autonomous mode |

OpenCode is available from Phase 1 onward. It is not a “phase 8 feature”; the
context/tool contract shapes the app architecture early.

## 15. Open questions

1. Exact service registration/auth schema and the cleanest Rust discovery
   path; confirm in Phase 0.
2. Can OpenCode's Java LSP be disabled per location without editing user
   config? If not, what is the memory/duplication cost?
3. Is client-MCP stable enough for the beta, or should the first-party plugin
   be the default?
4. Should the IDE bundle OpenCode at launch or require a user-installed V2?
5. Which agents/skills and permission preset ship as the recommended default?
6. Do we expose OpenCode's own terminal/PTY or keep all shells in the IDE
   terminal? (v1: IDE terminal; agent tool output stays in chat.)
