# Phase 49 Auth/API Client Boundaries

**Plan:** 49-01
**Captured:** 2026-05-20
**Purpose:** Make the executable boundary for Plans 49-02 through 49-04 explicit before runtime changes.

## Boundary Decisions

### D-01 Central Auth Ownership

For normal browser API calls, `frontend/src/lib/api.ts` is the only frontend runtime allowed to read, persist, refresh, clear, resolve, or attach Keycloak/App auth tokens.

Implementation consequence:

- Keep token cookies/storage and refresh coordination inside the central client.
- Do not move token reads into pages, components, hooks, or upload callers.
- Treat `authToken` helper parameters as compatibility debt unless a boundary row explicitly allows them.

### D-02 Token-Free Pages

Normal pages and components may consume:

- `hasAccessToken`
- `hasRefreshToken` where an auth entrypoint needs it
- `isClientInitialized`
- current-user data
- capability booleans
- token-free session snapshots

Normal pages and components must not consume or store:

- raw access tokens
- raw refresh tokens
- `API_AUTH_SESSION_TOKEN` as a business value
- expiry timestamps
- parsed claims for request scheduling
- direct auth cookie or storage values

### D-03 Request Gatekeeper

All normal protected browser requests must flow through `apiClientFetch`/`authorizedFetch` or an equivalent central wrapper owned by `frontend/src/lib/api.ts`.

Required behavior for 49-02:

- Check token freshness before a protected request.
- Coordinate refresh through one shared in-flight refresh promise.
- Attach the current bearer centrally.
- Retry auth-related `401` exactly once.
- Surface non-recoverable auth failure consistently.

### D-04 Refresh Coordination

Concurrent fetch and upload work must share central refresh coordination. Upload wrappers must not create a second refresh promise, second token cache, or page-owned refresh queue.

### D-05 Runtime Resync

Session changes must resync running pages through central events and guards:

- login
- logout
- refresh
- session switch
- focus/visibility resync
- storage events
- BroadcastChannel or equivalent cross-tab signal

`AuthSessionSwitchGuard` remains the global session-switch cleanup surface. Individual pages should not implement their own forced logout behavior.

### D-06 Upload/XHR Boundary

Upload paths that need progress may continue to use XHR, but the auth lifecycle belongs in one central upload wrapper.

Allowed upload wrapper responsibilities:

- preflight refresh before opening XHR
- bearer attachment
- auth-related `401` classification
- exactly-once retry only where endpoint persistence order is proven safe
- progress preservation/reset semantics
- refresh failure cleanup

Disallowed upload behavior:

- per-upload helper token reads
- duplicated `setRequestHeader('Authorization', ...)` blocks outside the central wrapper
- new media ownership tables or parallel upload logic
- attaching release media directly to episodes

### D-07 Keycloak Identity-Only Boundary

Keycloak remains the identity and token lifecycle layer. Team4s backend and the Permission Engine remain responsible for domain authorization, fansub membership, release/media access, and capability decisions.

Allowed Keycloak helper scope:

- `frontend/src/lib/keycloakAuth.ts` may own PKCE transient state and direct Keycloak exchange/refresh/logout primitives.
- `/auth` may start login and call central auth lifecycle helpers.

Disallowed:

- pages/components directly refreshing Keycloak tokens
- frontend role checks replacing backend Permission Engine decisions
- Keycloak roles becoming Team4s domain permissions in this phase

### D-08 Streaming/Jellyfin Boundary

Jellyfin and streaming routes are a documented server-side boundary for Phase 49. They are not normal browser API calls and must not be silently migrated with the page/component cleanup.

Boundary files:

- `frontend/src/app/api/episodes/[id]/play/route.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/server/streamRelayAuth.ts`

Allowed in Phase 49:

- inspect and document stream relay auth behavior
- keep tests green if shared auth constants change
- preserve existing grant/refresh/fallback semantics

Deferred:

- streaming auth redesign
- per-user stream grants beyond current route behavior
- Jellyfin relay migration into normal browser API client

### D-09 Verification First

Plans 49-02 through 49-04 must prove the boundary with automated tests and static gates. The gates must distinguish normal browser pages/components from SSR server pages, `/auth`, server streaming routes, public/no-auth fetches, and tests.

## Boundary Categories

| Category | Allowed Files/Examples | Allowed Auth Behavior | Static Gate Treatment |
|---|---|---|---|
| Normal browser API calls | Admin pages/components/hooks, `frontend/src/lib/api/*.ts`, normal upload callers | Token-free UI state only; protected requests through central client/wrapper. | Fail on direct token reads, `authToken` props, bearer construction, direct Keycloak refresh, and duplicated upload auth. |
| Token-free UI consumption | `useAuthSession` consumers, contributor pages, admin pages | `hasAccessToken`, `isClientInitialized`, current user, capabilities. | Fail on raw tokens, expiry metadata, auth cookie reads, or local/session storage auth reads. |
| Auth entrypoint | `frontend/src/app/auth/page.tsx`, `frontend/src/lib/keycloakAuth.ts` | Login start, callback completion, refresh/logout buttons, PKCE transient state. | Allowlisted separately; not a pattern for normal pages. |
| SSR server page boundary | `frontend/src/app/watchlist/page.tsx`, `frontend/src/app/anime/[id]/page.tsx` | Server-side `cookies()` reads for render-time data only. | Separate allowlist from browser pages/components and streaming. |
| Upload/XHR | Upload helpers in `frontend/src/lib/api.ts` through a central wrapper | Central preflight refresh, bearer attach, retry classification, progress. | After migration, fail on repeated `new XMLHttpRequest` auth header blocks outside wrapper. |
| Server streaming/Jellyfin | `frontend/src/app/api/episodes/[id]/play/route.ts`, `frontend/src/app/api/releases/[id]/stream/route.ts`, `frontend/src/lib/server/streamRelayAuth.ts` | Server cookie reads, grant resolution, upstream bearer, refreshed cookie application. | Allowlisted as server-streaming boundary only. |
| Public/no-auth fetch | `ScreenshotGallery.tsx` release images, `MediaUpload.tsx` remote source fetch | No auth lifecycle, no bearer. | Keep classified to avoid false positives in direct-fetch gate. |
| Tests | `*.test.ts`, `*.test.tsx` | May mock tokens and auth events. | Excluded from production static gates; covered by test assertions. |

## SSR Decision

The resolved Phase 49 research decision is implemented here:

`/watchlist` and `/anime/[id]` are **SSR server-side auth boundaries** for Phase 49 unless they make normal browser API calls. Their server-side cookie reads are not normal browser page/component token ownership. Static allowlists must therefore keep SSR pages separate from:

- normal browser pages/components
- `/auth` auth entrypoint
- server streaming routes
- tests

If a later plan moves watchlist state into a client component, that new browser request path must use the central client and must not pass page-owned token strings.

## Migration Queue

| Order | Plan | Queue Item | Exit Condition |
|---:|---|---|---|
| 1 | 49-02 | Characterize current auth lifecycle and upload retry eligibility. | Passing characterization tests and endpoint-specific retry safety notes. |
| 2 | 49-02 | Harden central fetch lifecycle. | Proactive refresh, shared refresh coordination, once-only auth 401 retry, refresh-failure cleanup, and auth events covered by tests. |
| 3 | 49-02 | Introduce central upload/XHR auth wrapper. | Upload preflight and 401 behavior are centralized; unsafe upload retry cases return re-auth/error instead of blind replay. |
| 4 | 49-03 | Remove API helper token signatures for normal browser calls. | Helpers call central client without `authToken` arguments, except documented boundaries. |
| 5 | 49-03 | Clean page/component token ownership. | Normal pages/components consume token-free session and capability state only. |
| 6 | 49-03 | Migrate upload callers. | Upload helpers preserve media ownership and progress while auth runs through central wrapper. |
| 7 | 49-04 | Add final static no-token gates. | Gates pass with separate allowlists for auth entrypoint, SSR, streaming, public/no-auth, and tests. |
| 8 | 49-04 | Write streaming/Jellyfin handoff. | Stream relay remains documented non-scope with a follow-up path for future stream-grant work. |

## Static Allowlist Contract For 49-04

The final static checks should fail production code that introduces:

- `getRuntimeAuthToken` or `getRuntimeRefreshToken` outside central client or allowed server boundary.
- `AUTH_TOKEN_COOKIE_NAME` or `AUTH_REFRESH_COOKIE_NAME` in normal browser pages/components.
- `localStorage` or `sessionStorage` auth-token reads outside central client or Keycloak PKCE transient state.
- direct `Authorization: Bearer` construction outside central client/upload wrapper or server streaming.
- `authToken` props and token parameters in normal pages/components/helpers.
- duplicated XHR auth header blocks outside the central upload wrapper.

Allowlist categories must be explicit by boundary, not by broad path alone.

## Non-Goals

- No application code changes in 49-01.
- No streaming/Jellyfin migration in Phase 49.
- No backend permission redesign.
- No Keycloak role authorization for Team4s domain permissions.
- No release/fansub media ownership changes.
- No roadmap/state metadata repair in this inventory plan.
