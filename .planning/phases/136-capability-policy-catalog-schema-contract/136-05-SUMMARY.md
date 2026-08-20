---
phase: 136-capability-policy-catalog-schema-contract
plan: 05
subsystem: frontend-role-catalog
tags: [react, role-catalog, contributions, karaoke-fx]
requires:
  - phase: 136-03
    provides: pure catalog adapter and open role codes
  - phase: 136-11
    provides: root RoleCatalogProvider
provides:
  - pure anime-contribution role transforms with explicit catalog injection
  - provider-backed contribution editors and selectors without leaf requests
affects: [136-12, 136-13, contribution cards, release crew]
tech-stack:
  added: []
  patterns: [injected catalog transforms, neutral unknown-role preservation]
key-files:
  created: []
  modified:
    - frontend/src/components/contributions/contributionRoles.ts
    - frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.ts
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
key-decisions:
  - "Contribution role transforms accept catalog rows explicitly; there is no static or implicit fallback catalog."
  - "Unknown stored role codes remain visible after catalog-ordered known roles."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 14min
completed: 2026-08-20
---

# Phase 136 Plan 05: Catalog-driven Contribution Roles Summary

**Contribution selectors, normalization, labels, and release-crew editing now derive from the root-loaded anime-contribution catalog while preserving unknown stored codes.**

## Performance

- **Duration:** 14 min
- **Tasks:** 1 TDD task
- **Files modified:** 10

## Accomplishments

- Replaced both duplicated `ANIME_CONTRIBUTION_ROLES` arrays with one set of pure transforms over injected `RoleDefinitionOption[]` rows.
- Proved catalog ordering, context filtering, `karaoke_fx`/`typer` separation, deduplication, and neutral unknown-code labels.
- Connected all compilation-blocking contribution editors, toggles, cockpit labels, and proposal options to the root `RoleCatalogProvider`; no leaf fetch was introduced.
- Kept existing editor and release-crew behavior covered by 15 focused passing tests.

## Task Commits

1. **RED: Specify catalog-derived contribution behavior** — `4a37972b`
2. **GREEN: Implement transforms and migrate blocking consumers** — `450da362`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migrated existing consumers in the same task**
- **Found during:** Task 1 typecheck
- **Issue:** Removing the static export and requiring explicit catalog input correctly broke five existing callers. Only a later plan covered one of them, leaving the repository unable to typecheck.
- **Fix:** Migrated `AnimeContributionModal`, `ReleaseContributionDrawer`, `RoleToggleGroup`, `AnimeReleasesCockpit`, and `MyProposalsSection` to `useRoleCatalog('anime_contribution')` and updated their focused tests with injected catalog fixtures.
- **Files modified:** the five consumers plus `AnimeContributionModal.test.tsx` and `ReleaseContributionDrawer.test.tsx`.
- **Commit:** `450da362`

**2. [Rule 3 - Blocking] Corrected the planned Vitest filter**
- The Compose workdir is `/app`, and brackets in the repository-prefixed path are treated as a pattern. The executable focused filter is `contributionRoles.test.ts`.

## Verification

- Contribution roles, anime contribution modal, and release contribution drawer: 15/15 tests passed.
- Frontend TypeScript typecheck: passed.
- Targeted ESLint: completed with no errors; two existing hook dependency warnings remain because the provider returns a fresh ordered array per render.
- Static valid-role grep across both transform modules: no role list or role-specific branch found.
- `git diff --check`: passed.

## Known Stubs

None.
