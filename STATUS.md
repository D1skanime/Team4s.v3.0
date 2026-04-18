# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Anime Create UX/UI follow-through is complete for this slice and deployed locally in Docker.
- **Current branch:** `main`
- **Rough completion:** Core anime-create asset lifecycle work is now through the create-page UX/persistence pass.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Local dev startup also works without rebuilding app containers each time:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend-dev.ps1 -RunMigrations`
  - `powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend-dev.ps1`
- Anime create can stage and link `cover`, `banner`, `logo`, additive `background`, and additive `background_video` assets through the shared V2 seam.
- Anime create exposes separate provider search flows plus `Online suchen` chooser actions for `cover`, `banner`, `logo`, and `background`.
- Source/provenance labels render in the asset UI for Jellyfin, TMDB, Zerochan, Fanart.tv, Konachan, Safebooru, and manual assets.
- Background videos can be added more than once during create and are linked through the plural backend route.
- Runtime backdrop resolution can expose multiple background videos as theme videos.
- AniSearch create relation follow-through remains part of the verified baseline.
- AniSearch title search hides already-imported candidates and keeps duplicate redirect behavior.
- Tags persist through DB-backed `tags` / `anime_tags`.
- Anime edit/delete asset lifecycle behavior remains the baseline for persisted media cleanup.

## What Is Not Done Yet
- One final human browser pass after push is recommended to visually confirm the compact asset layout on the target screen.
- The next v1.1 slice has not been selected yet.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.

## Valid Commands
- `docker compose up -d --build team4sv30-frontend`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `docker compose up -d team4sv30-db team4sv30-redis`
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services -count=1`
- `cd backend && go test ./cmd/server -count=1`
- `cd frontend && npm test -- src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx`
- `cd frontend && npm test -- createAssetUploadPlan.test.ts`
- `cd frontend && npm run build`
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend-dev.ps1 -RunMigrations`
- `powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend-dev.ps1`

## Verification Evidence
- `cd frontend && npm test -- src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx` passed: 38 tests.
- `cd frontend && npm test -- createAssetUploadPlan.test.ts` passed during the multi-background-video work.
- `cd frontend && npm run build` passed after the final spacing/video-grid changes.
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services` passed during the background-video persistence work.
- Docker rebuild/deploy succeeded with `docker compose up -d --build team4sv30-frontend`.
- Smoke: `http://127.0.0.1:3002/admin/anime/create` returned `200`.
- Smoke: `http://127.0.0.1:8092/api/v1/anime` returned `200`.

## Top 3 Next
1. Do one 15-minute human smoke on the pushed `/admin/anime/create` page.
2. Choose the next narrow v1.1 slice from the now-closed Anime Create baseline.
3. Keep any follow-up UI polish separate from lifecycle/persistence changes unless a real regression appears.

## Risks / Blockers
- No known product blocker remains for Anime Create.
- Visual density may still need tiny tuning after human review on a real screen, but the functional path is verified.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
