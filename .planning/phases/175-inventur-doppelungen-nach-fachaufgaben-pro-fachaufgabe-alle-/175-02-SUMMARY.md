---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 02
subsystem: analysis
tags: [inventory, duplication, release-editing, search, filter, permissions, read-only]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: F-13/F-16 followup findings and 174-REPORT.md recommendations that scoped this inventory
provides:
  - "data/03-release-bearbeiten.md: full D-03 inventory of both release-editing frame pages (admin editor vs /me workspace) with file:line evidence, D-04 classification, and a precisely-located root cause for F-13's 'admin without member profile hits 404' symptom"
  - "data/07-suchen-filtern.md: full D-03 inventory of the global search library vs. 6 living client-side filters (not 7 as F-16 claimed), with a source-verified correction and umlaut-tolerance/UI-primitive comparison tables"
  - "scripts/count-03-release-bearbeiten.sh and scripts/count-07-suchen-filtern.sh: reproducible grep/existence-based count scripts matching the fragment files exactly"
affects: ["175-07 (175-INVENTORY.md merge)", "175-08 (175-PERMISSION-MATRIX.md)", "175-09 (175-ROADMAP-PROPOSAL.md)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fragment-file + reproducible count-script pattern for business-task duplication audits (data/*.md + scripts/count-*.sh), continued from 175-01"

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/03-release-bearbeiten.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-03-release-bearbeiten.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/07-suchen-filtern.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-07-suchen-filtern.sh
  modified: []

key-decisions:
  - "Admin-Editor-Rahmen (not the /me workspace) is the Vorbild for the future single release-editing page: it needs no member profile to function (uses getCurrentUser, not getOwnProfile/getMyProjectDetail), which structurally avoids F-13's 404 symptom rather than only catching it in the UI"
  - "The F-13 'admin without member profile gets a 404' symptom is precisely located in GetMyProjectDetail (contributions_me_project_handler.go:13, via resolveVerifiedMemberID), NOT in GetOwnProfile as the naive reading would suggest -- GetOwnProfile tolerates a missing member profile via a LEFT JOIN and never 404s for an authenticated app user"
  - "F-16's claim of 7 individual browser filters is corrected to 6: projectPageData.ts contains no search-input filter at all, only an unrelated image-title 'landscape' lookup -- a stale/incorrect file reference in the source followup"
  - "AdminGroupsClient.tsx and GroupMediaReviewSection.tsx (via GroupMediaReviewFilterBar.tsx) are the Vorbild-candidates for a future shared filter helper -- both already use the @/components/ui Input primitive; the other 4 filters use native <input> (pre-existing CLAUDE.md violations, out of D-01 scope to fix here)"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~110min
completed: 2026-10-07
---

# Phase 175 Plan 02: Fachaufgabe 3+7 Inventur (Release bearbeiten, Suchen & Filtern) Summary

**Full source-verified duplication inventory of the release-editing (2 frame pages) and search/filter (1 backend library + 6 client filters) business tasks, pinpointing the exact backend call responsible for F-13's "admin without member profile → 404" symptom and correcting F-16's claimed filter count from 7 to 6.**

## Performance

- **Duration:** ~110 min
- **Started:** 2026-10-07T08:05:00Z (approx.)
- **Completed:** 2026-10-07T09:55:00Z (approx.)
- **Tasks:** 2/2
- **Files modified:** 4 (all newly created)

## Accomplishments

- Produced `data/03-release-bearbeiten.md`: both release-editing frame pages (`/admin/episode-versions/[versionId]/edit` and `/me/releases/[versionId]/workspace`) documented across all D-03 (a)-(f) columns with file:line evidence, confirming both call the identical 3 backend endpoints (`editor-context`, `PATCH update`, `capabilities`) and directly import (not copy) the same 4 content blocks.
- Traced F-13's "admin without member profile hits a 404" claim to its exact source: `GetMyProjectDetail` (`contributions_me_project_handler.go:13`, via `resolveVerifiedMemberID`) returns a real `404 "kein verifizierter Member-Account verknüpft"` when called from the `/me` workspace's adjacent-navigation effect — and explicitly ruled out the more obvious candidate, `GetOwnProfile`, which never 404s for an authenticated app user (its `LEFT JOIN` on `members` degrades gracefully to `HasMemberProfile=false`).
- Selected the admin-editor frame as Vorbild for D-06's future single page, with a concrete structural reason (no member-profile dependency) rather than a stylistic preference, while also identifying what the admin frame should adopt from the `/me` workspace (global UI primitives: `PageHeader`, `AdjacentNavigation`, `Tabs`).
- Produced `data/07-suchen-filtern.md`: the global search library (`f_unaccent` + `pg_trgm`, ranked, paginated) documented against all 7 of F-16's named filter files — but found that one of the 7 (`projectPageData.ts`) contains no search-input filter at all (only an unrelated "landscape" image-title lookup), correcting the living count to 6. Confirmed the F-16 "uber does not find Über" example holds for all 6 remaining filters.
- Built two comparison tables (umlaut-tolerance, UI-primitive-conformity) across the 6 filters, identifying `AdminGroupsClient.tsx` and `GroupMediaReviewSection.tsx` (via `GroupMediaReviewFilterBar.tsx`) as Vorbild-candidates since both already use the `Input` primitive, while `admin/fansubs/page.tsx`, `merge/page.tsx`, and the two genre/tag-autocomplete hooks use native `<input>` (pre-existing CLAUDE.md violations, left undisturbed per D-01).
- Wrote two grep/existence-based count scripts (`count-03-release-bearbeiten.sh`, `count-07-suchen-filtern.sh`) whose output numbers are verified to match the fragment files' summary lines exactly, including a regression guard in the search script that re-checks whether `projectPageData.ts` has since grown a real search filter (would invalidate the correction).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fachaufgabe 3 — Release bearbeiten, vollständige Inventur** - `87e46d02` (docs)
2. **Task 2: Fachaufgabe 7 — Suchen & Filtern, vollständige Inventur** - `901ead0d` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/03-release-bearbeiten.md` - Full D-03/D-04 inventory of both release-editing frame pages, with the located 404 root cause and Vorbild/Altlast decision for D-06
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-03-release-bearbeiten.sh` - Reproducible grep-based count script for Task 1's summary numbers
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/07-suchen-filtern.md` - Full D-03/D-04 inventory of the global search library and 6 living client-side filters, with a source-verified correction to F-16's claimed count of 7
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-07-suchen-filtern.sh` - Reproducible grep-based count script for Task 2's summary numbers, with a regression guard on the projectPageData.ts correction

## Decisions Made

- Admin-Editor-Rahmen chosen as the Vorbild for the future single release-editing page over the `/me` workspace, based on a structural correctness argument: it has no dependency on a verified member profile (`getCurrentUser` vs. `getOwnProfile`/`getMyProjectDetail`), which is the actual mechanism behind F-13's named 404 symptom — not a stylistic or code-quality preference.
- The `/me` workspace's use of global UI primitives (`PageHeader`, `AdjacentNavigation`, `Tabs`, `Card`, `ErrorState`, `LoadingState`) is flagged as the one aspect the admin frame should adopt during consolidation, since the admin frame currently hand-rolls its tab bar and header with local CSS modules instead of the `Tabs` primitive (CLAUDE.md design-system requirement).
- `projectPageData.ts` removed from the "7 individual filters" count for Fachaufgabe 7 — verified via full file read and `git log --follow` that it has never contained a list/search filter, only an unrelated image-orientation heuristic. This correction is carried forward explicitly for 175-07/175-09 so the roadmap-proposal phase does not look for a non-existent 7th filter to migrate.
- `AdminGroupsClient.tsx` and `GroupMediaReviewSection.tsx` (via `GroupMediaReviewFilterBar.tsx`) selected as Vorbild-candidates for the future shared filter helper's UI layer, because both already render through the `@/components/ui` `Input` primitive; the other 4 filters (`admin/fansubs/page.tsx`, `merge/page.tsx`, and both genre/tag-autocomplete hooks sharing `AnimeEditGenreSection.tsx`) use native `<input>` and are flagged as pre-existing CLAUDE.md violations to fix during the eventual consolidation, not in this read-only phase.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written. No Rule 1/2/3 auto-fixes were needed; both tasks were pure read/analysis work producing new documentation and scripts only.

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

- F-16's source file list names `admin/anime/hooks/internal/useAnimePatchImpl.ts` and `admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` as filter implementations without specifying they are genre/tag-autocomplete filters over an already-loaded taxonomy catalog, not entity-list filters like the other four. Documented this distinction explicitly in `data/07-suchen-filtern.md` so 175-07/175-09 can decide whether to scope them into the same consolidation effort or treat them as a narrower, separate fix (a single shared `filterTaxonomyTokens` helper, independent of the larger listfilter migration).
- One of F-16's 7 named files (`projectPageData.ts`) turned out, on full read, to contain no search-filter code at all — see Decisions Made. This is flagged for the phase's closing report so the discrepancy is not silently re-discovered as a surprise during 175-09's roadmap cut.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both fragment files (`data/03-release-bearbeiten.md`, `data/07-suchen-filtern.md`) are ready to be merged into `175-INVENTORY.md` by 175-07, with concrete Vorbild/Altlast calls ready to feed 175-08's `175-PERMISSION-MATRIX.md` and 175-09's `175-ROADMAP-PROPOSAL.md`.
- No blockers for subsequent 175-0x plans. Two open notes for the eventual closing report: (1) the precise 404 root-cause location for F-13 (GetMyProjectDetail, not GetOwnProfile) should be carried into any future bugfix phase verbatim so it isn't re-investigated from scratch; (2) F-16's filter count should be corrected from 7 to 6 in any downstream roadmap document.

---
*Phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `data/03-release-bearbeiten.md`
- FOUND: `scripts/count-03-release-bearbeiten.sh`
- FOUND: `data/07-suchen-filtern.md`
- FOUND: `scripts/count-07-suchen-filtern.sh`
- FOUND: `175-02-SUMMARY.md`
- FOUND commit `87e46d02` (Task 1)
- FOUND commit `901ead0d` (Task 2)
