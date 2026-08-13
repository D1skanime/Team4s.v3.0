# Phase 56: Cropper - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 56-cropper
**Areas discussed:** Library replacement rationale

---

## Library Replacement Rationale

| Option | Description | Selected |
|--------|-------------|----------|
| Patch existing cropper foundation | Keep improving the current project-owned crop math and inline cropper flows. | |
| Choose a different maintained library | Replace the existing cropper foundation because it does not perform the required functions well enough. | yes |
| Lock a specific candidate immediately | Treat a previously mentioned candidate as already chosen before implementation proof. | |

**User's choice:** Use another library because the existing cropper foundation does not handle the needed functions well.
**Notes:** Context and plans now state that no cropper dependency is pre-locked. The executor must compare maintained libraries against Team4s' required functions and choose the one that works, while preserving the existing avatar and fansub media upload/domain seams.

---

## the agent's Discretion

- The executor may choose the exact maintained cropper library after comparing candidates against preview/export parity, fixed 1:1/circular crop, mobile/touch, keyboard/focus behavior, zoom/reset/apply/cancel controls, and reliable Blob/File export.

## Deferred Ideas

- None from this discussion.
