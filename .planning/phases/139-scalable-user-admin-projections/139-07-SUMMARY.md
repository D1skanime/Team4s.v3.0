---
phase: 139-scalable-user-admin-projections
plan: 07
subsystem: frontend
tags: [nextjs, react, typescript, admin-ui, permissions]

# Dependency graph
requires:
  - phase: 139-scalable-user-admin-projections
    plan: 02
    provides: "AdminUserContributionsPage/AdminUserMediaPage/AdminUserRightsSummaryPage TS DTOs and useUserContributionsFilters/useUserMediaFilters hooks this plan's api.ts wiring matches field-for-field"
  - phase: 139-scalable-user-admin-projections
    plan: 05
    provides: "GET /admin/users/:userId/rights-summary batched endpoint this plan's UserOverviewTab now calls exactly once"
provides:
  - "api.ts: paginated getAdminUserContributions/getAdminUserMedia, new getAdminUserRightsSummary, paginated getAdminUserGroupMemberships -- the real functions Plans 139-08/139-09 will build their full UI-SPEC tab rewrites on top of"
  - "UserGroupRightsTab.tsx: D22's lazy per-group rights fetch (bounded selector, deep-link preservation, cache reuse) closing the Rights-tab half of F-01/UADM-06"
  - "UserOverviewTab.tsx: the batched rights-summary call closing F-01/UADM-06's more consequential Overview-tab half, with an explicit exactly-once/never-called regression test"
affects: [139-08-contributions-tab-rewrite, 139-09-media-tab-rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bounded Button-row group selector (variant=ghost, full-width) + lazy per-group fetch-on-select, replacing eager Promise.all fan-outs across group memberships"
    - "applyFetchedRights helper merges a freshly fetched group's rights into state AND additively opens its default categories, shared between the deep-link/auto-select path (loadData) and the manual-selection path (loadRightsForGroup) without duplicating the category-computation logic"

key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/types/admin-users.ts
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.test.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
    - frontend/src/app/admin/users/tabs/UserMediaTab.tsx

key-decisions:
  - "only_deviations is sent to the backend as the literal string 'true' (not '1'), since GetUserContributions's Go handler checks c.Query('only_deviations') == 'true' exactly -- this is independent of useUserContributionsFilters.ts's '1'/absent URL-bar encoding convention (139-02), which is a separate browser-URL concern"
  - "AdminUserGroupMembershipsResponse gained an additive optional meta field (139-05's pagination was never reflected in the TS type) -- needed to drive the new membership-list Pagination control"
  - "Single-membership auto-select (no initialGroupId): UserGroupRightsTab still fetches that one group's rights automatically on mount, preserving every pre-existing single-membership test's mockGetEffectiveRights assertion unchanged; multi-membership with no deep-link stays fully unselected (zero fetch) until the admin picks a group"
  - "handleMutated refreshes the membership list (role/status may have changed) plus ONLY the currently selected group's rights -- never the old full eager reload of every group"
  - "GroupSummaryCard's props changed from (membership, states, actionLabels, matrix) to the server-precomputed (fansubGroupName, roleLabel, headlineStates, hasDeviation, openClaimsCount) directly off AdminUserGroupRightsSummaryItem -- rendered JSX strings stay byte-identical (Phase 138 D-05), only the data source and per-group open_claims_count honesty change (previously every card showed the SAME account-wide open_claims_count; now each card shows its own group's real count)"
  - "UserContributionsTab.tsx/UserMediaTab.tsx were NOT in this plan's files_modified list but had to be adapted anyway: Task 1's paginated-signature change on getAdminUserContributions/getAdminUserMedia broke `npm run build` (Next.js's production TypeScript check compiles real application source, unlike the dev-type/test-file diagnostics already documented as baseline debt) since both tabs still read the old project_defaults/release_overrides/media_items response shape, which no longer exists on the wire since Plans 139-03/139-04 already rewrote the backend. Rule 3 (blocking issue caused directly by this task's own necessary change) applied: adapted both tabs minimally to the real new grouped shape using the existing Table/Badge/Card visual language, explicitly NOT attempting Plan 139-08/139-09's full UI-SPEC-mandated rewrite (filters, standard-range collapse visuals, pagination controls, D-16 CTA copy)."

requirements-completed: [UADM-06, UADM-07]

# Metrics
duration: 40min
completed: 2026-08-24
---

# Phase 139 Plan 07: Rights-Tab Lazy Fetch + Overview Batched Summary + api.ts Pagination Wiring Summary

**Closes both F-01 fan-out locations for real: `UserGroupRightsTab.tsx` now fetches exactly one group's rights on selection (D22) instead of every membership at once, and `UserOverviewTab.tsx`'s default view issues one batched `rights-summary` call instead of `1+N` requests -- plus `api.ts` is wired to 139-03/139-04/139-05's new paginated backend shapes, including an unplanned but required compile-compatibility fix for the two other tabs that consume the same functions.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-24
- **Tasks:** 3/3 completed (plus 1 required collateral fix)
- **Files modified:** 10 (0 created)

## Accomplishments

- `api.ts`: `getAdminUserContributions`/`getAdminUserMedia` now accept filter/pagination params and return `AdminUserContributionsPage`/`AdminUserMediaPage`; new `getAdminUserRightsSummary(userId, limit?, offset?)`; `getAdminUserGroupMemberships` gained optional `limit`/`offset`, backward compatible.
- `UserGroupRightsTab.tsx`: the eager `Promise.all(memberships.map(getEffectiveRights))` fan-out (D22 violation) is gone. A bounded group selector (one `Button variant="ghost"` row per membership) replaces "render every membership's `GroupSection`"; selecting a group lazily fetches and caches exactly that one group's rights. Deep-link (`?group=`) and single-membership auto-select both resolve to exactly one fetch on mount. `SectionHeader` gained the locked UADM-07 "Aktionsfähig — ..." description.
- `UserDetailPageClient.tsx` threads `?group=` through to `UserGroupRightsTab` as `initialGroupId`.
- `UserOverviewTab.tsx`'s `GroupRightsSummarySection` calls `getAdminUserRightsSummary(userId)` exactly once instead of the old fan-out; `GroupSummaryCard` consumes the server-precomputed `role_label`/`headline_states`/`has_deviation`/`open_claims_count` directly, with byte-identical rendered output (Phase 138 D-05 parity) and honestly per-group claim counts (previously every card wrongly showed the same account-wide count).
- Both tabs' Phase-138 test files were rewritten in the same tasks that changed behavior: `UserGroupRightsTab.test.tsx`'s D-11 test now asserts lazy single-group selection + cache reuse instead of simultaneous multi-group fetch; `UserOverviewTab.test.tsx`'s mock now exports `getAdminUserRightsSummary`, with a new test asserting it is called exactly once and `getEffectiveRights` is never called (closes 139-VALIDATION.md's Wave-0 Overview-tab test-coverage gap).
- Unplanned collateral fix (Rule 3): `UserContributionsTab.tsx`/`UserMediaTab.tsx` (owned by Plans 139-08/139-09) were minimally adapted to the new grouped `AdminUserContributionsPage`/`AdminUserMediaPage` shapes because Task 1's signature change otherwise broke `npm run build`. `UserContributionsTab.test.tsx` rewritten to match; `UserMediaTab.tsx` has no test file.
- Full frontend suite re-verified after every task: 16 failed files / 45 failed tests, byte-identical to `139-BASELINE.md`; `docker compose build team4sv30-frontend` succeeds.

## Task Commits

Each task was committed atomically:

1. **Task 1: api.ts paginated contributions/media, batched rights-summary, paginated group-memberships** - `235ad97c` (feat)
2. **Task 2: UserGroupRightsTab.tsx lazy per-group fetch (D22) + deep-link + UADM-07 banner + test rewrite** - `75698d24` (feat)
3. **Task 3: UserOverviewTab.tsx batched rights-summary + test rewrite** - `4cbf49fe` (feat)
4. **Collateral fix: drop unused type imports from api.ts** - `631fa3bc` (chore)
5. **Collateral fix: adapt UserContributionsTab.tsx/UserMediaTab.tsx to the new contract (required for `npm run build` to pass)** - `54c547ae` (fix)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified

- `frontend/src/lib/api.ts` — 4 functions changed/added per Task 1's spec; unused `AdminUserContributionsResponse`/`AdminUserMediaResponse` imports dropped
- `frontend/src/types/admin-users.ts` — `AdminUserGroupMembershipsResponse` gained additive optional `meta: AdminListMeta`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` — lazy per-group fetch, bounded selector, deep-link, UADM-07 banner, `applyFetchedRights` shared helper
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` — D-11 test rewritten; single-membership test updated for the new duplicate-name-render (selector row + section)
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` — `GroupRightsSummarySection`/`GroupSummaryCard` rewritten around the batched endpoint
- `frontend/src/app/admin/users/tabs/UserOverviewTab.test.tsx` — mock extended, assertions rewritten, new exactly-once/never-called regression test
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` — `?group=` search param parsed and threaded as `initialGroupId`
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` — minimal compile-compatibility rewrite to the new grouped shape (collateral, not full UI-SPEC)
- `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx` — rewritten fixtures/assertions for the new shape
- `frontend/src/app/admin/users/tabs/UserMediaTab.tsx` — minimal compile-compatibility rewrite to the new grouped shape (collateral, not full UI-SPEC)

## Decisions Made

See `key-decisions` in frontmatter for the full list. Most consequential: the collateral UserContributionsTab.tsx/UserMediaTab.tsx fix was necessary because leaving them broken would have shipped a non-building frontend, which is a harder failure than the plan anticipated (the plan explicitly reserves these files for Plans 139-08/139-09, but did not account for the fact that changing `api.ts`'s return types immediately breaks their existing callers at the production-build level, not just at the dev-type-diagnostic level the plan's own escape clause anticipated).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `UserContributionsTab.tsx`/`UserMediaTab.tsx` broke `npm run build` after Task 1's api.ts signature change**
- **Found during:** Post-Task-3 full verification (`docker compose build team4sv30-frontend`)
- **Issue:** Task 1 changed `getAdminUserContributions`/`getAdminUserMedia` to return the new `AdminUserContributionsPage`/`AdminUserMediaPage` envelopes. Both tabs (owned by Plans 139-08/139-09, not in this plan's `files_modified`) still typed their local state as the old `AdminUserContributionsResponse`/`AdminUserMediaResponse` shapes and read fields (`project_defaults`, `media_items`, etc.) that no longer exist on the actual backend response (Plans 139-03/139-04 already changed the backend). This produced `tsc` errors that are NOT excluded by the plan's own escape clause ("any pre-existing unrelated tsc errors are out of scope") since they did not predate this task — and, more critically, Next.js's production build type-checks real application source (unlike the dev-type-artifact/test-file diagnostics already in `139-BASELINE.md`), so `docker compose build team4sv30-frontend` failed outright.
- **Fix:** Minimally adapted both tabs to consume the real new grouped/paginated shape (`AdminContributionProjectBlock`/`range_entries`, `AdminMediaReleaseBlock`/`items`) using the existing Table/Badge/Card visual language, explicitly stopping short of Plan 139-08/139-09's full UI-SPEC-mandated redesign (filters, standard-range collapse visuals, pagination controls, D-16 CTA copy correction). `UserContributionsTab.test.tsx`'s fixtures and assertions were rewritten to match; `UserMediaTab.tsx` has no test file.
- **Files modified:** `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx`, `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx`, `frontend/src/app/admin/users/tabs/UserMediaTab.tsx`
- **Verification:** `npx tsc --noEmit` clean (only the 4 pre-existing baseline diagnostics remain); `docker compose build team4sv30-frontend` succeeds; full `npx vitest run` shows 16 failed files / 45 failed tests, byte-identical to `139-BASELINE.md`.
- **Committed in:** `54c547ae`

**2. [Rule 3 - Blocking issue] `AdminUserGroupMembershipsResponse` TS type was missing the `meta` field 139-05 added to the backend**
- **Found during:** Task 2 (`tsc --noEmit` after adding the membership-list `Pagination` control)
- **Issue:** 139-05's backend additively added `Meta AdminListMeta` to the Go `AdminUserGroupMembershipsResult`, but the corresponding TS response type (`AdminUserGroupMembershipsResponse`, owned by Plan 139-02) was never updated to reflect it — a genuine forward-dependency gap between 139-02/139-05, not something either of their own SUMMARYs flagged.
- **Fix:** Added an additive optional `meta?: AdminListMeta` field to `AdminUserGroupMembershipsResponse`.
- **Files modified:** `frontend/src/types/admin-users.ts`
- **Verification:** `tsc --noEmit` clean for this change.
- **Committed in:** `75698d24` (Task 2 commit)

**3. [Rule 1 - Test bug found while rewriting] Single-membership test needed `getAllByText` after adding the selector**
- **Found during:** Task 2 test run (`vitest run UserGroupRightsTab`)
- **Issue:** With exactly one membership, the group name now renders twice (once in the new selector row, once in the existing `GroupSection` title) — the pre-existing single-membership test's `screen.getByText('Sakura-Fansub')` threw a "multiple elements" error.
- **Fix:** Updated the assertion to `screen.getAllByText('Sakura-Fansub').length).toBe(2)`, explicitly documenting why two renders are expected (auto-select).
- **Files modified:** `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx`
- **Verification:** `vitest run UserGroupRightsTab` — 9/9 green.
- **Committed in:** `75698d24` (Task 2 commit)

---

**Total deviations:** 3 (2 Rule 3 blocking-issue fixes, 1 Rule 1 test-assertion fix). All directly necessary for this plan's own tasks to compile, build, and pass their stated acceptance criteria — no scope creep beyond what was required to avoid shipping a broken build or a self-contradicting test suite.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both F-01 fan-out locations (Rights tab, Overview tab) are closed; Overview's default-view network cost is O(1) rights-related requests.
- `api.ts` now exposes the real paginated/filtered functions (`getAdminUserContributions`, `getAdminUserMedia`, `getAdminUserRightsSummary`, paginated `getAdminUserGroupMemberships`) that Plans 139-08/139-09 need.
- `UserContributionsTab.tsx`/`UserMediaTab.tsx` are functionally correct against the real contract today (compile-safe, honest rendering, D19 already incidentally satisfied) but are NOT the UI-SPEC-compliant surfaces those plans must still build — filters, standard-range collapse visuals, pagination controls, and D-16's "Release-Medien öffnen" copy correction remain their explicit scope. Plans 139-08/139-09 should treat this plan's adaptation as a disposable placeholder, not a locked contract to preserve.
- No blockers for 139-08/139-09.

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*

## Self-Check: PASSED

- FOUND: `frontend/src/lib/api.ts` (modified, contains `getAdminUserRightsSummary`, paginated `getAdminUserContributions`/`getAdminUserMedia`)
- FOUND: `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (modified, contains `selectedGroupId`, `loadRightsForGroup`, `initialGroupId`)
- FOUND: `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (modified, contains `getAdminUserRightsSummary`, no `getEffectiveRights` reference)
- FOUND: `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (modified, contains `initialGroupId`)
- FOUND: `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` / `UserMediaTab.tsx` (modified, compile against new Page shapes)
- FOUND: commit `235ad97c` in `git log`
- FOUND: commit `75698d24` in `git log`
- FOUND: commit `4cbf49fe` in `git log`
- FOUND: commit `631fa3bc` in `git log`
- FOUND: commit `54c547ae` in `git log`
- FOUND: `npx tsc --noEmit` — exactly 4 pre-existing baseline diagnostics remain, zero new
- FOUND: `docker compose build team4sv30-frontend` — succeeds
- FOUND: full `npx vitest run` — 16 failed files / 45 failed tests, byte-identical to `139-BASELINE.md`
