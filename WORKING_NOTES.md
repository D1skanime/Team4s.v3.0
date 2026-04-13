# WORKING_NOTES

## Current Workflow Phase
- Phase 13 is now complete in practice and pushed.
- Next move is the deliberately chosen edit-route relation UX slice, not a reopen of the verified create relation seam.

## Useful Facts To Keep
- The verified good seam is now:
  - manual create -> `/api/v1/admin/upload`
  - V2 media persistence
  - generic link helpers for `cover`, `banner`, `logo`, `background`, and `background_video`
  - edit-route asset actions in the provenance cards
  - `Cover entfernen` / non-cover removal through the same V2 model
  - anime delete cleanup for the current run
- Tags are now part of the create baseline:
  - visible create-page tag card
  - authoritative write on save
  - normalized `tags` + `anime_tags`
  - junction cleanup on anime delete
- AniSearch create relation follow-through is now part of the baseline too:
  - create payload keeps AniSearch `relations`
  - backend follow-through persists them after anime creation
  - duplicate rows degrade into `skipped_existing` instead of false warnings
- The last real AniSearch parser bug was not a missing relation page request; it was the `data-graph` JSON decode failing when `manga` / `movie` came back as empty arrays instead of objects.
- Concrete proof case: `10250` now parses into:
  - `Hauptgeschichte -> Ace of the Diamond (8674)`
  - `Fortsetzung -> Ace of the Diamond: Act II (13997)`
- The old `frontend/public/covers` and `/api/admin/upload-cover` paths are legacy traps and should not come back into active flows.
- Persisted asset resolution in `backend/internal/repository/anime_assets.go` needed `COALESCE(ma.modified_at, ma.created_at)` to stop manual non-cover assets from disappearing in the edit UI.
- Backgrounds should stay modeled as additive galleries in the UI; trying to force them into a singular compare-card made the interface worse.
- `0042_add_tag_tables_forward_fix` exists because historical applied migrations must not be edited to add new schema.
- Local dev now has a supported shape:
  - Docker for DB/Redis
  - `scripts/start-backend-dev.ps1`
  - `scripts/start-frontend-dev.ps1`
- Canonical repo is now `C:\Users\admin\Documents\Team4s`; `Team4sV2` was only the recovery workspace.

## Mental Unload
- The GitHub baseline is finally clean again, so avoid big repository surgery unless there is a clear reason.
- The next useful work is to scope edit-route relation UX cleanly, not to drift into "one more tiny AniSearch fix" or ad-hoc taxonomy expansion.
- Keep the first next step tomorrow to a short scoping task: inspect the current edit-route relation surface and write down the exact UX gaps before planning.
