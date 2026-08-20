---
phase: 136-capability-policy-catalog-schema-contract
plan: 07
subsystem: frontend
tags: [nextjs, react-context, role-catalog, profiles, project-members]
requires:
  - phase: 136-03
    provides: catalog-backed role presentation adapter
  - phase: 136-11
    provides: root-owned RoleCatalogProvider
provides:
  - catalog-backed role labels, ordering and presentation for current-project cards
  - catalog-backed project-member hero and release-role presentation
  - route-level evidence for Karaoke-FX, Typesetting and neutral future roles
affects: [136-08, public-member-profile, project-member-presentation]
tech-stack:
  added: []
  patterns: [root-injected role catalog, neutral total fallback, catalog-ordered role chips]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
key-decisions:
  - "Active profile and project-member leaves consume the root role catalog and never fetch or define role authority locally."
  - "The existing project-member label-only DTO is reconciled against canonical catalog code or label while unmatched values stay visible and neutral."
patterns-established:
  - "Catalog order first; unknown role values follow in stable input order with the neutral other presentation."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 7min
completed: 2026-08-20
---

# Phase 136 Plan 07: Profile and Project Role Presentation Summary

**Active public profiles, current-project cards, project-member heroes and release rows now present roles through the root-injected canonical catalog, including distinct Karaoke-FX and Typesetting roles with neutral future-role fallback.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-20T18:11:00Z
- **Completed:** 2026-08-20T18:18:13Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Removed the current-project card's local valid-role set, aliases and color branching.
- Routed current-project, project-member hero and release chips through the root `RoleCatalogProvider` and shared presentation adapter.
- Proved catalog ordering and labels for `karaoke_fx` and Typesetting, plus visible neutral behavior for arbitrary future roles.
- Kept the active public and own profile routes free of duplicate catalog requests and page-local role constants.
- Left the excluded legacy `/anime/[id]/group/[groupId]/releases` route untouched and untested.

## Task Commits

1. **Task 1 RED: Specify catalog-backed project roles** — `60107656`
2. **Task 1 GREEN: Drive project role cards from catalog** — `e944fdf9`
3. **Task 2: Prove profile catalog integration** — `c66834d2`
4. **Task 1 coverage completion: Project-member hero** — `4b059cc0`

## Files Created/Modified

- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` — resolves current-project role labels, order and safe presentation from the injected contribution catalog.
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` — covers Karaoke-FX, Typesetting, catalog order and unknown fallback while retaining pagination/layout tests.
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` — presents hero roles through the contribution catalog.
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx` — presents release roles through the same catalog path.
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx` — covers hero/release catalog behavior and existing collection pagination.
- `frontend/src/app/members/[slug]/page.test.tsx` — proves the active public profile receives catalog-driven project roles.
- `frontend/src/app/me/profile/page.test.tsx` — guards the own-profile route against local role authority or duplicate catalog loading.

## Decisions Made

- Unknown role values remain visible, sort after known catalog roles, and receive `other` presentation rather than disappearing or inheriting a known role's styling.
- The existing project-member contract supplies `role_labels` rather than code/label pairs. The active consumer matches those values against the injected catalog by code or canonical label; it does not restore a local label/color table or introduce a leaf request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted existing label-only project-member DTOs without expanding the API contract**
- **Found during:** Task 1
- **Issue:** Project-member summary and release DTOs currently expose `role_labels` only, while current projects already expose code/label pairs.
- **Fix:** Reconciled each value against the root catalog by code or canonical label and retained unmatched text with neutral presentation.
- **Files modified:** `ProjectMemberHero.tsx`, `ProjectMemberReleaseCard.tsx`
- **Verification:** Focused hero/release tests cover known codes, known labels and an unknown future value.
- **Committed in:** `e944fdf9`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No API, endpoint, auth, backend or persistence scope was added; the catalog remains the only role presentation authority.

## Issues Encountered

- Focused ESLint reports one pre-existing warning in `frontend/src/app/me/profile/page.test.tsx:53` for the test-only native `<textarea>` mock. It is unchanged by this plan and has no runtime impact.

## Verification

- Focused Vitest: 4 files, 90 tests passed.
- Frontend typecheck: passed.
- Focused ESLint: 0 errors; 1 pre-existing test warning.
- `git diff --check`: passed.

## Known Stubs

None.

## Threat Review

- Unknown/stale role values are total and neutral; they cannot crash profile rendering.
- Only adapter-allowlisted semantic presentation keys reach role presentation attributes.
- Catalog labels render as React text; no HTML interpretation was introduced.
- No network endpoint, auth path, token handling, file access or persistence boundary changed.

## User Setup Required

None.

## Next Phase Readiness

- Plan 136-08 can reuse the same root catalog for badges and points.
- The general badge UI unification remains deferred as required.

## Self-Check: PASSED

- All seven owned implementation/test files exist.
- Commits `60107656`, `e944fdf9`, `c66834d2`, and `4b059cc0` exist.
- Focused tests, typecheck, lint and diff validation completed.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
