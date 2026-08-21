---
phase: 136-capability-policy-catalog-schema-contract
plan: 22
subsystem: full-stack
tags: [postgresql, react, role-catalog, semantic-colors, tdd]
requires:
  - phase: 136-20
    provides: UAT gap plan baseline
  - phase: 136-03
    provides: canonical role catalog adapter
  - phase: 136-12
    provides: catalog-backed contribution card role normalization
provides:
  - paired project role code and label arrays in catalog order
  - catalog-backed project card and detail role presentation
  - semantic role colors with neutral unknown-role fallback
affects: [member-projects, contribution-cards, project-detail]
tech-stack:
  added: []
  patterns: [paired SQL aggregation order, root-injected catalog presentation]
key-files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_member_project_repository.go
    - backend/internal/repository/anime_contributions_member_project_repository_test.go
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
    - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
key-decisions:
  - "Known project roles always use canonical catalog labels; unknown roles retain their API label and neutral presentation."
  - "Both project-level and release-level arrays use catalog sort_order with stable code tie-breaking."
patterns-established:
  - "Role code and label arrays are aggregated from the same ordered rows, never sorted independently."
requirements-completed: [CAP-11, CAP-12, CAP-13, QUAL-01]
duration: 10min
completed: 2026-08-21
---

# Phase 136 Plan 22: Project Role Catalog Presentation Summary

**Member project DTOs now preserve paired catalog order, while project cards and detail rows render canonical labels with allowlisted semantic colors and neutral future-role fallback.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-21T10:07:51Z
- **Completed:** 2026-08-21T10:17:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced independent role-code and role-label sorting with shared `sort_order, role_code` aggregation at both project and release-version scopes.
- Reused the root `anime_contribution` catalog for project detail labels, ordering and semantic presentation.
- Replaced the contribution card's fixed info badge styling with catalog-derived semantic accents.
- Preserved distinct Typesetting, Karaoke-FX and Encoding roles while keeping unknown roles visible and neutral.

## Task Commits

1. **Task 1 RED: expose role-array ordering drift** — `298f1be9`
2. **Task 1 GREEN: pair project roles in catalog order** — `cae3bac3`
3. **Task 2 RED: expose project-detail presentation drift** — `e5d0d713`
4. **Task 2 GREEN: present project roles from catalog** — `f015e7d3`

## Files Created/Modified

- `backend/internal/repository/anime_contributions_member_project_repository.go` — aggregates codes and labels from the same catalog-ordered role rows.
- `backend/internal/repository/anime_contributions_member_project_repository_test.go` — rejects independent label sorting and requires shared catalog ordering.
- `frontend/src/components/contributions/AnimeGroupCard.tsx` — uses neutral badges accented by the catalog's allowlisted semantic color.
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` — renders ordered canonical project roles from the root catalog.
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` — covers canonical labels, order, semantic colors and unknown-role fallback.

## Decisions Made

- Existing API labels remain visible only for unknown role codes; known role labels are always sourced from the canonical catalog.
- Unknown role codes sort after catalog roles in stable input order and use the adapter's neutral `other` presentation.
- The established root provider and adapter remain the only role authority; no leaf request, local role map, endpoint or contract was added.

## Deviations from Plan

None - plan executed within the declared files and existing catalog seams.

## Issues Encountered

- Full frontend `npm run typecheck` is blocked by pre-existing generated `.next/dev/types` errors in unrelated routes and the existing named page exports. Focused Vitest transforms and all 20 owned tests pass. Generated runtime files were preserved.

## Verification

- Backend focused repository test: passed.
- Frontend focused Vitest: 2 files, 20 tests passed.
- `git diff --check`: passed.
- Frontend typecheck: attempted; blocked by unrelated generated Next.js route types documented above.

## Known Stubs

None.

## Threat Review

- Catalog color metadata still passes through the existing allowlisted adapter; unknown or invalid metadata becomes neutral.
- Paired role arrays cannot associate a code with another role's label because both arrays use the same row ordering.
- No new network endpoint, auth path, persistence schema, file access or contract surface was introduced.

## User Setup Required

None.

## Next Phase Readiness

- The two active project surfaces are ready for repeat UAT of catalog labels, order and semantic colors.
- Other Phase 136 gap-closure plans can proceed independently.

## Self-Check: PASSED

- All five owned files exist.
- Commits `298f1be9`, `cae3bac3`, `e5d0d713`, and `f015e7d3` exist.
- Focused backend/frontend tests and diff validation pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
