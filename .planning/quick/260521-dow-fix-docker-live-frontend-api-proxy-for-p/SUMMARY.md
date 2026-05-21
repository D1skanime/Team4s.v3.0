---
status: complete
completed: 2026-05-21
quick_id: 260521-dow
slug: fix-docker-live-frontend-api-proxy-for-p
---

# Summary

Fixed the Docker-live frontend current-user resolution path for Phase 49 without changing the central Auth/API ownership model.

## Changed
- Added a same-origin `/api/v1/*` Next route that proxies to `API_INTERNAL_URL`.
- Updated the central API base selection so browser calls use the same-origin proxy when `NEXT_PUBLIC_API_URL` is empty or loopback.
- Added focused proxy tests for target URL construction, Docker hostname normalization, and header forwarding.
- Kept the no-token boundary test explicit by allowlisting the server-side API proxy as a fetch boundary.

## Verification
- `npm run test -- src/lib/server/apiProxy.test.ts src/lib/api.no-token-boundary.test.ts src/lib/api.auth-refresh.test.ts`
- `npm run typecheck`
- `npm run build`
- `docker compose up -d --build team4sv30-frontend`
- `curl http://127.0.0.1:3002/api/v1/me` returned backend `401` (`anmeldung erforderlich`) instead of a connection refusal.

## Notes
- The local ignored `.env` was adjusted to leave `NEXT_PUBLIC_API_URL` empty for Docker-live testing.
- Full lint was not rerun because the known unrelated lint failures remain outside this quick fix.
