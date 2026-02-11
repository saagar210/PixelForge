# Decisions

## 2026-02-10

1. Keep batch scope focused (resize + export) rather than broad pipeline refactor.
   - Reason: minimizes risk and aligns with existing backend command shape.
   - Alternative rejected: introducing full operation graph in this pass (too broad).

2. Preserve existing Tauri command contract name (`run_batch_resize_export`).
   - Reason: avoid unnecessary API churn.
   - Alternative rejected: replacing command and requiring migration.

3. Improve reliability via targeted deltas:
   - output collision handling
   - stronger per-file validation/reporting
   - completion event
   - frontend resilience and clearer result rendering

4. Sidebar behavior changed to permit Batch without loaded canvas image.
   - Reason: batch workflow is independent of current in-canvas image.
   - Tradeoff: slight increase in sidebar conditional complexity.

5. Added `batch-complete` event while preserving command return result.
   - Reason: supports robust long-running UI state convergence and future background processing UX.
