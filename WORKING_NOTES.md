# WORKING_NOTES

## Current Workflow Phase
- Phase 07 is verified and approved.
- Next move is post-Phase-07 planning and tracking sync, not more lifecycle bug-hunting.

## Useful Facts To Keep
- The verified good seam is now:
  - manual create -> `/api/v1/admin/upload`
  - V2 media persistence
  - generic link helpers for `cover`, `banner`, `logo`, `background`, and `background_video`
  - edit-route asset actions in the provenance cards
  - `Cover entfernen` / non-cover removal through the same V2 model
  - anime delete cleanup for the current run
- The old `frontend/public/covers` and `/api/admin/upload-cover` paths are legacy traps and should not come back into active flows.
- Persisted asset resolution in `backend/internal/repository/anime_assets.go` needed `COALESCE(ma.modified_at, ma.created_at)` to stop manual non-cover assets from disappearing in the edit UI.
- Backgrounds should stay modeled as additive galleries in the UI; trying to force them into a singular compare-card made the interface worse.

## Mental Unload
- The main remaining ambiguity is strategic, not technical: what Phase 08 should actually be.
- Planning drift still exists around roadmap/milestone files; sync it, but do not let that turn into broad repo cleanup.
- The current workspace is very dirty, so any next slice should stay narrow and well-attributed.
