# WORKING_NOTES

## Current Workflow Phase
- `main` is already through verified Phase 15.
- Current dirty work is Phase-15 follow-through: make provider-selected create assets survive the authoritative save path and keep useful provenance.

## Useful Facts To Keep
- The verified good seam is now:
  - manual create -> `/api/v1/admin/upload`
  - V2 media persistence
  - generic link helpers for `cover`, `banner`, `logo`, `background`, and `background_video`
  - edit-route asset actions in the provenance cards
  - `Cover entfernen` / non-cover removal through the same V2 model
  - anime delete cleanup for the current run
- Phase 14/15 added:
  - separate provider-search state on create
  - slot-specific `Online suchen` actions
  - source-visible chooser results
  - remote-result adoption by staging local `File` objects instead of inventing a second persistence channel
- Tags are now part of the create baseline:
  - visible create-page tag card
  - authoritative write on save
  - normalized `tags` + `anime_tags`
  - junction cleanup on anime delete
- Today's key follow-through changes:
  - create payload can now carry `banner_image`, `logo_image`, `background_video_url`, and `background_image_urls`
  - backend create validation/model path accepts those fields
  - V2 create now attaches those URLs into `media_assets` / `anime_media`
  - create-side background upload/linking can keep `providerKey` and persist a `media_external` row
- `fanart.tv` now serves as a background source too via `showbackground`.
- Safebooru deterministic start offset was reduced from `200` to `10` to avoid skipping tiny niche result pools.
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
- The handoff drift was starting to lie about the actual baseline; that is fixed now, so tomorrow should trust the refreshed root files instead of the older story.
- The most useful next move is verification, not more cleverness: prove that remote-selected non-cover assets really survive create/save.
- If verification passes, decide calmly whether relation UX is still next or whether create-asset hardening needs one more narrow cleanup slice.
