# Gradle Integration

Gradle support is split deliberately:

- **jdtls/Buildship** imports the project and owns the Java compile classpath
  used for language features.
- **`gradle-bridge`** (a Java sidecar using the Gradle Tooling API) owns the
  build UX: project/task models, task execution, dependency inspection, test
  execution, and runtime classpaths.

Trying to make one component own both leads to a second, subtly different Java
model. The IDE correlates the two models and shows disagreements instead of
silently picking one.

## 1. Why a sidecar?

The Tooling API is a JVM library, not an HTTP service. A Rust process cannot
link it directly. Alternatives considered:

| Approach | Why not |
| --- | --- |
| Parse `gradle tasks --all` output | Fragile, slow, no structured errors/progress, no dependency model |
| Run Gradle with a custom init script and parse JSON | Better, but still a one-shot CLI; loses Tooling API models, cancellation, test events, daemon reuse |
| Reimplement the Gradle model | Out of scope and guaranteed to diverge |
| **Tooling API sidecar** | Structured, version-aware, daemon-aware, cancellable, supports tests and progress |

The sidecar is a small, stateless-per-request Java process (or a long-lived
process with a project connection) owned by `ide-gradle`. It is not a plugin
inside the user's build and does not write files into the project.

## 2. Sidecar contract

- Java 21 runtime, compiled with `--release 17` for compatibility.
- One persistent process per open root build. It may connect to multiple
  `ProjectConnection`s for included builds, but only one active operation per
  connection. The desktop shell tears the process down when the user opens a
  different workspace; a bridge is never reused for another root.
- JSON-RPC 2.0 over stdio, reusing `ide-jsonrpc` framing. stdout is protocol
  only; logs go to stderr and a file.
- Requests carry a workspace/build ID, a cancellation token, and a timeout.
- Streaming results use notifications:
  - `sync.progress`
  - `task.output`
  - `task.progress`
  - `test.started` / `test.finished` / `test.output`
  - `log`
- Errors carry a code, message, and optional source location:
  ```jsonc
  {
    "code": "gradle.configuration.failed",
    "message": "Could not resolve all dependencies for :app",
    "detail": "...",
    "file": "/path/build.gradle.kts",
    "line": 42,
    "column": 5
  }
  ```

### 2.1 Methods

| Method | Purpose |
| --- | --- |
| `initialize` | Handshake, report sidecar/Tooling API versions |
| `sync` | Build/refresh the model for a root directory |
| `cancel` | Cancel sync/task by request id |
| `runTask` | Execute one or more task paths with args/env/JVM args |
| `resolveClasspath` | Return runtime/test classpath for a project |
| `listTests` | Compile/scan test classes and return the discovered test tree (see [DEBUG_TEST.md](DEBUG_TEST.md) §7.1) |
| `runTests` | Run selected tests; optional debug via a generated `Test` task `debugOptions` init script |
| `dependencyReport` | Resolve a configuration's dependency graph |
| `shutdown` | Close connections and exit |

Use the Tooling API's own cancellation (`CancellationTokenSource`) rather than
killing the daemon. Kill the sidecar only on timeout/hang, then recreate it.

## 3. Model

The sidecar returns a single `BuildSnapshot` per sync:

```text
BuildSnapshot
  root: Path
  gradleVersion: String
  gradleHome: Path
  javaHome: Path
  projects: [BuildProject]
  includedBuilds: [BuildSnapshot]
  problems: [BuildProblem]
  syncedAt: Timestamp

BuildProject
  path: ":app"                  // Gradle project path
  name: "app"
  directory: Path
  description: String?
  buildFile: Path?
  tasks: [Task]
  sourceSets: [SourceSet]
  configurations: [Configuration]
  dependencies: [DependencyEdge]
  javaVersion: String?
  toolchain: String?
  plugins: [String]
  testTasks: [Task]

Task
  path: ":app:test"
  name: "test"
  group: String?
  description: String?
  type: String?
  isTest: bool
  isRun: bool

SourceSet
  name: "main"
  javaDirs: [Path]
  resourceDirs: [Path]
  outputDirs: [Path]
  compileClasspath: [Path]
  runtimeClasspath: [Path]

DependencyEdge
  configuration: "runtimeClasspath"
  group: String?
  module: String?
  version: String?
  resolved: Path?
  requested: String
  conflict: bool
  children: [DependencyEdge]
```

The Rust side maps these to `ide-domain` `BuildProject`, `BuildTask`,
`Classpath`, etc. The JSON DTOs stay inside `ide-gradle`/sidecar.

## 4. Sync algorithm

```text
request sync(root)
  → validate root, detect settings/build files, detect wrapper
  → choose Gradle distribution and Java home
  → connect (Tooling API)
  → phase 1: build structure (settings evaluated)
  → phase 2: project models, tasks, source sets, configurations
  → phase 3: dependency/classpath details (lazy where possible)
  → publish BuildSnapshot + problems
  → cache to workspace data dir
  → return
```

Implementation notes:

- Prefer a custom `BuildAction` that fetches models in one daemon invocation.
  Gradle 9.3+ supports `BuildController.fetch()` for resilient sync and partial
  models; use it when available, with `getModel`/`findModel` fallbacks for
  older Gradle. Gradle 9.4/9.7 changed partial-failure behavior; test both.
- Do not build every configuration eagerly. Start with the project tree, tasks,
  and `main`/`test` source sets; resolve configurations on demand (dependency
  view, run, test).
- Cache the last good snapshot and show it immediately on reopen with a
  “refreshing” indicator. Never block the editor waiting for a cold Gradle sync.
- Serialize syncs. If a build file changes during a sync, mark the snapshot
  dirty and schedule one follow-up sync after the current one finishes.
- Coalesce file watcher events (300–500 ms) for `build.gradle(.kts)`,
  `settings.gradle(.kts)`, `gradle.properties`, version catalogs, and
  `gradle/wrapper/*`.
- Surface partial success: one broken subproject must not hide the rest of the
  tree. Attach problems to the closest project/file.
- Respect `--offline`, proxy settings, and `GRADLE_USER_HOME`. Never inject
  credentials into logs.

## 5. Gradle distribution, JDK, and toolchains

Resolution order for the build distribution:

1. Project wrapper (`gradle/wrapper/gradle-wrapper.properties`).
2. Workspace setting `gradle.distribution` (path to a local distribution).
3. A pinned local Gradle if the user explicitly opts in.
4. Download the wrapper distribution (behind a trust/network confirmation).

Rules:

- Verify wrapper distribution URLs/checksums where possible; warn on plain HTTP.
- If the wrapper is absent, do not silently pick an arbitrary system Gradle.
  Show the detected version and ask.
- Tooling API version must be compatible with the target Gradle. Pin the
  sidecar's Tooling API (for example 9.8.x) and test the supported matrix:
  Gradle **8.5–8.x and 9.x**. Older builds may work but are best effort.
- The sidecar JVM and the Gradle daemon JVM are independent. Use the project's
  Gradle Java home (`org.gradle.java.home`, toolchain, or detected JDK). If the
  project needs JDK 17 and the sidecar runs on 21, that is fine.
- Discover JDKs from `JAVA_HOME`, SDKMAN, asdf/mise, Gradle toolchains,
  `/usr/lib/jvm`, macOS `/Library/Java/JavaVirtualMachines`, and Windows
  registry/`Program Files`. Cache the list with a manual refresh.
- Set `org.gradle.java.installations.paths` for the build if auto-detection
  misses a toolchain.
- Gradle 9 requires Java 17+ to run; Gradle 8.x supports Java 8–21 depending on
  the version. Surface a clear error when the selected JDK is incompatible.

## 6. Task execution

- Use `BuildLauncher` with task paths and arguments. Do not launch a second
  Gradle CLI.
- Stream output and progress events to the UI; keep a bounded ring buffer per
  task and a full log file for long builds.
- Set color output off for parsing, or parse ANSI into styled spans.
- Cancellation: Tooling API token; if the daemon ignores it, offer “Stop build”.
- Environment: inherit plus user overrides; explicit `cwd`; no shell.
- Result: exit code, structured failure, duration, task outcomes
  (`SUCCESS`, `UP_TO_DATE`, `FROM_CACHE`, `SKIPPED`, `FAILED`).
- Run task UI: task picker from the model, favorites, recent, args, env,
  “rerun”, “copy command”, “open build file”.
- Do not run arbitrary shell strings from the UI. A “custom Gradle command”
  escape hatch must be explicit and permission-gated.
- Build scans are off by default; honor the project's own configuration and
  warn before uploading data.

## 7. Tests

Primary path for Gradle projects: **Gradle's test execution**, so test tasks,
filters, JVM args, system properties, toolchains, and plugins behave exactly as
the build defines.

- Use `BuildLauncher` with `forTasks(":module:test")` and a generated init
  script for class/method selection. The init script calls
  `TestFilter.includeTest(className, methodName)` and
  `setFailOnNoMatchingTests(false)`. The Tooling API rejects `--tests` as a
  build argument, and `TestLauncher` unconditionally disables
  `Test.debugOptions` provider-side, so `BuildLauncher` is the supported path
  for both plain and debug test runs.
- The same init script disables `upToDateWhen`/`cacheIf` for the selected
  `Test` task so IDE runs always execute and emit test events.
- For test debugging, the generated init script also enables the `Test` task's
  `debugOptions` (`server=true`, `suspend=true`, loopback port allocated by the
  IDE), then attaches the java-debug DAP client. Do **not** use
  `TestLauncher.debugTestsOn(port)`: Gradle implements it with `server=n`,
  which expects a listening debugger, while java-debug attaches as a JDWP
  client. See [DEBUG_TEST.md](DEBUG_TEST.md) §7.4 for the full flow.
- Collect results from:
  1. Tooling API test events (preferred; live),
  2. JUnit XML under `build/test-results/<task>/` (fallback and persistence).
- Map test events to a stable test ID: project path + task path + class +
  method + parameterized display name. Use the source location when available.
- Output: stdout/stderr per test, failure stack traces, standard streams,
  durations, skipped/ignored reasons.
- Rerun failed: retain the selection and use the same task/class/method filters.
- Non-Gradle projects use the jdtls/java-test path; see
  [DEBUG_TEST.md](DEBUG_TEST.md).

## 8. Dependency view

- Resolve one configuration at a time on demand (for example
  `runtimeClasspath`, `testCompileClasspath`).
- Show requested vs selected versions, conflict resolution, and the path that
  introduced a dependency.
- Show source/javadoc attachment status for jars; allow “download sources”.
- Keep this read-only in v1; dependency editing belongs in the build script.
- Large graphs: virtualize, lazy-expand, cap depth, and provide a text search.

## 9. Coordination with jdtls

```text
build file changed
  → GradleActor: debounce + cancel in-flight sync
  → GradleActor: sync, publish BuildSnapshot
  → JdtlsActor: projectConfiguration.update (single-flight)
  → wait for jdtls ProjectStatus idle
  → App: correlate build projects with Java projects
  → UI: update tree/problems; keep last good model on failure
```

- Never run the sidecar sync and a jdtls-triggered Buildship import
  simultaneously if they can conflict on `.gradle` caches. Serialize the
  “build file changed” path; ordinary task execution may proceed concurrently
  if Gradle supports it, but the UI should show queued builds.
- Both use the same `GRADLE_USER_HOME` so they share caches and, where
  compatible, the daemon.
- jdtls/Buildship owns compile classpaths; the sidecar owns runtime/test
  classpaths. If they disagree, display a warning in the project details and
  prefer jdtls for diagnostics, Gradle for execution.
- Importing a project must **not** write Eclipse metadata into the project by
  default (`java.import.generatesMetadataFilesAtProjectRoot=false`).

## 10. Build-script support (v1 limitation)

jdtls does not provide Java intelligence for Groovy or Kotlin build scripts.
v1 provides:

- syntax highlighting (tree-sitter Groovy/Kotlin grammars),
- bracket/folding/indent basics,
- Gradle sync errors mapped to build-file locations,
- “Open build file”, “Run task”, and task/model inspection.

v1 does **not** provide completion, navigation, or refactoring inside
`build.gradle`, `settings.gradle`, or `.gradle.kts`. Do not pretend otherwise.
Kotlin LSP integration for `.gradle.kts` is a later workstream.

## 11. Trust and safety

Opening a Gradle project can execute arbitrary build logic. Therefore:

- Workspace trust is required before the first Gradle sync/task/test/debug.
- Restricted mode: no sync, no tasks, no wrapper download, no Java import.
- Wrapper downloads and remote build caches require network consent.
- Never log dependency credentials, repository passwords, or environment
  values. Redact known secret keys.
- Run tasks with the user's authority; do not sandbox by default (it would
  break builds). Make the risk explicit in the trust dialog.

## 12. Testing

- **Unit (Rust):** model mapping, JSON-RPC, selection IDs, cache invalidation,
  error mapping.
- **Sidecar unit/integration:** Gradle TestKit with fixture builds;
  `TestLauncher` selection; cancellation; offline mode; broken configuration.
- **Fixtures:**
  - `gradle-single` — one module, JUnit 5, application plugin.
  - `gradle-multi` — `:app`, `:lib`, test fixtures, version catalog.
  - `gradle-composite` — included build.
  - `gradle-broken` — syntax/configuration failure.
  - `gradle-toolchain` — explicit Java 17 toolchain on a JDK 21 machine.
- **Nightly:** Gradle 8.5, latest 8.x, latest 9.x, release candidate if
  available; JDK 17/21/25.
- **Performance:** warm sync budget for the multi-module fixture; no
  re-resolution of every configuration on reopen.

## 13. Known risks

| Risk | Mitigation |
| --- | --- |
| Two Gradle integrations (Buildship + sidecar) double memory/daemons | Share `GRADLE_USER_HOME`; serialize imports; add low-memory profile; measure |
| Sidecar/Tooling API vs Gradle version mismatch | Pin and test matrix; clear error; allow per-workspace Tooling API version only as a last resort |
| Configuration cache incompatibility | Detect failures; don't disable the cache globally; document |
| Composite builds and included builds | Model recursively; test; degrade to root build only if necessary |
| Gradle 9 annotation-processing init script regression in jdtls | Pin fixed jdtls; make AP configurable; nightly fixture |
| Build scripts are opaque to Java tooling | Explicit v1 limitation; later Kotlin LSP |
| Long-running tasks block cancellation | Tooling API token + stop-build escape hatch; bounded logs |
