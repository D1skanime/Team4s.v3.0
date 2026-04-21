# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 20.1 DB Schema v2 physical cutover is verified and deployed locally in Docker.
- **Current branch:** `main`
- **Rough completion:** Phase 20 can start on the normalized release schema; release-native episode import writes remain the next slice.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Clean DB migration from zero through migration 46 has been verified against `team4s_v2_plan04_clean`.
- DB Schema v2 contract audit passes with 401 present artifacts, 0 missing artifacts, 0 legacy episode-version deletion targets, and only the allowed old `streams` compatibility table divergence.
- The legacy `episode_versions`, `episode_version_images`, and `episode_version_episodes` tables are absent after migration.
- Target schema tables remain present, including `episodes`, `episode_titles`, `episode_types`, `languages`, `release_variants`, `release_variant_episodes`, `release_streams`, `media_assets`, `anime_media`, and `release_media`.
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
- Phase 20 still needs to implement release-native episode import apply writes against `release_variant_episodes`, `release_streams`, and the release graph.
- Legacy episode-version mutation routes intentionally return Phase 20 deferred errors instead of writing partial replacement rows.
- Group release screenshot thumbnails remain deferred until release-native media linking lands.
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
- `powershell -ExecutionPolicy Bypass -File .\scripts\schema-v2-audit.ps1`
- `powershell -ExecutionPolicy Bypass -File .\scripts\schema-v2-contract-check.ps1 -OutputPath .\.planning\phases\20.1-db-schema-v2-physical-cutover\20.1-04-schema-audit.md`
- `powershell -ExecutionPolicy Bypass -File .\scripts\reset-local-schema-cutover-data.ps1 -ConfirmLocal`

## Verification Evidence
- `cd backend && go run ./cmd/migrate up -database-url "postgres://team4s:team4s_dev_password@localhost:5433/team4s_v2_plan04_clean?sslmode=disable" -dir ..\database\migrations` passed from a clean database and applied 46 migrations.
- `powershell -ExecutionPolicy Bypass -File .\scripts\schema-v2-contract-check.ps1 -OutputPath .\.planning\phases\20.1-db-schema-v2-physical-cutover\20.1-04-schema-audit.md` passed.
- Direct Postgres queries confirmed `episode_versions`, `episode_version_images`, and `episode_version_episodes` are absent while target identity/release/media tables remain.
- `cd backend && go test ./internal/... -count=1` passed.
- `cd frontend && npm run build` passed.
- `docker compose up -d --build team4sv30-backend team4sv30-frontend` built the backend and frontend images; an interrupted Compose recreate left stale non-running replacement containers, which were removed before starting the freshly built images.
- Smoke: `http://127.0.0.1:8092/health` returned `200`.
- Smoke: `http://127.0.0.1:8092/api/v1/anime` returned `200`.
- Smoke: `http://127.0.0.1:3002/admin` returned `200`.
- Smoke: `http://127.0.0.1:3002/admin/anime/create` returned `200`.
- Smoke: `http://127.0.0.1:3002/admin/fansubs` returned `200`.
- `cd frontend && npm test -- src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx` passed: 38 tests.
- `cd frontend && npm test -- createAssetUploadPlan.test.ts` passed during the multi-background-video work.
- `cd frontend && npm run build` passed after the final spacing/video-grid changes.
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services` passed during the background-video persistence work.
- Docker rebuild/deploy succeeded with `docker compose up -d --build team4sv30-frontend`.
- Smoke: `http://127.0.0.1:3002/admin/anime/create` returned `200`.
- Smoke: `http://127.0.0.1:8092/api/v1/anime` returned `200`.

## Top 3 Next
1. Execute Phase 20 Plan 01 against the verified DB Schema v2 foundation.
2. Keep release-native episode import writes on `release_variant_episodes`, `release_streams`, and the release graph; do not recreate legacy episode-version tables.
3. Verify Naruto-style combined-file coverage and filler metadata in Phase 20 before broadening import behavior.

## Risks / Blockers
- Phase 20 import apply remains intentionally deferred until release-native writes are implemented.
- The old `streams` table still exists as an allowed compatibility leftover beside target `release_streams`; new import work must not write to it as the authoritative stream model.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
