# Architecture Decision Records

An ADR records a decision that is expensive to reverse or that changes a
boundary, ownership rule, persistence format, security posture, or core
dependency. Small refactors do not need one.

## Index

| ADR | Title | Status | Decision |
| --- | --- | --- | --- |
| [0001](0001-ui-stack.md) | UI stack for v1 | Accepted | Tauri 2 + CodeMirror 6; core stays UI-agnostic |
| [0002](0002-gradle-integration.md) | Gradle integration | Accepted | Java Tooling API sidecar; jdtls owns compile classpath |
| [0003](0003-jdtls-source-of-truth.md) | Java semantics | Accepted | jdtls is the source of truth; no Java reimplementation |
| [0004](0004-opencode-integration.md) | OpenCode V2 | Accepted | Local HTTP/SSE service + Rust client + client-MCP |
| [0005](0005-ai-edit-policy.md) | Agent edits | Proposed | Disk writes + watcher + diff/revert |
| [0006](0006-text-model.md) | Text model | Proposed | Rope + UTF-8 byte offsets; convert at boundaries |

Statuses become **Accepted** when the plan is approved and Phase 0 validates
the assumptions. A proposed ADR can be revised before acceptance. Once
accepted, only its status and links change; a reversal requires a new ADR.

## Conventions

- File name: `NNNN-short-title.md`, zero-padded and monotonically increasing.
- Start from [0000-template.md](0000-template.md).
- Keep the decision section short and testable.
- List alternatives seriously; “we didn’t consider anything” is a red flag.
- Record consequences honestly, including the negative ones.
- Add follow-up actions with an owner or phase.
- Link the ADR from the plan, architecture doc, or code where the decision is
  enforced.
- Update the index in the same change.

## When to write one

Write an ADR for:

- a new crate boundary or a dependency edge that violates the current map;
- a new external service, process, protocol, or persisted format;
- a change to workspace trust, permissions, or agent capabilities;
- a change to the text model, document versions, or edit application;
- a dependency that is hard to remove (UI toolkit, database, language server);
- a decision that future maintainers will ask “why on earth?” about.

Do not write one for:

- a local refactor with no boundary change;
- a bug fix;
- a dependency version bump;
- a style change.
