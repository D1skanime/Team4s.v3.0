---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
plan: 04
subsystem: ui
tags: [search, filtering, unicode-normalization, react, vitest, admin-fansubs]

# Dependency graph
requires:
  - phase: 178-01
    provides: "frontend/src/lib/textFilter.ts (normalizeSearchText/matchesSearch) and the EmptyState variant=info primitive"
  - phase: 178-02
    provides: "FansubGroup.aliases?: string[] bundled on every getFansubList(...) response (backend bulk-loaded, no per-group fetch needed)"
provides:
  - "frontend/src/app/admin/fansubs/fansubPageFilter.ts exporting filterFansubPageItems(items, { statusFilter, query }) — status remap + matchesSearch over name/slug/kuerzel/alias"
  - "admin/fansubs/page.tsx's filteredItems wired onto filterFansubPageItems instead of an inline closure that read a lazy, visible-page-only aliasesByGroup fetch"
  - "admin/fansubs/page.tsx's search field on the global Input primitive instead of a native <input>"
  - "admin/fansubs/page.tsx tracks fetchLimitReached from loadList's existing single-status pagination loop and renders the EmptyState variant=info D-16 hint"
affects: [178-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function + colocated-test extraction (named export only) mirrored from fansubListSort.ts/.test.ts and adminGroupsFilter.ts/.test.ts (178-03) — now a third instance for filter #2"

key-files:
  created:
    - frontend/src/app/admin/fansubs/fansubPageFilter.ts
    - frontend/src/app/admin/fansubs/fansubPageFilter.test.ts
  modified:
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/page.test.tsx

key-decisions:
  - "filterFansubPageItems spreads item.aliases ?? [] directly into the matchesSearch haystack array (same shape as 178-03's filterAdminGroups), keeping per-alias independent matching rather than pre-joining to a string"
  - "fetchLimitReached compares the first page's meta.total to the final accumulated allItems.length inside loadList's existing single do/while loop — this site (unlike adminGroupsFilter's three-status loop) already fully paginates, so the hint is currently dead-code-safe but kept for cross-site consistency with 178-03/178-05"

patterns-established: []

requirements-completed: [D-15, D-18, D-10, D-16, D-02, D-07, D-14]

# Metrics
duration: ~6min
completed: 2026-10-10
---

# Phase 178 Plan 04: Filter #2 (admin/fansubs/page.tsx) umlaut-tolerant search + Input primitive + lazy-alias-fetch removal Summary

**Replaced `admin/fansubs/page.tsx`'s inline status+search closure (which read a lazy, visible-page-only `aliasesByGroup` fetch) with a named, independently-tested `filterFansubPageItems` function sourcing aliases from the now-bundled `item.aliases` field, swapped its native search `<input>` for the global `Input` primitive, and wired the same D-16 "Abrufgrenze erreicht" hint already established on filter #1 (178-03).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-10T08:59:54Z (approx, immediately after 178-03's metadata commit)
- **Completed:** 2026-10-10T09:05:35Z
- **Tasks:** 2/2 completed
- **Files modified:** 4 (2 new: source + test; 2 existing: page component + its test)

## Accomplishments

- `frontend/src/app/admin/fansubs/fansubPageFilter.ts` created, exporting `filterFansubPageItems(items, { statusFilter, query })`, reproducing the exact existing status-remap logic (`"archived"` → `item.status === "dissolved"`, every other value → `item.status === statusFilter`, `"all"` always passes) combined with `matchesSearch([item.name, item.slug, item.kuerzel, ...(item.aliases ?? [])], query)`.
- `frontend/src/app/admin/fansubs/fansubPageFilter.test.ts` created with 7 Vitest cases (active-only statusFilter with empty query, `"archived"`→`"dissolved"` remap, Kürzel-only match with `statusFilter: "all"`, single-alias-entry match, `aliases: undefined` safety, umlaut-stripped ASCII query against an accented name/slug, combined status+search exclusion), mirroring `fansubListSort.test.ts`'s `describe/it`/`makeGroup(overrides)` convention.
- `admin/fansubs/page.tsx`: removed the dead `aliasesByGroup` state, its reset inside `loadList`, the entire per-page lazy alias-fetch `useEffect`, and the `getFansubAliases` import — all fully obsolete now that `item.aliases` arrives bundled on every `FansubGroup`. The two `primaryAlias` computations (table row, mobile card) now read `item.aliases ?? []` directly.
- `admin/fansubs/page.tsx`'s `filteredItems` useMemo now calls `filterFansubPageItems(items, { statusFilter, query })` instead of an inline filter closure.
- The native search `<input id="fansub-query">` is now the global `Input` primitive from `@/components/ui` (D-02/D-07), with the existing `<label htmlFor="fansub-query">` left unchanged.
- A new `fetchLimitReached` state is set inside `loadList`'s existing single `do...while` pagination loop (`firstPageTotal` captured on the first iteration, compared against the final `allItems.length`), rendering the same `EmptyState variant="info"` "Abrufgrenze erreicht" hint already shipped on filter #1 in 178-03.

## Task Commits

1. **Task 1: Extract the #2 filter predicate and remove the lazy alias fetch (D-15/D-18)** - `72c8f718` (feat)
2. **Task 2: Swap the #2 native input for the Input primitive and wire the D-16 hint** - `e423f859` (feat)
3. **Rule 1 auto-fix: update page.test.tsx mock for bundled aliases** - `5c07b592` (fix)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/fansubPageFilter.ts` - new pure function `filterFansubPageItems(items, { statusFilter, query })`
- `frontend/src/app/admin/fansubs/fansubPageFilter.test.ts` - new colocated Vitest coverage, 7 cases
- `frontend/src/app/admin/fansubs/page.tsx` - `filteredItems` rewired onto `filterFansubPageItems`; `aliasesByGroup` state/effect/`getFansubAliases` import fully removed; alias rendering reads `item.aliases` directly; search field swapped onto the `Input` primitive; new `fetchLimitReached` state + `firstPageTotal` tracking in `loadList`; new `EmptyState variant="info"` hint; `Info` imported from `lucide-react`
- `frontend/src/app/admin/fansubs/page.test.tsx` - existing component test updated to mock the bundled `aliases` field on the `getFansubList` response instead of a separate `getFansubAliases` call (see Deviations)

## Decisions Made

- Followed the plan's literal interface for `filterFansubPageItems` (array spread of `item.aliases ?? []` into the `matchesSearch` haystack), matching 178-03's `filterAdminGroups` shape for consistency across both filter sites.
- Followed the plan's literal `firstPageTotal`/`allItems.length` comparison for `fetchLimitReached`, matching the single-status pagination shape of this site (as opposed to adminGroupsFilter's three-status aggregation in 178-03, since this site only has one status-agnostic fetch loop).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated `page.test.tsx`'s existing alias-rendering test after removing the dead per-group fetch**
- **Found during:** Task 1 (Extract the #2 filter predicate and remove the lazy alias fetch)
- **Issue:** The pre-existing `page.test.tsx` mocked `getFansubAliases` (a per-group fetch) and expected the page to call it to populate the rendered "Tag: SAK" alias badge. Removing the dead `aliasesByGroup` fetch per the plan's explicit action broke this test — `getFansubAliases` is no longer imported, and the mocked `getFansubList` response had no `aliases` field, so `item.aliases ?? []` resolved to `[]` and the alias badge no longer rendered.
- **Fix:** Removed `getFansubAliases` from the test's hoisted `apiMocks` object, and added `aliases: ["SAK"]` (plus the matching `aliases_count: 1`) directly to the mocked `getFansubList` group fixture, matching the new bundled-data source.
- **Files modified:** `frontend/src/app/admin/fansubs/page.test.tsx`
- **Verification:** `npx vitest run src/app/admin/fansubs/page.test.tsx` passes (2/2); full `npx vitest run src/app/admin/fansubs/` passes (362/362, 45 files).
- **Committed in:** `5c07b592` (separate fix commit, applied immediately after Task 2's commit since the regression only surfaced on a broader test sweep beyond the plan's scoped `fansubPageFilter.test.ts` command)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary to keep the existing component test suite accurate after removing the dead alias-fetch code the plan explicitly called for; no scope creep, no behavior change beyond what Task 1 specified.

## Issues Encountered

None beyond the auto-fixed test regression above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Filter #2 now matches the shared umlaut-tolerant search pattern (`matchesSearch`), the global `Input` primitive, and the D-16 fetch-limit hint already established by 178-03 on filter #1.
- Filter #3 (178-05) can follow the same `fansubPageFilter.ts`/`adminGroupsFilter.ts` extraction pattern.
- Full `admin/fansubs/` test suite (45 files, 362 tests), `tsc --noEmit`, and `npm run build` all pass clean.

---
*Phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-*
*Completed: 2026-10-10*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/fansubs/fansubPageFilter.ts
- FOUND: frontend/src/app/admin/fansubs/fansubPageFilter.test.ts
- FOUND: frontend/src/app/admin/fansubs/page.tsx
- FOUND: frontend/src/app/admin/fansubs/page.test.tsx
- FOUND commit: 72c8f718
- FOUND commit: e423f859
- FOUND commit: 5c07b592
