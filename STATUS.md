# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 25 is live/UAT-backed, and Phase 26 segment source asset upload/persistence is implemented and needs final live verification.
- **Current branch:** `main`
- **Current focus:** finish the honest close/verify pass for `Phase 26 - Segment Source Asset Upload And Persistence`.

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
- The episode overview no longer shows the obsolete `Korrektur-Sync` action.
- Deleting an episode version now works through the backend release-native delete path instead of returning `500`.
- The default fansub admin list hides collaboration records so the everyday list only shows real groups.

## What Is Not Done Yet
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Phase 26 is not yet formally live-verified/closed.
- The future fansub-self-service upload route for segment files is still a product direction, not an implemented surface.
- Some local temp/cache/debug directories and screenshots are still present in the worktree and are not part of the intended code/history.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go build ./...`
- `cd frontend && npm.cmd run build`
- `http://localhost:3002/admin/episode-versions/5/edit`
- `http://localhost:3002/admin/anime/4/episodes`

## Verification Evidence
- `cd backend && go build ./...` passed on 2026-04-28.
- `cd frontend && npm.cmd run build` passed on 2026-04-28.
- Docker rebuild/redeploy passed on 2026-04-28 after the segment-status visibility changes.
- Smoke checks returned `200` for:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:3002/admin/episode-versions/5/edit`
  - `http://127.0.0.1:3002/admin/anime/4/episodes`

## Top 3 Next
1. Verify live that segment rows show uploaded file names and that episode overview version rows show correct segment/file badges.
2. If that passes, close or verify Phase 26 formally instead of reopening broad theme-management work.
3. Decide the next smallest slice for segment-file workflows, likely around later fansub-self-service upload reuse.

## Risks / Blockers
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Untracked local temp/cache/debug artifacts still clutter the worktree and should stay out of history.
