---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "04"
subsystem: frontend-validation
tags: [vitest, intersection-observer, ssr, cls, immutable-evidence]
requires:
  - phase: 120-01
    provides: User-authorized Phase-119 overlap snapshot and immutable chain validator
  - phase: 120-02
    provides: Green inherited frontend baseline
provides:
  - Expected-red contracts for one-shot 600px carousel activation and no-observer fallback
  - SSR-preserving badge, project and contribution geometry contracts
  - Immutable per-file overlap transitions for all three authorized Phase-119 tests
affects: [120-06, 120-07, 120-10, 120-13]
tech-stack:
  added: []
  patterns: [top-level expected-red selection, SSR content beneath aria-hidden shells, immutable overlap evidence]
key-files:
  created:
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/evidence/120-04-task1-overlap.json
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/evidence/120-04-task2-overlap.json
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-04-SUMMARY.md
  modified:
    - frontend/src/components/ui/FocalCarousel.test.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
    - frontend/src/components/profile/LatestContributionsSection.test.tsx
    - frontend/src/components/profile/PreviousContributionsSection.test.tsx
key-decisions:
  - "Exact Phase 120 RED tests are top-level so the mandated anchored negative-lookahead cleanly excludes them from inherited-green runs."
  - "The validator-bound temporary finish output is atomically renamed without changing manifest bytes because the plan's begin and finish output names are incompatible with the validator contract."
requirements-completed: [D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19]
duration: 14 min
completed: 2026-08-04
---

# Phase 120 Plan 04: Deferred Profile Stability Contracts Summary

**Expected-red carousel and deep-section contracts preserve complete SSR content while specifying one-shot near-viewport activation, fixed geometry, and accessibility-clean skeleton shells.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-04T12:42:00Z
- **Completed:** 2026-08-04T12:56:11Z
- **Tasks:** 2
- **Files modified:** 7 task artifacts plus this summary

## Accomplishments

- Proved all inherited Phase-119 carousel/badge cases green (67/67) before adding the two exact Task-1 RED contracts.
- Locked complete initial badge content, six-category order, counters, progress metrics, quiet semantics, and dormant expensive listeners without introducing production code.
- Required a once-only `IntersectionObserver` activation at `rootMargin: 600px 0px` and immediate interaction when the observer API is unavailable.
- Proved all inherited project/contribution cases green (9/9) before adding the three exact Task-2 RED contracts.
- Locked 2:3 project covers, exact `(max-width: 720px) 68px, 90px` image sizing, lazy loading, accessibility-clean skeleton shells, and opacity/visibility-only exchanges without size animation.
- Captured immutable before/after SHA-256 evidence for every authorized dirty overlap test.

## Task Commits

1. **Task 1: Lock global carousel activation and badge inheritance** — `e6521177`
2. **Task 2: Lock project and contribution stability** — `41f19a14`

## Expected-Red Evidence

### Task 1

- `Phase 120 RED: keeps SSR carousel content while expensive listeners remain dormant` fails because five badge-stage `ResizeObserver` registrations occur before near-view activation.
- `Phase 120 RED: activates once at 600px and immediately without IntersectionObserver` fails because no observer exists and the expected `600px 0px` root margin is absent.
- Evidence log: `/tmp/phase120-carousel-red.log` on the canonical Linux host.

### Task 2

- `Phase 120 RED: reserves project geometry while SSR cards remain readable` fails because project images do not yet expose the exact responsive `sizes` contract.
- Both exact contribution-shell tests fail because no direct `aria-hidden="true"` skeleton layer exists yet.
- Evidence log: `/tmp/phase120-sections-red.log` on the canonical Linux host.

## Overlap Chain Evidence

| Task | Manifest ID | Authorized paths | Predecessor |
|---|---|---|---|
| 1 | `120-04:task1:8c4eecee-ee3f-4ae3-869f-f498a9d0cb6c` | `FocalCarousel.test.tsx`, `MemberBadgeChain.test.tsx` | `initial:phase120-01-c1356826-76c3-4dbb-b447-556281c184bd` |
| 2 | `120-04:task2:79b14c91-d7f2-4033-97a1-a0dc9a5549f9` | `LatestContributionsSection.test.tsx` | `initial:phase120-01-c1356826-76c3-4dbb-b447-556281c184bd` |

The final 18-file audit passed with the three exact latest overrides. No other dirty Phase-119 file was staged.

## Verification

- Task-1 inherited suites: **PASS**, 67 passed and 2 RED tests skipped.
- Task-1 exact RED suite: **EXPECTED FAIL**, both named cases present with observer/listener assertions.
- Task-2 inherited suites: **PASS**, 9 passed and 3 RED tests skipped.
- Task-2 exact RED suite: **EXPECTED FAIL**, all three named cases present with `sizes`/`aria-hidden` assertions.
- Focused ESLint over all five test files: **PASS**, zero errors and warnings.
- Immutable overlap-chain final audit: **PASS**, `{"ok":true}`.
- `git diff --check`: **PASS**.
- Full typecheck: **BLOCKED by pre-existing/future-plan state** — stale `.next/dev/types` member-route signatures, the already-dirty `page.test.tsx` `media_id` fixture, and Plan-03's expected-red missing `ResponsiveImage` implementation. None is introduced by Plan 120-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept exact RED names outside suite prefixes**
- **Found during:** Task 1 verification
- **Issue:** Vitest matches the full suite-qualified name, so nested RED tests were not excluded by the mandated anchored negative lookahead.
- **Fix:** Defined all five exact `Phase 120 RED:` cases at file top level.
- **Files modified:** All five declared test files.
- **Verification:** Inherited runs report the RED cases skipped and remain fully green.
- **Committed in:** `e6521177`, `41f19a14`

**2. [Rule 3 - Blocking] Reconciled validator-bound begin and final output names**
- **Found during:** Task 1 manifest finish
- **Issue:** The plan's `begin` command binds `.120-04-taskN-begin.json` as the receipt output, while its `finish` command requests `120-04-taskN-overlap.json`; the fail-closed validator rejects differing output paths.
- **Fix:** Finished each receipt to its cryptographically bound unused path, then atomically renamed the unchanged manifest bytes to the required unique final filename.
- **Files modified:** Both declared evidence manifests.
- **Verification:** Both manifests retain valid digests, exact initial predecessors, and the final 18-file audit returns `{"ok":true}`.
- **Committed in:** `e6521177`, `41f19a14`

**Total deviations:** 2 auto-fixed blocking execution issues. **Impact:** No production behavior, authorization record, receipt, predecessor, or manifest content was weakened or refreshed.

## Authentication Gates

None.

## Known Stubs

None. The five failures are intentional Wave-0 expected-red contracts owned by later implementation plans, not executable stubs in this plan.

## Threat Review

No new network, auth, file-access, schema, or media ownership surface was introduced. The tests strengthen T-120-07 coverage for SSR availability, once-only activation, cleanup, accessibility, and stable geometry.

## Decisions Made

- Preserve Phase-119 semantics and complete authorized test bytes; only extend them with Phase-120 contracts.
- Keep the RED test names top-level because the plan's exact anchored selection commands depend on that observable test-runner behavior.
- Preserve manifest bytes exactly when resolving the plan/validator output-name mismatch.

## Next Phase Readiness

Plans 120-06/07 can implement the generic deferred-activation and stable-shell behavior against five precise RED contracts. Plans must not rewrite these expectations to change Phase-119 badge or global-carousel ownership semantics.

## Self-Check: PASSED

- Both immutable evidence manifests exist and passed the final chain audit.
- Task commits `e6521177` and `41f19a14` exist.
- All five exact RED names are present once and inherited suites are green.
- No STATE.md, ROADMAP.md, production source, CSS, badge asset, or unrelated dirty path was staged by this plan.
