# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Status:** Phase 20 is verified complete; live Docker UAT and normalized-table evidence are captured.
- **Current branch:** `main`
- **Current focus:** choose the next narrow post-Phase-20 slice from the verified release-native import baseline.

## What Works Now
- Docker frontend is live on `http://127.0.0.1:3002`.
- Backend API is live on `http://127.0.0.1:8092`.
- Phase 20 backend apply writes target the normalized release graph (`episodes`, `episode_titles`, `fansub_releases`, `release_versions`, `release_variants`, `release_variant_episodes`, `stream_sources`, `release_streams`).
- Phase 20 import preview carries multilingual titles plus filler metadata.
- Episode import UI shows filler state, preferred title fallback, and editable release group/version fields before apply.
- Parallel releases for the same canonical episode now stay valid in the frontend instead of being downgraded to `conflict`.
- Multi-target mappings like `9,10` remain preserved through bulk confirm.
- Anime create now persists both Jellyfin and AniSearch provenance via authoritative `anime.source` plus `anime_source_links`.
- Live Docker replay for `3×3 Eyes` proved provider linkage, canonical episode persistence, multilingual `episode_titles`, release-native version rows, and Jellyfin-backed `release_streams`.
- Frontend production build passed on 2026-04-21.
- Docker rebuild/redeploy of `team4sv30-backend` and `team4sv30-frontend` passed on 2026-04-21.
- Smoke after rebuild passed:
  - `http://127.0.0.1:8092/health`
  - `http://127.0.0.1:8092/api/v1/anime`
  - `http://127.0.0.1:3002/admin`
  - `http://127.0.0.1:3002/admin/anime/1/episodes/import`

## What Is Not Done Yet
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
- The import workbench still allows another `Mapping anwenden` after an idempotent successful apply; that is a UX follow-up rather than a persistence blocker.

## Valid Commands
- `docker compose up -d team4sv30-db team4sv30-redis`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services -count=1`
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts`
- `cd frontend && npm.cmd run build`
- `powershell -ExecutionPolicy Bypass -File .\scripts\reset-local-schema-cutover-data.ps1 -ConfirmLocal`

## Verification Evidence
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services -count=1` passed on 2026-04-21.
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` passed: 23 tests.
- `cd frontend && npm.cmd run build` passed and included `/admin/anime/[id]/episodes/import` in build output.
- `docker compose up -d --build team4sv30-backend team4sv30-frontend` passed and restarted both services.
- Smoke checks returned `200` for backend health, anime list, admin root, and the episode import route.

## Top 3 Next
1. Decide the next narrow post-Phase-20 slice from the verified import baseline.
2. Consider a UX follow-up that clearly marks successful idempotent applies as already processed.
3. Re-run cross-AI review once an independent reviewer CLI is available locally.

## Risks / Blockers
- The old `streams` table still exists as an allowed compatibility leftover beside target `release_streams`; new import work must not treat it as authoritative.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.
