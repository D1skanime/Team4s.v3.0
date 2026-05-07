# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 33 abgeschlossen. Kein aktiver Plan. Nächste Phase noch nicht festgelegt.
- **Current branch:** `main` — in sync mit `origin/main` nach Push am 2026-05-07.
- **Current focus:** Entscheiden welche Phase als nächstes kommt.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 release-native import baseline remains verified complete.
- Phase 21 fansub group chips and deterministic collaboration wiring are complete and UAT-approved.
- Phase 28 runtime playback/fallback behavior remains live-verified.
- Fansub create/edit community links use generic `fansub_group_links` rows for `website`, `discord`, `twitter`, `github`, and `irc`.
- Phase 30 explicit release endpoints exist for list, canonical release, and release-by-ID reads.
- Phase 31 fansub edit is a tabbed workspace with `Anime & Releases` as the release-context entry point.
- Phase 32 adds a release side drawer for concrete release-theme-asset editing without introducing new DB tables.
- Release-theme-asset upload works through explicit `Upload starten`.
- Release-theme delete removes the physical stored file as well as the DB/link state.
- New release-theme uploads store under `media/release-theme-assets/release_<releaseId>/theme_<themeId>/...`.
- Backend upload rejects conflicting release-specific uploads when a global/admin theme segment already covers the episode range.
- Fansub timeline status semantics: `Global/Admin` / `Release-Asset` / `Fehlt` (upload-required).
- Fansub timeline duration consumes `release_variants.duration_seconds`; Release 41 displays `00:23:03`.
- Phase 33: Release-theme uploads schreiben jetzt `media_files (variant='original')` → `size_bytes` korrekt persistent (UAT: 10906996 bytes für media_id 90).
- PNG-Logo-Uploads behalten Quellformat (kein stilles JPG-Downgrade mehr).
- Theme-Types in DB und Frontend: OP Kara, ED Kara, Insert Kara, Outro.

## What Is Not Done Yet
- Nächste Phase noch nicht entschieden (Kandidaten: Segment-Playback, Fansub Group Media, Asset-Lifecycle-Folgearbeit).
- `fansub_groups.closed_year` und `history_description` — Entscheidung ob hard-drop möglich ist steht aus.
- Formale Ablösung/Entfernung der alten manual-vs-Jellyfin Entry-Choice-UX steht aus.
- Cross-AI review weiterhin lokal nicht verfügbar.
- `npm run lint` passes mit 26 unrelated pre-existing warnings.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `docker compose up -d --build team4sv30-frontend`
- `go test ./...`
- `go test ./internal/models ./internal/repository ./internal/handlers -run "TestAdminContentFansubReleases|TestAdminFansubReleases"`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npx tsc --noEmit`
- `http://127.0.0.1:3002/admin/fansubs/88/edit`
- `http://127.0.0.1:3002/admin/episode-versions/41/edit`

## Verification Evidence
- 2026-05-07: Release 41 re-upload nach Delete → `size_bytes: 10906996` (Phase 33 UAT bestätigt).
- 2026-05-07: `go test ./internal/handlers -run "TestReleaseThemeAsset_InsertMediaFile"` passed (source-text tests).
- 2026-05-07: Docker rebuild (`--build team4sv30-backend`) nach Phase-33-Fix erfolgreich.
- 2026-05-06: `go test ./...` passed.
- 2026-05-06: `cd frontend && npx tsc --noEmit` passed.
- 2026-05-06: `cd frontend && npm test -- --run` passed with 37 files / 357 tests.
- 2026-05-06: `cd frontend && npm run lint` passed with 0 errors and 26 unrelated warnings.
- 2026-05-06: `docker compose up -d --build team4sv30-frontend` passed.
- 2026-05-06 browser verification on `/admin/fansubs/88/edit`:
  - Release 41 right-axis duration is `00:23:03`.
  - OP/IN cards show `Release-Asset`.
  - stale `Anfrage fehlgeschlagen` is gone after successful upload.
  - the timeline rail is grey and visually clear.

## Top 3 Next
1. Smoke-test delete/re-upload of one Release 41 release-theme asset on `/admin/fansubs/88/edit`.
2. Decide whether to fix release-theme asset `size_bytes` metadata currently listed as `0`.
3. Prepare the 13 ahead commits for push/PR after the final smoke pass.

## Risks / Blockers
- Wrong-domain persistence remains the biggest product risk: release/fansub media must not drift onto neutral anime or episode entities.
- Branch `main` is ahead of `origin/main` by 13 commits and should be pushed or wrapped into a PR after final smoke.
- Untracked scratch/cache files are present locally and should stay out of product commits.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
