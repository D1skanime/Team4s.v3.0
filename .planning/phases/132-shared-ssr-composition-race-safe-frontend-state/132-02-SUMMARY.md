---
phase: 132-shared-ssr-composition-race-safe-frontend-state
plan: 02
subsystem: ui
tags: [react, hooks, abortcontroller, vitest, testing-library, next.js]

# Dependency graph
requires:
  - phase: 132-01
    provides: known-for aggregate/member-profile groundwork used elsewhere in the phase
provides:
  - Shared, StrictMode-safe, cancellable slug-keyed async-state hook (useCancellableSlugState)
  - Real AbortSignal cancellation support on getMemberProjects
  - MemberCurrentProjectsSection continuation paging wired onto the shared hook with a local ErrorState + retry
  - Locked progressive-disclosure ("full content stays mounted while clamped/collapsed") test contract across MemberStorySection, FocalCarousel, and MemberBadgeChain
affects: [profile, member-profile, ui-primitives]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slug/requestKey-scoped AbortController hook with pure (non-ref-mutating) state updaters for StrictMode safety"
    - "Progressive disclosure = CSS-only visual clamp/expand; DOM content is always fully mounted (never conditionally unmounted)"

key-files:
  created:
    - frontend/src/hooks/useCancellableSlugState.ts
    - frontend/src/hooks/useCancellableSlugState.test.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
    - frontend/src/components/profile/MemberStorySection.test.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/ui/FocalCarousel.test.tsx

key-decisions:
  - "getMemberProjects gained a 4th optional signal?: AbortSignal parameter, mirroring the existing getSearch/getSearchSuggestions pattern rather than introducing new plumbing in apiClientFetch."
  - "useCancellableSlugState never mutates a ref inside a setState updater; state transitions are pure functions of previous state + resolved value, avoiding the StrictMode double-invoke dedup corruption bug precedent set in useProjectMemberCollection.ts."
  - "Pre-existing, unrelated MemberBadgeChain.test.tsx failures (from an earlier in-flight WIP commit e034b53c, landed before 132-02 execution started) were left unfixed per the SCOPE BOUNDARY rule and logged to deferred-items.md rather than silently patched."

patterns-established:
  - "Progressive-disclosure components (MemberStorySection clamp, FocalCarousel expand, MemberBadgeChain group carousels) must never conditionally unmount content behind a visual toggle — only apply/remove a CSS class. This is now a locked, tested contract (PMFE-06/D-09 citations in the three test files)."

requirements-completed: [PMFE-03, PMFE-04, PMFE-06, PMFE-08]

# Metrics
duration: 19min
completed: 2026-08-15
---

# Phase 132 Plan 02: Shared Cancellable Hook + Progressive-Disclosure Contract Summary

**Shared `useCancellableSlugState` hook with real AbortController cancellation wired onto `MemberCurrentProjectsSection`'s continuation paging (local ErrorState + retry), plus a locked full-mount test contract for story clamp, carousel expand, and badge-group carousels.**

## Performance

- **Duration:** 19 min (21:25:04 - 21:44:07 UTC)
- **Started:** 2026-08-15T21:25:04Z
- **Completed:** 2026-08-15T21:44:07Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments
- New shared `useCancellableSlugState` hook: slug/requestKey-scoped, truly cancellable via real `AbortController`, StrictMode double-invoke safe, with a pure (non-ref-mutating) state-transition invariant documented inline.
- `getMemberProjects` now accepts and forwards an `AbortSignal`, matching the existing `getSearch`/`getSearchSuggestions` pattern in `frontend/src/lib/api.ts`.
- `MemberCurrentProjectsSection` continuation loading ("Weitere Projekte laden") rewired onto the shared hook; a failed load now renders a local `ErrorState` (title/description/retry per UI-SPEC) instead of a bespoke `<p role="alert">`, while the rest of the page stays interactive.
- Progressive-disclosure ("full content stays mounted while clamped/collapsed") is now a locked, tested contract across `MemberStorySection` (story clamp), `FocalCarousel` (expand-to-grid), and `MemberBadgeChain` (badge-group carousel expand).

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared useCancellableSlugState hook and add signal support to getMemberProjects** - `146b8253` (feat)
2. **Task 2: Wire MemberCurrentProjectsSection onto the shared hook with a local ErrorState** - `5841f6a6` (feat)
3. **Task 3: Lock the progressive-disclosure contract (full content stays mounted while clamped/collapsed)** - `d602d4ac` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/hooks/useCancellableSlugState.ts` - Shared cancellable, key-guarded async-state hook (real AbortController, pure updaters, StrictMode-safe)
- `frontend/src/hooks/useCancellableSlugState.test.ts` - Hook behavior contract tests including a StrictMode double-invoke regression test
- `frontend/src/lib/api.ts` - `getMemberProjects` gained an optional 4th `signal?: AbortSignal` parameter forwarded to `apiClientFetch`
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` - Continuation paging rewired onto `useCancellableSlugState`; bespoke error paragraph replaced with `ErrorState` + retry
- `frontend/src/components/profile/MemberCurrentProjectsSection.module.css` - Removed the now-unused `.loadError` rule
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` - Updated continuation-fetch assertion for the new `signal` argument; added ErrorState/retry test
- `frontend/src/components/profile/MemberStorySection.test.tsx` - New test locking that clamped story content stays fully mounted (CSS-only clamp)
- `frontend/src/components/ui/FocalCarousel.test.tsx` - New test locking that the expanded grid view renders every item from `items`, not just the windowed `carouselItems` subset
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - New test locking that a badge group's carousel keeps every role row mounted after expand

## Decisions Made
- `useCancellableSlugState`'s internal `AbortController` lives in a `useRef`, aborted before each new request and on unmount/effect-cleanup; state transitions themselves are pure (no ref mutation inside `setState` updaters), directly citing the StrictMode/dedup bugfix precedent already established in `useProjectMemberCollection.ts`.
- Retrying a failed continuation load re-issues exactly one request for the same offset that failed (the `requestKey` is offset-derived, not incremented on retry).
- Pre-existing, unrelated `MemberBadgeChain.test.tsx` failures were left alone (see Deviations) rather than fixed inline, to respect the SCOPE BOUNDARY rule against fixing issues not caused by this plan's changes.

## Deviations from Plan

### Auto-fixed Issues

None - Tasks 1 and 2 (already committed prior to this resume) and Task 3 (this session) were executed as specified in the plan; no bugs, missing functionality, or blocking issues required an auto-fix.

### Deferred (out-of-scope, logged not fixed)

**1. Pre-existing unrelated MemberBadgeChain.test.tsx failures**
- **Found during:** Task 3 (extending MemberBadgeChain.test.tsx for the PMFE-06 full-mount contract)
- **Issue:** `MemberBadgeChain.test.tsx` already had 5 failing tests and a handful of pre-existing `tsc` type errors (a `containe`/`container` typo, a stale `badgeProgress` prop-type mismatch, and assertions expecting a `Besondere Auszeichnungen` heading the component no longer renders). All of these predate plan 132-02 - they were introduced by commit `e034b53c` ("wip(profile): in-flight carousel keyboard-nav + achievement heading polish"), committed 2026-08-15 21:11 UTC, before 132-02 execution started.
- **Fix:** Not applied. Per the executor's SCOPE BOUNDARY rule ("only auto-fix issues DIRECTLY caused by the current task's changes"), these failures are unrelated to progressive-disclosure/full-mount behavior and were left red.
- **Logged to:** `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/deferred-items.md`
- **Verification:** The 3 new PMFE-06 assertions added in this plan (one each in `MemberStorySection.test.tsx`, `FocalCarousel.test.tsx`, `MemberBadgeChain.test.tsx`) all pass cleanly; `MemberBadgeChain.test.tsx`'s full-file `npx vitest run` result is 132 passed / 5 pre-existing failed (unchanged from before Task 3's edits) / 1 skipped.

---

**Total deviations:** 0 auto-fixed; 1 deferred/logged (pre-existing, out-of-scope).
**Impact on plan:** No scope creep. The plan's own literal acceptance-criteria command (`vitest run` across all three files) does not fully pass only because of the pre-existing, unrelated `MemberBadgeChain.test.tsx` failures documented above - not because of anything introduced by this plan.

## Issues Encountered
- `npx tsc --noEmit` and `npx vitest` are not runnable directly on the host (frontend `node_modules` is not installed locally per this repo's Docker-only dev workflow); all verification commands in this plan were run inside the `team4sv30-frontend` container via `docker compose exec`.
- The plan's Task 3 acceptance criterion (`vitest run` across the three files passes) could not be satisfied literally because of pre-existing, unrelated failures in `MemberBadgeChain.test.tsx` (see Deviations above). The new PMFE-06 assertions themselves pass; the file's failing count (5) is unchanged before and after this task's edits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useCancellableSlugState` is now available as a reusable pattern for any other slug-keyed, cancellable continuation/pagination fetch in the profile UI.
- `MemberBadgeChain.test.tsx`'s pre-existing drift (5 failing tests, several `tsc` errors) should be reconciled by a follow-up `/gsd:quick` or dedicated plan before further work touches that component - see `deferred-items.md`.

---
*Phase: 132-shared-ssr-composition-race-safe-frontend-state*
*Completed: 2026-08-15*

## Self-Check: PASSED

All created/modified files and all three task commits (146b8253, 5841f6a6, d602d4ac) verified present.
