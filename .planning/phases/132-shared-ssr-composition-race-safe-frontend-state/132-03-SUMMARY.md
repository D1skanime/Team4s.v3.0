---
phase: 132-shared-ssr-composition-race-safe-frontend-state
plan: 03
subsystem: ui
tags: [react, hooks, abortcontroller, vitest, testing-library, member-profile]

# Dependency graph
requires:
  - phase: 132-02
    provides: useCancellableSlugState (shared cancellable slug-keyed state hook)
provides:
  - Single shared useMemberViewer hook consolidating the three independent client-side owner/viewer resolvers
  - Fail-closed (PMFE-10) owner/viewer resolution contract, tested against loading/stale-key states
affects: [profile, member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slug-keyed owner/viewer resolution consumers must memoize their fetcher (useCallback keyed on slug) before passing it to useCancellableSlugState, since a fresh function identity every render re-triggers (and immediately self-aborts) the effect forever."

key-files:
  created:
    - frontend/src/lib/useMemberViewer.ts
    - frontend/src/lib/useMemberViewer.test.ts
  modified:
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx
    - frontend/src/app/members/[slug]/OwnProfileEditLink.tsx
    - frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx
    - frontend/src/components/profile/CorrectionReportModal.tsx
    - frontend/src/components/profile/CorrectionReportModal.test.tsx

key-decisions:
  - "useMemberViewer's fetcher must be useCallback-memoized on slug alone; an inline arrow function recreated every render fed into useCancellableSlugState's effect dependency array causes an infinite self-abort/refetch loop (caught during Task 1 TDD before it shipped)."
  - "CorrectionReportModal no longer performs any owner-resolution fetch at all -- it trusts its sole caller (OwnProfileEditLink) to only ever render it in the already-known non-owner branch (PMFE-02/D-02)."

patterns-established:
  - "One central useMemberViewer(slug, { enabled, retryKey }) hook is now the only place frontend/src/app/members/[slug]/ and frontend/src/components/profile/CorrectionReportModal.tsx may resolve getMemberProfile-derived owner/viewer status; new owner-gated UI in this surface must consume it rather than adding another independent resolver."

requirements-completed: [PMFE-01, PMFE-02, PMFE-06, PMFE-10]

# Metrics
duration: 8min
completed: 2026-08-15
---

# Phase 132 Plan 03: Central useMemberViewer Hook Summary

**Consolidated the three independent client-side owner/viewer resolvers in `OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx`, and `CorrectionReportModal.tsx` onto one shared, fail-closed `useMemberViewer` hook built on Plan 132-02's `useCancellableSlugState`.**

## Performance

- **Duration:** 8 min (21:44:xx - 21:52:xx UTC)
- **Completed:** 2026-08-15T21:52:43Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- New `frontend/src/lib/useMemberViewer.ts`: a single shared hook that resolves `getMemberProfile(slug)` at most once per `(slug, enabled, retryKey)`, built directly on top of `useCancellableSlugState` (no reimplementation of cancellation/key-guard logic).
- Fail-closed contract (PMFE-10) is explicit and tested: the hook's status is `'loading'` whenever disabled, in flight, `idle`, or superseded by a newer requestKey -- it is *never* `'resolved'` in any of those cases, so owner-only UI can never flash on for a not-yet-known viewer.
- `OwnHiddenProfilePreview.tsx` and `OwnProfileEditLink.tsx` both dropped their own `useEffect` + `getMemberProfile` + local union-state machinery in favor of `useMemberViewer`, with byte-identical rendered output preserved for every existing test scenario (loading, unavailable, error+retry, owner, non-owner, stale-response ignore, refresh-only owner upgrade, already-resolved reuse).
- `CorrectionReportModal.tsx` no longer performs its own `getOwnProfile()` fetch/gate at all -- the redundant third resolver (keyed by `app_user` via `getOwnProfile`, independent from the primary slug-keyed resolver) is deleted entirely; the modal now trusts its sole caller (`OwnProfileEditLink`, which only renders it once `viewer.is_owner === false` is already known) as the sole owner-gating authority.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the central useMemberViewer hook** - `d4fd1045` (feat)
2. **Task 2: Wire OwnHiddenProfilePreview and OwnProfileEditLink onto useMemberViewer; delete CorrectionReportModal's redundant owner check** - `74e43d30` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/lib/useMemberViewer.ts` - New shared owner/viewer resolver hook (fail-closed, built on `useCancellableSlugState`)
- `frontend/src/lib/useMemberViewer.test.ts` - Contract tests: disabled/null-slug never fetch, never resolves while loading, never resolves for a stale/superseded key, 404 maps to `unavailable`, other failures map to `error`, one fetch per `retryKey` bump
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` - Refactored onto `useMemberViewer`; rendered branches (`LoadingProfile`, `UnavailableProfile`, retry `ErrorState`, `MemberProfileContent`) unchanged
- `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` - Refactored onto `useMemberViewer`; viewer derivation (`viewerResolved` reuse / anonymous public viewer / resolved hook result) unchanged
- `frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx` - `@/lib/api` mock extended with an `ApiError` export (now required transitively by `useMemberViewer`'s 404 detection)
- `frontend/src/components/profile/CorrectionReportModal.tsx` - Removed the independent `getOwnProfile` effect, `ownMemberId` state, and its half of the early-return gate; added a PMFE-02/D-02 comment documenting the caller-owns-gating contract
- `frontend/src/components/profile/CorrectionReportModal.test.tsx` - Removed the now-redundant `Owner-Ausschluss (eigenes Profil)` describe block and its `getOwnProfile` mock plumbing (covered at the composition level by `members/[slug]/page.test.tsx`); kept the `Sichtbarkeits-Gate (D-18)` block unchanged

## Decisions Made
- `useMemberViewer`'s `fetcher` is memoized via `useCallback` keyed on `slug` alone -- an inline arrow function recreated every render would be a new object identity on every call, which is a dependency of `useCancellableSlugState`'s internal effect and would cause the effect to re-run (abort + refetch) on every single render, forever. This was caught while writing Task 1's own tests (two tests hung/timed out) before the hook shipped, and fixed inline per Rule 1 (bug fix, discovered and fixed within the same task, before commit).
- `CorrectionReportModal` no longer owns any owner-determination logic. `OwnProfileEditLink` is the sole owner-gating authority for this surface (grep-confirmed: `CorrectionReportModal` is only ever rendered from `OwnProfileEditLink`'s already-known non-owner branch).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an inline-fetcher-identity infinite refetch loop in `useMemberViewer`**
- **Found during:** Task 1 (writing `useMemberViewer.test.ts`)
- **Issue:** The first draft of `useMemberViewer` passed a fresh inline arrow function (`fetcher: () => getMemberProfile(slug as string)`) to `useCancellableSlugState` on every render. Since `fetcher` is part of that hook's `useEffect` dependency array, a new function reference on every render caused the effect to abort-and-restart the fetch on every single re-render -- so any in-flight or superseded-key test hung/timed out (never settling), because each render's freshly-aborted request pre-empted the previous one before it could apply its result.
- **Fix:** Memoized the fetcher with `useCallback(() => getMemberProfile(slug as string), [slug])` so its identity is stable across renders unless `slug` itself changes.
- **Files modified:** `frontend/src/lib/useMemberViewer.ts`
- **Commit:** `d4fd1045`

None else - Task 2 (wiring the two consumer components and deleting `CorrectionReportModal`'s redundant fetch) required only the plan-specified changes plus one test-mock addition (`ApiError` export) needed because `useMemberViewer` now transitively requires it for 404 detection, which `OwnProfileEditLink.test.tsx`'s existing `@/lib/api` mock had not previously needed to provide.

---

**Total deviations:** 1 auto-fixed (Rule 1, caught by the plan's own TDD requirement before shipping); 0 deferred.
**Impact on plan:** None on scope. The bug was found and fixed entirely inside Task 1's own RED/GREEN cycle before any commit landed; no plan behavior or acceptance criteria were affected.

## Issues Encountered
- `npx vitest`, `npx tsc`, and `npx eslint` are not runnable directly on the host; all verification commands in this plan were run inside the `team4sv30-frontend` container via `docker compose exec`.
- `npx tsc --noEmit` continues to show the same pre-existing, unrelated errors documented in `deferred-items.md` from Plan 132-02 (`MemberBadgeChain.test.tsx` drift, and two unrelated Next.js `.next/dev/types` generated-route-type errors on `fansubs/[slug]` pages) -- none of these reference any file touched by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useMemberViewer` is now the single, reusable owner/viewer resolution seam for the `members/[slug]` client surface; any future owner-gated UI added to that route should consume it rather than adding another independent `getMemberProfile`/`getOwnProfile` call.
- The pre-existing `MemberBadgeChain.test.tsx` drift (5 failing tests, several `tsc` errors, logged in `deferred-items.md` during Plan 132-02) remains open and unrelated to this plan's scope.

---
*Phase: 132-shared-ssr-composition-race-safe-frontend-state*
*Completed: 2026-08-15*

## Self-Check: PASSED

All created/modified files and both task commits (d4fd1045, 74e43d30) verified present.
