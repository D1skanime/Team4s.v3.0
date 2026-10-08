---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 11
subsystem: api
tags: [typescript, next.js, admin-anime, api-client, refactor]

# Dependency graph
requires:
  - phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
    provides: "176-05/176-06 established the sibling getAdminGenreTokens barrel-export pattern this plan matches"
provides:
  - "Single canonical, barrel-exported getAdminTagTokens implementation"
  - "useAdminAnimeCreateControllerImpl.ts now imports getAdminTagTokens from @/lib/api like its sibling useAnimePatchImpl.ts"
affects: [admin-anime-create, admin-anime-taxonomy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All admin taxonomy token fetchers (genre, tag) are barrel-exported from @/lib/api via anime-taxonomy.ts, never duplicated in feature-specific API client files"

key-files:
  created: []
  modified:
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts

key-decisions:
  - "Kept anime-taxonomy.ts's getAdminTagTokens (authorizedFetch/getApiBaseUrl) as canonical over admin-anime-intake.ts's duplicate (apiClientFetch) because it is barrel-exported and already used identically by the sibling useAnimePatchImpl.ts hook"
  - "Confirmed no behavioral difference for the current caller: apiClientFetch is a thin wrapper that resolves a relative URL via getApiBaseUrl and then calls authorizedFetch internally, so both versions ultimately hit the same auth/retry/401-refresh code path; both ApiError classes originate from the same client.ts definition"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-10-08
---

# Phase 176 Plan 11: Consolidate duplicate getAdminTagTokens Summary

**Removed the non-barrel-exported duplicate `getAdminTagTokens` in `admin-anime-intake.ts` and redirected its sole caller to the canonical barrel-exported implementation in `anime-taxonomy.ts`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-08T09:01:23Z
- **Tasks:** 2
- **Files modified:** 4 (2 listed in plan frontmatter + 2 ancillary test files)

## Accomplishments
- Confirmed via semantic comparison that the two `getAdminTagTokens` implementations are behaviorally equivalent for the current caller (same endpoint, same query params, same effective auth/retry mechanism, same `ApiError` class)
- Removed the duplicate, non-barrel-exported implementation from `admin-anime-intake.ts`
- Redirected `useAdminAnimeCreateControllerImpl.ts`'s import to the `@/lib/api` barrel, matching the sibling `useAnimePatchImpl.ts` pattern exactly
- Updated the two tests that previously asserted/mocked `getAdminTagTokens` via the `admin-anime-intake` module path so they reflect the new barrel-sourced import

## Task Commits

Each task was committed atomically:

1. **Task 1: Compare both implementations' semantics and confirm which is canonical** - investigation only, no file changes, no separate commit (findings below and folded into Task 2's commit message)
2. **Task 2: Remove the duplicate implementation and redirect its caller** - `d3df1793` (refactor)

**Plan metadata:** pending (this SUMMARY + STATE/ROADMAP update commit)

## Semantic Comparison (Task 1 findings)

| Aspect | Version A (anime-taxonomy.ts, kept) | Version B (admin-anime-intake.ts, removed) |
|---|---|---|
| Endpoint | `GET /api/v1/admin/tags` | `GET /api/v1/admin/tags` (same) |
| Query params | `query`, `limit` (same semantics) | `query`, `limit` (identical) |
| URL construction | Absolute, via `getApiBaseUrl()` directly | Relative path, resolved to absolute by `apiClientFetch` internally (`apiClientFetch` prefixes with `getApiBaseUrl()` when the path isn't already absolute) |
| Fetch/auth mechanism | `authorizedFetch` (auth-header injection, 401 refresh-retry, idempotent-request network retry) | `apiClientFetch` -- a thin wrapper that resolves the URL and then calls `authorizedFetch` internally, so the actual auth/retry behavior is identical |
| `authToken` param | Passed through to `authorizedFetch` | Explicitly ignored via `ignoreDeprecatedAuthToken` (the controller never passes a second arg, so this is a no-op difference for the current caller) |
| Error handling | `parseApiError` -- message only, `ApiError(status, message)` | `parseApiErrorPayload` -- message + code + details, `ApiError(status, message, null, code, details)` (superset of fields; both `ApiError` classes are the same class defined once in `client.ts`, so `instanceof` checks and `.status`/`.message` reads behave identically) |
| Response shape | `Promise<AdminTagTokensResponse>` | `Promise<AdminTagTokensResponse>` (identical type from `@/types/admin`) |
| Barrel-exported | Yes, via `frontend/src/lib/api.ts` → `export * from "./api/admin/anime-taxonomy"` | No, only reachable via a direct deep import |
| Existing sibling usage | `useAnimePatchImpl.ts` already imports this exact function from the `@/lib/api` barrel for the identical capability | N/A |

**Conclusion:** No behavioral difference affects the current caller (`useAdminAnimeCreateControllerImpl.ts`'s effect calls `getAdminTagTokens({ limit: 1000 })` with no second argument and only inspects `error instanceof ApiError` / `error.status` / `error.message` on failure). Version A is canonical: it is barrel-exported (matches CLAUDE.md's "funnel through `frontend/src/lib/api.ts`" convention) and is the pattern already followed by the sibling hook for the identical capability.

## Files Created/Modified
- `frontend/src/lib/api/admin-anime-intake.ts` - Removed the duplicate `getAdminTagTokens` function and its now-unused `AdminTagTokensResponse` type import
- `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` - Changed the `getAdminTagTokens` import from `@/lib/api/admin-anime-intake` to the `@/lib/api` barrel, consolidated with the existing `getAdminGenreTokens` import
- `frontend/src/app/admin/anime/create/page.test.tsx` - Updated the test asserting `getAdminTagTokens`'s import path to check the `@/lib/api` barrel instead of the now-removed `admin-anime-intake` export
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` - Moved the `getAdminTagTokens` mock wiring from the `@/lib/api/admin-anime-intake` mock to the `@/lib/api` mock, keeping the same `intakeMocks.getAdminTagTokens` fn reference so all existing `.mockReset()`/assertion call sites kept working unchanged

## Decisions Made
- See "Key-decisions" in frontmatter and the semantic comparison table above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated two tests that mocked/asserted the removed import path**
- **Found during:** Task 2 (verification step -- running vitest after the file changes)
- **Issue:** `page.test.tsx` had a test asserting `getAdminTagTokens` is importable from `@/lib/api/admin-anime-intake`, and `useAdminAnimeCreateController.test.ts` mocked `@/lib/api` without `getAdminTagTokens` (it was wired via the `admin-anime-intake` mock instead). Both would fail/break after the import redirect: the first asserts a now-nonexistent export, the second would leave the controller calling an unmocked (`undefined`) function in the mocked `@/lib/api` module.
- **Fix:** Updated `page.test.tsx`'s test to import from `@/lib/api` instead and check the barrel export. Moved `getAdminTagTokens`'s mock wiring in `useAdminAnimeCreateController.test.ts` from the `@/lib/api/admin-anime-intake` mock object to the `@/lib/api` mock object, keeping the same `intakeMocks.getAdminTagTokens` vi.fn() reference so all downstream `.mockReset()`/assertion call sites needed no further changes.
- **Files modified:** `frontend/src/app/admin/anime/create/page.test.tsx`, `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts`
- **Verification:** `npx vitest run src/app/admin/anime` -- 53 test files, 479 tests, all passing. `npx tsc --noEmit` -- no errors. `npx eslint` on all four touched files -- 0 errors (1 pre-existing, unrelated warning about an unused `resetStagedAssets` function that this plan did not touch).
- **Committed in:** `d3df1793` (part of Task 2's commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking test breakage from the import-path change)
**Impact on plan:** Necessary to keep the test suite passing after the planned import redirect. No scope creep -- both test edits are scoped exactly to the `getAdminTagTokens` import-path change the plan specified.

## Issues Encountered
None beyond the test-mock deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `getAdminTagTokens` now exists exactly once, barrel-exported, consistent with the `getAdminGenreTokens` sibling pattern.
- No blockers for subsequent plans in this wave.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*

## Self-Check: PASSED

- FOUND: frontend/src/lib/api/admin-anime-intake.ts
- FOUND: frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
- FOUND: frontend/src/app/admin/anime/create/page.test.tsx
- FOUND: frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
- FOUND commit: d3df1793
