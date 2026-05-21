---
status: complete
completed: 2026-05-21
quick_id: 260521-efz
slug: audit-restliche-direkte-frontend-api-med
---

# Summary

Audited remaining direct frontend API/media URL construction and removed browser-facing loopback backend fallbacks that could break Docker-live `3002`.

## Changed
- Added `frontend/src/lib/publicApiUrl.ts` as a shared public/media URL helper.
- Reused that helper from the central API client and public/media consumers.
- Removed direct browser-facing `NEXT_PUBLIC_API_URL || http://localhost:8092` fallbacks from:
  - anime backdrop/media URL normalization
  - group asset media/image URL rendering
  - episode video modal stream URLs
  - screenshot gallery fetch URLs
  - Jellyfin intake asset URL rendering
  - anime/group public story imagery
- Added `publicApiUrl.test.ts` with a static production-source guard against direct browser loopback backend fallbacks.

## Verification
- `npm run test -- src/lib/publicApiUrl.test.ts src/lib/server/apiProxy.test.ts src/lib/api.no-token-boundary.test.ts src/lib/api.auth-refresh.test.ts`
- `npm run typecheck`
- `npm run build`
- `docker compose up -d --build team4sv30-frontend` built successfully, but Compose hit a transient backend container name conflict during recreate.
- Recovered by starting only the affected services: `docker compose up -d --no-deps --force-recreate team4sv30-frontend` and `docker compose up -d --no-deps team4sv30-backend`.
- `curl http://127.0.0.1:3002/api/v1/me` returned backend `401` instead of connection refusal.
- Browser smoke on `3002` found no `127.0.0.1:8092` or `localhost:8092` resource URLs on checked public/media/admin routes.

## Notes
- The remaining `localhost:8092` source matches are in explicit server streaming routes, where `API_INTERNAL_URL` takes precedence in Docker and the boundary is intentionally separate.
- Browser plugin login typing was blocked by local virtual clipboard integration during the final relogin attempt; the path audit and `3002` resource smoke still completed.
