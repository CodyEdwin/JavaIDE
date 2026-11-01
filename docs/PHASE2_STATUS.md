# Phase 2 status

- **Last updated:** 2026-11-01
- **Phase goal:** the jdtls adapter is feature-complete for v1 and robust
  against real projects
  ([ROADMAP.md](ROADMAP.md#5-phase-2--complete-java-intelligence-46-weeks)).
- **Overall:** in progress. The navigation and refactor surface that a daily
  edit loop needs is implemented and checked against a real jdtls. The rest of
  the matrix (semantic tokens, hierarchies, code lens, multi-root import,
  OpenCode permissions) is not.

`ide-ui-api` and generated TypeScript bindings are a Phase 1 boundary that
this phase does not require. Command structs still live in the desktop shell.

## Done

| Feature | LSP surface | Where |
| --- | --- | --- |
| Signature help | `textDocument/signatureHelp` | Tooltip after `(` or `,`; `java.signatureHelp.enabled` is sent explicitly because jdtls otherwise returns an empty signature list |
| Find references | `textDocument/references` | `Shift+F12`, Java panel |
| Go to implementation | `textDocument/implementation` | Command palette |
| Go to type definition | `textDocument/typeDefinition` | Command palette |
| Rename | `prepareRename` + `rename` | `F2`. Edits apply to open buffers as one undo step per file. Files that are not open are loaded and marked dirty; nothing is written until save |
| Code actions | `textDocument/codeAction` + `codeAction/resolve` | `Ctrl/Cmd+.`. Quick fix, refactor, and source kinds are advertised. Disabled actions and command-only actions are shown but not applied |
| Document symbols | `textDocument/documentSymbol` | Command palette **Java: Go to Symbol** |
| Workspace symbols | `workspace/symbol` | Adapter API `java_workspace_symbols` |
| Range formatting | `textDocument/rangeFormatting` | Adapter API |
| First-launch jdtls | pinned snapshot `1.64.0-202610301801`, SHA-256 checked, extracted under the data directory | `ide-jdtls::ensure_jdtls` |

The pinned snapshot's OSGi bundles require **JDK 25**. The shell picks the newest JDK it can find (21 or newer) so a JDK 25 install wins over an older `JAVA_HOME`. Settings sent to jdtls include `java.import.generatesMetadataFilesAtProjectRoot: false` so a normal import does not drop `.project` / `.classpath` into the workspace.

## Verified live

`cargo test -p ide-jdtls --test live_server -- --ignored` against jdtls
1.64.0-202610301801 on OpenJDK 25.0.4. The fixture is copied into a temporary
plain Java project (the test's `.project` file is not written into the
repository). The run checks clean diagnostics, hover, completion, definition,
formatting, organize imports, signature help on `add(`, references, the
outline, rename of `add` to `sum`, and a code action on a file with a missing
semicolon.

## Still ahead

- Semantic tokens, inlay hints, folding ranges, selection ranges, call
  hierarchy, type hierarchy, and code lens.
- Decompiled `jdt://` documents and source-attachment navigation.
- `workspace/applyEdit` still writes through the Phase 0 disk path and does
  not yet reject a stale document version. Editor-initiated rename and code
  actions apply to buffers instead.
- Multi-root workspaces, broken-build import UX, and Unicode/CRLF fixtures
  beyond the existing adapter tests.
- OpenCode context bundle, permission replies, and reconnect rehydration.
- `ide-ui-api` / `ts-rs` bindings.
