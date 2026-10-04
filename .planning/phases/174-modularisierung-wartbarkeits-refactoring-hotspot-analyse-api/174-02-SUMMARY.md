---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 02
subsystem: api
tags: [refactoring, api-client, auth-session, vitest-mocking, barrel-module, module-boundaries]

# Dependency graph
requires:
  - phase: 174-01
    provides: "174-HOTSPOTS.md baseline (6 pre-existing frontend test failures), D-19's don't-misread-pre-existing-failures-as-regressions rule"
provides:
  - "frontend/src/lib/api/client.ts: the single physical home for shared API-client infrastructure (resolveApiUrl, ApiError, apiClientFetch, authorizedFetch, parseApiErrorPayload, base-URL resolution, auth-header building, token/cookie/session-meta storage, auth-refresh-on-401 retry) — empirically proven D-10-compatible"
  - "Locked barrel-path decision: frontend/src/lib/api.ts stays the permanent barrel file (coexists with the sibling frontend/src/lib/api/ directory, re-exports via `export * from './api/client'`) — every subsequent Welle-2 plan (174-03..174-08) wires its new domain module the same way"
  - "4 isolated canary tests empirically proving every Vitest mock pattern used against @/lib/api in this repo (real import, literal-factory vi.mock, vi.importActual partial mock, namespace vi.spyOn) survives the barrel split"
affects: [174-03, 174-04, 174-05, 174-06, 174-07, 174-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Barrel-path collision probe: write a placeholder in the sibling directory, run tsc --noEmit, diff against a captured pre-change baseline to prove/disprove ambiguous-module resolution empirically rather than assuming"
    - "One mock-pattern per canary test file (vi.mock hoisting-collision avoidance) sharing one trivial non-test consumer module"

key-files:
  created:
    - frontend/src/lib/api/client.ts
    - frontend/src/lib/api/canary.barrel.consumer.ts
    - frontend/src/lib/api/canary.barrel.real.test.ts
    - frontend/src/lib/api/canary.barrel.literal-mock.test.ts
    - frontend/src/lib/api/canary.barrel.import-actual.test.ts
    - frontend/src/lib/api/canary.barrel.spyon.test.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.no-token-boundary.test.ts

key-decisions:
  - "Barrel layout: api.ts (file) + sibling api/ (directory) coexist cleanly under tsc --noEmit (confirmed empirically, diffed byte-identical against a pre-change 6-error baseline) — api.ts stays the permanent barrel, no api/index.ts rename needed"
  - "Task 2's scope expanded beyond the plan's literal text: authorizedFetch's real (traced, not assumed) transitive closure reaches the entire auth/session/token-storage subsystem, not just getApiBaseUrl — traced the full graph empirically and confirmed it is fully self-contained (zero dependency on anything staying in api.ts beyond external keycloakAuth/publicApiUrl imports and neutral types), so the whole closure moved to client.ts with no circular import"
  - "client.ts is ~910 lines, well past the 450-line project guideline — justified per the same D-24 cohesion exception 174-05-PLAN.md already anticipates for auth.ts/permissions.ts: authorizedFetch's auth-refresh-on-401 retry is one cohesive, verbatim-relocated function chain that must not be artificially split mid-refactor"

requirements-completed: [D-08, D-09, D-10, D-11, D-12, D-19, D-22]

# Metrics
duration: ~90min
completed: 2026-10-04
---

# Phase 174 Plan 02: Shared API-Client Infrastructure + Barrel Canary Tests Summary

**Resolved the api.ts/api/ barrel-path collision empirically (tsc-clean, byte-identical to a captured pre-change baseline), relocated the complete shared API-client/auth-session transport chain (resolveApiUrl, ApiError, apiClientFetch, authorizedFetch, and their full traced dependency closure) verbatim into a new `frontend/src/lib/api/client.ts`, and proved via 4 isolated canary tests that every Vitest mock pattern this repo uses against `@/lib/api` survives the split — full suite matches the 174-01 baseline exactly (0 new regressions after fixing one architectural-boundary test that needed its allowlist updated).**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-10-04
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 8 (2 modified, 6 created)

## Accomplishments

- Empirically resolved the barrel-path collision risk PATTERNS.md flagged: `frontend/src/lib/api.ts` (file) and the sibling `frontend/src/lib/api/` (directory, already containing `admin-anime-intake.ts`/`segment-contributors.ts` pre-174) coexist cleanly under `tsc --noEmit` — diffed byte-identical against a captured 6-error pre-change baseline, with and without the new `client.ts`.
- Traced `apiClientFetch`'s real dependency graph by reading every function body it transitively calls (not assuming from the plan's abbreviated interface excerpt), discovering it reaches far deeper than `getApiBaseUrl`/`authorizedFetch` alone: the full auth-session/token-storage/cookie/Keycloak-refresh chain. Confirmed empirically that this entire closure is self-contained (depends only on `@/lib/keycloakAuth`, `@/lib/publicApiUrl`, and neutral `@/types/*` — nothing that stays in `api.ts`), so it relocates to `client.ts` with zero circular imports.
- Moved ~900 lines verbatim: `resolveApiUrl` (+`resolveLoopbackMediaUrl`/`isLoopbackHost`), `ApiError`, `apiClientFetch`, `authorizedFetch`, `parseApiErrorPayload`/`parseApiError`, `getApiBaseUrl` (+base-URL consts), `resolveAuthToken`/`withAuthHeader`, `ensureFreshRuntimeSession`/`refreshRuntimeSession`/`shouldRefreshRuntimeSession`, `getRuntimeRefreshToken`/`getRuntimeSessionMeta`/`persistAuthSession`/`clearAuthSession`/`toRuntimeAuthData`, `getCurrentUserWithBearerToken`/`refreshAuthToken`/`normalizeCurrentUserResponse`, `isAuthRelatedError`, and the cookie/localStorage read/write primitives (`readBrowserCookie`/`writeBrowserCookie`/`readBrowserStorage`/`writeBrowserStorage`/`clearLegacyTokenStorage`/`isSecureBrowserContext`) they all depend on — all into `frontend/src/lib/api/client.ts`.
- `api.ts` now re-exports the full barrel surface (`export * from "./api/client"`) and imports back the ~20 names its still-resident functions (`getCurrentUser`, `issueAuthToken`, `revokeAuthToken`, `completeKeycloakAuthCallback`, `refreshActiveAuthSession`, `logoutActiveAuthSession`, `getRuntimeAuthToken`, `getRuntimeDisplayName`, `getAuthSessionSnapshot`, `prepareRuntimeSessionSwitch`, `authorizedUploadXhr`, and ~300 domain functions throughout the 10,600-line remainder) need — confirmed one-directional (`api.ts → client.ts`, never the reverse) by tracing every call site.
- 4 isolated canary tests (`canary.barrel.real.test.ts`, `canary.barrel.literal-mock.test.ts`, `canary.barrel.import-actual.test.ts`, `canary.barrel.spyon.test.ts`) plus a shared `canary.barrel.consumer.ts` helper, each testing exactly one of the 4 mock shapes this repo actually uses against `@/lib/api` (confirmed by reading the cited real example files) — all 6 assertions pass, each file contains exactly one `vi.mock` call (or none).
- Full regression suite (`npx vitest run`) matches the 174-01 baseline **exactly**: 4 failed test files / 6 failed tests (all pre-existing, documented in `174-HOTSPOTS.md`), 357 passed files (353 baseline + 4 new canary files) / 3192 passed tests (3186 baseline + 6 new canary assertions). `npx tsc --noEmit` byte-identical to the pre-change baseline. `npx eslint` on every file this plan touched: zero errors, zero warnings.

## Task Commits

All 3 tasks land in a single commit per this plan's own Task 3 instructions (Task 1's placeholder `client.ts` is overwritten by Task 2, so an intermediate commit would capture throwaway content — the plan's `files_modified`/`<verify>` design treats Tasks 1-3 as one atomic unit):

1. **Tasks 1-3: barrel-path decision + shared-infra carve-out + canary tests** - `001841e6` (refactor)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `frontend/src/lib/api/client.ts` - New file. Complete shared API-client/auth-session transport surface (~910 lines): `resolveApiUrl`, `ApiError`, `apiClientFetch`, `authorizedFetch`, `parseApiErrorPayload`, base-URL resolution, auth-header building, token/cookie/session-meta storage, auth-refresh-on-401 retry.
- `frontend/src/lib/api.ts` - Reduced by ~900 lines (the moved shared infra); now imports the ~20 client.ts names its remaining ~300 domain functions and residual auth-adjacent functions (`getCurrentUser`, `issueAuthToken`, `revokeAuthToken`, Keycloak callback/logout wrappers) still need, and re-exports the full client.ts surface via `export * from "./api/client"`. Still the monolith for domain functions — those move in 174-03 through 174-07.
- `frontend/src/lib/api/canary.barrel.consumer.ts` - New. Trivial non-test module (`callApiClientFetch`, `callResolveApiUrl`) the mock-dependent canaries call through.
- `frontend/src/lib/api/canary.barrel.real.test.ts` - New. Pattern (a): plain unmocked import, no `vi.mock` call.
- `frontend/src/lib/api/canary.barrel.literal-mock.test.ts` - New. Pattern (b): full-literal-factory `vi.mock`.
- `frontend/src/lib/api/canary.barrel.import-actual.test.ts` - New. Pattern (c): `vi.importActual` partial mock.
- `frontend/src/lib/api/canary.barrel.spyon.test.ts` - New. Pattern (d): namespace import + `vi.spyOn`, no `vi.mock`.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Modified (deviation, see below). Updated the Phase-49 architectural boundary guard's `centralClientAllowlist` to include `src/lib/api/client.ts`, and extended the Keycloak-ID-token anti-pattern check to also scan `client.ts` (where `toRuntimeAuthData` now lives).

## Decisions Made

- **Barrel layout locked:** `frontend/src/lib/api.ts` stays the permanent barrel file, re-exporting `./api/client` (and, in later Welle-2 plans, each new domain module) via `export * from`. Verified empirically with `tsc --noEmit`, diffed byte-identical against a pre-change 6-error baseline (the 6 errors are unrelated pre-existing issues in `ReleaseDetailHero.test.tsx`/a `page.tsx` type mismatch, confirmed present with and without the new `client.ts`). No `api/index.ts` rename needed — the `ui/index.ts` collision PATTERNS.md worried about does not materialize in practice.
- **Scope of "verbatim relocation" resolved by tracing, not assuming:** the plan's `<interfaces>` block only named `getApiBaseUrl`/`authorizedFetch` as `apiClientFetch`'s dependencies. Reading every function body in the real call chain revealed `authorizedFetch` → `ensureFreshRuntimeSession` → `refreshRuntimeSession` → the full token-refresh/Keycloak/session-persistence subsystem (~35 additional functions/constants). Traced each one's own dependencies to confirm the entire closure is self-contained (only external `@/lib/keycloakAuth`/`@/lib/publicApiUrl` imports and neutral `@/types/*`), so there is no circular-import risk in moving all of it together. This is **not** a change of architectural direction — it is the same "client.ts never depends on a domain module" rule the plan already states, just applied after tracing the real graph instead of the plan's partial excerpt.
- **client.ts's size (~910 lines) is a justified exception to the 450-line guideline**, using the same D-24 cohesion rationale 174-05-PLAN.md already pre-approves for `auth.ts`/`permissions.ts`: `authorizedFetch`'s auth-refresh-on-401 retry chain is one cohesive, verbatim-relocated unit that must not be split mid-move. A future plan may choose to further decompose `client.ts` (e.g. separating pure transport from token-storage primitives) once 174-05 has landed and the `auth.ts`/`client.ts` boundary can be drawn with both files existing — out of this plan's scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `authorizedFetch`'s real dependency closure was far larger than the plan's interface excerpt described**
- **Found during:** Task 2
- **Issue:** The plan's `<interfaces>` block said `apiClientFetch` "Depends on `getApiBaseUrl` and `authorizedFetch` — read their current bodies and relocate alongside," implying a shallow, ~70-line move. Reading `authorizedFetch`'s actual body and recursively tracing every function it calls revealed a ~35-function/constant closure spanning the entire auth-session/token/cookie/Keycloak-refresh subsystem (lines spread across `api.ts`'s first 1,600 and lines 3226-3247). Several of these functions (`getRuntimeSessionMeta`, `persistAuthSession`, `clearAuthSession`, `getRuntimeRefreshToken`, `refreshAuthToken`) are explicitly named in 174-05-PLAN.md's own "auth/session" bucket destined for a future `auth.ts` — meaning this plan's relocation lands them in `client.ts` first, ahead of 174-05's schedule.
- **Fix:** Traced the complete, real call graph (not the plan's partial excerpt) by reading every function body transitively reachable from `authorizedFetch`/`apiClientFetch`. Confirmed the full closure is self-contained (no dependency on anything that stays in `api.ts`, only external `@/lib/keycloakAuth`/`@/lib/publicApiUrl` and neutral types) and moved all of it verbatim into `client.ts`. Fixed every import-path fallout in `api.ts` with `tsc --noEmit` iteration until byte-identical to the pre-change baseline.
- **Follow-up note for 174-05:** when 174-05 executes, the 17 "auth/session" functions it lists (`getRuntimeSessionMeta`, `getRuntimeAuthToken`\*, `getRuntimeRefreshToken`, `getRuntimeDisplayName`\*, `hasRuntimeAuthToken`\*, `getAuthSessionSnapshot`\*, `persistAuthSession`, `clearAuthSession`, `persistResolvedAuthSession`\*, `resolveCurrentUserFromAuthSession`\*, `completeKeycloakAuthCallback`\*, `refreshActiveAuthSession`\*, `logoutActiveAuthSession`\*, `issueAuthToken`\*, `refreshAuthToken`, `revokeAuthToken`\*) are split: the 9 marked `\*` are still in `api.ts` exactly where 174-05 expects them; the other 6 (`getRuntimeSessionMeta`, `getRuntimeRefreshToken`, `persistAuthSession`, `clearAuthSession`, `refreshAuthToken`) already moved to `client.ts` in this plan. 174-05's own `<verify>` grep (`! grep -qE "...names..." frontend/src/lib/api.ts`) will still pass trivially for the 6 already-moved names (they're genuinely absent from `api.ts`), but 174-05's action should check `client.ts` first for these 6 before assuming they need a fresh move from `api.ts`, and should move them from `client.ts` to `auth.ts` instead (same verbatim-relocation discipline, different source file).
- **Files modified:** `frontend/src/lib/api.ts`, `frontend/src/lib/api/client.ts`
- **Verification:** `tsc --noEmit` byte-identical to pre-change baseline; full `vitest run` matches 174-01 baseline exactly; `eslint` clean on both files.
- **Committed in:** `001841e6` (part of the single Task 1-3 commit)

**2. [Rule 1 - Bug/stale test] `api.no-token-boundary.test.ts`'s architectural boundary allowlist did not recognize the new physical location**
- **Found during:** Task 3 (full-suite regression run)
- **Issue:** `frontend/src/lib/api.no-token-boundary.test.ts` is a Phase-49 architectural guard that statically scans the entire production source tree for token/cookie/bearer-header/fetch patterns and fails if they appear outside a hardcoded `centralClientAllowlist = new Set(['src/lib/api.ts'])`. After moving the auth/token code to `client.ts`, 4 of its 9 tests failed (`keeps direct runtime token and auth-cookie access...`, `keeps browser auth storage access...`, `keeps bearer construction...`, `keeps direct fetch outside the central client...`) — a genuine new regression, not a baseline failure (confirmed: not in `174-HOTSPOTS.md`'s documented 6-failure baseline).
- **Fix:** Added `'src/lib/api/client.ts'` to `centralClientAllowlist` with a comment explaining the boundary itself did not change, only the protected code's physical file. Also extended the separate "keeps Keycloak ID tokens out of Team4s API bearer mapping" check (which reads `api.ts`'s source text directly) to additionally scan `client.ts`, since `toRuntimeAuthData` — the function it actually guards — now lives there.
- **Files modified:** `frontend/src/lib/api.no-token-boundary.test.ts`
- **Verification:** `npx vitest run src/lib/api.no-token-boundary.test.ts` → 9/9 passed. Full suite re-run matches 174-01 baseline exactly (4 failed files / 6 failed tests, all pre-existing and documented).
- **Committed in:** `001841e6` (part of the single Task 1-3 commit)

**3. [Rule 1 - Lint cleanup] Removed 3 now-unused imports in `api.ts` left behind by the relocation**
- **Found during:** Task 3 (`npx eslint .` full run)
- **Issue:** `AuthRefreshRequest` (type), `refreshKeycloakToken`, and `KeycloakTokenBundle` (type) were only used by `refreshAuthToken`/`refreshRuntimeSession`, both now in `client.ts` — left as dead imports in `api.ts`, flagged by `@typescript-eslint/no-unused-vars`.
- **Fix:** Removed the 3 unused imports from `api.ts`'s `@/types/auth` and `@/lib/keycloakAuth` import statements (the other names in those statements, e.g. `AuthIssueRequest`/`isKeycloakEnabled`/`logoutFromKeycloak`, remain in use by code still in `api.ts`).
- **Files modified:** `frontend/src/lib/api.ts`
- **Verification:** `npx eslint src/lib/api.ts` → 0 errors, 0 warnings.
- **Committed in:** `001841e6` (part of the single Task 1-3 commit)

## Known Stubs

None — this plan relocates existing, working code; no new UI surfaces or data sources were introduced.

## Threat Flags

None — the two threats this plan's `<threat_model>` already named (T-174-02-01: verbatim relocation correctness; T-174-02-02: barrel-mocking compatibility) are exactly what Task 2's byte-identical-tsc-diff verification and Task 3's 4 canary tests + full-suite-baseline-match empirically close. No new network endpoints, auth paths, or trust-boundary-crossing surface were introduced — only a file-layout change plus one test allowlist correction.

## Self-Check: PASSED

- `frontend/src/lib/api/client.ts` — FOUND
- `frontend/src/lib/api/canary.barrel.consumer.ts` — FOUND
- `frontend/src/lib/api/canary.barrel.real.test.ts` — FOUND
- `frontend/src/lib/api/canary.barrel.literal-mock.test.ts` — FOUND
- `frontend/src/lib/api/canary.barrel.import-actual.test.ts` — FOUND
- `frontend/src/lib/api/canary.barrel.spyon.test.ts` — FOUND
- Commit `001841e6` — FOUND (`git log --oneline --all | grep 001841e6`)
