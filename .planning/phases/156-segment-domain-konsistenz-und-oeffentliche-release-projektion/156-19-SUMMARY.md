---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 19
subsystem: ui
tags: [react, nextjs, typescript, admin, segments, gap-closure]

# Dependency graph
requires:
  - phase: 156-18
    provides: contributor preselection for single-episode segments (migration 0165, central rule)
provides:
  - "SegmentEditPanel.tsx: Mitwirkende-am-Segment gated only on origin_release_version_id != null, no longer on is_shared"
  - "SegmentEditPanel.tsx: read-only 'Origin: Folge N' info line for single-episode segments (replaces useless one-option Select)"
affects: [156-UAT, admin-anime-intake]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-only info branch mirrors the editable Select branch's condition inversion (isSharedSegment vs !isSharedSegment) instead of a shared boolean flag, keeping both branches independently readable"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx

key-decisions:
  - "Widened the SegmentContributorsField gate to `origin_release_version_id != null` only, dropping `isSharedSegment &&` entirely, per the plan's literal target replacement"
  - "Single-episode origin display uses findAssignedEpisodeNumber with a currentEpisodeLabel fallback (never exercised in the primary fixtures, only a defensive guard against stale assigned_episodes data)"

patterns-established: []

requirements-completed: [P156-06, 156-18, GAP-08]

# Metrics
duration: ~20min
completed: 2026-09-15
---

# Phase 156 Plan 19: GAP-08 Mitwirkende/Origin fuer Ein-Folgen-Segmente Summary

**SegmentEditPanel.tsx zeigt "Mitwirkende am Segment" jetzt bei jedem Segment mit gueltiger Origin unabhaengig von is_shared, und Ein-Folgen-Segmente bekommen eine schreibgeschuetzte "Origin: Folge N"-Info statt eines nutzlosen Ein-Options-Selects.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-15T07:48:00Z (approx.)
- **Completed:** 2026-09-15T07:53:05Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Closed GAP-08 (`156-UAT.md`): admins can again see and edit "Mitwirkende am Segment" for single-episode segments ("Kara time 1", "Ending Buddy", "test") whose contributors were auto-preselected by Plan 156-18 but had become invisible/unabwaehlbar because the section only rendered for `is_shared: true` segments.
- Added a new read-only "Origin: Folge N" info line for single-episode segments with a valid origin, replacing the previous behavior of showing nothing at all for that case.
- Verified the shared-segment path (editable Select, both options, `setAnimeSegmentOrigin` on change, "Mitwirkende am Segment" rendering) stays byte-identical — proven both by the plan's own literal replacement (unchanged markup block) and by a new regression test exercising the select's `onChange`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen Mitwirkende/Origin rendering gates in SegmentEditPanel.tsx, test-first** - `9277988b` (fix, TDD: RED confirmed inline via test run before the fix, then GREEN)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` - Origin block now renders three ways: editable Select for shared segments (unchanged), a new read-only "Origin: Folge N" info line for single-episode segments with a valid origin, and the `SegmentContributorsField` gate widened to `origin_release_version_id != null` (dropped `isSharedSegment &&`)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - 4 new GAP-08 subtests: single-episode segment shows "Mitwirkende am Segment" and calls the candidates API; same fixture shows "Origin: Folge 1" with no combobox; a segment without origin/assignment shows neither; a shared segment keeps the editable Select (2 options) and calls `setAnimeSegmentOrigin` on change

## Decisions Made
- Followed the plan's `<interfaces>` target replacement literally (three-block structure) rather than inventing an alternative gating condition, since the plan's before/after JSX was exact and pre-verified against the file's actual current line numbers.
- Kept `findAssignedEpisodeNumber(...) ?? currentEpisodeLabel` fallback exactly as specified even though it is not exercised by the new fixtures (defensive guard for stale `assigned_episodes` data, documented in the plan).

## Deviations from Plan

None — plan executed exactly as written. The target replacement JSX was applied verbatim from the plan's `<interfaces>` section; no additional Rule 1-4 fixes were needed.

## Issues Encountered
- The first attempt at the "segment without origin/assignment" test case (`assigned_release_version_ids: []`) caused the segment to disappear from the table entirely (filtered out by `isCurrentEpisodeAssigned` in `SegmenteTab.tsx`, unrelated to this plan's scope), so the "Bearbeiten" button could not be found. Fixed by keeping `assigned_release_version_ids: [481]` (segment still assigned/visible in the table) while setting `origin_release_version_id: null` and `assigned_episodes: []` — this correctly models "assigned to the release but no valid origin/episode data" per the plan's actual behavior requirement, and is not a deviation from the plan's intended test coverage.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run SegmenteTab"` — 110/110 tests passing across `SegmenteTab.test.tsx` (91 tests, includes the 4 new GAP-08 subtests) and `SegmenteTab.assignment-conflicts.test.tsx` (19 tests), zero regressions.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"` — clean, exit 0.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint '...SegmentEditPanel.tsx' '...SegmenteTab.test.tsx'"` — clean, exit 0 (including the `no-restricted-syntax` native-element rule; no raw `<select>`/`<input>` introduced).
- `grep -n "isSharedSegment &&" SegmentEditPanel.tsx` — no longer matches the `SegmentContributorsField` gate line (only the origin-Select branch and the unrelated override-block condition inside `handleSaveClick` still use it).
- `grep -n "Origin: Folge" SegmentEditPanel.tsx` — matches exactly once.
- `wc -l SegmentEditPanel.tsx` — 389 lines (well under the 450-line project cap).
- `grep -n "ä\|ö\|ü\|ß" SegmentEditPanel.tsx` — pre-existing German strings (`ausfüllen`, `überschreitet`, `hinzufügen`, `mitgeändert`) intact, no ASCII-substitution regression.
- Frontend container (`team4sv30-frontend`) restarted via `docker restart` (no dependency changes, no rebuild needed); `docker compose ps` confirms it came back up and is serving live traffic (dev server log shows `✓ Ready` and subsequent 200 responses).

## Explicit Non-Claim (Live-UAT)

**The human live-UAT sign-off for GAP-08 in the Admin-Editor (browser, requires login) is NOT run or claimed as passed by this plan.** This plan closes GAP-08 automatically/verification-side only (tests, typecheck, lint, container restart, and reachability). The Auftraggeber's separate live-UAT step per `156-UAT.md` — visually confirming in the browser that "Kara time 1", "Ending Buddy", and "test" now show an editable, deselectable "Mitwirkende am Segment" section — remains open. This mirrors the pattern of every prior 156-1x gap-closure plan in this phase (156-16, 156-17, 156-18): Phase 156 as a whole continues to be NOT considered fully accepted until the Auftraggeber confirms the bundled `156-UAT.md` / `156-HUMAN-UAT.md` live-UAT checkpoint.

## Next Phase Readiness
- GAP-08 is closed on the automated-verification side. No further code changes are anticipated for this specific gap.
- Outstanding: the bundled `156-HUMAN-UAT.md` live-UAT checkpoint (covering GAP-02 and now GAP-08) remains the Auftraggeber's separate, still-open acceptance step for Phase 156 as a whole.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-15*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
- FOUND: frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
- FOUND: commit 9277988b
