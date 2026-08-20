---
phase: 136-capability-policy-catalog-schema-contract
plan: 13
subsystem: frontend-admin-contributions
tags: [react, role-catalog, contributions, karaoke-fx, auth-refresh]
requires:
  - phase: 136-05
    provides: catalog-injected anime contribution transforms
  - phase: 136-11
    provides: root RoleCatalogProvider and central catalog loading
provides:
  - catalog-backed admin contribution projection with canonical labels, order, and presentation
  - compact catalog failure handling for contribution selection
  - regression proof for karaoke_fx, typer, unknown codes, empty data, and provider errors
affects: [phase-137, admin users, fansub contribution editing]
tech-stack:
  added: []
  patterns: [root-provider consumption, pure catalog transforms, neutral unknown-role fallback]
key-files:
  created:
    - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
key-decisions:
  - "Admin contribution leaves consume anime_contribution rows from the root provider; they add no catalog transport or token handling."
  - "Unknown stored contribution codes use shared readable labels and neutral presentation rather than a static fallback catalog."
patterns-established:
  - "Contribution badges pair normalizeRoleCodes with labelForRole and presentationForRole over explicitly provided catalog rows."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 7min
completed: 2026-08-20
---

# Phase 136 Plan 13: Admin Contribution Catalog Migration Summary

**The active contribution selector and admin user projection now use canonical provider rows for ordered role labels and presentation while preserving unknown stored codes neutrally.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-20T18:21:00Z
- **Completed:** 2026-08-20T18:27:55Z
- **Tasks:** 1 TDD task
- **Files modified:** 4

## Accomplishments

- Kept `karaoke_fx` and `typer` distinct and server ordered in the active contribution selector.
- Replaced the user-contribution tab's local code echo with shared catalog normalization, labels, colors, and icons.
- Added scoped catalog failure states without leaf requests, bearer construction, or direct token inspection.
- Proved neutral unknown-code rendering plus empty and provider-error states in 11 focused tests.

## Task Commits

1. **RED: Specify catalog-backed admin contribution behavior** — `8d031d9d`
2. **GREEN: Derive active admin contribution views from the shared catalog** — `56129ae6`

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — surfaces scoped catalog errors and disables unavailable role selection.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx` — proves catalog order and Karaoke/Typesetting separation.
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` — renders catalog labels and presentation with neutral unknown fallbacks.
- `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx` — covers canonical, unknown, empty, and provider-error projections.

## Decisions Made

- Catalog failure disables only contribution-role selection while leaving the drawer closable and compact.
- Stored codes absent from the current catalog remain readable through the shared neutral fallback; they are never silently discarded.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's regex-style Vitest filter is treated literally by Vitest 3.2.4. Verification used both exact test filenames instead.
- The project lint wrapper no longer accepts `--file`; focused ESLint ran directly through the installed container dependency. It reports one pre-existing `react-hooks/exhaustive-deps` warning already documented by Plan 136-05 and no errors.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path, file access, or schema trust boundary was added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Active admin contribution consumers now share the canonical catalog seam required by Phase 137.
- No blocker remains; the legacy `/anime/[id]/group/[groupId]/releases` route was not touched.

## Self-Check: PASSED

- All four task files exist.
- Commits `8d031d9d` and `56129ae6` exist.
- Focused tests, typecheck, ESLint, static auth/request grep, and `git diff --check` passed.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
