# Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-Haertung - Research

**Researched:** 2026-05-20
**Domain:** Frontend auth/API client, Keycloak token lifecycle, upload/XHR auth, stream relay boundary
**Confidence:** HIGH for current-code inventory; MEDIUM for final migration effort because application files are already dirty/untracked. [VERIFIED: file reads] [VERIFIED: git status --short 2026-05-20]

<user_constraints>
## User Constraints (from CONTEXT.md)

All entries in this section are copied from `49-CONTEXT.md`; deferred items are out of scope. [VERIFIED: 49-CONTEXT.md]

### Locked Decisions
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

### the agent's Discretion
None in 49-CONTEXT.md. [VERIFIED: 49-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- Direct Jellyfin/stream relay redesign.
- Public archive page product work beyond auth lifecycle preparation.
- Backend permission model changes unrelated to auth client consistency.
- Keycloak role-based domain authorization.
- Broad frontend visual redesign.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-API-CLIENT-01 | Normal frontend API calls use one central auth lifecycle; pages/components stop owning tokens; uploads and session changes participate; streaming remains documented boundary. | Current ownership/risk map below identifies the exact central seams, direct-token callers, upload wrappers, stream route boundary, and test gaps. [VERIFIED: .planning/ROADMAP.md Phase 49] [VERIFIED: 49-CONTEXT.md] |
</phase_requirements>

## Summary

`frontend/src/lib/api.ts` already contains the main auth authority: cookie/storage token persistence, session snapshots, Keycloak callback completion, refresh/logout, a shared `runtimeSessionRefreshPromise`, `authorizedFetch`, and `apiClientFetch`. [VERIFIED: frontend/src/lib/api.ts:708-974] Existing tests cover successful first-token requests, runtime-token preference over stale explicit tokens, one refresh plus retry after auth-related 401, refresh failure clearing local session, one retry maximum, and session-switch events. [VERIFIED: frontend/src/lib/api.auth-refresh.test.ts] [VERIFIED: frontend/src/lib/api.session-switch.test.ts]

The remaining work is not a new auth stack; it is consolidation. [VERIFIED: frontend/src/lib/api.ts] The current code still passes `authToken` through many page/component props and helpers, exposes token-reading helpers to components, has direct `fetch(... headers: withAuthHeader(...))` paths in `api.ts`, and has five XHR upload functions that attach `Authorization` directly without the central refresh/retry lifecycle. [VERIFIED: rg authToken/useAuthSession results] [VERIFIED: frontend/src/lib/api.ts:1535,2395,2575,2630,3846]

**Primary recommendation:** Make `apiClientFetch` plus a new central `authorizedUploadXhr` the only normal API attachment points, then migrate callers to token-free session booleans/snapshots instead of passing `authToken` strings. [VERIFIED: 49-CONTEXT.md D-01-D-06] [VERIFIED: frontend/src/lib/api.ts:969-974]

## Project Constraints (from AGENTS.md)

- Do not implement application code in this research phase; only write this research file. [VERIFIED: user task]
- Do not modify migrations, old historical migrations, or schema files. [VERIFIED: AGENTS.md]
- Do not reintroduce legacy fansub/release media behavior. [VERIFIED: AGENTS.md]
- Release media must use existing `media_files`, `media_assets`, and release media structures; do not attach release media directly to episodes. [VERIFIED: AGENTS.md] [VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Group media must use existing `fansub_group_media`, `media_assets`, and `media_files` structures where applicable. [VERIFIED: AGENTS.md] [VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Keep diffs small and scoped; do not revert user changes. [VERIFIED: AGENTS.md]
- User-facing German UI strings must use correct umlauts when code is edited. [VERIFIED: AGENTS.md]
- Stop before any change that could attach release or fansub data to the wrong domain entity. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Keycloak login/code exchange/refresh/logout | Browser / Client | Keycloak token proxy route | Browser helper owns PKCE/login and direct Keycloak refresh/logout calls; `/api/auth/keycloak/token` proxies code exchange. [VERIFIED: frontend/src/lib/keycloakAuth.ts:107-199] |
| Team4s app-user resolution and permissions | API / Backend | Browser / Client consumes `/api/v1/me` | Docs state Keycloak is identity only and Team4s owns app users, roles, and fansub permissions. [VERIFIED: docs/operations/keycloak-auth-foundation-phase43.md] [VERIFIED: docs/architecture/fansub-member-management.md] |
| Normal API token attachment and retry | Browser / Client central API library | API / Backend validates bearer | `authorizedFetch` currently attaches bearer tokens, retries auth-related 401 once after refresh, and `apiClientFetch` wraps URL construction. [VERIFIED: frontend/src/lib/api.ts:940-974] |
| Upload progress with auth | Browser / Client central upload wrapper | API / Backend upload endpoints | Existing upload helpers use XHR for progress and manually set Authorization. [VERIFIED: frontend/src/lib/api.ts:1522-1568,2382-2429,2560-2664,3831-3884] |
| Streaming / Jellyfin relay | Frontend Server (Next API route) | API / Backend grant/stream endpoints | Stream routes read server cookies and call `resolveStreamRelayTarget`; context says inspect/document only in this phase. [VERIFIED: frontend/src/app/api/episodes/[id]/play/route.ts] [VERIFIED: frontend/src/app/api/releases/[id]/stream/route.ts] [VERIFIED: 49-CONTEXT.md D-08] |

## Current Auth/Token Ownership Map

| Area | Current Owner/Behavior | Planner Action |
|------|------------------------|----------------|
| Runtime storage | `api.ts` writes access, refresh, display name cookies; clears legacy localStorage token keys; stores token-free session meta in localStorage. [VERIFIED: frontend/src/lib/api.ts:749-766] | Keep storage ownership inside `api.ts`; do not move storage reads into pages/components. |
| Token reads | `getRuntimeAuthToken`, `getRuntimeRefreshToken`, `getAuthSessionSnapshot`, and `resolveAuthToken` read cookies or fallback env/local bypass. [VERIFIED: frontend/src/lib/api.ts:575-610,708-741] | Keep token reads private where possible; expose only token-free session state. |
| Keycloak helper | `keycloakAuth.ts` exposes `beginKeycloakLogin`, `exchangeKeycloakCode`, `refreshKeycloakToken`, `logoutFromKeycloak`; only `api.ts` and auth entrypoints should call token-bearing functions. [VERIFIED: frontend/src/lib/keycloakAuth.ts] [VERIFIED: frontend/src/lib/api.ts:158,886,913,932] | Leave as low-level identity helper behind central auth client. |
| Auth page | `/auth` reads token-free snapshot, starts Keycloak login, completes callback through `completeKeycloakAuthCallback`, refreshes/logs out through `api.ts`. [VERIFIED: frontend/src/app/auth/page.tsx:97-274] | Treat `/auth` as allowed auth entrypoint; keep direct Keycloak login start here but no API-token storage outside `api.ts`. |
| Session hook | `useAuthSession` returns `authToken` as sentinel `API_AUTH_SESSION_TOKEN` plus booleans. [VERIFIED: frontend/src/lib/useAuthSession.ts:8-28] | Replace `authToken` return with token-free fields or deprecate it; planner should migrate callers away from sentinel props. |
| Session switch guard | Guard clears local auth and redirects/reloads when cross-tab switch targets another app user. [VERIFIED: frontend/src/components/auth/AuthSessionSwitchGuard.tsx] | Keep as resync guard; expand tests if client emits new auth events. |

## Remaining Direct-Token Risks

| Risk | Evidence | Target |
|------|----------|--------|
| Pages/components still pass `authToken` widely. | Static search found 392 `authToken` references under `frontend/src/app` and `frontend/src/components`. [VERIFIED: rg count 2026-05-20] | Replace props/locals with token-free `hasAccessToken` or call API helpers without token args. |
| `useAuthSession` still exposes `authToken` sentinel, which keeps token-shaped ownership in UI code. | Hook returns `authToken: hasAccessToken ? API_AUTH_SESSION_TOKEN : ''`. [VERIFIED: frontend/src/lib/useAuthSession.ts:14-18] | Return only `hasAccessToken`, `hasRefreshToken` if needed, `displayName`, `isClientInitialized`; central API resolves tokens internally. |
| Some components directly query token presence. | `WatchlistAddButton` imports and calls `hasRuntimeAuthToken()`. [VERIFIED: frontend/src/components/watchlist/WatchlistAddButton.tsx:6-43] | Convert to `useAuthSession` token-free state or central current-user/session snapshot. |
| Server pages read auth cookies directly. | `/watchlist` and `/anime/[id]` read `AUTH_TOKEN_COOKIE_NAME` via `cookies()`. [VERIFIED: frontend/src/app/watchlist/page.tsx:2-45] [VERIFIED: frontend/src/app/anime/[id]/page.tsx:2-92] | Planner must classify SSR public/user pages: either normal API calls migrate to a server-safe central helper or stay documented as server boundary. |
| `api.ts` still has direct `fetch` with `withAuthHeader`, bypassing `authorizedFetch` retry/refresh. | Multiple direct fetches with auth headers exist, e.g. watchlist, genre/tag tokens, segment assets, release-version media item mutations, note deletes. [VERIFIED: frontend/src/lib/api.ts:1703,3302,3328,3739,3765,3786,3807,3896,3919,3939,4384,4560] | Route all protected normal calls through `apiClientFetch`/`authorizedFetch`; public unauthenticated reads may remain plain fetch by explicit classification. |
| XHR upload helpers manually attach Authorization once. | Five XHR helpers call `xhr.setRequestHeader('Authorization', ...)`. [VERIFIED: frontend/src/lib/api.ts:1535,2395,2575,2630,3846] | Add central upload wrapper with preflight refresh, one 401 retry, and progress preservation. |
| Direct Keycloak refresh/logout exists outside `api.ts` only in low-level helper/tests. | Static search found token lifecycle calls in `keycloakAuth.ts`, `api.ts`, tests, and stream relay server helper. [VERIFIED: rg token search 2026-05-20] | Keep helper exports but lint/static-test production imports so pages/components do not call refresh/logout directly. |

## Central-Client Target Shape

Use these concrete targets for planning:

1. `apiClientFetch(pathOrUrl, options)` remains the public normal request entrypoint and delegates to `authorizedFetch`. [VERIFIED: frontend/src/lib/api.ts:969-974]
2. Add a pre-request `ensureFreshRuntimeSession()` step before `send()` in `authorizedFetch`. It should inspect `access_token_expires_at` from stored auth data or persisted session metadata before each protected request. [VERIFIED: 49-CONTEXT.md D-03] [VERIFIED: frontend/src/lib/api.ts:749-756 currently persists expiry only in cookie lifetime, not queryable metadata]
3. Reuse `runtimeSessionRefreshPromise` for all proactive refresh and 401 recovery. [VERIFIED: frontend/src/lib/api.ts:875-910]
4. Preserve the existing one-shot retry property: initial request, optional refresh, exactly one retry. [VERIFIED: frontend/src/lib/api.auth-refresh.test.ts]
5. Make API helper signatures accept no `authToken` for browser normal calls; keep optional server/internal token only if explicitly needed and documented. [VERIFIED: current `authToken?: string` signatures are widespread in frontend/src/lib/api.ts]
6. Make `useAuthSession` token-free and update UI call sites to check booleans only. [VERIFIED: 49-CONTEXT.md D-02] [VERIFIED: frontend/src/lib/useAuthSession.ts]

Suggested internal API:

```ts
// Source: current api.ts central client shape, target sketch for planner.
export async function apiClientFetch(pathOrUrl: string, options: AuthorizedRequestOptions = {}) {
  await ensureFreshRuntimeSession({ reason: 'pre-request' })
  return authorizedFetch(resolveApiClientUrl(pathOrUrl), options)
}

export async function authorizedUploadXhr<T>(options: AuthorizedUploadOptions): Promise<T> {
  await ensureFreshRuntimeSession({ reason: 'upload-preflight' })
  return sendUploadOnceOrRefreshAndRetry<T>(options)
}
```

This is a target shape, not verified existing code. [ASSUMED]

## Upload/XHR Migration Notes

- `uploadFansubMedia`, `uploadAdminAnimeMedia`, `uploadAdminReleaseThemeAsset`, `uploadAdminReleaseThemeAssetForRelease`, and `uploadReleaseVersionMedia` are XHR-based progress paths and need a shared `authorizedUploadXhr` wrapper. [VERIFIED: frontend/src/lib/api.ts:1522,2382,2560,2615,3831]
- `uploadSegmentAsset` and `uploadOwnProfileAvatar` use `fetch`/FormData and can migrate to `apiClientFetch` without XHR unless progress is added later. [VERIFIED: frontend/src/lib/api.ts:1911-1925,3729-3755]
- `useReleaseVersionMedia` calls `uploadReleaseVersionMedia` without passing authToken, which currently works because upload resolves the runtime token internally; it still lacks preflight refresh and 401 retry. [VERIFIED: frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:152-162] [VERIFIED: frontend/src/lib/api.ts:3831-3884]
- Fansub edit and anime create/edit pass token-shaped props into media upload flows. [VERIFIED: frontend/src/app/admin/fansubs/[id]/edit/page.tsx:621,1048,1474-1475] [VERIFIED: frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts:187,682-763]
- Migration must preserve release-native media endpoints and existing release/group media ownership; do not invent new upload tables or attach release media to episodes. [VERIFIED: AGENTS.md] [VERIFIED: docs/architecture/db-schema-fansub-domain.md]

Recommended wrapper behavior:

| Step | Required Behavior | Reason |
|------|-------------------|--------|
| Preflight | Refresh if access token is near expiry before opening XHR. | Long uploads should not begin with an almost-expired bearer. [VERIFIED: 49-CONTEXT.md D-03,D-06] |
| Send | Attach bearer inside the wrapper only. | Removes duplicate header logic from upload helpers. [VERIFIED: frontend/src/lib/api.ts current duplicate XHR headers] |
| 401 | Parse payload/status, refresh once, resend same FormData/File payload once. | Aligns upload with fetch one-shot auth recovery. [VERIFIED: 49-CONTEXT.md D-06,D-09] |
| Progress | Preserve `onProgress` and reset progress deliberately on retry. | Current callers depend on progress state. [VERIFIED: frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:152-166] |

## Streaming/Jellyfin Boundary Decision

The stream routes are not normal browser API calls in this phase. [VERIFIED: 49-CONTEXT.md D-08] They are Next server routes that read auth cookies server-side, request short-lived grant tokens, optionally refresh session cookies, and relay range-aware stream responses. [VERIFIED: frontend/src/app/api/episodes/[id]/play/route.ts] [VERIFIED: frontend/src/app/api/releases/[id]/stream/route.ts] [VERIFIED: frontend/src/lib/server/streamRelayAuth.ts]

Do not migrate `/api/episodes/[id]/play` or `/api/releases/[id]/stream` to the normal browser API client in Phase 49. [VERIFIED: 49-CONTEXT.md D-08] The planner should add a handoff note: later per-user streaming work belongs in a stream-grant/relay phase, including whether server cookie token reads are acceptable or should be represented by a server-side auth service. [VERIFIED: 49-CONTEXT.md deferred ideas]

## Testing Strategy

| Area | Existing Coverage | Required Additions |
|------|-------------------|--------------------|
| 401 refresh/retry | `api.auth-refresh.test.ts` covers first-token success, runtime token preference, 401 refresh+retry, refresh failure clearing session, and retry max once. [VERIFIED: frontend/src/lib/api.auth-refresh.test.ts] | Add proactive expiry-before-request tests and concurrent request shared-refresh tests. |
| Session switch | `api.session-switch.test.ts` covers same-user no event and different-user session-switch event. [VERIFIED: frontend/src/lib/api.session-switch.test.ts] `AuthSessionSwitchGuard.test.tsx` covers clear+redirect after cross-tab switch. [VERIFIED: frontend/src/components/auth/AuthSessionSwitchGuard.test.tsx] | Add auth changed/focus/visibility resync expectations after hook changes. |
| Auth page | `auth/page.test.tsx` verifies existing runtime token resolves current user once. [VERIFIED: frontend/src/app/auth/page.test.tsx] | Update mocks for token-free `useAuthSession`/snapshot API as needed. |
| Upload auth | `api.admin-anime.test.ts` verifies asset vocabulary for admin anime XHR upload, not lifecycle refresh. [VERIFIED: frontend/src/lib/api.admin-anime.test.ts:532-568] | Add upload wrapper tests: preflight refresh, no duplicate header logic, 401 once retry, refresh failure clears session, progress still reports. |
| Static no-token reads | No dedicated static test found for forbidden imports/usages. [VERIFIED: rg token search 2026-05-20] | Add a Vitest or script test scanning production `frontend/src/app` and `frontend/src/components` for forbidden imports/usages: `getRuntimeAuthToken`, `getRuntimeRefreshToken`, auth cookie constants, direct `Authorization: Bearer`, `refreshKeycloakToken`, and `authToken` prop types except allowlisted auth entry/boundary files. |
| Stream relay | `streamRelayAuth.test.ts` covers provided grant, refresh on grant 401, bearer fallback, refresh when access token empty, and fallback token retry. [VERIFIED: frontend/src/lib/server/streamRelayAuth.test.ts] | Do not expand into stream redesign; only keep tests green if shared constants change. |

Recommended commands:

```powershell
cd frontend
npm run typecheck
npm run lint
npm run test -- api.auth-refresh.test.ts api.session-switch.test.ts api.admin-anime.test.ts app/auth/page.test.tsx components/auth/AuthSessionSwitchGuard.test.tsx lib/server/streamRelayAuth.test.ts
git diff --check
```

The frontend scripts exist in `frontend/package.json`. [VERIFIED: frontend/package.json]

## Standard Stack

| Library/Tool | Repo Version | Latest Checked | Purpose | Recommendation |
|--------------|--------------|----------------|---------|----------------|
| Next.js | `^16.1.6` | `16.2.6` from npm | App Router pages and server routes. | Do not upgrade in Phase 49; use current repo version. [VERIFIED: frontend/package.json] [VERIFIED: npm view next version 2026-05-20] |
| React | `18.3.1` | `19.2.6` from npm | Client components/hooks. | Do not upgrade in Phase 49; auth cleanup should not mix with React major upgrade. [VERIFIED: frontend/package.json] [VERIFIED: npm view react version 2026-05-20] |
| Vitest | `^3.2.4` | `4.1.7` from npm | Frontend unit tests. | Keep repo toolchain; add focused tests. [VERIFIED: frontend/package.json] [VERIFIED: npm view vitest version 2026-05-20] |
| TypeScript | `^5.7.2` | `6.0.3` from npm | Typecheck. | Keep repo toolchain; use type errors as migration guide. [VERIFIED: frontend/package.json] [VERIFIED: npm view typescript version 2026-05-20] |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Frontend tests/typecheck | yes | `v24.14.0` | none needed. [VERIFIED: node --version 2026-05-20] |
| npm | Frontend scripts/package checks | yes | `11.9.0` | none needed. [VERIFIED: npm --version 2026-05-20] |
| Keycloak live service | Browser/live auth UAT | not probed | unknown | Unit tests can mock; live UAT needs local Docker stack. [VERIFIED: docs/operations/keycloak-auth-foundation-phase43.md] |

## Risks / Stop Conditions

- Stop if a planned migration requires changing Keycloak/domain authorization boundaries; Keycloak must stay identity/session lifecycle only. [VERIFIED: docs/operations/keycloak-auth-foundation-phase43.md]
- Stop if upload cleanup would alter release/group media ownership or create parallel media logic. [VERIFIED: AGENTS.md] [VERIFIED: docs/architecture/db-schema-fansub-domain.md]
- Stop before changing streaming routes beyond documentation or a tiny compatibility adjustment explicitly required by normal API auth consistency. [VERIFIED: 49-CONTEXT.md D-08]
- Treat existing dirty/untracked files as user work; do not revert. `git status --short` showed modified `frontend/src/app/auth/page.tsx`, modified `frontend/src/lib/api.ts`, and untracked auth helper files/phase dir before writing this research file. [VERIFIED: git status --short 2026-05-20]
- Watch for German UI text regressions if implementation edits user-facing strings; current files already contain German auth copy. [VERIFIED: AGENTS.md] [VERIFIED: frontend/src/app/auth/page.tsx]

## Open Questions (RESOLVED)

Both planning questions are resolved for Phase 49 and must be reflected in `49-01` boundaries plus downstream static gates. These decisions keep normal browser API calls centralized while avoiding token or expiry metadata leakage back into pages/components. [VERIFIED: 49-PLAN-CHECK.md blocker resolution request]

| Question | Decision | Planning Impact |
|---|---|---|
| Should SSR pages such as `/watchlist` and `/anime/[id]` be treated as normal frontend API calls or a server-side auth boundary? | SSR pages such as `/watchlist` and `/anime/[id]` are server-side auth boundaries for Phase 49 unless they make normal browser API calls. | `49-01` must document SSR pages separately from normal pages/components and streaming routes. Static allowlists must separate server-side page cookie reads from browser component/page token ownership instead of mixing them into the normal frontend allowlist. |
| Should `AuthSessionSnapshot` expose expiry metadata? | Expiry metadata remains private inside `frontend/src/lib/api.ts`. `AuthSessionSnapshot` remains token-free and must not expose raw token or expiry data except booleans needed by UI. | The central client owns proactive refresh decisions. `useAuthSession` and pages/components may consume booleans such as `hasAccessToken` and `hasRefreshToken`, but must not receive raw tokens, expiry timestamps, parsed claims, or refresh scheduling data. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The target `ensureFreshRuntimeSession`/`authorizedUploadXhr` sketch is a suitable implementation shape. | Central-Client Target Shape | Planner may choose different names/signatures, but the ownership and behavior must remain central. |
| A2 | Exact helper names/signatures should follow implementation ergonomics. | Metadata | Planner should preserve behavior even if naming differs. |
| A3 | Research remains valid until 2026-06-03 for this repo snapshot. | Metadata | If auth files change earlier, stale inventory could miss new token reads. |

## Sources

### Primary
- `.planning/ROADMAP.md` Phase 49 - goal, plans, success criteria. [VERIFIED: file read]
- `49-CONTEXT.md` - locked decisions, deferred scope, canonical refs. [VERIFIED: file read]
- `AGENTS.md` - project constraints and fansub/media rules. [VERIFIED: file read]
- `docs/operations/keycloak-auth-foundation-phase43.md` - Keycloak identity/session boundary. [VERIFIED: file read]
- `docs/architecture/fansub-member-management.md` - Team4s-owned roles/permissions. [VERIFIED: file read]
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release media ownership rules. [VERIFIED: file read]
- `frontend/src/lib/api.ts`, `keycloakAuth.ts`, `useAuthSession.ts`, `/auth/page.tsx`, `AuthSessionSwitchGuard.tsx`. [VERIFIED: file reads]
- Upload and stream boundary files listed in context. [VERIFIED: file reads]

### Tool Findings
- `rg` token/static searches on 2026-05-20. [VERIFIED: rg output]
- `npm view` version checks on 2026-05-20. [VERIFIED: npm registry]
- Node/npm availability checks on 2026-05-20. [VERIFIED: local shell]
- Graph context absent: `.planning/graphs/graph.json` was not present. [VERIFIED: graph status check]

## Metadata

**Confidence breakdown:**
- Current inventory: HIGH - based on direct file reads and static searches. [VERIFIED: file reads] [VERIFIED: rg output]
- Target architecture: MEDIUM - central ownership is locked, but exact helper names/signatures should follow implementation ergonomics. [VERIFIED: 49-CONTEXT.md] [ASSUMED]
- Testing plan: HIGH - based on existing test files and identified missing lifecycle cases. [VERIFIED: frontend/src/lib/api.auth-refresh.test.ts] [VERIFIED: frontend/src/lib/api.session-switch.test.ts] [VERIFIED: frontend/src/lib/api.admin-anime.test.ts] [VERIFIED: frontend/src/app/auth/page.test.tsx]

**Research date:** 2026-05-20 [VERIFIED: current_date]
**Valid until:** 2026-06-03 for this repo snapshot; re-run static searches if auth files change first. [ASSUMED]
