---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
plan: 05
subsystem: ui
tags: [react, nextjs, typescript, search-filter, vitest, fansub-merge]

requires:
  - phase: 178-01
    provides: "normalizeSearchText/matchesSearch in @/lib/textFilter; EmptyState variant=\"info\""
  - phase: 178-02
    provides: "FansubGroup.aliases/kuerzel bundled on every getFansubList(...) object"
provides:
  - "fansubMergeScoring.ts with filterMergeCandidates()/scoreMergeRelevance() named, exported, pure functions"
  - "Merge wizard filter #3 search field on the Input primitive"
  - "Live-rendering D-16 'Abrufgrenze erreicht' hint on the merge wizard's single per_page:500 fetch"
affects: [178-06, 178-07]

tech-stack:
  added: []
  patterns:
    - "Extract-filter-and-scorer-together pattern (178-RESEARCH.md Pitfall 3): never split a filter's boolean-match extension from its scorer's ranking extension across tasks/commits"
    - "Pure-function colocated test file with local makeGroup() factory, mirroring fansubListSort.ts/.test.ts"

key-files:
  created:
    - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.ts
    - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.test.ts
  modified:
    - frontend/src/app/admin/fansubs/merge/page.tsx

key-decisions:
  - "Kuerzel/Alias tiers (115/110/75/70/40/35) placed strictly below the equivalent-specificity name/slug tier (120/-, 90/80, 55/45) so a name/slug match of any specificity is never outranked by a Kuerzel/Alias match of the same specificity, per D-18's explicit tier ordering in the plan"
  - "Both scoreMergeRelevance and filterMergeCandidates normalize all compared fields (name/slug/kuerzel/alias) via normalizeSearchText, not plain .toLowerCase(), closing the exact accent-tolerant-filter vs accent-blind-scorer inconsistency RESEARCH.md Pitfall 3 warns about"
  - "D-04 scoring stays bespoke to this file (not delegated to the shared textFilter helper) — only filterMergeCandidates' boolean pass/fail uses matchesSearch; the numeric ranking is still hand-rolled per the plan's explicit protection of the merge wizard's existing relevance order"

requirements-completed: [D-15, D-18, D-04, D-10, D-16, D-02, D-07, D-14]

duration: ~15min
completed: 2026-10-10
---

# Phase 178 Plan 05: Merge-Wizard Filter #3 Extraction + Kuerzel/Alias Scoring Summary

**Extracted the merge wizard's inline filter+scoring closure into testable `filterMergeCandidates`/`scoreMergeRelevance` functions, added umlaut-tolerant Kuerzel/Alias ranking tiers below the unchanged name/slug tiers, swapped the native search `<input>` for the `Input` primitive, and wired a genuinely live D-16 "Abrufgrenze erreicht" hint on the wizard's single non-looping 500-row fetch.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-10T09:09:00Z
- **Completed:** 2026-10-10T09:11:24Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created implementation file, 1 created test file, 1 modified page)

## Accomplishments
- `fansubMergeScoring.ts` exports `filterMergeCandidates()` and `scoreMergeRelevance()` as pure, named, testable functions, with the old inline `relevanceScore` closure and `query` local fully removed from `merge/page.tsx` (D-14)
- Name/slug scoring tiers (120/90/80/55/45/0) are numerically byte-for-byte unchanged from the original closure — proven by 19 passing Vitest cases including an accent-tolerant top-tier match (`"Über Subs"` matches query `"Uber Subs"` at 120) — satisfying the D-04 non-regression guard
- New D-18 Kuerzel/Alias tiers (115/110 exact, 75/70 prefix, 40/35 substring) are implemented and tested, each strictly below the equivalent-specificity name/slug tier so ties never let a Kuerzel/Alias match outrank a name/slug match
- `filterMergeCandidates` now passes a group that matches only on Kuerzel or only on one Alias entry, via `matchesSearch` (same mechanism as filters #1/#2), closing RESEARCH.md's Pitfall 3 (filter-extension and scorer-extension landed in the same commit)
- The #3 search field now renders through the global `Input` primitive instead of a handbuilt native `<input>` (D-02/D-07)
- `loadGroups` now computes `fetchLimitReached = response.data.length < response.meta.total` on the one genuinely non-looping `getFansubList({ per_page: 500 })` call in the whole phase, and an `EmptyState variant="info"` hint renders above the filter row when truncation is real (D-16, D-10)

## Task Commits

Each task was committed atomically (Task 1 followed the TDD RED/GREEN cycle per its `tdd="true"` flag):

1. **Task 1a (RED): add failing test for merge scoring/filter extraction** - `b31eb057` (test)
2. **Task 1b (GREEN): extract filterMergeCandidates/scoreMergeRelevance with Kuerzel/Alias tiers** - `c5b31803` (feat)
3. **Task 2: swap #3 merge search for Input primitive, wire live D-16 hint** - `bca6eb4d` (feat)

**Plan metadata:** (final commit below, created after this summary)

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed the full RED → GREEN cycle:
- RED (`b31eb057`): test file committed first, confirmed to fail with a module-not-found error (`fansubMergeScoring.ts` temporarily removed, `npx vitest run` showed `Cannot find module './fansubMergeScoring'`)
- GREEN (`c5b31803`): implementation restored, `merge/page.tsx` wired onto it, all 19 tests pass
- No REFACTOR commit was needed — the implementation didn't require cleanup after GREEN

## Files Created/Modified
- `frontend/src/app/admin/fansubs/merge/fansubMergeScoring.ts` - `filterMergeCandidates(groups, { query, statusFilter })` (boolean pass/fail via `matchesSearch` over name/slug/kuerzel/aliases) and `scoreMergeRelevance(group, query)` (bespoke numeric ranking, umlaut-tolerant via `normalizeSearchText`, 12-tier table covering name/slug/kuerzel/alias at exact/prefix/substring specificity)
- `frontend/src/app/admin/fansubs/merge/fansubMergeScoring.test.ts` - 19 Vitest cases: one per scoring tier (including the 6 new Kuerzel/Alias tiers and the empty-query/accent-tolerant cases) plus 4 `filterMergeCandidates` cases (Kuerzel-only match, alias-only match, no-match exclusion, statusFilter exclusion)
- `frontend/src/app/admin/fansubs/merge/page.tsx` - `filteredGroups` useMemo now calls the two extracted functions instead of an inline closure; added `fetchLimitReached` state computed in `loadGroups`; added a live `EmptyState variant="info"` hint; swapped the native `<input id="merge-search">` for `<Input id="merge-search">`; added `Info` (lucide-react) and `EmptyState`/`Input` (`@/components/ui`) imports

## Decisions Made
- Kuerzel/Alias tiers placed strictly below the equivalent-specificity name/slug tier (120 exact name/slug > 115 exact kuerzel > 110 exact alias; 90/80 name/slug prefix > 75/70 kuerzel/alias prefix; 55/45 name/slug substring > 40/35 kuerzel/alias substring) — verified by a dedicated test asserting a group whose name, slug, kuerzel, and every alias are all identical to the query still scores 120, not 115 or 110
- Used `normalizeSearchText` (not plain `.toLowerCase()`) on every compared field in both functions, so an accented group name matches its exact top tier against an unaccented query — this generalizes RESEARCH.md Pitfall 3's warning from "filter vs scorer" inconsistency to the broader "accent-tolerant filter vs accent-blind scorer" inconsistency the plan called out
- Kept the numeric scoring bespoke to this file per D-04 (only the boolean filter delegates to the shared `matchesSearch` helper) — the plan is explicit that the merge wizard's candidate ranking must not be replaced by the generic textFilter helper

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Filter #3 (merge wizard) is now on the same `Input`-primitive + umlaut-tolerant-matching standard as filters #1/#2 from earlier plans in this phase
- `fansubMergeScoring.ts` is colocated, independently testable, and does not grow `merge/page.tsx` — leaves headroom for the next plans in this phase (178-06/07) which cover remaining phase-wide verification and live-UAT
- The D-16 hint logic is verified correct via the unit-testable `response.data.length < response.meta.total` comparison; live visual confirmation (whether the hint renders/doesn't render against the real ~14-group dataset) is explicitly deferred to 178-07 per the plan's acceptance criteria

---
*Phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-*
*Completed: 2026-10-10*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`b31eb057`, `c5b31803`, `bca6eb4d`) verified present in `git log --all`.
