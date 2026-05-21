---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
verified: 2026-05-20T17:09:45Z
status: passed
verdict: PASS_WITH_NOTES
score: 12/12 must-haves verified
overrides_applied: 0
gaps: []
human_verification: []
---

# Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-HÃ¤rtung Verification Report

**Phase Goal:** Einen zentralen Auth-/API-Mechanismus fÃ¼r normale Frontend-API-Aufrufe fertigstellen, Token-Besitz aus Seiten/Komponenten entfernen, Refresh/Retry/Resync zentralisieren und Jellyfin-/Streaming-Routes als separaten serverseitigen Sonderfall dokumentieren.
**Requirement:** AUTH-API-CLIENT-01
**Verified:** 2026-05-20T17:09:45Z
**Verdict:** PASS_WITH_NOTES
**Re-verification:** Yes - final verifier pass over the prior unstructured PASS report.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Pre-implementation inventory and boundary analysis exists. | VERIFIED | `49-auth-api-client-inventory.md`, `49-auth-api-client-boundaries.md`, `49-RESEARCH.md`, and `49-PATTERNS.md` classify token access, uploads, SSR, auth entrypoint, session events, and streaming boundaries. |
| 2 | Normal pages/components do not directly read Keycloak/App tokens. | VERIFIED | `api.no-token-boundary.test.ts` passed; `rg` finds runtime token/cookie reads only in `api.ts`, SSR pages, auth entrypoint, and server streaming boundaries. |
| 3 | Normal pages/components do not store/pass token values for later API calls. | VERIFIED | Static app/component gate passed. `useAuthSession()` exposes booleans/display name and `authToken: ''` only as empty compatibility field. Remaining `authToken` hits are SSR server pages or central `api.ts`. |
| 4 | Normal protected API calls pass through a central request gatekeeper with pre-request freshness checks. | VERIFIED | `authorizedFetch()` calls `ensureFreshRuntimeSession()` before protected requests; proactive refresh test passed. |
| 5 | Refresh is concurrency-safe. | VERIFIED | `runtimeSessionRefreshPromise` coordinates refresh; concurrent protected request test asserts one Keycloak refresh. |
| 6 | Auth-related 401s refresh and retry exactly once. | VERIFIED | Tests cover one refresh+retry, second 401 surfacing, non-retry paths, and refresh failure cleanup. |
| 7 | Auth changes resync running pages and session switches. | VERIFIED | `useAuthSession` listens to storage/custom/focus/visibility events; `AuthSessionSwitchGuard` covers storage and BroadcastChannel logout behavior. |
| 8 | Upload/XHR paths use central auth lifecycle and avoid unsafe replay. | VERIFIED | `authorizedUploadXhr()` owns preflight refresh, bearer header, progress, and retry classification; tests prove no unsafe upload replay after 401 and no XHR opening when preflight refresh fails. |
| 9 | Keycloak remains identity/token lifecycle only. | VERIFIED | Docs state backend Permission Engine remains authoritative; source changes are frontend auth client/caller cleanup, with no backend permission redesign in Phase 49 artifacts. |
| 10 | Jellyfin/streaming routes were not silently redesigned and are documented separately. | VERIFIED | `docs/frontend/streaming-auth-handoff.md` documents server streaming boundary; static gates allow only the documented stream route/helper files for server bearer construction. |
| 11 | Tests cover lifecycle, upload, session switch, static no-token boundaries, auth page, and stream relay compatibility. | VERIFIED | Focused suite passed: 7 files, 49 tests. |
| 12 | Required checks ran or have clearly bounded existing failures. | VERIFIED | Focused tests, typecheck, build, targeted lint, and diff-check passed. Full lint fails on unrelated existing files/scripts listed below. |

**Score:** 12/12 truths verified.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/lib/api.ts` | Central auth/API lifecycle and upload wrapper | VERIFIED | Contains `ensureFreshRuntimeSession`, `runtimeSessionRefreshPromise`, `authorizedFetch`, `apiClientFetch`, and `authorizedUploadXhr`. |
| `frontend/src/lib/useAuthSession.ts` | Token-free session hook | VERIFIED | Returns `hasAccessToken`, `hasRefreshToken`, `displayName`, `isClientInitialized`; no raw token or expiry metadata. |
| `frontend/src/lib/api.no-token-boundary.test.ts` | Static no-token boundary gate | VERIFIED | Passed and uses explicit allowlists for central client, Keycloak/auth, SSR, streaming, and public no-auth fetches. |
| `docs/frontend/auth-api-client.md` | Developer guidance | VERIFIED | Documents central ownership, token-free UI usage, upload/XHR rules, forbidden patterns, and permission boundary. |
| `docs/frontend/streaming-auth-handoff.md` | Streaming handoff | VERIFIED | Documents Jellyfin/streaming as out-of-scope server relay boundary. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `useAuthSession.ts` | `api.ts` | `getAuthSessionSnapshot` | WIRED | Hook reads token-free snapshot booleans and display name only. |
| `api.ts` | `keycloakAuth.ts` | `refreshKeycloakToken`, exchange/logout helpers | WIRED | Keycloak calls are centralized in auth client/auth entrypoint; normal app/components do not call them. |
| `api.no-token-boundary.test.ts` | source tree | source inspection allowlists | WIRED | Test fails on token reads, bearer construction, token props, duplicate XHR auth outside allowed boundaries. |
| Upload helpers | `authorizedUploadXhr` | central wrapper | WIRED | XHR bearer/progress logic exists in one central wrapper; production scan finds only that XHR auth block. |

## Data-Flow Trace

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `apiClientFetch`/`authorizedFetch` | bearer token | private runtime cookies/meta via `resolveAuthToken`, refreshed via Keycloak/app refresh | Yes | FLOWING |
| `useAuthSession` | session booleans/display name | `getAuthSessionSnapshot()` | Yes | FLOWING |
| `authorizedUploadXhr` | upload bearer/progress | `ensureFreshRuntimeSession()` then `resolveAuthToken()` and XHR events | Yes | FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Lifecycle/static/upload/session tests | `npm run test -- api.auth-refresh.test.ts api.session-switch.test.ts api.admin-anime.test.ts api.no-token-boundary.test.ts components/auth/AuthSessionSwitchGuard.test.tsx app/auth/page.test.tsx lib/server/streamRelayAuth.test.ts` | 7 files / 49 tests passed | PASS |
| TypeScript | `npm run typecheck` | `tsc --noEmit` passed | PASS |
| Build | `npm run build` | Next build compiled, typechecked, and generated 19 static pages | PASS |
| Targeted lint | `npx eslint src/lib/api.ts ... src/components/admin/MediaUpload.test.tsx` | No output, exit 0 | PASS |
| Scoped diff check | `git diff --check -- [Phase 49 verification/source/doc files]` | Exit 0 | PASS |
| Full lint | `npm run lint` | 14 errors in unrelated existing files/scripts | NOTE |

## Static Gates

| Gate | Result | Status |
|---|---|---|
| Runtime token/cookie access outside central client | SSR/server streaming/auth boundary hits only | PASS |
| Browser auth storage outside central/keycloak PKCE helper | zero hits | PASS |
| Bearer construction outside central client | server streaming boundary hits only | PASS |
| `authToken` props/params/locals in app/components | SSR server page hits only | PASS |
| Direct fetch outside central helper | public/no-auth fetches only | PASS |
| XHR auth duplication | one central block in `api.ts` only | PASS |

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| AUTH-API-CLIENT-01 | Normal frontend API calls use one central Auth/API client that owns token reads, persistence, refresh, 401 retry, request auth headers, upload/XHR auth, and auth-state resync. Pages/components consume token-free session state and must not store or directly read tokens. | SATISFIED | Central client owns token lifecycle; static gates and tests passed; SSR and streaming are documented separate boundaries. |

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `frontend/src/lib/api.ts` | Compatibility `authToken?: string` helper parameters remain inside central client | NOTE | Accepted as central-client compatibility debt because pages/components no longer pass token values; docs forbid new normal-helper token contracts. |
| `49-03-SUMMARY.md`, `49-09-SUMMARY.md`, `49-10-SUMMARY.md` | Historical `SPLIT_REQUIRED` summaries remain | NOTE | Later split plans and final static gates closed the production token ownership concern; metadata status may confuse readers. |
| unrelated lint files | Full lint errors | NOTE | Existing failures in `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and `tmp-live-full-flow*.js`; targeted Phase 49 lint passed. |

## Gaps Summary

No blocking gaps found. Phase 49 satisfies all roadmap success criteria and AUTH-API-CLIENT-01.

Residual notes:

- `api.ts` still carries central compatibility token parameters, but normal browser pages/components are statically gated from using token values.
- SSR pages `/watchlist` and `/anime/[id]` still read cookies server-side by explicit Phase 49 boundary decision.
- The workspace is heavily dirty with unrelated changes; this verification changed only this report.
- Full lint remains blocked by unrelated existing errors.

---

_Verified: 2026-05-20T17:09:45Z_
_Verifier: the agent (gsd-verifier)_
