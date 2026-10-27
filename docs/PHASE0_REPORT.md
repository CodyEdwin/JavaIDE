# Phase 0 report

- **Date:** 2026-10-27
- **Scope:** retire the jdtls, Gradle Tooling API, and OpenCode V2 integration
  risks, then prove a minimal desktop shell over the validated adapters.
- **Result:** **passed**, with the known gaps listed at the end.

## Environment

| Component | Version |
| --- | --- |
| Rust | 1.99.0 |
| Gradle | 9.8.1 |
| JDK for Gradle/jdtls | Temurin 21.0.12.1 |
| Gradle Tooling API | 9.8.1 |
| jdtls | 1.61.0 snapshot (2026-08-12) |
| OpenCode V2 service | 2.1.4 |
| Node / npm | 24.16.0 / 11.16.0 |
| Tauri / CodeMirror | 2.11.6 / 6 |

The default `java` on this machine is JDK 11. Every Gradle and jdtls command
pins a Java 21 `JAVA_HOME`; the Rust Gradle client also prepends
`<JAVA_HOME>/bin` to the sidecar's `PATH`, because the generated launcher script
otherwise resolves `java` from the inherited `PATH`.

## 1. jdtls

Validated in `crates/ide-jdtls` and with the `ide-phase0 jdtls` harness:

- discovery of an extracted jdtls distribution,
- process launch on JDK 21 with the Equinox launcher and config directory,
- LSP `initialize` / `initialized`, `ServiceReady`,
- `textDocument/didOpen`, diagnostics for clean and broken Java files,
- server-request pump and response handling,
- `workspace/applyEdit` with UTF-16 to UTF-8 range conversion,
- clean `shutdown` / `exit`.

`cargo test -p ide-jdtls`: 13 tests pass. The live spike received diagnostics
and shut down without orphaned processes.

## 2. Gradle Tooling API sidecar

The Java sidecar in `sidecar/gradle-bridge` speaks JSON-RPC 2.0 over
`Content-Length` framed stdio. Live protocol validation covered:

- `initialize`: protocol version `"1"`, Java 21, Tooling API 9.8.1,
- `sync`: Gradle 9.8.1, one project, 37 tasks, zero problems,
- `runTask :test`: task outcomes and streamed output,
- `listTests`: one class (`com.example.AppTest`), two methods, JUnit 5,
- `runTests`: both tests pass and emit `test.started` / `test.finished` events,
- `resolveClasspath main`: two runtime entries and two output directories,
- `dependencyReport testRuntimeClasspath`: three roots, eight artifacts,
- `shutdown`: process exits cleanly.

### Test execution and debugging

`TestLauncher` is **not** used. Gradle's `TestExecutionBuildConfigurationAction`
unconditionally applies `test.debugOptions { enabled = false }` to
`TestLauncher` runs unless `debugTestsOn` is used, overriding init-script
settings. The sidecar therefore uses `BuildLauncher` with a generated init
script that:

- applies `TestFilter.includeTest(className, methodName)` and
  `setFailOnNoMatchingTests(false)`,
- disables `upToDateWhen` / `cacheIf` so IDE runs always execute,
- sets `Test.debugOptions` to `server=true`, `suspend=true`, a loopback host and
  an explicit port.

The JDWP flow was validated live: the test worker opened a listener and
suspended, the client sent the 14-byte `JDWP-Handshake` greeting first, read the
echo, and sent `VirtualMachine.Resume` (command set 1, command 6). Tests then
ran to completion. The worker emits an unsolicited composite event packet
(command set `0x40`) before the Resume reply; clients must ignore non-reply
packets and read the reply error code from header bytes 9–11. The Phase 0
harness now completes the debug pass with `failed=false`; reading the handshake
before sending the greeting was the cause of the earlier `early eof` failures.

A fixed high debug port is used instead of releasing a reserved ephemeral port.
The earlier reserved-port approach raced Gradle's own ephemeral worker-control
ports: the debugger could connect to the wrong listener and the test worker
could not bind its debug port.

## 3. OpenCode V2

Validated in `crates/ide-opencode` and with the `ide-phase0 opencode` harness:

- discovery of the loopback service from the OpenCode state/config files,
- Basic auth with username `opencode` and the service password,
- `GET /api/info`, version gate, session list/create,
- incremental SSE decoding and a live subscription (`server.connected`),
- session context, prompt, interrupt, permission reply, and diff models,
- client-MCP WebSocket attach at
  `/api/experimental/client-mcp?name=…&location.directory=…`,
- first inbound MCP frame received (`initialize`, protocol `2025-11-25`).

`cargo test -p ide-opencode`: 22 tests pass.

The client-MCP module currently owns transport only. MCP method dispatch
(`initialize`, `tools/list`, tool calls) and the Java/Gradle tool schemas remain
for the next phase.

## 4. Rust clients

- `ide-jsonrpc`: strict JSON-RPC 2.0 envelopes, bounded framing, correlation,
  cancellation, shutdown. 38 tests.
- `ide-platform`: process lifecycle, loopback ports, home/path helpers.
- `ide-gradle`: typed Tooling API client with event fan-out, caller-supplied
  request ids, cancellation, and structured error mapping.
- `ide-opencode`: discovery, HTTP/SSE, client-MCP transport.

## 5. Desktop shell

`apps/desktop` is a Tauri 2 + CodeMirror 6 shell over the Rust core. It was
built and launched on the Linux/X11 test display:

- explorer over the fixture workspace, with directories collapsed by default and
  working expand/collapse,
- Java/JSON editor with tabs, dirty state, and `Ctrl/Cmd+S` save,
- Gradle panel: sync, task list, task execution, test discovery and test runs;
  verified against the fixture (Gradle 9.8.1) and a real `runelite` checkout
  (Gradle 8.8, 4 projects). Opening a different folder stops the old bridge and
  the next sync targets the new project,
- OpenCode panel: connect, sessions, context, prompt, streaming events, stop.

The shell runs from a source checkout:

```sh
cd sidecar/gradle-bridge && ./gradlew installDist && cd -
cd apps/desktop && npm install && npm run tauri dev
```

or `apps/desktop/run.sh` after the first build.

## Known gaps

1. **MCP tool host:** the client-MCP transport is live, but the IDE does not yet
   answer `initialize` / `tools/list` or dispatch Java/Gradle tools.
2. **jdtls in the GUI:** diagnostics, completion, and navigation are validated in
   the adapter but not wired into the desktop shell.
3. **Debug UI:** debug test runs are available in the Phase 0 harness but not in
   the GUI.
4. **OpenCode permissions:** permission events are surfaced as text; there is no
   reply UI yet.
5. **Packaging:** the shell is built as a debug binary from source; no installer
   or release bundle is produced yet.
6. **Eager classpath resolution:** sync currently resolves every source set's
   compile/runtime classpath, so a large project with a cold dependency cache
   can be slow. `resolveClasspath` reads the snapshot rather than resolving on
   demand; lazy resolution is the next Gradle improvement.

## Commands used

```sh
# Rust adapters
cargo test --workspace

# jdtls harness (requires an extracted jdtls root)
cargo run -p ide-phase0 -- jdtls --jdtls-root /path/to/jdtls --java-home /usr/lib/jvm/temurin-21

# Gradle end-to-end, including the JDWP debug pass
cargo run -p ide-phase0 -- gradle --debug --debug-port 5012

# OpenCode discovery, info, sessions, SSE, client-MCP attach
cargo run -p ide-phase0 -- opencode --attach-mcp

# Desktop shell
cd apps/desktop && npm run tauri dev
```
