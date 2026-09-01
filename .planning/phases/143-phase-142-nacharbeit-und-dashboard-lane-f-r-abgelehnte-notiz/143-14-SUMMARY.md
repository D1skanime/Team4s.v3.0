---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 14
subsystem: web
tags: [react, nextjs, dashboard, design-system, typescript]

# Dependency graph
requires:
  - phase: 143-13
    provides: "OwnDashboardData.pending_own_note_revisions field (backend aggregation, openapi.yaml sync) this plan renders"
provides:
  - "OwnDashboardPendingOwnNoteRevisionItem/Group TypeScript types (frontend/src/types/dashboard.ts)"
  - "AttentionSection.tsx's fifth lane rendering rejected own notes, grouped per anime-project + fansub-group"
  - "pendingOwnNoteRevisions wired through /me/dashboard/page.tsx"
affects: [me-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-link card pattern (group card is not one Link; each inner row is its own Link) used for a lane whose group can span multiple release versions -- documented deviation from the single-Link-per-card pattern the other three AttentionSection lanes use."

key-files:
  created: []
  modified:
    - frontend/src/types/dashboard.ts
    - frontend/src/app/me/dashboard/components/AttentionSection.tsx
    - frontend/src/app/me/dashboard/components/AttentionSection.module.css
    - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
    - frontend/src/app/me/dashboard/page.tsx
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
    - frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
    - frontend/src/lib/api.dashboard.test.ts

key-decisions:
  - "Fixed 3 pre-existing OwnDashboardData test fixtures (CategoryProgressTable.test.tsx, DashboardMetrics.test.tsx, api.dashboard.test.ts) to include the new required pending_own_note_revisions field -- Rule 3 blocking-issue auto-fix, a direct type-checker consequence of Task 1's field addition, not a scope expansion."
  - "Extended the AttentionSection.test.tsx in-file next/link mock to forward aria-label -- required to assert the new lane's per-row accessible names (the mock previously dropped this prop since no prior lane needed it)."

requirements-completed: ["Criterion-7"]

# Metrics
duration: ~35min
completed: 2026-09-01
---

# Phase 143 Plan 14: Frontend Dashboard Lane for Rejected Own Notes Summary

**Rendered plan 143-13's `pending_own_note_revisions` backend aggregation as a fifth `AttentionSection` lane -- grouped Cards per anime-project + fansub-group with an "Abgelehnt" danger Badge, one row per rejected note linking to `/me/releases/{versionId}/workspace?tab=notes` -- using the exact markup, CSS classes, and locked render order specified verbatim in 143-UI-SPEC.md, with zero changes to `workspace/page.tsx`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-01T22:55:00Z (approx.)
- **Completed:** 2026-09-01T23:00:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 8 (5 planned + 3 Rule-3 fixture fixes)

## Accomplishments
- `OwnDashboardPendingOwnNoteRevisionItem`/`Group` TypeScript interfaces added to `frontend/src/types/dashboard.ts`, mirroring the existing `OwnDashboardPending*` style; `pending_own_note_revisions` added to `OwnDashboardData`.
- `AttentionSection.tsx` gained a new optional `pendingOwnNoteRevisions` prop (default `[]`) and a fifth lane, inserted into the locked render order (`pendingGroupMediaReviews` -> `pendingReleaseReviews` -> `pendingClaims` -> **`pendingOwnNoteRevisions`** -> `contributionProjects`), confirmed via `grep` showing exactly this order top to bottom.
- Each rejected-notes group renders one `Card variant="default"` with an `Abgelehnt` (`Badge variant="danger"`) header and one `<Link>` row per note, showing `Folge {N}` (or `Release-Version` fallback when `episode_number` is null) and the note title (or `Ohne Titel` fallback), each carrying an explicit `aria-label` (`{episode} · {title} überarbeiten öffnen`) since multiple links share one card.
- Empty-state gating extended from a four-way to a five-way `.length === 0` check; exact existing `EmptyState` copy unchanged.
- Six new CSS classes appended verbatim to `AttentionSection.module.css` (`.noteGroupHeader`, `.noteRevisionList`, `.noteRevisionRow` + hover/focus states, `.noteRevisionEpisode`, `.noteRevisionTitle`) -- no existing class restyled, all values use existing design tokens.
- `frontend/src/app/me/dashboard/page.tsx` passes `pendingOwnNoteRevisions={state.dashboardData.pending_own_note_revisions}` as a fifth prop, matching the three existing `pending*` props' style; `workspace/page.tsx` and all of `frontend/src/app/me/releases/` remain untouched (confirmed by empty `git diff --stat`).
- 3 new tests added to `AttentionSection.test.tsx`: (a) grouped-markup rendering with both the episode/title fallback branches, (b) link target + `aria-label` assertions, (c) empty-state gating with an empty `pendingOwnNoteRevisions` array alongside all other sources empty. 13/13 tests in the file pass (10 pre-existing + 3 new).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the frontend types** - `5ffd94b7` (feat)
2. **Task 2: Add the fifth AttentionSection lane, CSS, and empty-state gating** - `b7ac77cc` (feat)
3. **Task 3: Wire the new prop through the dashboard page** - `f6802b9d` (feat)

## Files Created/Modified
- `frontend/src/types/dashboard.ts` - added `OwnDashboardPendingOwnNoteRevisionItem`/`Group` interfaces and the `pending_own_note_revisions` field on `OwnDashboardData`
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` - new `pendingOwnNoteRevisions` prop, fifth lane markup, five-way empty-state gating
- `frontend/src/app/me/dashboard/components/AttentionSection.module.css` - six new classes appended (`.noteGroupHeader`, `.noteRevisionList`, `.noteRevisionRow`, `.noteRevisionRow:hover/:focus-visible`, `.noteRevisionEpisode`, `.noteRevisionTitle`)
- `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` - 3 new tests; `next/link` mock extended to forward `aria-label`
- `frontend/src/app/me/dashboard/page.tsx` - fifth prop wired onto `<AttentionSection>`
- `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx` - Rule-3 fix: added `pending_own_note_revisions: []` to the `makeData` fixture
- `frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx` - Rule-3 fix: added `pending_own_note_revisions: []` to the `makeDashboardData` fixture
- `frontend/src/lib/api.dashboard.test.ts` - Rule-3 fix: added `pending_own_note_revisions: []` to the inline `OwnDashboardResponse` fixture

## Decisions Made
- Fixed the three pre-existing `OwnDashboardData` object-literal fixtures broken by Task 1's new required field, per Rule 3 (blocking issue directly caused by this plan's own type change) rather than deferring -- `tsc --noEmit` was clean before this fix and stayed clean after, and all three files are direct, mechanical consumers of the type this plan extends.
- Extended the in-file `next/link` mock in `AttentionSection.test.tsx` to forward `aria-label`, since none of the four pre-existing lanes needed it (each of their cards has exactly one link with no distinct accessible name requirement) but the new lane's multi-link-per-card shape requires per-row `aria-label` assertions to be testable at all.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Three pre-existing OwnDashboardData test fixtures failed tsc after Task 1's new required field**
- **Found during:** Task 1 (`tsc --noEmit` verification)
- **Issue:** `CategoryProgressTable.test.tsx`, `DashboardMetrics.test.tsx`, and `frontend/src/lib/api.dashboard.test.ts` each construct an `OwnDashboardData` object literal without the new `pending_own_note_revisions` field, which is required (not optional) per the UI-SPEC's data-shape contract and the plan's Task 1 instruction.
- **Fix:** Added `pending_own_note_revisions: []` to each fixture, matching the existing `pending_claims`/`pending_group_media_reviews`/`pending_release_reviews: []` pattern already present in the same object literals.
- **Files modified:** `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx`, `frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx`, `frontend/src/lib/api.dashboard.test.ts`
- **Commit:** `5ffd94b7`

**2. [Rule 3 - Blocking issue] next/link test mock did not forward aria-label**
- **Found during:** Task 2 (writing the new lane's link-target/aria-label test)
- **Issue:** `AttentionSection.test.tsx`'s own `vi.mock("next/link", ...)` only forwarded `href`/`children`/`className`, dropping any `aria-label` prop -- the new lane's rows pass `aria-label` (required since multiple `<Link>`s share one card, unlike the other three lanes), so `screen.getByRole("link", { name: ... })` could not find them by accessible name.
- **Fix:** Extended the mock's destructured props and rendered `<a>` to include `aria-label`.
- **Files modified:** `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx`
- **Commit:** `b7ac77cc`

## Issues Encountered
- Pre-existing ESLint warnings (`ATTENTION_WINDOW_DAYS`, `isRecentlyAssigned`, `resolveWorkspaceHref` unused) already existed in `AttentionSection.tsx` before this plan's edits (confirmed via `git show HEAD~2`) -- out of scope per the deviation rules' scope boundary, not touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Criterion-7 is now fully closed end to end: backend aggregation (143-13) + frontend rendering (this plan) both ship. Rejected own release-version notes now appear in "Braucht deine Aufmerksamkeit", grouped per anime-project + fansub-group, in the locked position after `pendingClaims` and before `contributionProjects`.
- This is the last plan (14 of 14) in Phase 143. All 7 ROADMAP success criteria for this phase are now addressed across the phase's plans.
- No blockers.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: frontend/src/types/dashboard.ts
- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.tsx
- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.module.css
- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
- FOUND: frontend/src/app/me/dashboard/page.tsx
- FOUND: frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
- FOUND: frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
- FOUND: frontend/src/lib/api.dashboard.test.ts
- FOUND commit: 5ffd94b7
- FOUND commit: b7ac77cc
- FOUND commit: f6802b9d
