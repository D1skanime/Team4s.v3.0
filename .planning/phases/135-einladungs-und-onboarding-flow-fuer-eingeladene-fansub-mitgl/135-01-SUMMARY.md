---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 01
subsystem: auth
tags: [nextjs, keycloak, sessionStorage, pkce, react, vitest]

# Dependency graph
requires: []
provides:
  - "keycloakAuth.ts consumeStoredReturnPath() one-shot validated returnPath read/clear"
  - "keycloakAuth.ts BeginKeycloakLoginOptions.loginHint / .returnPath, forwarded as Keycloak login_hint and persisted returnPath"
  - "login/page.tsx completeCallback() destination priority: persistedReturnPath > registration-completion default > next param"
affects: [135-05, 135-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-shot sessionStorage marker with same-origin/no-`//`/no-`/login`-prefix validation, mirroring the existing readSafeNextPath()/registrationCompletion.ts shape"

key-files:
  created: []
  modified:
    - frontend/src/lib/keycloakAuth.ts
    - frontend/src/app/login/page.tsx
    - frontend/src/app/login/page.test.tsx

key-decisions:
  - "consumeStoredReturnPath() stays a separate one-shot key rather than folding into consumeTransientAuthState()'s 3-field return shape, since login/page.tsx consumes it independently of the PKCE code-exchange call."
  - "saveTransientAuthState() clears any stale RETURN_PATH_STORAGE_KEY when no returnPath argument is passed, preventing an earlier abandoned attempt's value from leaking into an unrelated later login."
  - "persistedReturnPath is read and cleared exactly once per callback attempt (before the try block), regardless of success or failure."

patterns-established:
  - "Persisted-destination priority order for the Keycloak callback: persistedReturnPath ?? (registration-completion default) ?? next-param — future accept-page flows (135-05/06) must persist via beginKeycloakLogin({ returnPath }) rather than inventing a new mechanism."

requirements-completed: [D-01, D-04]

# Metrics
duration: 4min
completed: 2026-08-17
---

# Phase 135 Plan 01: keycloakAuth returnPath/loginHint foundation Summary

**`consumeStoredReturnPath()` and `loginHint`/`returnPath` options added to `keycloakAuth.ts`; `login/page.tsx` now gives a persisted returnPath priority over both the registration-completion default and the URL `next` param, closing the redirect round-trip gap invite-accept flows depend on.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-17T12:56:00Z
- **Completed:** 2026-08-17T12:58:10Z
- **Tasks:** 2 (Task 2 executed as RED/GREEN TDD cycle)
- **Files modified:** 3

## Accomplishments
- `keycloakAuth.ts` exports a validated, one-shot `consumeStoredReturnPath()` and extends `BeginKeycloakLoginOptions`/`beginKeycloakLogin` with `loginHint`/`returnPath`, mirroring the existing PKCE transient-storage and `registrationCompletion.ts` one-shot marker patterns.
- `login/page.tsx`'s `completeCallback()` now computes its post-Keycloak-callback destination as `persistedReturnPath ?? (registration-completion default)`, giving the future invite-accept flow priority to land back on its own page.
- `login/page.test.tsx` grew from 9 to 12 passing cases, proving the new priority ordering without touching any pre-existing case's intent.

## Task Commits

1. **Task 1: Extend keycloakAuth.ts with returnPath persistence and loginHint forwarding** - `6a95aca4` (feat)
2. **Task 2: Wire login/page.tsx to prefer the persisted returnPath (RED)** - `59a2b596` (test)
3. **Task 2: Wire login/page.tsx to prefer the persisted returnPath (GREEN)** - `e3ed16b0` (feat)

_Task 2 was executed as a RED/GREEN TDD cycle per its `tdd="true"` annotation; no REFACTOR commit was needed since the GREEN implementation required no cleanup._

## Files Created/Modified
- `frontend/src/lib/keycloakAuth.ts` - Added `RETURN_PATH_STORAGE_KEY`, extended `saveTransientAuthState` with a 4th `returnPath` argument, added exported `consumeStoredReturnPath()`, extended `BeginKeycloakLoginOptions` with `loginHint`/`returnPath`, and forwards `login_hint` on the Keycloak auth URL.
- `frontend/src/app/login/page.tsx` - Imports `consumeStoredReturnPath`; `completeCallback()` reads/clears it once per attempt and gives it priority in the destination computation.
- `frontend/src/app/login/page.test.tsx` - Added `consumeStoredReturnPathMock` to the hoisted mocks/mock factory/`beforeEach` reset, plus 3 new test cases covering the full priority ordering.

## Decisions Made
- Typed `consumeStoredReturnPathMock: vi.fn((): string | null => null)` explicitly in the test file rather than the plan's literal `vi.fn(() => null)`, because TypeScript would otherwise infer a `null`-only return type and reject `mockReturnValue('/invitations/accept?token=abc')` under `tsc --noEmit`. Behavior is identical to what the plan specified; this is a type-annotation-only adjustment required to keep the verification command green.

## Deviations from Plan

None beyond the type-annotation fix documented above under Decisions Made (not a scope change — same mock default value and reset behavior the plan specified).

## Issues Encountered
- `docker compose exec -T team4sv30-frontend npx tsc --noEmit` reports several pre-existing, unrelated errors in `.next/dev/types/app/admin/anime/**`, `app/fansubs/[slug]/page.ts`, etc. (Next.js generated route-type drift). Confirmed via `grep -i -E "keycloakAuth|login/page"` that none reference this plan's files; treated as pre-existing baseline noise, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`consumeStoredReturnPath()` and `beginKeycloakLogin({ loginHint, returnPath })` are ready for Plans 135-05/06 to wire into the shared `InviteAcceptFlow` component and the `/invitations/accept` / `/claim-invitations/accept` pages. No blockers.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
