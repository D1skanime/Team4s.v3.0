---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 06
subsystem: ui
tags: [react, role-catalog, css-modules, vitest, test-drift]

# Dependency graph
requires:
  - phase: 143
    provides: "143-05's RoleCatalogProvider-mock/contract-drift triage pattern for the remaining Kriterium-1 red files"
provides:
  - "6 of the 17 Kriterium-1 red frontend test files fixed and green (ContributionCard.test.tsx,
    PublicNoteCard.test.tsx, ProjectMemberReleasesSection.test.tsx,
    me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx, useGroupMembersTab.test.ts, and
    members/[slug]/page.test.tsx's 'renders current-project roles' case), plus the previously-green
    MemberCurrentProjectsSection.test.tsx kept green through its documented assertion correction"
  - "roleCatalog.ts's categoryForRole(rows, code) — a semantic-category data-role-code seam decoupled
    from presentationForRole()'s bounded hex-swatch contract"
affects: [143-testsuite-triage, frontend-testing, role-color-presentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "categoryForRole(rows, code) in roleCatalog.ts is the canonical helper for the CSS-selector-facing
      data-role-code attribute (semantic category, e.g. technical/creative/production, never a hex
      swatch or 'neutral'); presentationForRole(...).colorKey remains reserved exclusively for the
      data-color-key hex-swatch attribute (ReleaseVersionNotesTab.tsx, DefaultCrewManager.tsx,
      UserContributionsTab.tsx, FansubAppMembersOverview.tsx, FansubAppMemberEditorPanel.tsx,
      AnimeGroupCard.tsx) — the two attributes must never share one helper again."

key-files:
  created: []
  modified:
    - frontend/src/lib/roleCatalog.ts
    - frontend/src/components/contributions/ContributionCard.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
    - frontend/src/lib/roleColors.ts
    - "frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts"

key-decisions:
  - "FANSUB_GROUP_ROLE_OPTIONS no longer exists in @/types/fansub (removed in commit fa98ce8d, Phase
    136-08, 'remove residual runtime role catalogs') — the plan's literal import instruction for
    roleColorCode's label->code map could not be followed verbatim. Rebuilt the identical git-proven
    label/code pairs as a local Map inside roleColors.ts instead of importing a now-deleted export."
  - "ProjectMemberHero.tsx (not named in the plan's files_modified list) carried the exact same broken
    presentationForRole(...).colorKey data-role-code pattern and is exercised by the same
    ProjectMemberReleasesSection.test.tsx acceptance target; migrated it to categoryForRole alongside
    the four plan-named call sites to make the plan's own acceptance criteria pass."

patterns-established:
  - "categoryForRole(rows, code) does no hex validation — the catalog's raw color_key string (semantic
    category in anime_contribution/fansub_group contexts) flows through unvalidated, falling back to
    'other' only when the role code is unknown in the given catalog rows."

requirements-completed: ["Criterion-1"]

# Metrics
duration: 15min
completed: 2026-09-01
---

# Phase 143 Plan 06: data-role-code Regression Cluster — categoryForRole Seam Summary

**Added `categoryForRole()` as a dedicated semantic-category helper in `roleCatalog.ts` and migrated five `data-role-code` call sites (plus one undocumented sixth, `ProjectMemberHero.tsx`) off `presentationForRole(...).colorKey`, which Phase 136-30 silently repurposed into a bounded hex-swatch/`'neutral'` contract; separately reverted `roleColorCode` (label-only lookup, no catalog available at its call site) and `roleLabelForCode` (German label map) to their git-proven pre-regression implementations.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-01T21:10:35Z
- **Completed:** 2026-09-01T21:19:22Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- `categoryForRole(rows, code)` added to `roleCatalog.ts`: returns the catalog row's raw `color_key`
  category (trimmed/lowercased), falling back to `'other'` for unknown codes — never a hex string,
  never `'neutral'`
- Migrated `ContributionCard.tsx`, `ProjectMemberReleaseCard.tsx`, `ProjectMemberHero.tsx`,
  `me/projects/[animeId]/group/[fansubGroupId]/page.tsx`, and both `MemberCurrentProjectsSection.tsx`
  `data-role-code` sites from `presentationForRole(...).colorKey` to `categoryForRole(...)`
- `MemberCurrentProjectsSection.test.tsx`'s unknown-role assertion corrected from the stale `'neutral'`
  to `'other'`, the one deliberate, documented behavior change to a previously-green test
- `roleColorCode(roleLabel)` in `roleColors.ts` reverted to a direct German-label→role-code `Map`
  lookup (the `presentationForRole(catalog=[], roleLabel)` delegation could never resolve — its sole
  caller, `PublicNoteCard.tsx`, only has a label string and no catalog)
- `roleLabelForCode(code)` in `useGroupMembersTab.ts` reverted to a static German `ROLE_LABELS` map;
  unknown codes now fall through to the raw code unchanged instead of being title-cased
- `ReleaseVersionNotesTab.tsx`/`DefaultCrewManager.tsx` (the `data-color-key` hex-swatch consumers)
  confirmed untouched and green throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Add categoryForRole and migrate the data-role-code call sites** - `ea97abf9` (fix)
2. **Task 2: Revert roleColorCode to its git-proven label-lookup implementation** - `184dadc3` (fix)
3. **Task 3: Restore German role labels in roleLabelForCode** - `9d0ec559` (fix)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/lib/roleCatalog.ts` - added `categoryForRole(rows, code)`, kept `presentationForRole`/`boundedColorKey`/`ROLE_COLOR_KEYS` untouched
- `frontend/src/components/contributions/ContributionCard.tsx` - `data-role-code` now uses `categoryForRole`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx` - same migration
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` - same migration (deviation, see below)
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - same migration
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` - both `data-role-code` sites (project-wide + release-exception roles) migrated
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` - unknown-role assertion `'neutral'` → `'other'`
- `frontend/src/lib/roleColors.ts` - `roleColorCode` reverted to a local German-label→code `Map` (inlined, since the original `FANSUB_GROUP_ROLE_OPTIONS` source no longer exists)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` - `roleLabelForCode` reverted to a static `ROLE_LABELS` map

## Decisions Made
- Kept `presentationForRole(...).colorKey` and its `data-color-key` consumers completely untouched — that hex-swatch contract is correct for its own callers and out of this plan's scope.
- `categoryForRole` performs no hex validation by design (per plan's explicit instruction) — the catalog's `color_key` field is trusted as already holding the correct semantic string in the `anime_contribution`/`fansub_group` contexts this plan touches.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `roleColors.ts`'s planned restoration source (`FANSUB_GROUP_ROLE_OPTIONS` from `@/types/fansub`) no longer exists**
- **Found during:** Task 2
- **Issue:** The plan's `<interfaces>` block instructed restoring `roleColorCode` by importing `FANSUB_GROUP_ROLE_OPTIONS` from `@/types/fansub` verbatim from commit `6c35c59d`. `git log -S"FANSUB_GROUP_ROLE_OPTIONS"` confirmed that export was deliberately deleted in commit `fa98ce8d` (Phase 136-08, "remove residual runtime role catalogs") as part of the same catalog migration that later caused this regression cluster.
- **Fix:** Rebuilt the exact same label→code pairs (verified via `git show fa98ce8d^:frontend/src/types/fansub.ts`) as a local `const ROLE_CODE_BY_LABEL` Map inside `roleColors.ts`, preserving the `techadmin`→`'admin'` / `gfxler`→`'designer'` special cases and the `'other'` fallback exactly as the plan specified.
- **Files modified:** `frontend/src/lib/roleColors.ts`
- **Verification:** `PublicNoteCard.test.tsx` (4/4 tests) passes.
- **Committed in:** `184dadc3`

**2. [Rule 1 - Bug] `ProjectMemberHero.tsx` carried the identical broken `data-role-code` pattern but was not named in the plan's `files_modified` list**
- **Found during:** Task 1
- **Issue:** `ProjectMemberReleasesSection.test.tsx` (one of the plan's five named acceptance targets) contains a `describe('ProjectMemberReleaseCard', ...)` block that also renders `ProjectMemberHero` and asserts `categoryForRole`-shaped output (`'technical'`/`'creative'`/`'other'`) on its role chips. `ProjectMemberHero.tsx` still called `presentationForRole(roles, role.code).colorKey` for its own `data-role-code` attribute — the exact same regression pattern as the four plan-named files, just not listed in the plan's frontmatter or `<action>` text.
- **Fix:** Migrated `ProjectMemberHero.tsx`'s `data-role-code` to `categoryForRole`, identical to the four named sites.
- **Files modified:** `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx`
- **Verification:** `ProjectMemberReleasesSection.test.tsx` (5/5 tests) passes, including the hero-role assertions.
- **Committed in:** `ea97abf9`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - adapting the plan's literal restoration source/file list to the codebase's actual current state, with zero change to the plan's intended behavior)
**Impact on plan:** Both auto-fixes were required to make the plan's own named acceptance criteria pass. No architectural changes, no scope creep beyond making the plan's stated intent achievable against the current codebase.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 6 more of the 17 Kriterium-1 red files are green (11 of 17 now fixed across 143-05 and 143-06 combined); a full unscoped `npx vitest run` confirms zero regressions from this plan's changes: the remaining 6 failing test files (`api.no-token-boundary.test.ts`, `MemberBadgeChain.test.tsx`, `MembershipsSection.test.tsx`, `ResponsiveImage.config.test.ts`, `ReleaseGallery.test.tsx`, and the one still-open `members/[slug]/page.test.tsx` "Rollenfortschritt" heading-order case) are all pre-existing and untouched by any file this plan modified (confirmed each failure is identical before and after this plan's commits).
- `categoryForRole` is now the established pattern for any future `data-role-code` consumer; `presentationForRole(...).colorKey` remains reserved for `data-color-key` hex-swatch consumers only.
- No blockers for subsequent Kriterium-1 remediation plans in this phase.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*
