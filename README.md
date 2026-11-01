# JavaIDE

A desktop Java IDE with first-class Gradle support, a Rust core, and
[OpenCode V2](https://opencode.ai/v2/docs/) as a first-class collaborator.

The Java intelligence is provided by the
[Eclipse JDT Language Server (jdtls)](https://github.com/eclipse-jdtls/eclipse.jdt.ls).
The IDE does not reimplement javac, a Java parser, or a Gradle build engine.

> **Status: Phase 2 language surface is in place.** Phase 1 editing, trust, and
> Gradle compile/run/test are in place. Phase 2 adds the rest of the jdtls
> navigation and edit matrix (semantic tokens, hierarchies, code lens, inlay
> hints, version-checked workspace edits, multi-root import) and an OpenCode
> permission inbox. The checklist is in
> [docs/PHASE2_STATUS.md](docs/PHASE2_STATUS.md).

## Run the desktop shell

Rust 1.88 is pinned in `rust-toolchain.toml`. You need Node 20+, a JDK 17+
(21 recommended), and on Linux the GTK 3 and WebKitGTK 4.1 development packages.

```sh
cd sidecar/gradle-bridge && ./gradlew installDist && cd -
cd apps/desktop && npm install && npm run tauri dev
```

The shell opens `fixtures/java-gradle` by default. Use **Open Folder** for
another workspace, or set `JAVAIDE_WORKSPACE=/absolute/path` before launch. The
Gradle bridge is restarted for each workspace, so the panel always describes the
currently open project. JDKs are taken from `JAVAIDE_JDTLS_JAVA_HOME`, then
`JAVA_HOME`, then common Temurin paths, then a scan of `/usr/lib/jvm` and
`/Library/Java/JavaVirtualMachines`. Gradle itself still runs on JDK 17+.
OpenCode is discovered from the local V2 service and is optional.

If `JAVAIDE_JDTLS_HOME` is unset, the first Java file in a trusted folder
downloads jdtls `1.64.0-202610301801` (about 48 MB, SHA-256 checked) into the
user data directory. That build needs JDK 25. When none is installed, Linux
x86_64 downloads Temurin `25.0.5+8` (SHA-256 checked) into the data directory;
other platforms ask for `JAVAIDE_JDTLS_JAVA_HOME`. `F2` renames, `Shift+F12`
finds references, and `Ctrl/Cmd+.` lists code actions. Pending OpenCode
permissions show in the OpenCode panel as Once, Always, and Reject.

The first time a folder opens, the banner asks you to trust it. Until you do,
the editor still works, and Gradle, jdtls, and OpenCode stay off. **Compile**,
**Run**, and **Test** invoke the Gradle `compileJava`, `run`, and `test` tasks
for the trusted project. `Ctrl/Cmd+Shift+P` opens the command palette and
`Ctrl/Cmd+P` opens a file. `Ctrl/Cmd+\` splits the editor. Java settings
(format, completion, jdtls VM arguments) are edited from the Java panel and
saved under `$XDG_CONFIG_HOME/javaide/settings.toml`, or in
`<workspace>/.javaide/settings.toml` when the scope is this workspace. VM
arguments apply the next time jdtls starts.

Checks:

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo run -p xtask -- check-architecture
cd sidecar/gradle-bridge && ./gradlew test
cd apps/desktop && npm run build
```

## Product shape

- **Rust owns the hard parts:** process supervision, LSP/DAP clients, the Gradle
  Tooling API bridge, the document model, workspace state, and protocol
  translation.
- **jdtls owns Java semantics:** parsing, indexing, completion, diagnostics,
  refactoring, formatting, and the Java project model.
- **Gradle is split by responsibility:** jdtls/Buildship owns the classpath used
  for Java intelligence; a Java sidecar using the Gradle Tooling API owns task
  execution, build models, dependency views, test discovery/execution, and
  runtime classpaths.
- **OpenCode V2 is a first-class collaborator:** the IDE hosts sessions per chat
  tab, streams events, renders permissions and diffs, and exposes
  Java/Gradle/editor tools to the agent through client-MCP. OpenCode remains
  optional; the IDE is fully usable without it.
- **The UI is replaceable:** the application core exposes a typed
  command/event API. The recommended v1 shell is Tauri 2 + CodeMirror 6; a
  native Rust UI can be added later without touching the core.

## Start here

| Document | What it covers |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Product scope, decisions, risks, milestones |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases, deliverables, exit criteria, timeline |
| [docs/PHASE1_STATUS.md](docs/PHASE1_STATUS.md) | Phase 1 checklist: done, remaining, exit-criteria status |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Crate map, dependency rules, ports, concurrency |
| [docs/JDTLS.md](docs/JDTLS.md) | jdtls provisioning, lifecycle, settings, protocol mapping |
| [docs/GRADLE.md](docs/GRADLE.md) | Gradle sidecar, sync, tasks, tests, compatibility |
| [docs/DEBUG_TEST.md](docs/DEBUG_TEST.md) | DAP debugging, run configurations, test explorer |
| [docs/OPENCODE.md](docs/OPENCODE.md) | OpenCode V2 service, sessions, context, MCP, permissions |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | Modularity, rustdoc/comments, tests, CI, release |
| [docs/ADR/](docs/ADR/README.md) | Architecture decision records |

## Key decisions

| Decision | Choice | ADR |
| --- | --- | --- |
| UI stack | Tauri 2 + CodeMirror 6 for v1; core remains UI-agnostic | [0001](docs/ADR/0001-ui-stack.md) |
| Java intelligence | jdtls as a managed child process | [0003](docs/ADR/0003-jdtls-source-of-truth.md) |
| Gradle | Java Tooling API sidecar; compile classpath stays with jdtls | [0002](docs/ADR/0002-gradle-integration.md) |
| OpenCode | Local V2 HTTP/SSE service + Rust client + client-MCP | [0004](docs/ADR/0004-opencode-integration.md) |
| AI edits | Disk writes by OpenCode; IDE watcher, diff, revert | [0005](docs/ADR/0005-ai-edit-policy.md) |
| Text model | Rope + UTF-8 byte offsets; UTF-16 at protocol boundaries | [0006](docs/ADR/0006-text-model.md) |

The ADRs are **Proposed** until the plan is confirmed and Phase 0 validates the
assumptions. See [ROADMAP.md](docs/ROADMAP.md) for the gates.

## Open decisions

1. **UI stack:** confirm Tauri 2 + CodeMirror 6 versus a native GPUI shell. The
   core is unchanged either way; the schedule and UI adapter differ.
2. **OpenCode distribution:** require a user-installed V2 CLI for the beta, or
   bundle it from the first release?
3. **v1 build-system scope:** Gradle-only build UX, or also a Maven task/test
   runner? (jdtls already provides basic Maven intelligence.)
4. **License:** project license and whether the app is open source.
5. **Minimum OS versions** and Linux ARM64 support at launch.
6. **AI defaults:** bundled agents/skills and the recommended permission preset.

## Near-term plan

1. **Phase 0:** done. jdtls, the Gradle Tooling API sidecar, and OpenCode V2
   are proven from Rust. See [PHASE0_REPORT.md](docs/PHASE0_REPORT.md).
2. **Phase 1:** the shell, editor, basic LSP, trust, settings, command palette,
   and Gradle compile/run/test are in place. See
   [PHASE1_STATUS.md](docs/PHASE1_STATUS.md).
3. **Phase 2:** the jdtls feature matrix, version-checked workspace edits,
   multi-root import, and the OpenCode permission inbox are in the shell.
   Context bundles and forms are not. See
   [PHASE2_STATUS.md](docs/PHASE2_STATUS.md).
4. **Phase 3+:** Gradle depth, run configurations, debugger, assistant depth, release.

## Non-goals for v1

Android development, full Kotlin/Groovy build-script intelligence, remote
development, a plugin marketplace, inline AI completions, profilers, database
tools, and a full Git client. See [docs/PLAN.md](docs/PLAN.md) for the precise
boundary.

## Working name

"JavaIDE" is a placeholder. The name should be chosen before the first public
release; it appears only in user-facing strings and packaging, not in the crate
names (`ide-*`).

## Contributing

Until the Phase 0 skeleton lands, changes should be design/doc changes. After
that, follow [docs/ENGINEERING.md](docs/ENGINEERING.md): small PRs, tests,
rustdoc, architecture checks, and an ADR for any boundary change.
