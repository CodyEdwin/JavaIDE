# Engineering Standards

This document defines how the codebase is built, tested, documented, and kept
modular. It is intentionally concrete: “write clean code” is not a standard.

## 1. Repository layout

```text
Cargo.toml                 workspace manifest, shared lints, profile settings
rust-toolchain.toml        pinned stable toolchain / MSRV
deny.toml                  license, advisory, and source policy
crates/
  ide-domain/
  ide-jsonrpc/
  ide-lsp/
  ide-dap/
  ide-platform/
  ide-config/
  ide-editor/
  ide-workspace/
  ide-jdtls/
  ide-gradle/
  ide-debug/
  ide-context/
  ide-opencode/
  ide-mcp/
  ide-app/
  ide-runtime/
  ide-ui-api/
  ide-ui-tauri/
  ide-desktop/
  ide-testkit/
  xtask/
sidecar/
  gradle-bridge/
ui/
  src/
    generated/             checked-in TypeScript bindings
fixtures/
  gradle-single/
  gradle-multi/
  gradle-broken/
  plain-java/
  junit5-basic/
  junit4-basic/
  testng-basic/
  debug-main/
  traces/                  recorded protocol traffic
docs/
  PLAN.md
  ARCHITECTURE.md
  JDTLS.md
  GRADLE.md
  DEBUG_TEST.md
  OPENCODE.md
  ROADMAP.md
  ENGINEERING.md
  ADR/
schemas/                   generated JSON Schemas (launch, settings)
```

Create a crate only when it has a real responsibility. Empty placeholder crates
are architectural debt, not progress. When a crate is created, add it to the
allowlist in `xtask` and to the crate map in
[ARCHITECTURE.md](ARCHITECTURE.md) in the same change.

## 2. Toolchain and workspace policy

- **Rust:** current stable, edition 2024, pinned in `rust-toolchain.toml`.
  Bumping the toolchain is a normal PR with CI green; do not float `stable`
  silently in release builds.
- **MSRV:** the oldest stable that builds the workspace; documented in
  `README.md`. Do not raise it without a release note.
- **Java:** sidecar built with `--release 17` but run on JDK 21+; jdtls runtime
  is JDK 21+. Fixtures may target older source levels.
- **Node/UI:** one pinned package manager and lockfile; no global installs.
  Tauri 2 + CodeMirror 6 for v1 (see ADR 0001).
- **Formatting:** `cargo fmt --all --check`; `prettier`/`eslint` for `ui/`;
  `google-java-format` or Spotless for the sidecar.
- **Lints:** workspace-level `[workspace.lints]`; CI uses
  `cargo clippy --workspace --all-targets -- -D warnings`.

### Workspace lint baseline

```toml
[workspace.lints.rust]
unsafe_code = "deny"
missing_docs = "warn"
unused_must_use = "deny"
rust_2024_compatibility = { level = "warn", priority = -1 }

[workspace.lints.clippy]
all = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
module_name_repetitions = "allow"
must_use_candidate = "allow"
missing_errors_doc = "warn"
missing_panics_doc = "warn"
```

Crates may tighten lints (`#![deny(missing_docs)]`,
`#![deny(rustdoc::broken_intra_doc_links)]`) but may not loosen the workspace
baseline without an ADR or a review note. `unsafe` is denied; if a platform
crate truly needs it, add a narrowly scoped `#[allow(unsafe_code)]` with a
`SAFETY:` comment explaining the invariant, and require two reviewers.

### Dependency policy

- Prefer the standard library and small, well-maintained crates.
- Every dependency needs a reason; avoid a crate for one trivial function.
- Pin major versions in `Cargo.toml`; commit `Cargo.lock` for binaries.
- `cargo deny check` enforces:
  - allowed licenses: Apache-2.0, MIT, BSD-2/3-Clause, ISC, Unicode-3.0,
    Zlib, MPL-2.0 (file-level), EPL-2.0 (for bundled Eclipse components);
  - no unknown registries or git sources;
  - no advisories with a documented exception if unavoidable;
  - duplicate-version review for known-problematic crates.
- Third-party Java artifacts (jdtls, java-debug, java-test, Gradle Tooling API)
  are pinned by version and SHA-256; notices are generated into
  `THIRD_PARTY_NOTICES.md`.
- No GPL/AGPL dependencies in shipped binaries without legal review.
- `cargo machete` catches unused dependencies; `cargo tree -d` is reviewed for
  accidental duplicate major versions.

## 3. Modularity enforcement

The dependency rules in [ARCHITECTURE.md](ARCHITECTURE.md) are enforced, not
suggested.

### 3.1 Architecture check

`xtask check-architecture`:

1. Runs `cargo metadata --no-deps --format-version 1`.
2. Reads the workspace crates and their dependency edges.
3. Compares against an allowlist (`xtask/src/architecture.rs`).
4. Fails on:
   - an edge not in the allowlist;
   - a cycle;
   - a forbidden edge (for example `ide-app -> ide-jdtls`);
   - `ide-testkit` used outside `[dev-dependencies]`;
   - a protocol crate imported by a UI crate.
5. Prints a readable diff: crate, dependency, rule, and the file that declares
   it.

The allowlist is code-reviewed. Adding an edge is a design decision; “it was
easier” is not a reason. If a new edge is legitimate, update the architecture
doc and the allowlist together.

### 3.2 Boundary rules

- Protocol types (`lsp_types`, DAP structs, Gradle DTOs, OpenCode schemas)
  never leave their adapter crate.
- Domain ports do not return `serde_json::Value`.
- The UI never imports a protocol crate; it imports `ide-ui-api` only.
- Adapters never depend on `ide-app`, `ide-runtime`, or UI crates.
- `ide-testkit` is a dev-dependency only.
- No global mutable state; services are passed explicitly from `ide-runtime`.
- No `unwrap`/`expect` on user input, I/O, or protocol data in library code.
  Tests may use them with a clear panic message.

### 3.3 Crate template

Every crate starts with:

```rust
//! One-paragraph purpose.
//!
//! # Boundary
//! What this crate owns and what it must not know about.
//!
//! # Invariants
//! The rules callers can rely on.
//!
//! # Cancellation
//! How long-running work stops.
//!
//! # Errors
//! The error taxonomy and whether errors are retryable.
```

A public crate exposes a small, documented API. Keep implementation modules
private (`mod foo;` not `pub mod foo;`) unless another crate genuinely needs
them. Re-export the intended surface from `lib.rs`; avoid a “junk drawer”
`util` module.

## 4. Documentation and comment standards

### 4.1 Rustdoc

- Every public item has rustdoc: types, fields, variants, functions, traits,
  associated types, and constants.
- Use `#![deny(missing_docs)]` in library crates once the API stabilizes.
- Document:
  - **Purpose:** what it does, in one sentence.
  - **Invariants:** what must be true before/after.
  - **Errors:** when and why it fails.
  - **Panics:** only if reachable; prefer not to panic.
  - **Cancellation:** for async work, what happens when the future is dropped.
  - **Protocol:** for adapters, the exact spec/version and direction.
- Rustdoc examples must compile (`cargo test --doc`). Mark examples
  `no_run` when they require a live server.
- Intra-doc links are checked in CI. Link to types rather than repeating prose.
- Do not document the obvious (`/// Returns the name.` on `fn name`). Document
  the contract, units, ownership, and failure modes.

### 4.2 Comments

Comments explain **why**, not **what**:

```rust
// jdtls reports ServiceReady before project import finishes. Waiting for the
// import here would block the editor for tens of seconds, so we expose import
// progress separately and treat diagnostics as provisional until it completes.
```

Required comment forms:

- `// SAFETY:` for every `unsafe` block, including the invariant.
- `// TODO(#123):` with an issue number and a concrete next action.
- `// FIXME(#123):` only for known correctness bugs that are scheduled.
- `// NOTE:` for non-obvious trade-offs that future maintainers will question.
- `// PERF:` for measured hot paths and the reason for the chosen structure.
- `// SECURITY:` for trust boundaries, redaction, and process isolation.

Forbidden:

- Commented-out code (use version control).
- “This is a hack” without a linked issue and an exit condition.
- Comments that restate the code.
- `unwrap()` hidden behind a comment instead of a typed error.

### 4.3 Protocol documentation

Each adapter keeps a `PROTOCOL.md` (or a section in the crate docs) with:

- the pinned upstream version and source URL;
- the methods/notifications implemented;
- direction and payload shape;
- error and timeout behavior;
- a link to recorded traces in `fixtures/traces/`;
- known upstream bugs and workarounds.

When an upstream schema changes, update the snapshot and the contract tests in
the same PR.

### 4.4 Architecture decision records

Use `docs/ADR/NNNN-title.md` with:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN | Rejected
- Date: YYYY-MM-DD
- Deciders: ...
- Related: links

## Context
## Decision
## Consequences
## Alternatives considered
## Follow-up
```

Add an ADR when a change alters a boundary, ownership rule, persistence format,
security posture, or a dependency that is hard to reverse. Small refactors do
not need one. Accepted ADRs are immutable except for status and links; write a
new ADR to reverse a decision.

### 4.5 User-facing documentation

- `README.md`: what it is, status, how to build/run, documentation index.
- `docs/`: design and operations.
- `CHANGELOG.md`: user-visible changes, grouped by release.
- `THIRD_PARTY_NOTICES.md`: generated, not hand-edited.
- In-app help: short, task-oriented, links to the relevant doc section.
- Error messages: what happened, why, what to do next; no stack traces in the
  main message.

## 5. Code standards

### 5.1 Errors

- Library crates use `thiserror` enums; binaries/`xtask` may use `anyhow`.
- Every user-facing error has a stable code, title, detail, and optional
  actions. Example: `jdtls.initialize_timeout`.
- Do not string-match error text to make decisions; match typed variants or
  codes.
- Preserve the source chain; log it once at the boundary, not at every layer.
- Retry only idempotent operations, with bounded backoff and a user-visible
  state. Never retry a write or a prompt blindly.

### 5.2 Async and concurrency

- One Tokio runtime for the backend; UI threads never block on I/O.
- One actor owns each mutable state machine. Communicate with bounded channels
  and typed messages.
- Never hold a `std::sync::Mutex` or `RwLock` guard across `.await`. Prefer
  actor ownership; use `tokio::sync` only when a lock is truly needed.
- Every long operation accepts a `CancellationToken` or returns a handle with
  `cancel`.
- Use `spawn_blocking` for CPU-heavy or blocking filesystem work; never block
  the runtime.
- Bound every queue. Apply backpressure; drop stale completion/hover requests
  rather than growing memory.
- Document cancellation safety on every async trait method.

### 5.3 Text, offsets, and versions

- The canonical text model is a rope with UTF-8 byte offsets. See ADR 0006.
- Convert to/from UTF-16 only at LSP boundaries; never store line/column in the
  domain.
- Every document mutation carries a version. Stale edits are rejected.
- Apply edits descending by range, reject overlaps, and group undo entries.
- Write files atomically (temp file in the same directory, fsync, rename) and
  preserve permissions where possible.
- Handle CRLF, BOM, mixed line endings, invalid UTF-8 (reject or lossy-decode
  with an explicit warning), and very large files.

### 5.4 Processes and ports

- Spawn with argument arrays, explicit cwd/env, and no shell.
- Put children in their own process group (Unix) or Job Object (Windows).
- Capture stdout/stderr separately; protocol streams are never mixed with logs.
- Allocate ports from the OS; close listeners promptly; never hard-code 5005.
- On shutdown: graceful request → timeout → terminate group → kill.
- Record the PID, start time, and command for diagnostics, with secrets
  redacted.

### 5.5 Logging and telemetry

- `tracing` with structured fields: workspace ID, project path, document URI,
  session ID, request ID.
- Never log file contents, prompts, tokens, credentials, environment values, or
  full command lines with secrets.
- Wire logs are opt-in, redacted, and bounded in a ring buffer.
- No telemetry by default. Crash reports stay local unless the user exports
  them.
- Log levels: `error` for user-impacting failures, `warn` for degraded
  behavior, `info` for lifecycle, `debug` for protocol summaries, `trace` for
  development only.

### 5.6 Configuration

- Settings are typed structs in `ide-config`; no ad-hoc `serde_json::Value`
  reads scattered through the app.
- Generate JSON Schema for settings and launch configs with `schemars`; validate
  on load and show precise errors.
- Every persisted document has a schema version and a migration path.
- Unknown settings are preserved on save (forward compatibility) but reported
  as warnings.
- Defaults are documented and tested; settings that require a restart say so.

### 5.7 Feature flags

- Compile-time features only for optional UI shells or platform integrations,
  not for half-finished code paths in the default build.
- Runtime feature detection for jdtls/OpenCode capabilities; degrade
  gracefully.
- No dead code behind a flag without an owner and a removal date.

## 6. Testing strategy

### 6.1 Test pyramid

| Layer | What | Where | Runtime |
| --- | --- | --- | --- |
| Unit | Pure logic, conversions, state machines | Each crate | milliseconds |
| Property | Text offsets, edit application, framing, ID stability | `ide-editor`, `ide-jsonrpc`, `ide-debug` | seconds |
| Golden/contract | Recorded protocol traces, schema snapshots | `fixtures/traces/`, `ide-testkit` | seconds |
| Integration | Real jdtls/Gradle/OpenCode against fixtures | `crates/*/tests/`, `fixtures/` | minutes |
| E2E | UI flow through Tauri | `ui/e2e/` | minutes |
| Performance | Startup, typing, sync, completion, debug attach | `benches/` | nightly |
| Fuzz | Framing, JSON-RPC, apply-edit ranges, config parsing | `fuzz/` | nightly |

### 6.2 Rules

- Tests are deterministic; no arbitrary sleeps. Use timeouts and event
  conditions.
- No network by default. Integration tests that need a service use a local mock
  or an opt-in environment variable.
- Each test owns its temp directory, ports, and processes; clean up even on
  failure.
- Prefer real fixtures over mocks for protocol adapters. Mocks are for failure
  injection and timing.
- A bug fix includes a regression test that fails before the fix.
- Snapshot tests (`insta`) are reviewed like code; do not blindly accept
  snapshots.
- Property tests cover:
  - UTF-8 ↔ UTF-16 conversion, including surrogate pairs and CRLF;
  - edit application order and overlap rejection;
  - JSON-RPC framing split across arbitrary byte boundaries;
  - request ID correlation and cancellation;
  - test ID stability across renames and reruns.
- Fuzz targets run for a bounded time in CI nightly; crashes are filed with the
  input.

### 6.3 Coverage and quality metrics

- Line coverage is a diagnostic, not a target. Aim for **70% overall** and
  **85% on critical modules**: text edits, LSP apply-edit, JSON-RPC framing,
  Gradle test mapping, DAP state, permission handling.
- Measure with `cargo llvm-cov`; publish the report as a CI artifact.
- Do not merge tests that only assert a mock was called when the real contract
  can be tested.
- Flaky tests are quarantined with an owner and an issue; a quarantined test
  does not count as coverage.

### 6.4 Test harness

`ide-testkit` provides:

- `FakeLanguageService`, `FakeBuildSystem`, `FakeAssistantService`;
- fixture loaders and workspace temp dirs;
- recorded trace replay (LSP/DAP/JSON-RPC/SSE);
- process/port assertions;
- deterministic clocks for timeout logic.

Production crates never depend on `ide-testkit`.

## 7. CI/CD

### 7.1 Pull request pipeline (target < 12 minutes)

1. `cargo fmt --all --check`
2. `cargo clippy --workspace --all-targets -- -D warnings`
3. `cargo test --workspace` (unit + doc, nextest)
4. `cargo xtask check-architecture`
5. `cargo xtask check-bindings` (regenerate TS, fail on diff)
6. `cargo xtask check-schemas` (regenerate JSON Schema, fail on diff)
7. `cargo doc --workspace --no-deps` with `RUSTDOCFLAGS="-D warnings"`
8. `cargo deny check`
9. `cargo machete`
10. UI: typecheck, lint, unit tests, build
11. Sidecar: Gradle build + unit tests
12. Markdown link check for `docs/` and `README.md`

Use `Swatinem/rust-cache` or equivalent; cache the Gradle wrapper and Maven
dependencies; do not cache secrets.

### 7.2 Integration pipeline (per merge / scheduled)

- Real jdtls against fixtures (plain, single-module Gradle, multi-module,
  broken, Unicode/CRLF).
- Real Gradle Tooling API sidecar: sync, task, cancel, test discovery, test
  run, offline.
- OpenCode contract tests against a mock server; real service smoke is opt-in
  and runs nightly.
- DAP contract tests with a fake adapter; real java-debug smoke nightly.
- E2E Tauri smoke on Linux and macOS.

### 7.3 Nightly

- OS matrix: Linux x86_64, macOS arm64/x86_64 if available, Windows x86_64.
- JDK 17/21/25; Gradle 8.5/latest 8.x/latest 9.x; pinned jdtls.
- Performance benchmarks and regression thresholds.
- Fuzz targets for 10–15 minutes each.
- Real OpenCode service smoke (discover/start, session, prompt, SSE,
  cancellation, client-MCP).

### 7.4 Release pipeline

- Build sidecar, bundle jdtls/JRE, build Tauri app.
- Generate SBOM (CycloneDX), third-party notices, checksums.
- Sign macOS/Windows artifacts; notarize macOS.
- Publish installers and update metadata.
- Run the clean-install smoke suite against the published artifacts.
- Keep the previous release available for rollback.

## 8. Generated bindings and schemas

### 8.1 TypeScript

- `ide-ui-api` derives `ts_rs::TS` for every command, event, and view model.
- `cargo test -p ide-ui-api export_bindings` writes to `ui/src/generated/`.
- Generated files are committed; CI fails if regeneration produces a diff.
- Never hand-edit `ui/src/generated/`; change the Rust type and regenerate.
- The protocol has an integer version. Additive changes are allowed within a
  major version; removals/renames require a version bump and a migration.
- Events include a monotonically increasing sequence and a timestamp; the UI
  uses the sequence to drop stale updates.

### 8.2 JSON Schema

- `schemars` derives schemas for settings, launch configs, and MCP tool inputs.
- `xtask check-schemas` regenerates `schemas/*.json` and fails on drift.
- Schemas are published for editor autocomplete and external tooling.
- Tool schemas are versioned; additive fields only within a major version.

## 9. Performance budgets

Targets for the reference fixture (multi-module Gradle project, ~50k LOC,
10k-line file, warm caches). Measure on a 4-core/16 GB developer machine;
publish results with the benchmark.

| Metric | Budget |
| --- | --- |
| App start to interactive window | < 2.5 s |
| Open workspace to editable (cached model) | < 3 s |
| Keystroke to paint p95 (10k-line file) | < 50 ms |
| Scroll | 60 fps, no full re-layout |
| Completion p95 (warm jdtls) | < 300 ms |
| Go-to-definition p95 | < 500 ms |
| Diagnostics after save (visible) | < 2 s |
| Warm Gradle sync (20 modules) | < 3 s |
| Cold Gradle sync | < 60 s, progress visible |
| Test discovery (1,000 classes) | < 5 s |
| Test run start (warm daemon) | < 3 s |
| Debug attach (warm adapter) | < 3 s |
| Backend idle RSS (excluding JVMs) | < 500 MB |
| jdtls heap | 1–2 GB, configurable |
| UI memory (10 tabs) | < 500 MB |

Rules:

- No performance claim without a benchmark or trace.
- Regressions > 20% on a budget fail CI nightly and require a waiver.
- Profile before optimizing; document the measured bottleneck.
- Large files (> 5 MB) use a degraded mode (no semantic tokens by default,
  warning, explicit opt-in).

## 10. Security engineering

- Threat model in the architecture doc; update it when adding a process,
  network service, or agent capability.
- Workspace trust gates code execution: jdtls import, Gradle tasks, tests,
  debug, terminals, OpenCode.
- No shell interpolation; argument arrays only.
- Loopback-only services; no public bind; validate ports and origins.
- Redact secrets in logs, context bundles, and crash reports.
- Dependency and artifact verification (checksums, lockfiles, `cargo deny`).
- Fuzz all protocol parsers.
- Treat repository content and model output as untrusted input.
- Security-sensitive changes require a second reviewer and a note in the PR.

## 11. Release and versioning

- App uses SemVer. `0.x` during beta; breaking changes still get a migration
  note.
- UI protocol version is independent of the app version; bump it for
  incompatible command/event changes.
- Settings/state schemas have explicit versions and migrations; never silently
  discard user state.
- Changelog entries are user-facing, not commit dumps.
- Support policy: current stable + previous minor for critical fixes during
  beta.
- Update channels: stable, beta, nightly. Updates are signed and opt-in.

## 12. Pull request checklist

- [ ] The change has one clear purpose and a linked issue/ADR if it changes a
      boundary.
- [ ] New public APIs have rustdoc with errors/cancellation notes.
- [ ] Tests cover success, failure, cancellation, and stale data where relevant.
- [ ] No protocol type leaked outside its adapter.
- [ ] `cargo fmt`, clippy, tests, rustdoc, deny, architecture check pass.
- [ ] TypeScript bindings and schemas regenerated (if applicable).
- [ ] No secrets, prompts, or file contents in logs/fixtures.
- [ ] Performance impact considered and measured for hot paths.
- [ ] Docs updated (user-facing or design).
- [ ] The change works from a clean workspace, not just a warm dev setup.

## 13. Definition of done for a code change

A change is done when:

1. It is implemented behind the correct port and crate boundary.
2. It has tests at the lowest useful layer plus an integration/contract test if
   it touches a protocol.
3. Its errors are typed, actionable, and logged without secrets.
4. It is documented (rustdoc, design doc, or ADR as appropriate).
5. It passes the phase quality gates and does not regress performance budgets.
6. It can be disabled or degraded without taking down unrelated features.

## 14. Open engineering questions

- Exact Tauri IPC strategy: raw `invoke`/events vs. a thin typed command
  layer; decide in Phase 1 based on latency and codegen ergonomics.
- Whether to use `nextest` from day one (recommended) or standard `cargo test`.
- Whether the sidecar should be one process per root build or a shared process
  with multiple connections; measure memory and daemon behavior in Phase 3.
- Whether Gradle test discovery should stay bytecode-based or adopt JUnit
  Platform Launcher descriptors for JUnit 5; measure in Phase 4.
- Long-term native UI path (GPUI) remains open; do not let it leak into the
  domain or UI protocol.
