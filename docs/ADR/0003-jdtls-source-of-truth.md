# ADR 0003: jdtls is the source of truth for Java semantics

- **Status:** Accepted (Phase 0 validated)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [JDTLS.md](../JDTLS.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [ADR 0002](0002-gradle-integration.md)

## Context

A Java IDE needs parsing, indexing, type resolution, diagnostics, completion,
navigation, refactoring, formatting, and a project model. Implementing these
from scratch is a multi-year effort and would still be less correct than the
Eclipse JDT compiler.

The Eclipse JDT Language Server (jdtls) is the language server used by
vscode-java, Theia, Neovim, and others. It wraps Eclipse JDT and provides:

- Java parsing/indexing/type resolution and diagnostics;
- completion, hover, signature help, navigation, references, symbols;
- rename, code actions, refactoring, formatting, organize imports;
- code lens, semantic tokens, inlay hints, call/type hierarchy;
- Gradle/Maven project import through Buildship/m2e;
- extension bundles for debugging (java-debug) and tests (java-test).

Alternatives:

- Embed Eclipse JDT core directly and build a custom LSP-like layer.
- Use `javac` APIs for some features and build the rest.
- Use JavaParser/tree-sitter for syntax and skip semantic depth.
- Use another Java language server.
- Build a new Java compiler/index from scratch.

## Decision

Use **jdtls as a managed child process** and delegate Java semantics to it. The
IDE implements a generic LSP client and a jdtls-specific adapter; it does not
reimplement javac, a Java parser, or an index for language features.

- jdtls owns Java semantics and the Java project model used for language
  features.
- jdtls/Buildship owns the compile classpath for Gradle projects.
- The IDE owns the editor buffer, document versions, undo/redo, save policy,
  workspace state, and the application of `WorkspaceEdit`s.
- tree-sitter is used only for syntax highlighting, folding, and lightweight
  structural features. It must not compete with jdtls for semantic results.
- Gradle build/task/test/runtime concerns are delegated to a separate sidecar
  (ADR 0002), not inferred from jdtls.
- jdtls is pinned to a tested build; upgrades are explicit and tested.

## Consequences

**Positive**

- Correct Java semantics from a mature implementation.
- Full feature surface without owning a compiler.
- Proven integration path and extension bundles for debug/test.
- Engineering effort goes into the IDE experience, not Java internals.

**Negative**

- jdtls requires a JDK 21+ runtime (independent of project JDKs).
- JVM memory and startup cost; one server per workspace.
- Its project import (Buildship) can be slow or fail on unusual builds.
- jdtls custom protocol and settings must be tracked per pinned version.
- Gradle 9 annotation-processing regressions and other upstream bugs become
  our compatibility problem.
- We depend on LSP's UTF-16 positions and must convert at the boundary.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Embed Eclipse JDT core | Avoids a process but couples to internal APIs, classloaders, and a huge dependency surface; still need to build LSP features |
| `javac` APIs + custom index | Reimplements navigation/refactoring/completion; years of work; worse correctness |
| JavaParser/tree-sitter only | Insufficient for type-aware completion, diagnostics, rename, and refactoring |
| Another Java LSP | Less mature/complete for Gradle + Java refactoring; would still need the same adapter work |
| Build from scratch | Not viable for this project |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| jdtls crash | Supervisor with backoff; replay `didOpen` and folders; mark diagnostics stale; explicit restart |
| Memory use | One server per workspace; bounded heap; low-memory profile; clear storage |
| Buildship/Gradle incompatibility | Pin versions; test Gradle 8.5–9.x; surface upstream errors; fall back to manual import guidance |
| Protocol drift | Pin jdtls, snapshot settings/commands, contract tests, feature detection |
| UTF-16 conversion bugs | Rope + line index; property tests; versioned apply-edit; fuzzing |
| Over-reliance on custom commands | Wrap only documented/verified commands; keep a typed app surface; record traces |

## Follow-up

1. Phase 0: launch a pinned jdtls with JDK 21, initialize, receive diagnostics,
   apply an edit, restart.
2. Record the exact settings schema and custom command payloads for the pinned
   build.
3. Define the jdtls upgrade checklist: version, settings diff, contract tests,
   Gradle matrix, manual smoke.
4. Confirm the annotation-processing workaround for Gradle 9.
