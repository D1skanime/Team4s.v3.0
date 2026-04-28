# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 27 reusable segment-library identity/reuse is functionally verified in live Docker UAT, with one migration bookkeeping follow-up still open.
- **Current branch:** `main`
- **Current focus:** close the migration bookkeeping gap around Phase 27 after the live reuse flow passed.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 release-native import baseline remains verified complete.
- Phase 21 fansub group chips and deterministic collaboration wiring are complete and UAT-approved.
- Anime edit now uses the shared create-style workspace instead of the old divergent edit UI.
- Jellyfin reselection in anime edit uses the simplified create-style search/adopt flow.
- The old anime themes page is retired from the active flow; segment work happens on episode-version edit.
- Segment editing on `/admin/episode-versions/:id/edit` supports generic types (`OP`, `ED`, `Insert`, `Outro`) plus free names.
- Same-release segments reappear on covered episodes, while foreign-release segments show as adoptable suggestions.
- Segment source assets can be uploaded, persisted, replaced, and deleted for `release_asset` segments.
- The segment table now surfaces the uploaded file name instead of only a generic source label.
- The grouped episode overview now surfaces segment presence and uploaded-file presence per version row.
- Reusable segment-library definitions/assets now survive anime delete and can be rediscovered by the same AniSearch identity plus fansub-group context.
- The segment editor now exposes reusable library candidates and marks reused assets with provenance metadata.
- The episode overview no longer shows the obsolete `Korrektur-Sync` action.
- Deleting an episode version now works through the backend release-native delete path instead of returning `500`.
- The default fansub admin list hides collaboration records so the everyday list only shows real groups.

## What Is Not Done Yet
- The Phase-27 runtime migration state was inconsistent once: migration `52` appeared applied before the `segment_library_*` tables physically existed.
- The future fansub-self-service upload route for segment files is still a product direction, not an implemented surface.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Some local temp/cache/debug directories and screenshots are still present in the worktree and are not part of the intended code/history.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go build ./...`
- `cd backend && go test ./internal/repository -run 'DeleteAnimeSource|SegmentLibrary' -count=1`
- `cd backend && go test ./internal/handlers -count=1`
- `cd frontend && npm.cmd run build`
- `http://localhost:3002/admin/episode-versions/47/edit`

## Verification Evidence
- `cd backend && go build ./...` passed on 2026-04-28.
- `cd backend && go test ./internal/repository -run 'DeleteAnimeSource|SegmentLibrary' -count=1` passed on 2026-04-28.
- `cd backend && go test ./internal/handlers -count=1` passed on 2026-04-28.
- `cd frontend && npm.cmd run build` passed on 2026-04-28.
- Docker rebuild/redeploy passed on 2026-04-28 after the segment-library reuse changes.
- Live Phase-27 UAT passed on 2026-04-28:
  - uploaded a segment asset on seed anime `8`
  - deleted anime `8`
  - recreated anime `11` with the same AniSearch ID `5468`
  - rediscovered one library candidate
  - attached that candidate to recreated segment `8`
- Smoke checks returned `200` for:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:3002/admin/episode-versions/47/edit`

## Top 3 Next
1. Audit why migration `52` was marked applied before `segment_library_*` tables physically existed in the DB.
2. Decide whether upload-time assets should also be mirrored into the segment library immediately, not only on delete-detach.
3. Choose the next smallest slice after reuse, likely around formal Phase-26/27 closeout or later fansub-self-service workflows.

## Risks / Blockers
- Migration bookkeeping for Phase 27 needs follow-up because runtime state and schema_migration state diverged once.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Untracked local temp/cache/debug artifacts still clutter the worktree and should stay out of history.
