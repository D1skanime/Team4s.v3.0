# WORKING_NOTES

## Current Workflow Phase
- Anime Create UX/UI follow-through is closed for the current v1.1 slice.
- The repo is ready to move from create-page polish back into the next narrow roadmap decision.

## Useful Facts To Keep
- The create asset seam now supports:
  - `cover`
  - `banner`
  - `logo`
  - additive `background`
  - additive `background_video`
- Background videos are staged as an array in the frontend, linked through `POST /api/v1/admin/anime/:id/assets/background_videos`, and resolved at runtime via `BackgroundVideos` with singular fallback.
- The asset UI is intentionally reference-like:
  - Cover/Banner/Logo primary cards touch as one row.
  - Backgrounds live in the right grid with a soft divider.
  - Background videos live below primary cards in a compact two-column grid.
  - Source badges sit directly on image previews where useful.
  - Remove buttons sit on the image preview for backgrounds and video cards.
- AniSearch no longer renders the development-only details block after a load. Duplicate/conflict and error states still render.
- `Ordnerpfad` comes from `jellyfinPreview.jellyfin_series_path` and is shown readonly in Basisdaten.
- Basisdaten now includes the formerly separate title/year fields in one card.
- Provider source labels are normalized from staged provider keys where possible: TMDB, Zerochan, Fanart.tv, AniList, Konachan, Safebooru, Manuell, Online.
- The backend still preserves compatibility with old singular `BackgroundVideo`, but new multi-video behavior should prefer `BackgroundVideos`.
- Canonical repo is `C:\Users\admin\Documents\Team4s`; ignore the old `Team4sV2` recovery workspace.

## Verification Memory
- Frontend create card/page tests passed after hiding AniSearch diagnostics and after the final spacing/video-grid polish.
- Frontend production build passed after final CSS changes.
- Backend repository/handler/service tests passed during the multi-video persistence pass.
- Docker rebuild succeeded and the local create page responded with `200`.

## Mental Unload
- The biggest risk tomorrow is not code, it is over-polishing. If the user likes the final create page, pick the next slice instead of continuing to chase pixels.
- If another asset issue appears, first check whether it is a CSS/layout issue or a persistence/provenance issue; avoid mixing both in one change unless necessary.
