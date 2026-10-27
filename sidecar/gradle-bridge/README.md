# gradle-bridge

The Gradle Tooling API sidecar for JavaIDE. It owns build tasks, test
discovery/execution, classpath resolution, and dependency reports. It does
**not** own Java compilation semantics for the editor; jdtls/Buildship remains
the compile-classpath source of truth.

The sidecar is a Java 17-targeted application. It runs on Java 17 or newer
(Java 21 is recommended and is what the Phase 0 harness uses).

## Build and run

```sh
cd sidecar/gradle-bridge
./gradlew installDist
build/install/gradle-bridge/bin/gradle-bridge
```

Useful flags:

- `--log <file>`: append sidecar logs to a file instead of stderr.
- `--help`: print the supported flags.

`JAVA_HOME` must point at a Java 17+ JDK. The launcher script uses `JAVA_HOME`
when it is set and `java` from `PATH` otherwise. The Rust client prepends
`<JAVA_HOME>/bin` to the child `PATH`, so Gradle and the sidecar see the same
JDK.

The process speaks JSON-RPC 2.0 on stdin/stdout using `Content-Length`
framing. stdout carries protocol frames only; logs go to stderr or the log
file. The sidecar is single-client and exits on `shutdown` or EOF.

## Protocol

Every request is a JSON-RPC request object. `params` is always an object.

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

Success responses return the method's result object. Errors use JSON-RPC error
codes (`-32600`, `-32601`, `-32602`, `-32603`) and include a stable
`data.detail` string where useful.

Long-running methods accept:

- `requestId` (string): caller-generated id used by `cancel`.
- `root` (string, absolute path): the Gradle build root.
- `timeoutMs` (integer): operation timeout. `0` or absent means the sidecar
  default.

Operations that are cancelled return a normal result with `cancelled: true`.
Timeouts return an error with detail `gradle.timeout`.

### Methods

| Method | Purpose |
| --- | --- |
| `initialize` | Handshake. Returns name, version, `protocolVersion` (`"1"`), capabilities, Java and Tooling API versions. |
| `sync` | Builds a project/task/source-set/configuration snapshot. |
| `runTask` | Runs one or more task paths and streams output/events. |
| `listTests` | Lists compiled test classes and methods for a test task. |
| `runTests` | Runs selected tests, optionally with a JDWP listener. |
| `resolveClasspath` | Resolves one source set's compile/runtime classpath. |
| `dependencyReport` | Resolves one configuration's dependency graph and artifacts. |
| `cancel` | Cancels a running operation by `requestId`. |
| `shutdown` | Stops the sidecar and its Gradle connections. |

### Notifications

Events are JSON-RPC notifications scoped by `requestId`:

- `sync.progress` `{requestId,message}`
- `task.progress` `{requestId,message}`
- `task.output` `{requestId,stream,text}`
- `task.started` / `task.finished` `{requestId,taskPath,displayName,outcome,startTime,endTime,durationMs,failures}`
- `test.started` / `test.finished` `{requestId,test:{...},eventTime}`
- `test.output` `{requestId,test,stream,text}`

`runTests` results include suite nodes (`atomic:false`) and real test cases
(`atomic:true`). Consumers that show individual tests must filter on `atomic`.

## Tests

Discovery compiles the test source set first (unless `compile:false`), then
walks the test runtime classpath. `listTests` returns class names, methods,
source files, and parameterized/disabled metadata.

Execution uses Gradle's `BuildLauncher`, not `TestLauncher`. This is
deliberate: `TestLauncher` unconditionally applies
`test.debugOptions { enabled = false }` unless `debugTestsOn(port)` is used,
which overrides init-script debug settings. `BuildLauncher` honors the
generated init script.

A generated init script:

- applies class/method filters with `TestFilter.includeTest(...)`,
- sets `failOnNoMatchingTests(false)`,
- disables `upToDateWhen`/`cacheIf` so runs always execute and emit events,
- optionally sets `Test.debugOptions` (`server=true`, `suspend=true`, loopback
  host/port).

The Tooling API rejects `--tests` as a build argument, so selection lives in
the init script.

### Debugging tests

Pass `debug: {enabled:true, host:"127.0.0.1", port:<port>, suspend:true}` to
`runTests`. The sidecar allocates a loopback port when `port` is `0`, but the
allocated port is only reported in the result after the run finishes, so a
debugger client should supply the port up front.

The test worker opens a JDWP listener and suspends before running tests. A
debugger connects, sends the 14-byte `JDWP-Handshake` greeting first, reads the
echo, and sends
`VirtualMachine.Resume` (command set 1, command 6, id 1). The worker emits an
unsolicited composite event packet (command set `0x40`) before the reply;
clients must ignore non-reply packets while waiting for the reply id. Once
resumed, tests run normally and `runTests` returns the usual results plus
`debug:{host,port,suspend}`.

## Layout

- `GradleService.java`: Tooling API operations.
- `BridgeServer.java`: JSON-RPC dispatch, cancellation, timeouts, shutdown.
- `ConnectionPool.java`: per-root `ProjectConnection` lifecycle and locking.
- `BuildEvents.java`: event payloads and test-name normalization.
- `TestRunScript.java`: generated filter/force-run/JDWP init script.
- `model/`: Tooling model interfaces and DTOs.
- `src/test/java`: unit tests.

## Related docs

- `docs/GRADLE.md`: full contracts and ownership split.
- `docs/DEBUG_TEST.md`: test discovery and debug flow.
- `crates/ide-gradle`: the Rust client.
