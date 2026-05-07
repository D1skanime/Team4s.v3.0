# WORKING_NOTES

## Current Workflow Phase
- Phase 33 abgeschlossen. Kein aktiver Plan. `origin/main` ist in sync nach Push am 2026-05-07.
- Nächste Phase noch offen — Kandidaten: Segment-Playback, Fansub Group Media, Asset-Lifecycle-Folgearbeit.

## Useful Facts To Keep
- `docs/architecture/db-schema-fansub-domain.md` is the first domain-reference stop for fansub/anime/release persistence questions.
- `release_version_groups.fansub_group_id` is the canonical runtime group column; `fansubgroup_id` is legacy cleanup territory only.
- Anime and episodes stay neutral; release/process media must not get attached directly to those neutral entities.
- Phase 30 moved release identity onto explicit admin endpoints.
- Phase 31 made `Anime & Releases` the main release-context workspace on fansub edit.
- Phase 32 completed real browser round-trips on `/admin/fansubs/88/edit` for Release 41 and Release 42.
- Phase 33: `InsertMediaFile` Aufruf nach `CreateMediaAsset` in beiden Release-Theme-Upload-Handlern — sorgt dafür dass `size_bytes` aus `media_files` korrekt befüllt wird.
- Release-theme uploads store under `media/release-theme-assets/release_<releaseId>/theme_<themeId>/...`.
- Theme-Types in DB: id=1 OP Kara, id=3 ED Kara, id=5 Insert Kara, id=6 Outro (Migration 0058).
- PNG-Uploads gehen durch `imageExtFromMime()` in `media_upload_image.go` — kein JPG-Downgrade mehr.
- The current browser target is `http://127.0.0.1:3002/admin/fansubs/88/edit`.
- Local Jellyfin testing was temporarily pointed at `http://192.168.235.100:8098`.
- Untracked scratch/cache files are present locally and should not be staged accidentally.

## Verification Memory
- 2026-05-07: Release 41 delete + re-upload → `size_bytes: 10906996` (Phase 33 UAT).
- 2026-05-07: Docker rebuild (`--build team4sv30-backend`) nach allen Fixes erfolgreich.
- `go test ./...` passed on 2026-05-06.
- `cd frontend && npm test -- --run` passed on 2026-05-06: 37 files / 357 tests.
- `cd frontend && npm run lint` passed on 2026-05-06 with 0 errors and 26 unrelated warnings.
