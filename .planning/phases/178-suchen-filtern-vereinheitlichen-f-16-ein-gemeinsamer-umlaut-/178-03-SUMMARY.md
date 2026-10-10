---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
plan: 03
subsystem: ui
tags: [search, filtering, unicode-normalization, react, vitest, admin-groups]

# Dependency graph
requires: ["178-01", "178-02"]
provides:
  - "frontend/src/app/admin/groups/adminGroupsFilter.ts exporting filterAdminGroups(groups, query) — name/slug/Kuerzel/alias search via matchesSearch"
  - "AdminGroupsClient.tsx's filteredGroups wired onto filterAdminGroups instead of an inline name/slug-only closure"
  - "AdminGroupsClient.tsx's loadGroups tracks fetchLimitReached generically and renders the EmptyState variant=info D-16 hint"
affects: [178-04, 178-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function + colocated-test extraction (named export only) mirrored from fansubListSort.ts/.test.ts, now a second instance of the pattern for filter #1"

key-files:
  created:
    - frontend/src/app/admin/groups/adminGroupsFilter.ts
    - frontend/src/app/admin/groups/adminGroupsFilter.test.ts
  modified:
    - frontend/src/app/admin/groups/AdminGroupsClient.tsx

key-decisions:
  - "filterAdminGroups spreads group.aliases ?? [] directly into the matchesSearch haystack array rather than pre-joining to a string, keeping each alias as its own independently-matchable entry (consistent with matchesSearch's per-item .includes() semantics)"
  - "fetchLimitReached is computed from an aggregated total/fetched comparison across all three status loops (active/inactive/dissolved), not a single status, so the hint reflects the true combined dataset size"

patterns-established: []

requirements-completed: [D-15, D-18, D-10, D-16, D-14]

# Metrics
duration: ~15min
completed: 2026-10-10
---

# Phase 178 Plan 03: Filter #1 (AdminGroupsClient) umlaut-tolerant name/slug/Kuerzel/alias search Summary

**Replaced `AdminGroupsClient.tsx`'s inline name/slug-only `.includes()` closure with a named, independently-tested `filterAdminGroups` function that also searches Kürzel and alias through the shared `matchesSearch` helper, and wired the D-16 "Abrufgrenze erreicht" hint generically into its pagination loop.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-10T08:49:00Z (approx, immediately after 178-02's metadata commit)
- **Completed:** 2026-10-10T08:58:16Z
- **Tasks:** 2/2 completed
- **Files modified:** 3 (1 new source, 1 new test, 1 existing component)

## Accomplishments

- `frontend/src/app/admin/groups/adminGroupsFilter.ts` created, exporting `filterAdminGroups(groups, query)`, which filters groups via `matchesSearch([group.name, group.slug, group.kuerzel, ...(group.aliases ?? [])], query)`.
- `frontend/src/app/admin/groups/adminGroupsFilter.test.ts` created with 7 Vitest cases (empty query, whitespace-only query, name/slug baseline, Kürzel-only match, alias-only match, `aliases: undefined` safety, umlaut-stripped ASCII query), following `fansubListSort.test.ts`'s exact `describe/it`/`makeGroup(overrides)` convention.
- `AdminGroupsClient.tsx`'s `filteredGroups` `useMemo` now calls `filterAdminGroups(groups, searchValue)`; the old inline `group.name.toLowerCase().includes(query) || group.slug.toLowerCase().includes(query)` closure is fully removed (D-14, verified by grep returning 0 matches).
- A new `fetchLimitReached` state slot is set from generic per-status `statusTotal`/`statusFetched` tracking (summed into `aggregatedTotal`/`aggregatedFetched`) inside `loadGroups`'s existing three-status pagination loop. When true, an `EmptyState variant="info"` hint ("Abrufgrenze erreicht" / "Es werden die ersten 500 Einträge angezeigt – bitte die Suche eingrenzen.") renders above the group list, mirroring the pattern that will also land on filter sites #2/#3 in 178-04/178-05.
- Confirmed (per `178-RESEARCH.md`'s Pitfall 1 finding) that this site's `do...while` loop already exhausts every page before stopping, so `fetchLimitReached` is dead-code-safe under current data volume — it is implemented for cross-site consistency, not because this site currently truncates.

## Task Commits

1. **Task 1: Extract and extend the #1 filter predicate (D-15/D-18)** - `fc9cc409` (feat)
2. **Task 2: Wire the D-16 "Abrufgrenze erreicht" hint into AdminGroupsClient.tsx** - `dc694dfe` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/src/app/admin/groups/adminGroupsFilter.ts` - new pure function `filterAdminGroups(groups, query)`
- `frontend/src/app/admin/groups/adminGroupsFilter.test.ts` - new colocated Vitest coverage, 7 cases
- `frontend/src/app/admin/groups/AdminGroupsClient.tsx` - `filteredGroups` rewired onto `filterAdminGroups`; new `fetchLimitReached` state + generic per-status total/fetched tracking in `loadGroups`; new `EmptyState variant="info"` hint in the group-list JSX; `Info` imported from `lucide-react`

## Decisions Made

- Followed the plan's literal interface for `filterAdminGroups` (array spread of `group.aliases ?? []` into the `matchesSearch` haystack) rather than joining aliases into a single string, preserving per-alias match semantics.
- Followed the plan's literal `aggregatedTotal`/`aggregatedFetched` accumulation design for `fetchLimitReached` rather than a simpler single-status check, so the hint is correct if any status's dataset ever exceeds 500 in the future.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written. Both tasks' acceptance criteria (grep checks, `tsc --noEmit`, `npm run build`, the scoped Vitest file) passed on the first implementation pass.

### Scope-boundary note (not a deviation)

A full-suite `npx vitest run` (beyond the plan's scoped `adminGroupsFilter.test.ts` command) shows
3 pre-existing failing test files unrelated to this plan's changes (`badgeArtwork.test.ts`,
`ResponsiveImage.config.test.ts`, and `RoleCapabilityDetail.membershipBaselineDrift.test.ts` —
the last reads a hardcoded `/backend/...` absolute path that does not exist outside the project's
Docker container). None touch `frontend/src/app/admin/groups/` or `frontend/src/lib/textFilter.ts`.
Logged in `deferred-items.md` per the scope-boundary rule; not fixed.

## Known Stubs

None.

## Threat Flags

None — both registered threats (T-178-06, T-178-07) in the plan's threat model were pre-accepted
dispositions requiring no new mitigation code; no new, undeclared surface was introduced.

## Verification Results

- `cd frontend && npx vitest run src/app/admin/groups/adminGroupsFilter.test.ts` — 7/7 tests pass.
- `cd frontend && npx vitest run src/app/admin/groups/` — all 3 files in the directory (17 tests total, including the pre-existing `AdminGroupsClient.test.tsx` and `page.test.tsx`) pass, confirming no regression from the `filteredGroups` rewiring.
- `cd frontend && npx tsc --noEmit -p tsconfig.json` — no errors.
- `cd frontend && npm run build` — production build succeeds (`/admin/groups` route compiles).
- `grep -c "group.name.toLowerCase().includes" frontend/src/app/admin/groups/AdminGroupsClient.tsx` — 0 (old closure fully removed).
- `grep -n "filterAdminGroups(groups, searchValue)"` and `grep -n "fetchLimitReached"` and `grep -n 'variant="info"'` in `AdminGroupsClient.tsx` — all present at expected locations.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/groups/adminGroupsFilter.ts
- FOUND: frontend/src/app/admin/groups/adminGroupsFilter.test.ts
- FOUND: frontend/src/app/admin/groups/AdminGroupsClient.tsx (modified)
- FOUND: commit fc9cc409
- FOUND: commit dc694dfe
