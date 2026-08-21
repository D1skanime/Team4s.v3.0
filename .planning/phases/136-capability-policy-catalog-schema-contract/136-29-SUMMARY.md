---
phase: 136-capability-policy-catalog-schema-contract
plan: 29
subsystem: database
tags: [postgresql, role-catalog, legacy-projections, tdd]
requires:
  - phase: 136-21
    provides: assignable work-role catalog and legacy numeric identity bridge
  - phase: 136-22
    provides: catalog-backed project role presentation
  - phase: 136-23
    provides: catalog-backed release-note role presentation
provides:
  - role_definitions-only canonical labels and exact fifteen-role palette
  - reversible 0149 Up/Down/Up catalog correction
  - catalog-backed labels across all six legacy repository owners
  - exhaustive source gate rejecting contributor_roles.label presentation
affects: [136-30, member-profiles, project-members, public-release-detail]
tech-stack:
  added: []
  patterns: [legacy numeric identity joined by code to canonical presentation catalog]
key-files:
  created:
    - database/migrations/0149_role_catalog_palette_correction.up.sql
    - database/migrations/0149_role_catalog_palette_correction.down.sql
    - backend/internal/migrations/phase136_role_catalog_palette_correction_test.go
    - backend/internal/repository/phase136_role_definition_label_authority_test.go
  modified:
    - backend/internal/repository/group_contributors_repository.go
    - backend/internal/repository/member_profile_memberships_repository.go
    - backend/internal/repository/member_profile_recent_repository.go
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
key-decisions:
  - "contributor_roles remains only a legacy numeric ID/code seam; role_definitions alone owns labels and palette values."
  - "Exact catalog colors are stored as bounded uppercase hex values while legacy semantic keys remain valid for migration rollback."
patterns-established:
  - "Legacy projections join contributor_roles.name to role_definitions.code and select role_definitions.label_de."
requirements-completed: [CAP-11, CAP-12, CAP-13, QUAL-01, QUAL-04]
duration: 8 min
completed: 2026-08-21
---

# Phase 136 Plan 29: Role Catalog Authority Summary

**Reversible exact role palette and Typesetting correction with all legacy member, project, release, and note labels projected from role_definitions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-21T13:43:52Z
- **Completed:** 2026-08-21T13:51:22Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added reversible migration 0149 with all fifteen exact catalog colors and canonical Typesetting label.
- Proved Up/Down/Up leaves stale contributor_roles labels, assignability, contexts, capabilities, and excluded roles untouched.
- Replaced all eleven cr.label projections across the six inventoried repositories with role_definitions.label_de.
- Added an exhaustive repository source gate and catalog-only label mutation proof.

## Task Commits

1. **Task 1 RED: palette authority proof** — `28f04451`
2. **Task 1 GREEN: reversible catalog correction** — `d834b782`
3. **Task 2 RED: legacy projection authority gate** — `e84e3824`
4. **Task 2 GREEN: catalog-backed legacy projections** — `1da7a2a3`
5. **Task 2 SQL contract: catalog-only label mutation** — `79b08b6f`

## Files Created/Modified

- `database/migrations/0149_role_catalog_palette_correction.up.sql` — assigns exact palette values and the Typesetting label only in role_definitions.
- `database/migrations/0149_role_catalog_palette_correction.down.sql` — restores exact 0148-era catalog metadata and constraint.
- `backend/internal/migrations/phase136_role_catalog_palette_correction_test.go` — source and guarded live Up/Down/Up authority proof.
- `backend/internal/repository/phase136_role_definition_label_authority_test.go` — exhaustive source inventory and catalog-mutation SQL contract.
- Six declared repository files — retain contributor_roles identity joins while projecting labels through role_definitions.

## Decisions Made

- Kept contributor_roles and numeric role IDs intact for legacy foreign-key identity, but removed its runtime presentation authority.
- Extended the color_key constraint reversibly so exact locked hex palette values are valid while rollback restores the prior semantic-key constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended the color_key constraint for exact palette values**
- **Found during:** Task 1
- **Issue:** The 0146 constraint accepted lowercase semantic slugs only, while the locked 0149 palette requires exact uppercase hex values.
- **Fix:** 0149 Up accepts bounded uppercase hex or legacy semantic keys; Down restores legacy values before restoring the original constraint.
- **Files modified:** both 0149 migration files and migration test.
- **Verification:** guarded live Up/Down/Up passed.
- **Committed in:** `d834b782`

**Total deviations:** 1 auto-fixed (1 blocking correctness issue).
**Impact on plan:** Required to store the exact approved palette; no authorization or unrelated schema behavior changed.

## Issues Encountered

- The plan's broad repository regex selects unrelated `TestGetPublicMemberProfilePostgresIncludesTotalPoints`, which intentionally fails without `TEAM4S_PHASE128_TEST_DSN`. The equivalent focused source suites passed, and no Phase-128 test behavior was changed.

## Verification

- Guarded PostgreSQL migration Up/Down/Up against disposable `team4s_phase106_test_13629`: passed; test database removed afterward.
- Focused migration test: passed.
- Focused repository authority, group contributor, member profile, project member, and release detail tests: passed.
- Exhaustive repository `cr.label` absence gate: passed.
- `git diff --check`: passed.

## Known Stubs

None.

## Threat Review

- No new endpoint, auth path, file access, or ownership boundary was introduced.
- T-136-G35 is mitigated by the code-identity join and exhaustive source rejection of legacy label projections.
- T-136-G36 is mitigated by snapshot comparison of contexts, assignability, and role-capability rows across Up/Down/Up.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All ten owned files exist, all five task commits exist, focused verification passes, and no plan-owned stubs remain.

## Next Phase Readiness

Plan 136-30 can consume the exact fifteen catalog palette values through its single bounded frontend semantic-key seam.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
