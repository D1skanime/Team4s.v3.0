# Streaming Auth Handoff

Phase 49 does not redesign Jellyfin or stream relay authentication. Streaming routes remain a server-side boundary that is separate from normal browser API client cleanup.

## Boundary Files

- `frontend/src/app/api/episodes/[id]/play/route.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/server/streamRelayAuth.ts`

These files may read auth cookies on the Next server, request stream grants, refresh cookies when needed, and set upstream bearer headers for relay responses. That behavior is not a pattern for normal pages or components.

## Current Behavior

The stream relay path:

1. Reads access and refresh cookies server-side.
2. Uses an existing grant token when one is provided.
3. Requests a short-lived stream grant from the backend when needed.
4. Refreshes the Team4s/Keycloak session once when grant resolution fails due to auth.
5. Falls back to a configured bearer token only where the existing relay helper allows it.
6. Preserves range-aware streaming response behavior.

## Phase 49 Decision

Do not migrate streaming routes into `apiClientFetch` or the browser auth client during Phase 49.

The normal browser cleanup only covers pages, components, hooks, helper modules, and upload callers that make ordinary Team4s API requests. Streaming is server-side relay work with different constraints:

- cookies are read on the server, not in browser UI code
- backend grants and upstream Jellyfin authorization are involved
- range requests and response headers must be preserved
- route behavior may affect playback rather than normal CRUD/API state

## Future Stream-Grant Work

A future streaming phase should decide whether to keep the current server cookie model or introduce a dedicated server-side auth service for stream grants.

That phase should cover:

- per-user stream grant policy
- grant lifetime and refresh behavior
- backend permission checks for streamable releases
- Jellyfin fallback token rules
- range request and cache behavior
- browser playback failure UX
- tests for unauthorized, expired, refreshed, and range-based playback cases

Until that phase exists, normal frontend auth cleanup must not silently rewrite these routes.
