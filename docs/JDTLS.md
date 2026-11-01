# jdtls Integration

`ide-jdtls` is the only crate that knows jdtls exists. Everything above it sees
`LanguageService` and Java domain models. This document is the adapter contract.

## 1. Ownership and non-goals

**jdtls owns**

- Java parsing, indexing, type resolution, diagnostics, completion, hover,
  signature help, semantic tokens, folding, selection ranges.
- Navigation: definitions, declarations, type definitions, implementations,
  references, document/workspace symbols, call/type hierarchy.
- Refactoring and source actions, rename, formatting, organize imports, code
  lenses, inlay hints.
- The Java project model and compile classpath (through Buildship for Gradle).
- Compilation and incremental build status for open projects.

**The IDE owns**

- The editor buffer, document versions, undo/redo, save policy.
- Applying `WorkspaceEdit`s atomically to the correct document versions.
- Presenting progress, errors, and restart controls.
- Mapping jdtls settings to user-facing settings.
- Context provided to OpenCode; jdtls does not know about the assistant.

**Not allowed:** reimplementing javac diagnostics from a second parser. Tree-
sitter is for syntax highlighting/folding only; it must not compete with jdtls
for semantic results.

## 2. Version and runtime matrix

| Component | Requirement | Policy |
| --- | --- | --- |
| jdtls runtime | **JDK 25** for the pinned 1.64 snapshot (JDK 21+ is the older floor) | The shell prefers the newest discovered JDK so a JDK 25 install is used when both 21 and 25 exist |
| Java source levels | Java 8–25 (current jdtls feature set) | Project JDKs are independent of the server runtime |
| jdtls build | Pin one tested milestone (e.g. `1.61.x`) | Never auto-upgrade silently; show changelog and test before bumping |
| Gradle (Buildship) | Gradle 8.5–9.x recommended | Test 8.x and 9.x; see compatibility notes below |
| Platform | Linux x86_64/aarch64, macOS x86_64/aarch64, Windows x86_64 | Config directory differs per platform |

Pin exact versions in `ide-jdtls/src/versions.rs` and in the packaging manifest.
CI downloads the same artifacts by checksum.

## 3. Provisioning

```text
$XDG_DATA_HOME/javaide/
  jdtls/1.61.0/
    plugins/org.eclipse.equinox.launcher_*.jar
    config_linux/  config_mac/  config_win/
    extensions/com.microsoft.java.debug.plugin-*.jar
    extensions/com.microsoft.java.test.plugin-*.jar
  runtimes/jdk-21.0.x/
```

- Download from the official Eclipse milestone/snapshot URL, verify SHA-256,
  extract atomically, and write a completion marker.
- Bundle the jdtls archive in release builds; allow a local override for
  development.
- The `-configuration` directory must be writable. Use a copy under the
  workspace/cache, not a read-only installation directory.
- `-data` must be unique per workspace and must never be the project root.
- Pass extension bundles through `initializationOptions.bundles`:
  - `com.microsoft.java.debug.plugin-*.jar` (java-debug, EPL-1.0)
  - `com.microsoft.java.test.plugin-*.jar` (java-test, MIT) when test
    integration is enabled
- Keep third-party notices and source links in `THIRD_PARTY_NOTICES.md`.

## 4. Launch

The launcher is a typed argument builder, never a shell string.

```text
<jdk21>/bin/java
  -Declipse.application=org.eclipse.jdt.ls.core.id1
  -Dosgi.bundles.defaultStartLevel=4
  -Declipse.product=org.eclipse.jdt.ls.core.product
  -Dlog.level=INFO
  -Xms256m
  -Xmx<computed>m
  --add-modules=ALL-SYSTEM
  --add-opens java.base/java.util=ALL-UNNAMED
  --add-opens java.base/java.lang=ALL-UNNAMED
  -jar <jdtls>/plugins/org.eclipse.equinox.launcher_<version>.jar
  -configuration <writable-config-dir>
  -data <workspace-data-dir>
```

Rules:

- Set `JAVA_HOME` to the jdtls runtime for the child process.
- Capture stdout as protocol only. Log stderr and jdtls workspace logs to
  rotating files. If a stray non-protocol line appears on stdout, log it and
  fail the handshake with diagnostics rather than corrupting the stream.
- Heap default: 1–2 GB, scaled from available RAM. Allow `java.jdt.ls.vmargs`
  overrides.
- Spawn in its own process group (Unix) / Job Object (Windows) so a crash or
  app exit cannot orphan the server.
- Do not run `java` from `PATH` without verifying the version; prefer the
  provisioned runtime.

## 5. Lifecycle

```text
Stopped
  → Starting (process spawned)
  → Initializing (initialize request sent)
  → Indexing (ServiceReady + project import progress)
  → Ready
  → Degraded (build errors / partial import / worker failure)
  → Stopping (shutdown/exit)
  → Stopped

Any state ──crash/timeout──► Failed ──backoff──► Starting
```

- `initialize` includes workspace folders, client capabilities, and
  `initializationOptions`.
- Wait for `language/status` with `ServiceReady` before treating the server as
  ready. Project import continues after that; expose it as progress, not as a
  blocking modal.
- Health checks: process alive, JSON-RPC responsive (`workspace/symbol` or a
  cheap custom command), and event-loop progress. Do not poll aggressively.
- Restart policy: exponential backoff (1 s, 2 s, 5 s, 10 s, max 30 s), max 3
  automatic attempts; then surface “Restart Java Language Server”.
- On restart, replay `didOpen` for all open documents and workspace folders.
  Re-request diagnostics; discard all in-flight responses from the old
  generation.
- On shutdown: send `shutdown`, wait briefly, send `exit`, then terminate the
  process group. Never block app exit indefinitely.

## 6. Initialize contract

### 6.1 Client capabilities (minimum)

Advertise only what is implemented and correct:

- `workspace.configuration`, `workspace.workspaceFolders`, `workspace.applyEdit`
- `workspaceEdit.documentChanges`, resource operations, change annotations
- `textDocument.synchronization` (incremental, willSave/willSaveWaitUntil as
  implemented)
- `textDocument.completion` (snippets, resolve support, insert/replace,
  documentation formats)
- `hover`, `signatureHelp`, `definition`, `declaration`, `typeDefinition`,
  `implementation`, `references`
- `documentSymbol` (hierarchical), `workspaceSymbol` (resolve if implemented)
- `rename` (prepare support), `codeAction` (literal + resolve + disabled
  support), `formatting`, `rangeFormatting`, `onTypeFormatting`
- `semanticTokens` (full, delta, range as supported), `inlayHint`,
  `foldingRange`, `selectionRange`, `codeLens` (resolve), `callHierarchy`,
  `typeHierarchy`
- `publishDiagnostics` (version support, related information, tags,
  code descriptions)
- `workspace.didChangeWatchedFiles.dynamicRegistration`,
  `workspace.didChangeConfiguration.dynamicRegistration`
- `window.workDoneProgress`, `window.showMessage`, `window.showDocument`

Do not advertise features just to silence capability checks; jdtls will use
them and corrupt edits if the client is wrong.

### 6.2 Initialization options

```jsonc
{
  "bundles": [
    "/path/to/com.microsoft.java.debug.plugin.jar",
    "/path/to/com.microsoft.java.test.plugin.jar"
  ],
  "workspaceFolders": ["file:///path/to/project"],
  "settings": {
    "java": {
      "home": "/path/to/project-jdk",
      "jdt": { "ls": { "vmargs": "-Xmx2G" } },
      "configuration": {
        "updateBuildConfiguration": "automatic",
        "runtimes": [
          { "name": "JavaSE-21", "path": "/path/to/jdk-21", "default": true }
        ]
      },
      "import": {
        "gradle": {
          "enabled": true,
          "wrapper": { "enabled": true },
          "offline": { "enabled": false }
        },
        "maven": { "enabled": true }
      },
      "import.generatesMetadataFilesAtProjectRoot": false,
      "format": { "enabled": true },
      "saveActions": { "organizeImports": true },
      "edit": { "validateAllOpenBuffersOnChanges": true },
      "references": { "includeDecompiledSources": true },
      "telemetry": { "enabled": false }
    }
  }
}
```

Notes:

- `import.generatesMetadataFilesAtProjectRoot` is a flat key in the Java
  settings object, not nested under `import`. Verify the exact shape against the
  pinned jdtls settings schema; the default is `false`, which keeps
  `.project`, `.classpath`, `.factorypath`, and `.settings/` out of the project
  root.
- `configuration.updateBuildConfiguration`:
  - `automatic` for v1, with debouncing.
  - Move to `disabled` + explicit `java.projectConfiguration.update` if
    automatic imports race with the Gradle sidecar or cause loops.
- Populate `configuration.runtimes` from JDK discovery so jdtls can honor
  project toolchains. Do not pick one global JDK for every project.
- Keep `java.telemetry.enabled=false` and do not send usage data.

## 7. Settings mapping

User settings are ours; we map them to jdtls JSON. A non-exhaustive mapping:

| IDE setting | jdtls key | Notes |
| --- | --- | --- |
| `java.jdk.server` | process `JAVA_HOME` | jdtls runtime only |
| `java.jdk.project` | `java.configuration.runtimes` | detected JDKs; project prefers toolchain |
| `java.import.gradle.enabled` | `java.import.gradle.enabled` | default true |
| `java.import.gradle.wrapper` | `java.import.gradle.wrapper.enabled` | default true; checksum verification |
| `java.import.gradle.offline` | `java.import.gradle.offline.enabled` | mirrors Gradle setting |
| `java.import.gradle.args` | `java.import.gradle.arguments` | array, no shell |
| `java.import.gradle.jvmArgs` | `java.import.gradle.jvmArguments` | optional |
| `java.import.gradle.version` | `java.import.gradle.version` | only if wrapper absent |
| `java.updateBuildConfiguration` | `java.configuration.updateBuildConfiguration` | automatic/disabled |
| `java.format.enabled` | `java.format.enabled` | |
| `java.format.settings` | `java.format.settings.url` | Eclipse formatter XML |
| `java.saveActions.organizeImports` | `java.saveActions.organizeImports` | |
| `java.completion.favorites` | `java.completion.favoriteStaticMembers` | |
| `java.completion.importOrder` | `java.completion.importOrder` | |
| `java.inlayHints.parameterNames` | `java.inlayHints.parameterNames.enabled` | none/literals/all |
| `java.references.decompiled` | `java.references.includeDecompiledSources` | |
| `java.metadata.atProjectRoot` | `java.import.generatesMetadataFilesAtProjectRoot` | default false |
| `java.lombok.enabled` | bundle + lombok jar | optional; test before enabling |

Rules:

- Maintain one typed `JavaSettings` struct in `ide-config`. Serialize it to the
  jdtls shape in one place.
- Respond to `workspace/configuration` by **section**, returning the exact
  object jdtls asks for. Never return the whole settings tree blindly.
- After a settings change, send `workspace/didChangeConfiguration` and, if a
  restart is required, tell the user which settings need it.
- Version the mapping. A jdtls upgrade can rename keys; contract tests should
  catch it.

## 8. Project import and Gradle

jdtls imports workspace folders automatically. For Gradle projects, Buildship
executes the wrapper, resolves configurations, and publishes the Eclipse
project model. The IDE must not construct a competing compile classpath for
language features.

Recommended flow:

1. Detect `settings.gradle(.kts)`, `build.gradle(.kts)`, and
   `gradle/wrapper/gradle-wrapper.properties`.
2. Start jdtls with workspace folders and Gradle import enabled.
3. Show `language/status` and `$/progress` as “Importing Gradle project…”.
4. On completion, read project information through jdtls commands/model (for
   example `java.project.getAll`) and correlate with the Gradle sidecar model
   by canonical root and project path.
5. If the build file changes, debounce, run a sidecar sync, then trigger a
   jdtls reimport with `java.projectConfiguration.update` (or let jdtls's file
   watcher do it, with a single-flight guard).
6. Surface import failures from both jdtls/Buildship and the sidecar, but mark
   the source. Do not show duplicate errors without context.

Known Gradle compatibility issue to test: recent Gradle 9 releases can reject
old jdtls annotation-processing init scripts during import. Pin a jdtls build
that contains the fix, keep annotation-processing support configurable, and add
a Gradle 9 fixture to the nightly matrix. If a project is blocked, fall back to
disabling Gradle annotation processing for that import and tell the user.

## 9. LSP features and jdtls specifics

### 9.1 Document synchronization

- Use incremental sync. jdtls supports it; the editor's rope makes range edits
  cheap.
- LSP positions are UTF-16 code units. Convert from the editor's UTF-8 byte
  offsets using the current `LineIndex` and the negotiated position encoding.
  Recompute on every content change.
- Send `didOpen` only once per document; `didChange` with monotonically
  increasing versions; `didClose` when the last editor for a document closes
  (or when the file is deleted).
- `didSave` must not include text unless the server asks; jdtls compiles from
  its own copy.
- On restart, resend `didOpen` for every open document.

### 9.2 Applying edits

`workspace/applyEdit` is a server→client request. This is the most dangerous
code path in the adapter.

1. Decode `WorkspaceEdit` (document changes or plain changes).
2. Validate every URI is inside the workspace (or explicitly allowed).
3. Group edits per document; sort descending by range; reject overlaps.
4. Read the current document version. If the edit carries a version and it does
   not match, reject with a clear error instead of applying to stale text.
5. Apply atomically in the workspace actor, preserving undo grouping.
6. Notify jdtls of the resulting content changes as normal edits (or use
   `didChange` versions). Avoid feedback loops.
7. Return `{ applied: true }`; on failure return `{ applied: false, failureReason }`
   and show a notification with “Retry / Open diff”.

Use the same pipeline for code actions, rename, formatting, organize imports,
and AI-proposed workspace edits (if we add them later).

### 9.3 Custom protocol

In addition to standard LSP, implement the pinned jdtls extensions:

| Method | Direction | Purpose |
| --- | --- | --- |
| `language/status` | server → client | `Starting`, `ServiceReady`, `ProjectStatus`, errors, messages |
| `language/actionableNotification` | server → client | Message with client-executed commands |
| `java/projectConfigurationUpdate` | client → server | Force project/classpath refresh |
| `java/classFileContents` | custom | Retrieve class/decompiled source contents; verify direction against the pinned vscode-java client |
| `java/classFileContents`-related navigation | both | Open source attachments/decompiled classes |
| `workspace/applyEdit` | server → client | Apply refactorings/formatting |
| `window/workDoneProgress/create` | server → client | Progress tokens |
| `client/registerCapability` / `unregisterCapability` | server → client | Dynamic watchers, semantic tokens, etc. |
| `workspace/configuration` | server → client | Sectioned settings |
| `window/showMessageRequest` / `showDocument` | server → client | User decisions and navigation |
| `workspace/semanticTokens/refresh`, `codeLens/refresh`, `inlayHint/refresh`, `diagnostic/refresh` | server → client | Invalidate caches |

Commands worth wrapping (verify exact names/payloads against the pinned
jdtls and vscode-java source before shipping):

- `java.projectConfiguration.update` — reload project configuration.
- `java.project.refreshDiagnostics` — refresh diagnostics for a file/project.
- `java.project.getAll` / `java.project.getSettings` — project introspection.
- `java.edit.organizeImports` — organize imports (prefer the code action path
  for undo integration).
- `java.edit.stringFormatting` — format on type/paste.
- `java.navigate.resolveTypeHierarchy` / type hierarchy commands.
- `vscode.java.startDebugSession` — start the java-debug DAP adapter; returns a
  port. Provided by the java-debug extension bundle.
- `vscode.java.resolveMainClass`, `vscode.java.resolveClasspath`,
  `vscode.java.buildWorkspace` — provided by java-debug; use only as fallbacks
  when the Gradle model is unavailable.

Do not expose raw command names in the UI; wrap them in typed app commands.

### 9.4 Feature mapping

| IDE feature | LSP/jdtls surface | Notes |
| --- | --- | --- |
| Problems | `textDocument/publishDiagnostics` | Keep per-document versions; clear on close only when appropriate |
| Completion | `textDocument/completion` + `completionItem/resolve` | Debounce; cancel stale; support snippet edits |
| Hover | `textDocument/hover` | Render Markdown javadoc; handle `java/classFileContents` links |
| Signature help | `textDocument/signatureHelp` | Retrigger on `(` and `,` |
| Go to definition/declaration/type | `textDocument/definition` etc. | Locations may be in jars; open decompiled/source view |
| Find references | `textDocument/references` | Stream progress for large results |
| Rename | `prepareRename` + `rename` | Preview diff; apply atomically |
| Code actions | `textDocument/codeAction` + `resolve` | Separate quick fixes, refactors, source actions |
| Format | `textDocument/formatting`, `rangeFormatting` | Format-on-save option |
| Organize imports | Code action or jdtls command | Prefer code action for versioned edits |
| Symbols | `documentSymbol`, `workspace/symbol` | Hierarchical outline and quick open |
| Semantic tokens | `semanticTokens/full|delta|range` | Overlay on tree-sitter highlighting |
| Inlay hints | `textDocument/inlayHint` | Parameter names; toggle per workspace |
| Folding | `textDocument/foldingRange` | Merge with syntax folds |
| Selection range | `textDocument/selectionRange` | Expand/shrink selection |
| Call hierarchy | `callHierarchy/*` | Lazy tree, cancellable |
| Type hierarchy | `typeHierarchy/*` | Lazy tree |
| Code lens | `textDocument/codeLens` + resolve | Run/debug/test/references lenses |
| Save actions | `willSaveWaitUntil`/code actions | Keep consistent with jdtls settings |
| Decompiled sources | jdtls class contents/source attachment | Read-only virtual documents |

## 10. Diagnostics and correctness

- Publish diagnostics only for the document version they correspond to. If a
  newer edit exists, keep the old list visible but mark it stale or drop it
  according to the configured UX.
- `source == "Java"` is jdtls; do not assume it is the only source.
- Map diagnostic tags (`Unnecessary`, `Deprecated`) and code descriptions.
- Build errors may be project-level (`language/status`/`java/buildServer`
  style events) as well as file-level. The Problems panel needs a project
  section.
- On file close, jdtls may keep diagnostics for the project. Do not delete
  project diagnostics just because the editor closed.

## 11. Failure handling

| Failure | Behavior |
| --- | --- |
| Launch failure (bad JDK, missing jar) | Show actionable error with paths and logs; offer “Choose JDK” / “Reinstall jdtls” |
| Initialize timeout | Kill process group, capture logs, retry once, then degraded mode |
| Crash mid-session | Auto-restart with backoff; replay docs/folders; mark diagnostics stale |
| Import failure | Keep the last good project model; show build error with source (jdtls/Gradle); offer retry |
| ApplyEdit conflict | Reject; show diff; never overwrite newer text |
| Out of memory | Restart with larger heap if user allows; surface `-Xmx` setting |
| Workspace deleted/moved | Stop server, clean stale data dir, prompt to reopen |

## 12. Testing

- **Unit:** settings serialization, URI/path mapping, position conversion,
  lifecycle state machine, apply-edit validation/ordering.
- **Golden traces:** recorded initialize/status/applyEdit sequences replayed
  against the client.
- **Integration:** real jdtls against fixtures:
  - plain Java folder
  - single-module Gradle
  - multi-module Gradle
  - project with Unicode/CRLF files
  - project with a broken build
- Assertions: ready state, project count, diagnostics, completion item,
  formatting edit, rename across files, restart recovery.
- **Nightly matrix:** JDK 21/25, jdtls pinned, Gradle 8.x/9.x, Linux/macOS/
  Windows. Keep the smoke suite under 10 minutes.
- **Fuzzing:** LSP framing (in `ide-jsonrpc`), JSON-RPC ids, apply-edit ranges.
