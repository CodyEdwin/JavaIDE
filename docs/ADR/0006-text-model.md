# ADR 0006: Rope + UTF-8 byte offsets internally; convert at protocol boundaries

- **Status:** Proposed (pending plan review)
- **Date:** 2026-10-24
- **Deciders:** project maintainers
- **Related:** [ARCHITECTURE.md](../ARCHITECTURE.md), [JDTLS.md](../JDTLS.md)

## Context

Java source is Unicode text with CRLF/LF differences. Three coordinate systems
meet in the IDE:

- Rust strings and the editor core: UTF-8 bytes;
- LSP (including jdtls): UTF-16 code units by default;
- The JavaScript UI (CodeMirror): UTF-16 code units.

Line/column positions are convenient for display but go stale as soon as text
changes. Storing them in the core causes off-by-one bugs around surrogate
pairs, combining characters, tabs, and CRLF.

Large files also need efficient edits and viewport rendering; copying the whole
file per keystroke is not acceptable.

Options:

1. Store UTF-16 strings everywhere to match LSP/JS.
2. Store line/column positions in the core.
3. Store a rope with UTF-8 byte offsets, plus a cached line index.
4. Use a CRDT/piece table with operation IDs.
5. Store UTF-8 `String` and rebuild it on every edit.

## Decision

Use a **rope** (`ropey`) as the canonical document representation and **UTF-8
byte offsets** as the canonical position unit inside the Rust core.

- `TextRange { start: ByteOffset, end: ByteOffset }` is half-open.
- A `LineIndex` maps byte offsets ↔ line/column and is rebuilt/updated on
  change.
- Convert to **UTF-16** only at LSP boundaries, using the negotiated position
  encoding.
- The UI protocol (`ide-ui-api`) uses **UTF-16 code-unit offsets** (the native
  unit of CodeMirror/JavaScript) plus a document version, converted at the
  `ide-ui-api` boundary. The UI never sends UTF-8 byte offsets.
- The core never stores line/column as authoritative state; it stores byte
  offsets and derives positions for display/protocol.
- Every mutation carries a document version. Applying an edit to a mismatched
  version is rejected, not “best effort”.
- Edits are applied atomically, sorted descending by range, with overlap
  rejection; grouped edits share an undo entry.
- CRLF is preserved as document content. The line index understands `\r\n`,
  `\n`, and `\r`; formatting/LSP edits may normalize only when the user asks.
- Invalid UTF-8 files are rejected for editing with a clear error, or opened in
  a lossy read-only view; never silently rewrite them.
- Very large files use a degraded mode (no semantic tokens by default, explicit
  warning, highlighter budget).

## Why this option

- Rust's native string representation is UTF-8; a rope gives O(log n) edits and
  efficient slicing without copying the file.
- One canonical unit eliminates a class of “which offset is this?” bugs.
- LSP's UTF-16 requirement is isolated in one conversion layer that can be
  property-tested and fuzzed.
- The UI gets the unit it already uses, so cursor/selection mapping is direct.
- Versions make stale edits and stale diagnostics explicit.

## Consequences

**Positive**

- Correct handling of non-BMP characters (emoji, some CJK extensions) at the
  LSP boundary.
- Efficient editing and viewport extraction for large files.
- One place to test offset conversion and edit ordering.
- The domain API is independent of LSP/JS quirks.

**Negative**

- Two conversions exist (core ↔ LSP, core ↔ UI) and must be tested.
- The line index must be kept in sync; bugs here corrupt edits.
- Rope APIs and byte offsets are less familiar to UI contributors.
- UTF-16 conversion cost on every completion/diagnostic mapping; cache
  aggressively.
- CRLF and BOM handling need explicit tests.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| UTF-16 everywhere | Rust strings are UTF-8; converting the whole document or using UTF-16 buffers adds complexity and loses rope ergonomics |
| Line/column in the core | Goes stale on edit; ambiguous with tabs/CRLF; encourages off-by-one bugs |
| UTF-8 `String` per edit | O(n) copies; unacceptable for large files and typing latency |
| CRDT | Collaboration is not a v1 requirement; operation metadata and complexity are unnecessary |
| Piece table | Viable, but ropey is mature and sufficient; revisit only if measurements demand it |

## Invariants and tests

- `start <= end` for every range; both are on UTF-8 code-point boundaries.
- A range never splits a multi-byte code point.
- `LineIndex::position(offset)` and `LineIndex::offset(position)` round-trip.
- UTF-8 ↔ UTF-16 conversion round-trips for ASCII, BMP, non-BMP, combining
  marks, and CRLF.
- Applying a list of edits is independent of input order after sorting and
  rejects overlaps.
- A stale version is rejected before any mutation.
- Fuzz: random Unicode documents, random edits, random ranges; assert no panic
  and no corruption.
- Property: applying an edit then its inverse restores the original bytes and
  version semantics.

## Follow-up

1. Implement `ide-editor` with ropey and property tests in Phase 1.
2. Add conversion benchmarks; keep completion mapping under the latency budget.
3. Add fuzz targets for conversion and apply-edit.
4. Revisit the rope only if profiling shows a bottleneck; do not switch text
   models casually.
