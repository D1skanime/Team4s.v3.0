# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** Phase 4 - Provenance, Assets, And Safe Resync
- **Status:** `04-03` is now materially implemented and verified for persisted `cover`, `banner`, and `backgrounds`
- **Rough completion:** ~80-85% of the current Phase 4 slice; the main remaining uncertainty is phase wrap-up discipline, not the cover-slot implementation itself

## What Works Now
- Docker stack is running and was used for live verification on 2026-03-27.
- Phase 3 remains closed and verified; active work stays in Phase 4.
- Admin backend routes exist for Jellyfin context, preview, apply, and explicit asset-slot actions.
- Anime asset persistence now covers:
  - `cover`
  - `banner`
  - `backgrounds`
- Public/runtime precedence prefers persisted anime assets before Jellyfin fallback.
- Manual ownership is explicit and protected during provider apply/resync.
- `cover` now uses the same persisted slot model as `banner` and `backgrounds`, while `cover_image` is still mirrored for compatibility.
- The edit route shows:
  - Jellyfin provenance
  - preview-first metadata apply controls
  - provider asset previews
  - persisted cover/banner/background management
  - destructive actions with explicit operator feedback

## Verification
- `cd backend && go test ./internal/repository ./internal/handlers ./cmd/server -run 'Test(ReconcileAnimeProviderBackgrounds|ResolveAnimeAssetURL|BuildMetadataFieldPreview|BuildJellyfinCoverPreview|MapPersistedAnimeAssets)' -count=1`
- `cd frontend && npm run test -- src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts`
- `cd frontend && npm run build`
- `docker compose -f docker-compose.yml exec -T team4sv30-backend ./migrate status`
- `docker compose -f docker-compose.yml exec -T team4sv30-backend ./migrate up`
- Runtime smoke:
  - `GET /api/v1/admin/anime/25/jellyfin/context`
  - `POST /api/v1/admin/anime/25/jellyfin/metadata/preview`
  - `POST /api/v1/admin/anime/25/jellyfin/metadata/apply` with `apply_cover=true`
  - DB verification that manual cover ownership survives apply
- Browser smoke:
  - `/admin/anime/25/edit`
  - `Cover entfernen`
  - `Cover hochladen`
  - `Metadaten preview laden`

## Top 3 Next
1. Decide whether `04-03` should now be marked phase-complete/verify-complete in the planning files.
2. Decide whether the temporary Playwright cover smoke should stay as a durable regression test or remain ad-hoc evidence only.
3. Keep the repo-local closeout/resume notes aligned with the real Team4s work instead of broader root planning noise.

## Known Risks / Blockers
- **Planning drift risk:** the implementation is ahead of the formal phase closeout unless the Phase 4 plan/status files are updated accordingly.
- **Dirty worktree remains wide:** there are many unrelated local changes outside the verified cover-slot slice.
- **Ad-hoc browser smoke:** the cover UI flow is verified, but the current Playwright script lives in `frontend/tmp-playwright-phase4` rather than a permanent automated test lane.

## Valid Commands
- Start stack: `docker compose up -d --build`
- Backend targeted tests: `cd backend && go test ./internal/repository ./internal/handlers ./cmd/server -run 'Test(ReconcileAnimeProviderBackgrounds|ResolveAnimeAssetURL|BuildMetadataFieldPreview|BuildJellyfinCoverPreview|MapPersistedAnimeAssets)' -count=1`
- Frontend focused test: `cd frontend && npm run test -- src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts`
- Frontend production build: `cd frontend && npm run build`
- Container migration status: `docker compose -f docker-compose.yml exec -T team4sv30-backend ./migrate status`
- Apply migrations in container: `docker compose -f docker-compose.yml exec -T team4sv30-backend ./migrate up`
- Ad-hoc cover UI smoke: `node frontend/tmp-playwright-phase4/cover-ui-smoke.mjs`

## Owner Focus
- Backend lane: keep persisted asset-slot ownership rules stable across apply/resync
- Frontend lane: preserve the now-verified cover/banner/background controls on the edit route
- Planning/handoff lane: close the gap between verified implementation and formal Phase 4 tracking
