# TOMORROW

## Top 3 Priorities
1. Continue Jellyfin handler modularization beyond episode extraction (`jellyfin_sync.go`, `jellyfin_episode_sync.go`)
2. Run a full code/architecture/UX review pass across sync/admin surfaces and capture findings
3. Verify CI-equivalent regression path (`go test`, `npm test`, `npm run build`) and migration health on a clean start

## First 15-Minute Task
Open `backend/internal/handlers/jellyfin_sync.go`, list remaining oversized handlers/helpers with rough line counts, and choose the first extraction target for a new focused file.

## Dependencies To Unblock
- Ensure the Jellyfin test instance is reachable before sync smoke tests
- Confirm CI job/runtime parity with local toolchain versions

## Nice-To-Have
- Add lightweight diagnostics around Jellyfin timeout/error cases in admin sync flow
- Document the local `pg_trgm` benchmark method/results in a durable note
