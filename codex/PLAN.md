# Delta Plan

## A) Executive Summary

### Current state (repo-grounded)
- Batch backend command exists and performs resize+export loop with progress emit. (`src-tauri/src/commands/batch.rs`)
- Batch command is wired in Tauri invoke handler. (`src-tauri/src/lib.rs`)
- Batch panel exists and can run command from UI. (`src/components/panels/BatchPanel.tsx`)
- Batch route is wired into app active panel switch. (`src/App.tsx`)
- Sidebar only shows all tool buttons when `imageInfo` exists, gating batch access behind opening one image first. (`src/components/layout/Sidebar.tsx`)
- Shared batch types and IPC wrapper are present. (`src/types/image.ts`, `src/lib/tauri.ts`)
- Frontend tests/build are green; Rust tests blocked by missing host glib dependency.

### Key risks
- Output filename collisions can overwrite prior outputs in same folder.
- UX friction: batch inaccessible until single-image load due sidebar gating.
- Sparse error/result detail in panel reduces operator confidence for batch runs.
- Dialog API errors are not explicitly handled in batch panel actions.
- No explicit backend completion event for long-running observability.

### Improvement themes (priority)
1. Reliability hardening for backend batch output and eventing.
2. UX accessibility + resiliency for batch panel and sidebar.
3. Regression tests for new backend behavior and frontend rendering constraints.

## B) Constraints & Invariants (Repo-derived)

### Explicit invariants
- Keep existing command names and core app architecture (React+Zustand+Tauri command IPC).
- Preserve resize/export semantics and existing supported formats/filters.
- Maintain strict TypeScript and Rust error handling patterns.

### Implicit invariants (inferred)
- Sidebar tooling model uses panel toggles through `activeSidebarPanel`.
- Errors should be surfaced to user, not silently ignored.
- Non-destructive workflow: operations write new files, not in-place overwrite inputs.

### Non-goals
- No full multi-op batch graph/pipeline orchestration.
- No concurrency model redesign in this pass.
- No persistence schema changes.

## C) Proposed Changes by Theme

### Theme 1: Backend reliability hardening
- Current approach: fixed `<stem>_resized.<ext>` output path; can collide.
- Proposed: unique output naming on collision (`_2`, `_3`, ...), stronger file existence checks, explicit completion event.
- Why: prevents accidental overwrite and improves observability.
- Tradeoffs: slightly more code complexity, but deterministic and safe.
- Scope: `src-tauri/src/commands/batch.rs` only (+ tests).
- Excluded: async parallel executor.

### Theme 2: Frontend UX/accessibility hardening
- Current approach: batch tool hidden until image is loaded via sidebar gate.
- Proposed: show batch tool regardless of active image; keep edit/history gated by image state.
- Why: batch workflow is independent from single-image canvas state.
- Tradeoffs: sidebar logic split becomes slightly more explicit.
- Scope: `src/components/layout/Sidebar.tsx`, `src/components/panels/BatchPanel.tsx`.

### Theme 3: Surface better batch status/result detail
- Current approach: progress bar + first error only.
- Proposed: show last few failed entries, output count, and reset progress on completion.
- Why: operational clarity for multi-file runs.
- Scope: `src/components/panels/BatchPanel.tsx`, `src/types/image.ts` (if needed).

## D) File/Module Delta (Exact)

### ADD
- None expected (unless targeted tests require small new file).

### MODIFY
- `src-tauri/src/commands/batch.rs` — collision-safe output naming, completion event, stricter validation/tests.
- `src/components/layout/Sidebar.tsx` — expose Batch tool without requiring image load.
- `src/components/panels/BatchPanel.tsx` — robust dialog error handling, richer summary/errors.
- `src/types/image.ts` — optional completion payload type if needed.

### REMOVE/DEPRECATE
- None.

### Boundary rules
- UI must continue using `src/lib/tauri.ts` wrapper (no direct invoke in components).
- Batch command remains in `commands::batch` module only.

## E) Data Models & API Contracts (Delta)

- Current contracts: `BatchResizeRequest`, `BatchResult`, `BatchProgress` in `src/types/image.ts`, mirrored serde structs in Rust.
- Proposed change: keep request/result backward-compatible; add completion event payload (event-only, not command return contract change).
- Compatibility: no breaking change to existing command signature/return.
- Persisted data: none; no migrations.
- Versioning: in-place additive eventing.

## F) Implementation Sequence (Dependency-Explicit)

1. **Step S1: Backend hardening**
   - Objective: prevent output collisions, strengthen per-file checks, add completion event.
   - Files: `src-tauri/src/commands/batch.rs`
   - Preconditions: baseline known.
   - Verification: `pnpm build` (type+bundle sanity), `cargo test` (best effort, likely env warning).
   - Rollback: revert batch.rs changes only.

2. **Step S2: Frontend sidebar accessibility split**
   - Objective: make Batch nav available without loaded image.
   - Files: `src/components/layout/Sidebar.tsx`
   - Dependencies: none.
   - Verification: `pnpm test:run`, `pnpm build`.
   - Rollback: restore previous sidebar conditional rendering.

3. **Step S3: Batch panel resilience + richer reporting**
   - Objective: robust action error handling and better outcomes display.
   - Files: `src/components/panels/BatchPanel.tsx` (+ possibly `src/types/image.ts`)
   - Dependencies: S1 completion event optional handling.
   - Verification: `pnpm test:run`, `pnpm build`.
   - Rollback: revert panel changes.

4. **Step S4: Final hardening verification**
   - Objective: validate final repo health.
   - Verification: `pnpm test:run`, `pnpm build`, `cargo test` (documented env limitation).

## G) Error Handling & Edge Cases

- Backend edge cases to cover:
  - empty input list
  - zero dimensions
  - missing input file
  - unsupported format
  - output filename collisions
- Frontend edge cases:
  - dialog cancellation
  - dialog throw/reject
  - running with no output dir/inputs
  - displaying multiple failures

## H) Integration & Testing Strategy

- Keep batch command integration via existing IPC wrapper.
- Add/extend Rust unit tests in `batch.rs` for collision naming and extension mapping.
- Keep frontend verification via existing Vitest + build.
- DoD:
  - batch accessible without single-image open
  - no output overwrite on collisions
  - progress/results/errors clear in UI
  - existing tests/build still pass

## I) Assumptions & Judgment Calls

### Assumptions
- Inline review feedback maps to robustness/usability concerns around current batch implementation.
- No hidden private API consumers depend on output file naming pattern.

### Judgment calls
- Additive completion event instead of contract rewrite.
- Keep single-threaded backend loop for predictability in this patch.
