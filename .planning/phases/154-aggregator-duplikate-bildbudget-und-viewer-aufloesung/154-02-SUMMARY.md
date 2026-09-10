---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 02
subsystem: ui
tags: [react, nextjs, member-profile, achievement-badges, vitest]

# Dependency graph
requires:
  - phase: 154-01
    provides: query-budget consolidation for the public-member aggregator (unrelated code path, same phase, no functional dependency)
provides:
  - "AnimeProjectAchievementStage.tsx hero artwork gated on currentCode, matching its 3 siblings"
  - "Regression coverage proving the zero-progress Anime-Projekte hero renders LockedStageArtwork"
affects: [154-06]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/components/profile/AnimeProjectAchievementStage.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "Followed the plan's interfaces block verbatim - copied ContributionAchievementStage's currentCode ternary structure with no new className, no new copy, no ladder-gating changes"
  - "Left the Badge variant chip, progress bar, and milestone <ol> untouched per explicit plan scope boundary (hero-artwork-slot-only change)"

patterns-established: []

requirements-completed: [P154-05]

# Metrics
duration: 12min
completed: 2026-09-10
---

# Phase 154 Plan 02: Anime-Projekte Locked Hero Gate Summary

**Gated `AnimeProjectAchievementStage.tsx`'s hero-artwork slot on `currentCode` so a zero-contribution member profile renders `LockedStageArtwork hero` instead of loading the unearned `first_contribution` motif/frame pair (1254x1254, 2.92MB combined) — closing the one family (of four) that was missing the existing gate pattern.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-10T14:44:33Z (approx, per STATE.md `last_updated` at plan handoff)
- **Completed:** 2026-09-10T14:57:00Z (approx)
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- `AnimeProjectAchievementStage.tsx` hero span now wraps its `descriptor ? ... : ...` ternary in `currentCode ? (...) : <LockedStageArtwork hero />`, byte-for-byte matching `ContributionAchievementStage.tsx:65-81`'s structure (verified against the plan's `<interfaces>` block).
- Added a `family: 'progress'` fixture entry at `current_count: 0` to the existing "Quick 260812-bqs locked mystery heroes" describe block's `lockedProgress` array — the exact regression suite already covering the other 5 gated families now covers the 6th.
- All locked-hero and SSR-string count assertions raised from 5 -> 6 across both tests in that describe block.

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply the locked-hero gate to AnimeProjectAchievementStage** - `12a5d2d3` (fix)
2. **Task 2: Add a zero-progress regression test for the Anime-Projekte hero gate** - `cbdb3ba4` (test)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified
- `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` - Hero artwork span gated on `currentCode`; milestone `<ol>`, progress bar, count/unit copy, and badge chip left byte-identical to before.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - `lockedProgress` fixture extended with the `progress` family at zero contributions; both locked-hero-count assertions (DOM query + SSR string match) and the `Noch nicht freigeschaltet` text-node count raised from 5 to 6; added a `[data-family="progress"] [data-locked-stage-hero]` presence assertion alongside the 5 existing per-family checks.

## Decisions Made
- Copied the sibling gate pattern verbatim per plan instruction (CONTEXT.md B1: "keine dritte Variante" - no new component/variant invented). No new imports were needed since `LockedStageArtwork` was already imported at the top of the file (verified: `from './achievementStageHelpers'` still appears exactly once).
- Did not touch the `Badge variant={presentation.variant}` chip even though the closest sibling (`ContributionAchievementStage`) also conditionally mutes that chip's variant when `!currentCode` - the plan explicitly scoped this change to the hero-artwork slot only and named the chip as an untouched element, so I left it as-is to respect the stated scope boundary rather than importing more of the sibling's behavior than requested.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria and verify commands ran unchanged from the plan text and passed on the first attempt.

## Issues Encountered

None. The task-2 test was written after task-1's fix was already committed (per the plan's own task ordering: Task 1 = implementation, Task 2 = regression test), so there was no observable RED phase for this specific fix - `npx vitest run` passed immediately (94/94 tests, including the two updated tests in the "Quick 260812-bqs locked mystery heroes" describe block). This is consistent with the plan's explicit two-task structure, not a deviation.

## Verification Evidence

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` - exit 0, no output (clean).
- `grep -n "currentCode ?" frontend/src/components/profile/AnimeProjectAchievementStage.tsx` - line 51 (new gate).
- `grep -n "LockedStageArtwork hero" frontend/src/components/profile/AnimeProjectAchievementStage.tsx` - line 64.
- `grep -c "from './achievementStageHelpers'" frontend/src/components/profile/AnimeProjectAchievementStage.tsx` - `1` (no new import line).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/profile/MemberBadgeChain.test.tsx"` - `Test Files 1 passed (1)`, `Tests 94 passed (94)`, including:
  - "renders the same secret neutral hero contract for every completely unearned family" - now asserts 6 `[data-locked-stage-hero]` elements and 6 "Noch nicht freigeschaltet" text nodes, plus a new `[data-family="progress"] [data-locked-stage-hero]` presence check.
  - "keeps locked hero SSR free of future artwork identifiers and colors" - now asserts 6 SSR `data-locked-stage-hero` occurrences and 6 "Noch nicht freigeschaltet" occurrences.
- Manual/Playwright visual spot-check of a live zero-contribution profile (e.g. `kara`) was explicitly deferred by the plan's `<verification>` section to Plan 154-06's Workstream E visual evidence pass - not required standalone in this plan, and not performed here.

## Threat Flags

None - the plan's own threat model (T-154-B1-01) already disposed this change as `accept`: the branch only changes which already-public artwork asset is requested for a zero-progress state, and the implementation matches that disposition exactly (no new endpoint, no new data exposure).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- P154-05 is now closed at the code+test level. The remaining verification item (live Playwright screenshot of `kara`'s locked Anime-Projekte hero) is explicitly carried forward to Plan 154-06's Workstream E, per this plan's own `<verification>` section - not a gap introduced by this plan, but a deferred-by-design follow-up.
- No blockers for subsequent Wave 1 plans; this plan was standalone with `depends_on: []` and touched no shared aggregator/query-path code, so it does not affect 154-01's already-landed query-budget work.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*
