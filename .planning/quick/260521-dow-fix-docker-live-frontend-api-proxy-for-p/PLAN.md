---
status: complete
created: 2026-05-21
quick_id: 260521-dow
slug: fix-docker-live-frontend-api-proxy-for-p
---

# Fix Docker Live Frontend API Proxy For Phase 49 Current User Session Resolution

## Goal
Keep the Phase 49 central Auth/API client as the only browser token lifecycle owner, but fix the Docker-live runtime path so the current-user lookup after Keycloak login does not call `http://127.0.0.1:8092/api/v1/me` directly from the browser.

## Plan
1. Add a same-origin Next route for `/api/v1/*` that proxies requests server-side to `API_INTERNAL_URL`.
2. Make the central browser API base fall back to same-origin when `NEXT_PUBLIC_API_URL` is empty or points at loopback.
3. Preserve auth headers through the proxy without adding page-local token handling.
4. Cover the proxy path and rerun the Phase 49 no-token boundary tests plus focused auth refresh tests.

## Scope Guard
- Do not change `AnimeProjectNotesSection` or any admin screen.
- Do not add page/component token props, local token reads, or per-screen refresh logic.
- Do not redesign Jellyfin/streaming auth.
