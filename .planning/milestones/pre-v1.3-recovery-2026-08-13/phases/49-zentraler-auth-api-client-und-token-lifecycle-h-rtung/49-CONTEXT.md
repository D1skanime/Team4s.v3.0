# Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-HÃ¤rtung - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning
**Source:** User-approved scope from auth/API cleanup discussion

<domain>
## Phase Boundary

Phase 49 hardens the normal frontend Auth/API lifecycle after Keycloak integration. The phase must remove direct token ownership from pages and components, finish the central request gatekeeper, and make long-running admin pages resilient to token expiry, refresh, logout, user switch, cross-tab auth changes, and upload flows.

This phase does not silently redesign Jellyfin streaming. Server-side Next API routes for episode/release streaming may be inspected and documented, but direct changes to Jellyfin/stream relay auth belong in a separate follow-up unless the planner identifies a small, non-invasive compatibility adjustment that is strictly required to keep normal API auth consistent.

</domain>

<decisions>
## Implementation Decisions

### D-01 Central Auth Ownership
- The central Auth/API client is the only frontend runtime that may read, persist, refresh, clear, or attach Keycloak/App auth tokens for normal API calls.

### D-02 Token-Free Pages
- Pages and components must not store token strings in React state, props, memoized values, local variables for later API calls, localStorage, sessionStorage, or direct cookie reads. They may consume token-free session snapshots, current-user data, capabilities, and auth-state booleans.

### D-03 Request Gatekeeper
- Normal API calls must pass through a central request gatekeeper that performs pre-request expiry checks, coordinates refresh, attaches the active bearer token, retries auth-related 401 responses once, and surfaces non-recoverable auth failures consistently.

### D-04 Refresh Coordination
- Concurrent requests must share one in-flight refresh operation. The implementation must prevent multiple refreshes or token rotations from racing each other.

### D-05 Runtime Resync
- Login, logout, refresh, session switch, storage events, focus/visibility changes, and cross-tab signals must resync running pages so stale pages do not mutate with an old auth context.

### D-06 Upload/XHR Inclusion
- Upload paths with progress requirements must use the same auth lifecycle. If XHR remains necessary for progress events, the auth behavior belongs in a central wrapper rather than duplicated per upload function.

### D-07 Keycloak Boundary
- Keycloak remains the identity and token lifecycle layer. Team4s backend and the Permission Engine remain responsible for domain permissions and access decisions.

### D-08 Streaming Boundary
- Jellyfin/streaming routes are a documented boundary for this phase. Do not silently migrate them with normal page/component API cleanup. If later per-user streaming access is needed, it should be expressed as a separate stream-grant/relay phase.

### D-09 Verification First
- Planning and execution must include automated checks that prove pages/components no longer directly read token values and that the central client handles proactive refresh, 401 retry, refresh failure/logout, concurrency, session switch resync, and upload auth behavior.

</decisions>

<canonical_refs>
## Canonical References

Downstream agents MUST read these before planning or implementing.

### Phase Scope
- `.planning/ROADMAP.md` - Phase 49 goal, plan list, success criteria, and dependency on Phase 48.
- `.planning/STATE.md` - Current planning/execution state and recent milestone context.

### Auth And Permissions
- `docs/operations/keycloak-auth-foundation-phase43.md` - Keycloak boundary: identity/session lifecycle only; Team4s owns domain authorization.
- `docs/architecture/fansub-member-management.md` - App-user/fansub membership model and Team4s-owned roles.
- `backend/internal/permissions` - Permission Engine concepts that should remain backend/domain-owned.

### Frontend Auth/API Seams
- `frontend/src/lib/api.ts` - Central API/Auth client, runtime auth session helpers, fetch wrappers, upload helpers, and current direct fetch/Header seams.
- `frontend/src/lib/keycloakAuth.ts` - Keycloak login/code exchange/refresh/logout helper; should stay behind central client except for auth entrypoints.
- `frontend/src/lib/useAuthSession.ts` - Token-free session-state hook used by pages/components.
- `frontend/src/app/auth/page.tsx` - Auth entrypoint and current session lifecycle UI.
- `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` - Session switch cleanup and page resync behavior.
- `frontend/src/lib/api.auth-refresh.test.ts` - Existing refresh/retry coverage.
- `frontend/src/lib/api.session-switch.test.ts` - Existing session switch event coverage.

### Upload And Streaming Boundaries
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - Release media upload usage.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - Fansub media/admin flows that have historically passed auth tokens around.
- `frontend/src/app/api/episodes/[id]/play/route.ts` - Server-side stream relay boundary; inspect/document only unless explicitly in scope.
- `frontend/src/app/api/releases/[id]/stream/route.ts` - Server-side release stream relay boundary; inspect/document only unless explicitly in scope.

</canonical_refs>

<specifics>
## Specific Ideas

- Introduce or finish a single `apiClientFetch`/`authorizedFetch` path for all normal API calls.
- Add a central expiry buffer so requests refresh before tokens expire during long admin sessions.
- Keep a single shared refresh promise to coordinate parallel requests.
- Retry exactly once after an auth-related 401 and avoid infinite refresh loops.
- Provide token-free API to pages such as `useAuthSession`, `getAuthSessionSnapshot`, and current-user/capability responses.
- Use static searches/tests to prevent `getRuntimeAuthToken`, direct `Authorization: Bearer`, direct Keycloak refresh, or direct auth-cookie reads in pages/components.
- Wrap upload/XHR auth behavior centrally, preserving progress events where needed.
- Document streaming relay auth as a separate server-side concern.

</specifics>

<deferred>
## Deferred Ideas

- Direct Jellyfin/stream relay redesign.
- Public archive page product work beyond auth lifecycle preparation.
- Backend permission model changes unrelated to auth client consistency.
- Keycloak role-based domain authorization.
- Broad frontend visual redesign.

</deferred>

---

*Phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung*
*Context gathered: 2026-05-20 via user-approved scope*
