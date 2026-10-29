# JavaIDE

A desktop Java IDE with first-class Gradle support, a Rust core, and
[OpenCode V2](https://opencode.ai/v2/docs/) as a first-class collaborator.

The Java intelligence is provided by the
[Eclipse JDT Language Server (jdtls)](https://github.com/eclipse-jdtls/eclipse.jdt.ls).
The IDE does not reimplement javac, a Java parser, or a Gradle build engine.

> **Status: Phase 1 in progress.** The repository contains the design set, the
> Rust/Java integration crates, and a Tauri desktop shell with editor, Gradle,
> Java, and OpenCode panels. jdtls diagnostics, completion, hover,
> go-to-definition, formatting, and organize imports are wired into the shell;
> the remaining Phase 1 checklist is
> tracked in [docs/PHASE1_STATUS.md](docs/PHASE1_STATUS.md).

## Run the desktop shell

```sh
cd sidecar/gradle-bridge && ./gradlew installDist && cd -
cd apps/desktop && npm install && npm run tauri dev
```

The shell opens `fixtures/java-gradle` by default. Use **Open Folder** for
another workspace, or set `JAVAIDE_WORKSPACE=/absolute/path` before launch. The
Gradle bridge is restarted for each workspace, so the panel always describes the
currently open project. Gradle needs a Java 17+ JDK; OpenCode is discovered from
the local V2 service.

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

1. **Phase 0 (2 weeks):** prove jdtls, Gradle Tooling API, and OpenCode V2 from
   Rust; record protocol traces; update ADRs. See
   [ROADMAP.md](docs/ROADMAP.md#3-phase-0--risk-retirement-2-weeks).
2. **Phase 1:** Tauri shell, editor/workspace, basic LSP, OpenCode chat.
3. **Phase 2:** complete jdtls feature surface and OpenCode context/permissions.
4. **Phase 3+:** Gradle depth, run/test, debugger, assistant depth, release.

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
