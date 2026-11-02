# Phase 2 status

- **Last updated:** 2026-11-01
- **Phase goal:** the jdtls adapter is feature-complete for v1 and robust
  against real projects
  ([ROADMAP.md](ROADMAP.md#5-phase-2--complete-java-intelligence-46-weeks)).
- **Overall:** the Phase 2 language-server matrix and the OpenCode permission
  inbox are in the shell. A few exit criteria (assistant context bundle,
  forms, broken-build import UX, and the full settings catalog) are still
  ahead and are called out below.

`ide-ui-api` and generated TypeScript bindings are a Phase 1 boundary that
this phase does not require. Command structs still live in the desktop shell.

## Done

| Feature | LSP / API surface | Where |
| --- | --- | --- |
| Signature help | `textDocument/signatureHelp` | Tooltip after `(` or `,`; `java.signatureHelp.enabled` is sent because jdtls otherwise returns an empty list |
| Find references | `textDocument/references` | `Shift+F12`, Java panel |
| Go to implementation | `textDocument/implementation` | Command palette |
| Go to type definition | `textDocument/typeDefinition` | Command palette |
| Rename | `prepareRename` + `rename` | `F2`. Edits apply to open buffers as one undo step per file and are not written until save |
| Code actions | `textDocument/codeAction` + `codeAction/resolve` | `Ctrl/Cmd+.` |
| Document symbols | `textDocument/documentSymbol` | Command palette **Java: Go to Symbol** |
| Workspace symbols | `workspace/symbol` | Adapter API. `jdt://` symbols keep their URI |
| Range formatting | `textDocument/rangeFormatting` | Adapter API |
| Semantic tokens | `textDocument/semanticTokens/full` | Editor marks on Java files |
| Inlay hints | `textDocument/inlayHint` | Parameter-name hints. `java.inlayHints.parameterNames.enabled` is `all` |
| Folding | `textDocument/foldingRange` | Editor fold service |
| Selection ranges | `textDocument/selectionRange` | **Java: Expand Selection** |
| Call hierarchy | `prepareCallHierarchy`, incoming and outgoing calls | Command palette |
| Type hierarchy | `prepareTypeHierarchy`, supertypes and subtypes | Command palette. Responses are decoded from JSON because jdtls sends `tags` as an array and lsp-types 0.97 expects one tag |
| Code lens | `textDocument/codeLens` + `codeLens/resolve` | Java panel. Reference and implementation lenses are enabled in settings |
| Decompiled documents | `java/classFileContents` | Opening a `jdt://` location loads a read-only buffer |
| Multi-root import | `workspace/didChangeWorkspaceFolders` | **Java: Add Workspace Folder**. `workspace/applyEdit` accepts paths under any imported root |
| Versioned workspace edits | `workspace/applyEdit` | The disk writer is gone. Stale versions, overlaps, paths outside the roots, and resource operations are rejected. Accepted edits are applied to buffers |
| First-launch jdtls | pinned snapshot `1.64.0-202610301801`, SHA-256 checked | `ide-jdtls::ensure_jdtls` |
| JDK 25 runtime | Temurin `25.0.5+8` on Linux x86_64 when no JDK 25 is installed | `ide-jdtls::ensure_jdk`. Other platforms get a message naming `JAVAIDE_JDTLS_JAVA_HOME` |
| OpenCode permissions | `GET /api/permission/request`, reply `once` / `always` / `reject` | OpenCode panel inbox. Reconnect refetches context and the inbox |

Settings sent to jdtls include `java.import.generatesMetadataFilesAtProjectRoot: false` so a normal import does not drop `.project` / `.classpath` into the workspace.

## Verified live

`cargo test -p ide-jdtls --test live_server -- --ignored` against jdtls
1.64.0-202610301801 on OpenJDK 25.0.4. The fixture is copied into a temporary
plain Java project. The run checks clean diagnostics, hover, completion,
definition, formatting, organize imports, signature help, references, the
outline, rename, a code action, semantic tokens, inlay hints, folding,
selection ranges, incoming and outgoing calls, supertypes of a local
`implements` type, code lens, adding a workspace folder, and a
`java/classFileContents` request.

On that plain project, go-to-definition of `System` returned no location, so
the decompiled text of the JDK class was not observed. The class-file request
itself completed without a protocol error, and `jdt://` locations are kept
when the server does send them.

## Still ahead

- Assistant context bundle (selection, diagnostics, project metadata) and
  file attachments. The permission inbox is in place; forms and saved-approval
  management are not.
- Broken-build import UX, and a jdtls restart story beyond replaying open
  buffers when the server becomes ready again.
- The rest of the Java settings catalog in [JDTLS.md](JDTLS.md). The shell
  edits format, completion, and VM arguments.
- `ide-domain` and `ide-ui-api` created with typed commands/events; `ts-rs`
  bindings not yet generated.
- Automatic JDK provisioning is Linux x86_64 only.
