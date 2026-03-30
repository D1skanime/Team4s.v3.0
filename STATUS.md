# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** Anime v2 schema cutover
- **Status:** local runtime now uses `team4s_v2`; anime create/list/detail/backdrops/delete are live on v2, while edit/update still remains on the legacy write path
- **Rough completion:** the first anime vertical is meaningfully running on v2, but the admin write surface is not fully migrated yet

## What Works Now
- Docker stack is running.
- Backend health is green on `http://localhost:8092/health`.
- Frontend is live on `http://localhost:3002`.
- Backend runtime DB is `team4s_v2`.
- Anime create on v2 writes `anime`, `anime_titles`, `anime_genres`, `media_assets`, `anime_media`, and `media_external`.
- Public anime list/detail/backdrops read from v2.
- Anime delete on v2 is auditable and removes normalized associations plus unreferenced cover media.
- Public Jellyfin poster/logo/banner rendering works after frontend media URL handling changes.

## Verification
- `cd backend && go test ./internal/handlers ./internal/repository`
- `cd frontend && npm run build`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- Live runtime checks performed today:
  - `POST /api/v1/admin/anime`
  - `GET /api/v1/anime`
  - `GET /api/v1/anime/:id`
  - `GET /api/v1/anime/:id/backdrops`
  - `DELETE /api/v1/admin/anime/:id`
  - direct DB verification in `team4s_v2` for create/delete side effects
  - browser check on `/anime/3` for Jellyfin poster/logo/banner rendering
- Additional focused verification:
  - `go test ./internal/handlers/...` for Jellyfin client UTF-8 normalization
  - direct fetch of `http://localhost:8092/api/v1/media/image?...kind=primary...`

## Top 3 Next
1. Move `UpdateAnime` / edit save persistence onto the v2 schema.
2. Audit remaining anime routes for legacy flat-column assumptions and either migrate or consciously shim them.
3. Decide how much of the older anime/asset compatibility layer should remain once edit/update is on v2.

## Known Risks / Blockers
- **Edit path mismatch:** `UpdateAnime` still writes to legacy flat anime columns and is the next likely break if someone expects full v2 admin editing.
- **Partial cutover risk:** anime create/read/delete are on v2, but not every adjacent route is migrated yet.
- **Dirty worktree is broad:** this push includes v2 DB/bootstrap, backend route migration, UI cleanup, delete/audit fixes, and rendering fixes together.

## Valid Commands
- Start stack: `docker compose up -d --build`
- Backend tests: `cd backend && go test ./internal/handlers ./internal/repository`
- Frontend production build: `cd frontend && npm run build`
- Backend health: `Invoke-WebRequest -UseBasicParsing http://localhost:8092/health | Select-Object -ExpandProperty Content`
- Public anime detail check: `Invoke-WebRequest -UseBasicParsing http://localhost:8092/api/v1/anime/3 | Select-Object -ExpandProperty Content`
- Public backdrop check: `Invoke-WebRequest -UseBasicParsing http://localhost:8092/api/v1/anime/3/backdrops | Select-Object -ExpandProperty Content`
- Runtime DB target check: `docker exec team4sv30-backend printenv DATABASE_URL`

## Owner Focus
- Backend lane: pull the remaining anime write path onto v2 without reintroducing flat-schema coupling
- Frontend lane: keep public/admin anime pages aligned with the new route/data shape
- Handoff lane: leave tomorrow with a clear v2 edit/update target, not the old Phase 4 context
