# ADR 0004: OpenCode V2 integration over the local HTTP/SSE service

- **Status:** Accepted (Phase 0 validated)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [OPENCODE.md](../OPENCODE.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

OpenCode is a first-class function of the IDE, not an optional chat plugin. The
IDE must:

- create and restore sessions scoped to a workspace;
- stream assistant text, reasoning, tool calls, and tool output;
- render and answer permission requests and agent forms;
- show which files a turn changed and support revert;
- give the agent Java/Gradle/editor context;
- expose IDE capabilities as tools;
- remain usable when OpenCode is missing, disabled, or broken.

OpenCode V2 is client-server. A background service owns sessions, providers,
plugins, permissions, and tool execution. Clients connect over an HTTP API with
SSE events. V2 also supports a **client-hosted MCP server over a WebSocket**,
which lets the IDE expose tools without editing OpenCode config.

Options:

1. **Rust client over the local V2 HTTP/SSE service** (chosen).
2. Embed `@opencode/sdk` in a Bun/Node sidecar.
3. Use `@opencode/client` in the Tauri webview.
4. Shell out to `opencode run`.
5. Use the V1 API/server.

## Decision

Use the **OpenCode V2 local HTTP/SSE service** from a Rust client in
`ide-opencode`.

- The Rust client is the single source of assistant state for the IDE. The UI
  talks to Rust through `ide-ui-api`; it never calls OpenCode directly.
- Sessions are created with `location: { directory: <workspace root> }`.
- Stream events with `GET /api/event` (SSE). On reconnect, resubscribe **and**
  refetch `/api/session/{id}/context`, pending permissions, and forms; the
  stream is live-only and has no replay.
- Use the V2 `PromptInput.FileAttachment` shape for files; selection/mention
  ranges are explicit.
- Expose IDE tools through **client-MCP**:
  `GET /api/experimental/client-mcp?name=javaide&location.directory=<root>`,
  upgraded to WebSocket, one JSON-RPC message per text frame.
- Permissions are presented by the IDE and replied to with
  `POST /api/session/{id}/permission/{requestID}/reply`
  (`decision: once | always | reject`, optional message). Never auto-approve.
- Diffs and revert use `/api/session/{id}/diff`, `/revert/stage`,
  `/revert/commit`, and `DELETE /revert`.
- Keep the first-party TypeScript plugin (`opencode-plugin/`) as a fallback for
  client-MCP or for Java-specific commands/skills. It must use the same
  `IdeToolHost` and tool schemas.
- Prefer the user's shared service. If it is missing or incompatible, offer
  `ManagedServer` (IDE-owned `opencode serve` on loopback) or `Disabled`; never
  silently fall back to V1.
- Treat the V2 OpenAPI document as a versioned contract snapshot, not a stable
  public standard. Pin a snapshot, contract-test it, and feature-detect.

## Why this option

- Language-agnostic and UI-independent; the core stays Rust.
- Shares the user's OpenCode service, credentials, plugins, agents, and session
  history instead of creating a parallel installation.
- SSE + HTTP is simple to implement in Rust and easy to test with a mock server.
- Client-MCP is a first-party V2 mechanism, requires no config edits, and scopes
  tools to one location.
- If the UI is replaced, the assistant integration remains.

## Consequences

**Positive**

- One assistant state owner; no duplicate OpenCode client in the webview.
- Works with a user-installed or IDE-managed service.
- Tools are typed and testable; the fallback plugin reuses the same host.
- The IDE can degrade to “assistant unavailable” without affecting editing.

**Negative**

- A service dependency with its own lifecycle, auth, logs, and database.
- The V2 API is partly experimental; endpoints and schemas can change.
- SSE is live-only; reconnect logic must refetch state.
- Client-MCP must be kept compatible; the plugin fallback adds TypeScript work.
- OpenCode may start its own Java LSP, duplicating jdtls memory; this must be
  checked and disabled per location if possible.
- Permissions are security-sensitive; the UI must not make “always” easy to
  click by accident.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| `@opencode/sdk` embedded in Bun | Adds a second runtime, IPC hop, and packaging complexity; useful for a future fully embedded mode, not v1 |
| `@opencode/client` in the frontend | Duplicates state, ties the assistant to the web UI, and would need a rewrite for a native shell |
| `opencode run` CLI | No streaming UI, permissions, tool events, or session control |
| V1 API | Explicitly out of scope; V2 is the source of truth |
| IDE-owned protocol to OpenAI/etc. | Reimplements agents, tools, permissions, and provider auth; not the product |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| V2 API drift | Vendor OpenAPI snapshot; contract tests; feature detection; version range; isolate in `ide-opencode` |
| Service discovery/auth changes | Phase 0 spike; configurable service URL/token; actionable setup UI |
| SSE gaps | Refetch context/permissions/forms on every reconnect; sequence/idle markers |
| Client-MCP instability | Plugin fallback; same tool schemas; runtime feature flag |
| Java LSP duplication | Detect and disable OpenCode's Java LSP per location if supported; otherwise surface memory cost |
| Permission fatigue/unsafe autonomy | Conservative defaults; explicit scopes; saved approvals UI; no auto-approve |
| Secret leakage | Redaction, preview, no prompt/tool logging, loopback only |

## Follow-up

1. Phase 0: discover/start V2, `/api/info`, create session, prompt, SSE, one
   client-MCP tool, one permission reply.
2. Confirm the service registration/auth schema and the cleanest Rust discovery
   path.
3. Confirm how to disable OpenCode's Java LSP per location.
4. Decide whether the beta requires a user-installed V2 CLI or bundles it.
5. Record SSE and MCP traces as fixtures.
