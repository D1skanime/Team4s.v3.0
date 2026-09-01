---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 05
subsystem: testing
tags: [vitest, react-testing-library, role-catalog, openapi-contract, test-drift]

# Dependency graph
requires: []
provides:
  - "5 of the 17 Kriterium-1 red frontend test files fixed and green (v12-projection-contract.test.ts,
    FansubAppMembersSection.test.tsx, admin/fansubs/[id]/edit/page.test.tsx,
    mitwirkende/[memberSlug]/page.test.tsx, admin/episode-versions/[versionId]/edit/page.test.tsx)"
  - "Documented, reusable diagnosis of the remaining 12 Kriterium-1 red files (unchanged, confirmed
    out of scope for this plan, matches CONTEXT.md's inventory exactly)"
affects: [143-testsuite-triage, frontend-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock('@/providers/RoleCatalogProvider', () => ({ useRoleCatalog: () => ({ roles: ..., error: null }) }))
      is the established pattern (already used by DefaultCrewManager.test.tsx et al.) for test trees
      that render any component calling useRoleCatalog()"

key-files:
  created: []
  modified:
    - frontend/src/types/__tests__/v12-projection-contract.test.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
    - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx

key-decisions:
  - "PublicMemberBadge.next_tier enum stays [bronze, silver, gold, platinum] in openapi.yaml (already correct); the test's stale assertion was updated instead of touching the contract."
  - "Historical-member visibility default is 'public' (matches commit 0481b671's deliberate app-code change); the pre-existing test assertions of 'internal' were stale and updated to match."
  - "The release-date DatePicker's German label is 'Bearbeitung abgeschlossen am' (post-0481b671 rename out of ReleaseVersionMetadataFields.tsx); the pre-refactor test assertion of 'Release-Datum auswählen' was stale and updated to match."

patterns-established:
  - "When a missing RoleCatalogProvider mock masks a component crash, always re-check the whole test
    file after fixing the crash — secondary phase-142 test drift (stale mock data, renamed labels,
    changed default values) is commonly hidden behind the crash and only surfaces once rendering
    succeeds."

requirements-completed: ["Criterion-1"]

# Metrics
duration: 15min
completed: 2026-09-01
---

# Phase 143 Plan 05: Testsuite-Triage — RoleCatalogProvider und Contract-Drift Summary

**Fixed 5 of the 17 Kriterium-1 red frontend test files (67 tests total) by adding the missing `RoleCatalogProvider` mock everywhere `useRoleCatalog()` is called in these render trees, plus a chain of phase-142 test-drift fixes (stale enum assertion, stale German UI labels, a missing `@/lib/api` mock export, and a missing form-fixture field) that only became visible once the provider crash stopped masking them.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-01T20:54:05Z
- **Completed:** 2026-09-01T21:08:54Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `v12-projection-contract.test.ts` now agrees with `openapi.yaml`'s already-correct `PublicMemberBadge.next_tier` enum (`[bronze, silver, gold, platinum]`)
- `FansubAppMembersSection.test.tsx` (8 tests), `admin/fansubs/[id]/edit/page.test.tsx` (36 tests), and `mitwirkende/[memberSlug]/page.test.tsx` (2 tests) no longer crash on `useRoleCatalog must be used within RoleCatalogProvider`
- `admin/episode-versions/[versionId]/edit/page.test.tsx` (15 tests) no longer crashes on the missing `getAnimeFansubProjectTimeline` mock export
- Full unscoped `npx vitest run` confirms zero regressions: the 11 still-red files (20 failing tests) exactly match CONTEXT.md's documented, out-of-scope Kriterium-1 inventory minus this plan's 5 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Resolve the PublicMemberBadge.next_tier contract-drift decision** - `f2775e79` (test)
2. **Task 2: Add RoleCatalogProvider mocks and fix the stale screenshot-category label** - `039d28d5` (fix)
3. **Task 3: Add the missing getAnimeFansubProjectTimeline mock export** - `73587955` (fix)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` - fixed stale `next_tier` enum assertion
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` - added `RoleCatalogProvider` mock, real `listFansubGroupRoleDefinitions` fixture data, fixed 2 stale `visibility: "internal"` assertions to `"public"`
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` - added `RoleCatalogProvider` mock, fixed stale `ReleaseVersionMediaDrawerSummary` category-label assertion, added missing `getAnimeFansubProjectTimeline`/`updateAnimeFansubProjectTimeline` mock exports, added a `getMyAnimeContributions` fixture for the "opens the release drawer directly on Media" test
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts` - wrapped the `"notes"` `canUseMainTab` case in `Boolean(...)` so it returns `false` (not `undefined`) when `can_edit_founding_history` is absent from a capabilities payload
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` - added `RoleCatalogProvider` mock
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` - added `getAnimeFansubProjectTimeline` mock, added missing `productionStartedOn` fixture field, fixed stale release-date DatePicker button-name assertion

## Decisions Made
- `PublicMemberBadge.next_tier`'s enum in `openapi.yaml` is authoritative and correct (`[bronze, silver, gold, platinum]`); the test file's assertion was the stale side, not the contract.
- Historical-member `visibility: 'public'` (not `'internal'`) is the intended, already-deliberately-changed app behavior (commit `0481b671`); test assertions were updated to match, not the app code.
- The release-date field's current German label `"Bearbeitung abgeschlossen am"` (renamed from `"Release-Datum"` when `ReleaseVersionMetadataFields.tsx` was extracted in commit `0481b671`) is the intended label; the test assertion was updated to match.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `FansubAppMembersSection.test.tsx`'s `listFansubGroupRoleDefinitions` mock resolved to `[]` in every test, hiding all role-option buttons/labels**
- **Found during:** Task 2
- **Issue:** Once the `RoleCatalogProvider` crash was fixed, 6 of 7 tests still failed — `roleOptions` in `FansubAppMembersSection.tsx` is sourced exclusively from `listFansubGroupRoleDefinitions(fansubId)`, which the shared `beforeEach` always resolved to `[]`. Buttons like "Editing"/"Timing" could never render.
- **Fix:** `beforeEach` now resolves `listFansubGroupRoleDefinitions` with the same `catalogRoles` fixture (with `assignable: true`) used for the `RoleCatalogProvider` mock.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`
- **Verification:** All 8 tests in the file pass.
- **Committed in:** `039d28d5`

**2. [Rule 1 - Bug] `FansubAppMembersSection.test.tsx` asserted `visibility: "internal"` for two `createGroupMember`/`createMemberRole` calls, but commit `0481b671` deliberately changed the app code to `visibility: 'public'` without updating the test**
- **Found during:** Task 2
- **Issue:** `git log -p` on the relevant lines confirmed `0481b671` ("feat: harden fansub collaboration UAT flows") intentionally changed all three `visibility: 'internal'` literals in `FansubAppMembersSection.tsx` to `'public'`; this specific test file was not updated in that commit.
- **Fix:** Updated both assertions from `visibility: "internal"` to `visibility: "public"`.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`
- **Committed in:** `039d28d5`

**3. [Rule 1 - Bug] `admin/fansubs/[id]/edit/page.test.tsx` also crashed on the missing `getAnimeFansubProjectTimeline` mock export (same class of bug as Task 3), and one test needed a `getMyAnimeContributions` fixture that the shared `beforeEach` default (`{ data: [] }`, added in `0481b671`) had silently broken**
- **Found during:** Task 2
- **Issue:** `AnimeReleasesCockpit.tsx` renders `AnimeProjectTimelineSection`, which calls the same unmocked `getAnimeFansubProjectTimeline`. Separately, the "opens the release drawer directly on Media for non-platform users with media rights" test (pre-existing, unmodified by `0481b671`) started failing because that commit added a global `getMyAnimeContributions: vi.fn().mockResolvedValue({ data: [] })` default, which zeroed out `ownProjectAssignmentKeys` and hid the "Medien öffnen" link this test asserts on.
- **Fix:** Added `getAnimeFansubProjectTimeline`/`updateAnimeFansubProjectTimeline` to the file's `@/lib/api` mock; added a `getMyAnimeContributions` override with a matching confirmed contribution for the affected test.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`
- **Committed in:** `039d28d5`

**4. [Rule 1 - Bug] `canUseMainTab`'s `"notes"` case returned `undefined` instead of `false` when `can_edit_founding_history` was absent from a capabilities payload**
- **Found during:** Task 2
- **Issue:** `capabilities.can_edit_notes || capabilities.can_edit_founding_history` was not wrapped in `Boolean(...)` (unlike every other case in the same switch), so `false || undefined` evaluated to `undefined`. `AnimeProjectNoteWorkspace`'s `canEdit` prop received `undefined` instead of the expected `false`, failing a `toMatchObject` assertion and violating the function's own declared `: boolean` return type.
- **Fix:** Wrapped the case body in `Boolean(...)`, matching the pattern already used by every other tab case in the same function.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts`
- **Committed in:** `039d28d5`

**5. [Rule 1 - Bug] `admin/episode-versions/[versionId]/edit/page.test.tsx`'s shared `formState` fixture was missing the `productionStartedOn` field, crashing `DatePicker` once the provider/mock-export crashes were fixed**
- **Found during:** Task 3
- **Issue:** `ReleaseVersionMetadataFields.tsx` (new in `0481b671`) reads `formState.productionStartedOn` and passes it directly into `DatePicker`'s `value` prop; `DatePicker.parseDateValue` calls `.trim()` on that value unconditionally, throwing on `undefined`. The shared fixture object never included this field.
- **Fix:** Added `productionStartedOn: ''` to the `makeEditorState().formState` fixture.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`
- **Committed in:** `73587955`

**6. [Rule 1 - Bug] "uses the project DatePicker for the release date" asserted the pre-refactor label `"Release-Datum auswählen"`, but commit `0481b671` renamed the field's label to `"Bearbeitung abgeschlossen am"` when extracting `ReleaseVersionMetadataFields.tsx`**
- **Found during:** Task 3
- **Issue:** `git show 0481b671` confirmed the DatePicker's `label` prop changed from `"Release-Datum"` to `"Bearbeitung abgeschlossen am"` as part of the same refactor that created the new component file; this specific test file was not touched in that commit.
- **Fix:** Updated the button-name assertion to `"Bearbeitung abgeschlossen am auswählen"`.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`
- **Committed in:** `73587955`

---

**Total deviations:** 6 auto-fixed (all Rule 1 - bug/test-drift fixes surfaced once the diagnosed `RoleCatalogProvider`/missing-mock-export crashes stopped masking them)
**Impact on plan:** All auto-fixes were required to make the plan's own acceptance criteria pass (each named test file green with zero failures) and were confirmed via `git log -p`/`git show` to be genuine phase-142 test-drift (app code changed intentionally, sibling test file not updated) rather than unrelated pre-existing issues. No architectural changes, no scope creep beyond the plan's 5 named files.

## Issues Encountered
None beyond the deviations documented above — each secondary failure was traced to its exact root cause (via `git show`/`git log -p` on the relevant lines) before fixing, to confirm it was phase-142 drift and not a separate unrelated defect.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 5 of 17 Kriterium-1 red files are now green; 12 remain, matching CONTEXT.md's documented inventory exactly (confirmed via a full unscoped `npx vitest run`: 11 files / 20 tests still red, all pre-existing and outside this plan's scope)
- The `vi.mock('@/providers/RoleCatalogProvider', ...)` pattern is now proven across 3 additional consumer shapes (`FansubAppMembersOverview`, `AnimeReleasesCockpit`, `ProjectMemberHero`) and ready to reuse for any future red file that hits the same crash
- No blockers for subsequent Kriterium-1 remediation plans in this phase

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

All 6 modified files and the SUMMARY.md itself verified present on disk; all 4 commits
(`f2775e79`, `039d28d5`, `73587955`, `9697e2e9`) verified present in `git log --oneline --all`.
