# ADR 0002: Gradle integration via a Tooling API sidecar

- **Status:** Accepted (Phase 0 validated)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [GRADLE.md](../GRADLE.md), [DEBUG_TEST.md](../DEBUG_TEST.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

Gradle support must be first-class: import multi-module builds, show projects and
tasks, run/cancel tasks, resolve runtime and test classpaths, inspect
dependencies, discover and run tests, and react to build-file changes.

The IDE core is Rust. Gradle's model is exposed by the **Gradle Tooling API**, a
JVM library. There is no supported native Rust binding. The options are:

1. Parse `gradle tasks --all` / other CLI output.
2. Generate an init script that emits JSON from a one-shot Gradle invocation.
3. Embed a JVM in the Rust process via JNI and call the Tooling API.
4. Run a small Java **sidecar** that owns the Tooling API and speaks a typed
   protocol to Rust.
5. Reimplement the Gradle model in Rust.

At the same time, jdtls already imports Gradle projects through Buildship and
owns the Java compile classpath used for language features. A second,
independent Java model is a correctness risk, not just duplicated work.

## Decision

### Ownership split

- **jdtls/Buildship owns the Java compile classpath** and the Java project model
  used for language features.
- **`gradle-bridge` owns build/task/test/runtime concerns**: project and task
  models, task execution, cancellation, dependency inspection, test discovery
  and execution, and runtime/test classpaths.
- The IDE correlates the two models by canonical root and Gradle project path,
  and surfaces divergence instead of silently choosing one.

### Sidecar

- A Java 21 process under `sidecar/gradle-bridge/`, compiled with
  `--release 17`.
- JSON-RPC 2.0 over stdio, reusing `ide-jsonrpc` framing.
- One persistent process per open root build; multiple ProjectConnections for
  included builds, one active operation per connection.
- Methods: `initialize`, `sync`, `cancel`, `runTask`, `resolveClasspath`,
  `listTests`, `runTests`, `dependencyReport`, `shutdown`.
- Streaming notifications for sync/task/test progress and output.
- Cancellation uses the Tooling API's `CancellationTokenSource`; kill the
  sidecar only on timeout/hang.
- No project files are written; generated init scripts (when needed) live in
  the IDE data directory.
- `GRADLE_USER_HOME` is shared with jdtls/Buildship so caches and, where
  compatible, daemons are reused.

### Why not the alternatives

| Alternative | Problem |
| --- | --- |
| Parse CLI output | Fragile, slow, no structured errors/progress, no dependency model, no cancellation |
| Init-script JSON, one-shot | Better, but loses daemon reuse, live test events, and long-running cancellation; still needs a JVM |
| JNI-embedded JVM | Tight coupling, crash/GC/classloader risk, difficult cross-platform packaging, no process isolation |
| Reimplement Gradle | Out of scope and guaranteed to diverge |
| Buildship only | jdtls does not expose the full task/dependency/test/runtime surface we need, and coupling build UX to Buildship is brittle |

## Consequences

**Positive**

- Structured, version-aware models; live progress and test events.
- Cancellation and daemon reuse without parsing text.
- Sidecar crashes do not take down the IDE.
- The protocol boundary is testable and language-agnostic.
- The Java compile classpath remains owned by jdtls, avoiding a second source
  of truth for diagnostics.

**Negative**

- An extra JVM process and more memory.
- A Tooling API/Gradle compatibility matrix to maintain.
- Two models require correlation and clear UI labeling.
- A Java toolchain and build step are part of the product build.
- Test debugging requires a generated Gradle init script to set
  `debugOptions` (see [DEBUG_TEST.md](../DEBUG_TEST.md) §7.4), not
  `TestLauncher.debugTestsOn`, whose `server=n` mode expects a listening
  debugger.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Tooling API version mismatch | Pin the sidecar's Tooling API; test Gradle 8.5–9.x; clear error; per-workspace override only as a last resort |
| Two Gradle daemons / memory | Share `GRADLE_USER_HOME`; serialize imports; low-memory profile; measure |
| Composite builds | Model recursively; test; degrade to root build with a warning |
| Configuration cache incompatibility | Detect failures; do not disable globally; document |
| jdtls/Buildship and sidecar disagreement | Correlate by root/path; warn in project details; prefer jdtls for diagnostics, sidecar for execution |
| Sidecar hang | Cancellation token + timeout; kill and recreate; keep last good model |

## Follow-up

1. Phase 0 spike: model, task run, cancel, test event, broken build.
2. Decide whether one process per root or a shared process per workspace after
   measuring memory and daemon behavior.
3. Validate the test-debug init-script path across the supported Gradle matrix.
4. Record Tooling API traces as contract fixtures.
