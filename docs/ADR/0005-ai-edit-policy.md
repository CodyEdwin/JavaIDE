# ADR 0005: Agent edits write to disk; the IDE watches, diffs, and reverts

- **Status:** Proposed (pending plan review)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [OPENCODE.md](../OPENCODE.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [ADR 0004](0004-opencode-integration.md)

## Context

OpenCode's native agent tools edit files on disk. The IDE has its own document
store, unsaved buffers, undo stack, and file watcher. These two models must
coexist without losing user work.

Options for agent edits:

1. **Let OpenCode write to disk; the IDE treats it as an external change.**
2. Intercept every edit through a custom IDE tool or virtual filesystem.
3. Require the agent to produce patches that the IDE applies.
4. Give the agent a separate worktree and merge later.
5. Disable agent edits entirely in v1.

## Decision

For v1, **OpenCode writes files on disk**. The IDE:

- autosaves or explicitly warns about dirty buffers before a prompt;
- watches the workspace and reloads clean documents;
- detects conflicts for dirty documents and asks the user to keep the buffer,
  load the disk version, or open a diff — never silently overwrite;
- after a turn, fetches the session diff and presents a review surface;
- supports **stage → review → commit** revert, or clear, without touching
  unrelated changes;
- keeps the IDE undo stack separate from agent edits and makes that distinction
  visible;
- records the editor generation and turn/message ID so stale diffs are not
  applied to newer text;
- never auto-reverts without an explicit user action.

A future `ide_apply_edit` tool plus a first-party plugin may route edits through
the IDE to preserve undo groups and unsaved buffers. That is an optimization,
not a prerequisite, and must remain compatible with native agent edits.

## Why this option

- Works with OpenCode's real tools and multi-file edits.
- Reuses OpenCode's snapshots and revert semantics instead of inventing a
  parallel patch format.
- Avoids blocking the agent on IDE-specific tool support.
- The file watcher and diff/revert surfaces are needed anyway for external
  tools, Git, and build scripts.
- It is honest: the IDE cannot pretend it owns every write.

## Consequences

**Positive**

- Broad compatibility with agents/tools and with edits made outside the IDE.
- Reversible turns via OpenCode's diff/revert endpoints.
- One external-change path for all non-IDE writers.

**Negative**

- Unsaved editor buffers can conflict with agent writes.
- The user may see files change “behind” the editor.
- Revert can fail if the file changed outside the session or the workspace
  moved.
- IDE undo does not undo agent edits; the UI must explain this.
- Watching large workspaces needs debouncing and ignore rules.

## Alternatives considered

| Alternative | Why not for v1 |
| --- | --- |
| Intercept all edits through an IDE tool | Requires a plugin/custom MCP path and cooperation from every agent tool; still needs external-change handling |
| Patch-only edits | Restricts the agent and duplicates OpenCode's edit machinery |
| Virtual filesystem | Large complexity; build/tooling integration would break |
| Agent worktree + merge | Excellent isolation, but worktree lifecycle, merge UX, and Gradle/jdtls state are a separate project; later |
| Disable agent edits | Safe but fails the “first-class collaborator” goal |

## Conflict policy

| Situation | Behavior |
| --- | --- |
| Document clean, disk changed | Reload, preserve cursor where possible, show a subtle “updated by OpenCode” marker |
| Document dirty, disk changed | Block automatic reload; show conflict dialog with keep/load/diff |
| File deleted on disk, buffer dirty | Keep buffer as an orphan; offer save/recreate or close |
| File created on disk | Add to workspace index; open only if the user or agent asks |
| Revert would touch a dirty buffer | Require save/discard/cancel; never discard silently |
| Diff base no longer matches | Show “stale diff”; refetch; do not apply |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Lost unsaved edits | Autosave prompt before sending; conflict dialog; no silent reload |
| Agent edits unrelated files | Diff review per file; revert only the staged turn; warn on out-of-workspace paths |
| Revert deletes user work | Stage → review → commit; show the file list; allow cancel |
| Watcher storms | Debounce/coalesce; ignore build output, `.git`, caches; cap events |
| Large/binary files | Do not auto-open or diff binary files; show a size/type notice |
| Secrets in diffs | Redaction in context; do not log diffs; user-controlled attachment |

## Follow-up

1. Phase 3: prove file watcher → diff → revert on a multi-file agent turn.
2. Measure conflict frequency in real use; decide whether `ide_apply_edit` is
   worth building.
3. Define the UI copy that distinguishes IDE undo from agent revert.
4. Test on Windows file locking and case-insensitive paths.
