---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 02
subsystem: ui
tags: [react, nextjs, capability-matrix, accessibility, badge, testing-library]

# Dependency graph
requires:
  - phase: 145
    provides: RoleCapabilityDetail.tsx's reserved-pseudo-role row layout (membershipBaselineCodes constant, isReservedBaseline branch) that this plan filters and badges
provides:
  - "configurableActions filter fix (D-15): the reserved pseudo-role now renders exactly its 3 intended baseline rows instead of all 38 catalog actions unfiltered"
  - "Persistent, non-color-only protected-state Badge (Lock icon + 'Geschützt' + screen-reader description) on those 3 rows, wired via aria-describedby (Criterion 2)"
  - "Real-38-action-shape regression test proving exactly 3 switches render across all 8 categories (closes the Phase-145 UAT blind spot D-19 documents)"
affects: [146-registry-selbstschutz-und-sanierung-der-quelltext-substring- criteria 1/3/4 backend plans consuming the same membershipBaselineCodes shape]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reserved-role row filtering: configurableActions ternary now filters IN membershipBaselineCodes for isReservedBaseline (was passing role.actions through unfiltered)"
    - "Non-color-only protected-state affordance: Badge (visible text + Lock icon + aria-describedby screen-reader description) instead of a disabled/locked-out control, per 146-UI-SPEC.md's 'attempt-then-reject' interaction shape"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx

key-decisions:
  - "Kept the 3 baseline Switches fully interactive (not disabled) per 146-UI-SPEC.md's locked interaction shape — Criterion 2 requires a rejected-attempt message, which presupposes the attempt is possible; backend rejection (Criterion 1, separate plan) is the real enforcement layer"
  - "No changes to RoleCapabilityImpactPreviewModal.tsx — its existing mutationError render path already satisfies the 'sprechende deutsche Meldung' requirement once the backend returns the right message"

patterns-established:
  - "Badge variant='info' + decorative Lock icon (aria-hidden) + visible short label + visually-hidden expanded description referenced via aria-describedby is now the established non-color-only protected-state pattern for this admin surface"

requirements-completed: ["Criterion 2"]

# Metrics
duration: 12min
completed: 2026-09-04
---

# Phase 146 Plan 02: Capability-Matrix Baseline-Schutz Summary

**Fixed the reserved pseudo-role's row filter to actually show 3 rows (not 38) and added a visible, non-color-only "Geschützt" badge with screen-reader description to those 3 baseline rows.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T15:37:00Z
- **Completed:** 2026-09-04T15:48:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed the `configurableActions` filter bug (D-15): the reserved pseudo-role (`group_member`) branch now filters row rendering to only the 3 `membershipBaselineCodes` actions instead of passing all 38 catalog actions through unfiltered — a defect Phase-145 UAT/unit-testing never caught because the Accordion lazy-mounts unopened categories
- Added the locked `146-UI-SPEC.md` protected-state contract: a `Badge variant="info"` with a `Lock` icon, visible "Geschützt" text, and a screen-reader-only expanded description, wired to each baseline `Switch` via `aria-describedby`
- Rewrote the Phase-145 "keine Sonderbehandlung" test (now inaccurate — the badge IS special treatment) and added a new fixture test using the real 38-action D-19 shape across all 8 accordion categories, proving exactly 3 switches render (not 37)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix configurableActions filter (D-15) and add the protected badge (Criterion 2)** - `6083e680` (feat)
2. **Task 2: Rewrite the "keine Sonderbehandlung" test and add the real-38-action fixture proof (D-07, D-19)** - `3aaca8e0` (test)

_Note: tasks were tagged `tdd="true"` in the plan but executed as a single implementation-then-test-rewrite pair rather than a strict RED→GREEN cycle, since Task 2 exercises Task 1's already-committed behavior rather than driving new production code — both tasks' automated verification (tsc, vitest) passed before each commit._

## Files Created/Modified
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` - `configurableActions` now filters IN `membershipBaselineCodes` for the reserved pseudo-role (was unfiltered); each of the 3 baseline rows gains a `Badge`/`Lock`/"Geschützt"/`aria-describedby` protected-state contract
- `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` - Renamed/updated the old 145-03 "keine Sonderbehandlung" test to assert the new badge (3x "Geschützt" text); added `reservedBaselineRoleFullCatalog` fixture (38 actions across all 8 categories) and a new test proving exactly 3 switches render against the real catalog shape

## Decisions Made
- The 3 baseline `Switch` controls stay fully interactive — no new `disabled` condition was added, per the UI-SPEC's explicit "attempt-then-reject" interaction shape (Criterion 2 presupposes an attempt happens and is then rejected with an explanation, not that the attempt is prevented up front)
- `RoleCapabilityImpactPreviewModal.tsx` was left completely untouched — its existing `mutationError` catch-and-render path already satisfies the requirement once the backend (a separate Criterion-1 plan, out of this plan's scope) returns the right rejection message

## Deviations from Plan

None - plan executed exactly as written. The filter fix, Badge/Lock/aria-describedby JSX, and both test changes match the plan's `<action>` blocks verbatim.

## Issues Encountered
- Local `frontend/node_modules` is empty on this host (per `CLAUDE.md`'s canonical-environment note, all Docker Compose services own their own installs) — ran `npm run test` and `tsc --noEmit` verification inside the running `team4sv30-frontend` container instead of the bare host, per project convention. No functional issue, just a verification-path note for future executors on this host.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Criterion 2 (ROADMAP.md) is now satisfied: the capability matrix visibly marks exactly 3 baseline rights as protected for the reserved role, across all categories, with a non-color-only affordance
- Criterion 1's backend rejection work (a separate plan in this phase) still needs to return the exact rejection copy from `146-UI-SPEC.md`'s Copywriting Contract as the mutation's JSON error `message` field for `RoleCapabilityImpactPreviewModal.tsx`'s existing `mutationError` path to surface it correctly — no frontend blocker, this plan's scope ends at the copy contract

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
- FOUND: frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx
- FOUND: .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-02-SUMMARY.md
- FOUND: commit 6083e680
- FOUND: commit 3aaca8e0
