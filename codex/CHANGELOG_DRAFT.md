# Changelog Draft

## Theme: Batch pipeline hardening

### What changed
- Hardened backend batch output handling to avoid filename collisions by generating unique suffixed output paths.
- Added explicit backend completion event (`batch-complete`) in addition to command return payload.
- Added per-file input existence guard in backend loop with clearer error entries.
- Refactored sidebar gating so Batch is available without loading a single image first.
- Improved batch panel robustness (dialog error handling, safer numeric guards) and richer result/error reporting.

### Why it changed
- Prior implementation allowed output overwrites on duplicate filenames and offered limited operational transparency.
- Batch UX was unintentionally blocked by single-image editing preconditions.
- Error handling needed to be resilient for production desktop workflows.

### User-visible behavior changes
- Users can open and use Batch directly from sidebar before loading an image into the viewer.
- Batch output files no longer overwrite previous files when names collide in target folder.
- Batch panel now displays clearer status and multiple error entries.
