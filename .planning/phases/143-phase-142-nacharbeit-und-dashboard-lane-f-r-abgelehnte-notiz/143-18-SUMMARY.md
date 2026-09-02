---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 18
subsystem: ui
tags: [react, nextjs, typescript, vitest, review-lifecycle]

# Dependency graph
requires:
  - phase: 143
    provides: "143-17's has_own_rejected_notes boolean on MeProjectReleaseVersion (backend query + OpenAPI + contributions.ts)"
provides:
  - "A third, visually distinct release-row state ('Überarbeitung nötig', danger badge) for a rejected-only release on /me/projects/[animeId]/group/[fansubGroupId]"
  - "Non-downgraded (primary) action-button prominence for a rejected-only release's 'Notizen & Medien' link"
affects: [dashboard, me-projects, release-review-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A per-row derived boolean (needsRework) gates only display (Badge variant/text, button prominence), never the underlying isDone()/counter/filter classification -- keeps a locked counting contract (Kriterium 5) fully separable from a later-added display refinement."

key-files:
  created: []
  modified:
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"

key-decisions:
  - "hasOwnArtifacts (drives button variant/className) now also reads has_own_rejected_notes via logical OR, alongside the existing has_own_notes/has_own_media -- one flag reused for two purposes (button prominence input, and combined with !releaseDone to compute needsRework), avoiding a second parallel derivation."
  - "needsRework is computed as !releaseDone && has_own_rejected_notes so isDone()'s own has_own_notes/has_own_media precedence always wins first -- a release with real notes/media is 'Erledigt' even if a rejected note also exists in its history."
  - "Reused the Badge component's existing variant=\"danger\" (already used elsewhere for rejection semantics, e.g. AttentionSection.tsx) rather than introducing a new color."

patterns-established: []

requirements-completed: ["UAT-02"]

# Metrics
duration: ~10min
completed: 2026-09-02
---

# Phase 143 Plan 18: Render the Überarbeitung nötig Badge State Summary

**The member-project release list now shows a third, distinct "Überarbeitung nötig" (danger) badge with a primary-prominence action button for a rejected-only release, instead of collapsing it into the same "Offen" state as a release nobody has touched at all — closing the frontend rendering half of UAT-02.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-02T08:33:52Z (approx., following 143-17's completion)
- **Completed:** 2026-09-02T08:35:45Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `page.tsx`'s per-row release map now derives `needsRework = !releaseDone && release.has_own_rejected_notes` and feeds it into a three-way Badge ternary (`success`/`danger`/`warning` -> `Erledigt`/`Überarbeitung nötig`/`Offen`)
- `hasOwnArtifacts` extended with `|| release.has_own_rejected_notes` so a rejected-only release's "Notizen & Medien" button renders `primary` (not downgraded to `secondary`/`emptyWorkspaceButton`)
- `isDone()`, `filterReleases()`, `assignedCount`/`openCount`/`doneCount`, and `emptyText` logic are byte-identical to before this plan — a rejected-only release is still classified and counted as "offen" (Kriterium 5's locked behavior)
- 4 new regression tests added: the third-state badge renders exactly once with no leaked "Offen"/"Erledigt" span for that row; the button stays primary (no `buttonSecondary` class); the counter/filter still treats the release as offen; a never-touched release (all `has_own_*` false) is unchanged (plain "Offen" + secondary button)

## Task Commits

Each task was committed atomically:

1. **Task 1: Render the third "Überarbeitung nötig" state and fix button prominence** - `217c47aa` (feat)
2. **Task 2: Add regression tests for the third state and button prominence** - `29ada495` (test)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - `hasOwnArtifacts` now includes `has_own_rejected_notes`; new `needsRework` derived boolean; Badge variant/text is now a three-way ternary
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - 4 new tests covering the third badge state, button prominence, counter/filter classification, and a never-touched-release regression guard

## Decisions Made
- Kept `hasOwnArtifacts` as one reused boolean rather than introducing a second flag for button prominence — the plan's `<interfaces>` block explicitly called this out as the minimal-diff approach.
- `needsRework`'s `!releaseDone &&` guard ensures `isDone()`'s existing precedence (has_own_notes/has_own_media wins) is never bypassed, even when `has_own_rejected_notes` is also true on an otherwise-done release.
- Reused `Badge`'s existing `variant="danger"` for visual consistency with the dashboard's rejected-notes lane (`AttentionSection.tsx`), per the plan's explicit interface note — no new color introduced.

## Deviations from Plan

None - plan executed exactly as written. One test-writing adjustment within Task 2's own scope: the first regression test's initial assertion (`screen.queryByText('Offen')`) matched the page's "Offen" filter-toggle button in addition to any badge span, so it was scoped to `.filter((node) => node.tagName === 'SPAN')` matching this file's existing established pattern (`shows a status badge (Offen/Erledigt)` test) before the tests were committed — no separate commit needed since this was corrected during the same Task 2 verification loop, not after commit.

## Issues Encountered
None beyond the test-scoping adjustment documented above (resolved before commit, not a deviation from the plan's intended behavior).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT-02 is now fully closed end to end: 143-17 shipped the backend/contract signal, this plan (143-18) consumes it in the only frontend surface that renders release status for a member's own assigned releases.
- This was the last plan in Phase 143 (gap-closure phase for live UAT findings UAT-01..UAT-04). All plans in the phase are now complete.
- No blockers.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
- FOUND commit: 217c47aa
- FOUND commit: 29ada495
