---
phase: 183-status-label-konsolidierung-fachaufgabe-11-eine-kanonische-i
plan: 02
subsystem: ui
tags: [nextjs, typescript, vitest, fansub-labels, claim-status]

requires:
  - phase: 183-01
    provides: appUserStatusLabels.ts two-function helper pattern (structural template reused here)
provides:
  - "GroupMediaReviewGrid.tsx reads fansub media category labels from the existing canonical fansub-labels.ts instead of a diverging local copy"
  - "frontend/src/lib/claimStatusLabels.ts — the single canonical claim-status label/variant mapping, consumed by UserClaimsTab.tsx and ClaimsClient.tsx"
affects: [183-03]

tech-stack:
  added: []
  patterns:
    - "Two-function switch-pair helper (claimStatusVariant + claimStatusLabel) mirroring appUserStatusLabels.ts from 183-01, not a combined map, because both values are needed independently at each call site"

key-files:
  created:
    - frontend/src/lib/claimStatusLabels.ts
    - frontend/src/lib/__tests__/claimStatusLabels.test.ts
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
    - frontend/src/app/admin/claims/ClaimsClient.tsx

key-decisions:
  - "Locked claim-status wording: verified/active -> 'Genehmigt' (not 'Verifiziert'), pending/open -> 'Offen', rejected/denied -> 'Abgelehnt', unknown -> raw value"
  - "ClaimsClient.tsx's alias coverage silently widened from 3 statuses (verified/pending/rejected) to all 6 (adds active/open/denied) by switching to the shared helper — closes the D-03 alias gap called out in the plan's must-haves"

requirements-completed: [D-02, D-03]

duration: 6min
completed: 2026-10-15
---

# Phase 183 Plan 02: Status-Label-Konsolidierung — Fansub-Medien-Kategorien und Claim-Status Summary

**`GroupMediaReviewGrid.tsx` now sources fansub media category labels from the canonical `fansub-labels.ts` helper, and a new shared `claimStatusLabels.ts` helper (wording locked to "Genehmigt") replaces two divergent local copies in `UserClaimsTab.tsx` and `ClaimsClient.tsx`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-15T09:09:00Z (approx.)
- **Completed:** 2026-10-15T09:15:43Z
- **Tasks:** 3
- **Files modified:** 5 (1 modified-only, 2 created, 2 modified)

## Accomplishments
- `GroupMediaReviewGrid.tsx` no longer computes its own category label mapping; the Fansub-Gruppenmedien-Review-Grid now shows "Alte Website" and "IRC-Chat" (previously "Alte Webseite" / "IRC / Chat"), identical to the public gallery.
- New `frontend/src/lib/claimStatusLabels.ts` provides `claimStatusVariant`/`claimStatusLabel` as the single claim-status mapping source, with full logic-test coverage for all 6 aliases plus the unknown fallback.
- `UserClaimsTab.tsx` and `ClaimsClient.tsx` both import the shared helper instead of maintaining their own copies. `UserClaimsTab.tsx` now shows "Genehmigt" instead of "Verifiziert" for verified/active claims; `ClaimsClient.tsx` gained the previously-missing active/open/denied aliases (D-03 alias gap closed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix GroupMediaReviewGrid.tsx category label to use fansub-labels.ts (D-02)** - `6a110ef3a` (refactor)
2. **Task 2: Create claimStatusLabels.ts helper with logic tests (D-03)** - `817b17659` (test, RED) + `6734e919a` (feat, GREEN)
3. **Task 3: Migrate UserClaimsTab.tsx and ClaimsClient.tsx onto the shared claim-status helper** - `018c0b24f` (refactor)

_Note: Task 2 is a TDD task with a test commit (RED) followed by a feat commit (GREEN); no refactor commit was needed._

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx` - Removed local `CATEGORY_OPTIONS`/`getCategoryLabel`; imports `getFansubMediaCategoryLabel` from `@/lib/fansub-labels`
- `frontend/src/lib/claimStatusLabels.ts` - New canonical `claimStatusVariant`/`claimStatusLabel` switch-pair helper
- `frontend/src/lib/__tests__/claimStatusLabels.test.ts` - Logic tests for both functions covering all 6 known aliases and the unknown fallback
- `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` - Removed local claim-status functions; imports the shared helper
- `frontend/src/app/admin/claims/ClaimsClient.tsx` - Removed local claim-status functions (including the D-23 doc comment); imports the shared helper

## Decisions Made
- Kept the two-function switch-pair structure (not a combined map) for `claimStatusLabels.ts`, matching the plan's instruction to mirror `appUserStatusLabels.ts` from Plan 183-01 — both `variant` and `label` are consumed independently at each call site.
- Reworded the doc comment on `claimStatusLabels.ts` to use „Genehmigt" (German guillemets) instead of `'Genehmigt'` (straight quotes) to avoid an unintended second grep match against the acceptance criterion that required exactly one literal `'Genehmigt'` occurrence (the switch-case return value). This is a cosmetic wording choice with no behavior impact — flagged here for transparency since the plan's own action text had used straight quotes in the doc-comment wording it specified.

## Deviations from Plan

None - plan executed exactly as written for all behavioral outcomes. One minor self-correction (noted above under Decisions Made) was needed to satisfy a plan acceptance criterion that was sensitive to how the doc comment quoted the word "Genehmigt"; this is a documentation-wording adjustment, not a deviation from scope, behavior, or the locked mapping.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None. All acceptance criteria and must-haves were met exactly.

## Issues Encountered

None. All three tasks' acceptance criteria (grep counts, `tsc --noEmit`, `vitest run`, `eslint`) passed on first attempt after the doc-comment wording adjustment described above.

Full frontend test suite (`npx vitest run`, 387 files) shows 4 pre-existing failing test files unrelated to this plan's changes (`badgeArtwork.test.ts`, `ResponsiveImage.config.test.ts`, `anime-detail-contract.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts` — the last fails because it reads an absolute `/backend/internal/permissions/permissions.go` path not present in this environment). None reference `claimStatusLabels`, `UserClaimsTab`, `ClaimsClient`, `GroupMediaReviewGrid`, or `fansub-labels` — confirmed out of scope and pre-existing per the Scope Boundary rule; not fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 183-03 (Wave 2) can proceed: both Wave-1 plans (183-01, 183-02) are now committed with no file overlap. The frontend container restart/deployment step remains deliberately out of scope for this plan per the orchestrator's instruction and belongs to 183-03.

## Self-Check: PASSED

All created/modified files verified present on disk; all 4 task commit hashes (`6a110ef3a`, `817b17659`, `6734e919a`, `018c0b24f`) verified present in git history.

---
*Phase: 183-status-label-konsolidierung-fachaufgabe-11-eine-kanonische-i*
*Completed: 2026-10-15*
