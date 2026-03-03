# Sync/Admin Hardening Review (2026-03-03)

## Scope Reviewed
- Backend Jellyfin sync/search/preview handlers and helper split
- Frontend admin sync feedback mapping and guard behavior
- API contract/error-shape consistency for Jellyfin admin flows
- Runtime/deployment validation path for sync/admin surfaces

## Findings

### 1) Handler modularization target reached for active sync entrypoints
- `jellyfin_sync.go` reduced to 144 lines.
- `jellyfin_episode_sync.go` reduced to 114 lines.
- Behavior-preserving helper extraction completed for import/metadata/cleanup and episode sync flow.
- Risk level: low (improves maintainability, no contract changes).

### 2) Timeout diagnostics gap addressed with transport-level logging
- Added centralized Jellyfin transport diagnostics in `fetchJellyfinJSON`:
  - `path`
  - `elapsed_ms`
  - transport `category` (`timeout` / `connectivity` / `transport`)
- Upstream error classification now distinguishes timeout-focused operator guidance from generic connectivity guidance.
- Risk level: low (observability improvement only).

### 3) Contract/UX alignment remains stable
- Error envelope still uses stable shape:
  - `error.message`
  - optional `error.code`
  - optional `error.details`
- Existing frontend mapping (`jellyfin_unreachable`, `jellyfin_auth_invalid`, etc.) remains compatible.
- Bulk season sync vs corrective single-episode sync mental model remains explicit in UX copy/docs.
- Risk level: low.

### 4) Quality gate rerun after refactor and diagnostics changes
- `go test ./...` passed.
- `npm test` passed.
- `npm run build` passed.
- Runtime checks:
  - `/health` OK
  - migration status clean (`Applied: 17, Pending: 0`)
  - `scripts/smoke-admin-content.ps1` passed (`25/25`)
- Risk level: low.

## Remaining Follow-Ups
- Add explicit timeout simulation test case for Jellyfin integration lane (transport failure fixture).
- Add periodic review of Jellyfin timeout logs to confirm actionable signal/noise ratio after production-like load.
