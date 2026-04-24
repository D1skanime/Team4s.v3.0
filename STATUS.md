# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 21 is complete, and Phase 22 anime-edit/create-flow alignment is actively implemented and live on Docker.
- **Current branch:** `main`
- **Current focus:** finish the honest close/verify pass for `Phase 22 - Anime Edit On Create-Flow Foundation`.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 release-native import baseline remains verified complete.
- Phase 21 fansub group chips and deterministic collaboration wiring are complete and UAT-approved.
- Anime edit now uses the shared create-style workspace instead of the old divergent edit UI.
- Jellyfin reselection in anime edit uses the simplified create-style search/adopt flow.
- Anime edit assets now merge manual and Jellyfin fallback assets for backgrounds and background videos.
- Individual Jellyfin assets can be dismissed in edit without removing the overall Jellyfin source linkage.
- The top provenance banner and duplicate save button were removed from anime edit.
- The episode overview no longer shows the obsolete `Korrektur-Sync` action.
- Deleting an episode version now works through the backend release-native delete path instead of returning `500`.
- The default fansub admin list hides collaboration records so the everyday list only shows real groups.

## What Is Not Done Yet
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Phase 22 is not yet formally verified/closed.
- Some local temp/cache/debug directories and screenshots are still present in the worktree and are not part of the intended code/history.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/edit/page.test.tsx`
- `cd frontend && npm.cmd run build`

## Verification Evidence
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-24.
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/edit/page.test.tsx` passed on 2026-04-24.
- `cd frontend && npm.cmd run build` passed on 2026-04-24.
- Docker rebuild/redeploy passed during the 2026-04-24 edit/fansub/delete fixes.
- Smoke checks returned `200` for:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:3002/admin/anime/4/edit`
  - `http://127.0.0.1:3002/admin/anime/4/episodes`
  - `http://127.0.0.1:3002/admin/fansubs`

## Top 3 Next
1. Decide whether the current anime edit baseline is sufficient to verify/close Phase 22.
2. If not, capture the next smallest remaining edit-route gap explicitly instead of reopening broad legacy behavior.
3. Re-run cross-AI review once an independent reviewer CLI is available locally.

## Risks / Blockers
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- Untracked local temp/cache/debug artifacts still clutter the worktree and should stay out of history.
