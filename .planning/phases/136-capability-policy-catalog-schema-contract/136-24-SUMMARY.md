---
phase: 136-capability-policy-catalog-schema-contract
plan: 24
subsystem: frontend
tags: [react, capabilities, segments, contributor-workspace, navigation]

requires:
  - phase: 136-capability-policy-catalog-schema-contract
    provides: release-version capability projection, contributor project detail, and canonical role policy
provides:
  - Capability-gated reuse of the existing segment editor in the contributor workspace
  - Project-scoped previous/next release navigation preserving validated return paths
affects: [contributor-workspace, release-segments, project-navigation]

tech-stack:
  added: []
  patterns: [server-capability-gated shared editor reuse, authenticated project-order adjacency]

key-files:
  created: []
  modified:
    - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
    - frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx
    - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css

key-decisions:
  - "Adjacent releases are derived only from the selected anime/group's authenticated project detail response and are discarded if the response identity does not match."
  - "Navigation failure remains local to the navigation status so media, notes, and segments stay usable."

patterns-established:
  - "Contributor workspace features reuse server capability booleans and existing domain components; the UI does not create parallel permission or segment logic."
  - "Release neighbor links preserve only the already-validated canonical project return path."

requirements-completed: [CAP-13, QUAL-01]

duration: 11 min
completed: 2026-08-21
---

# Phase 136 Plan 24: Contributor Workspace Segments and Navigation Summary

**The contributor release workspace now reuses the canonical segment editor under can_manage_segments and navigates only within the authenticated anime/group project release order.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-21T10:07:51Z
- **Completed:** 2026-08-21T10:18:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added a Segmente tab using the existing SegmenteTab with the real anime, group, episode, version, duration, and release-version identifiers.
- Made segment-only capability sufficient for workspace access and selected the segment tab when it is the first available tool.
- Added previous/next release links from the existing authenticated project-detail helper, bounded to the selected anime/group and stable backend order.
- Preserved the validated project return_to across neighbor links while isolating navigation loading and failure from the editor tools.

## Task Commits

Each task followed the TDD RED/GREEN gate:

1. **Task 1 RED: segment workspace coverage** - de8d2e86 (test)
2. **Task 1 GREEN: capability-gated segment editor** - 0eaac1ec (feat)
3. **Task 2 RED: project neighbor coverage** - 34341e39 (test)
4. **Task 2 GREEN: project-scoped adjacent navigation** - 178012e5 (feat)

## Files Created/Modified

- frontend/src/app/me/releases/[versionId]/workspace/page.tsx - Reuses the segment editor and derives validated project-scoped neighbors.
- frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx - Covers segment capability states, refresh-session loading, neighbor bounds, absent releases, return paths, and local failures.
- frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css - Adds narrow status and navigation containment styling.

## Decisions Made

- The project DTO's release_versions order is the sole neighbor order; no client sort or global release query is introduced.
- A mismatched project response identity or a current release absent from the project list yields no navigation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The repository-wide frontend typecheck remains blocked by pre-existing generated .next/dev/types route-contract errors, including several untouched routes. No error pointed to the new workspace implementation itself. Focused Vitest and ESLint checks for the owned files pass.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. The empty tab list and nullable navigation values are intentional runtime state, not placeholder UI or unwired data.

## Next Phase Readiness

- The active contributor workspace now exposes both missing UAT seams without new endpoints or legacy-route work.
- No blocker remains for the Phase 136 gap-closure verification pass.

## Self-Check: PASSED

- All three owned implementation/test/style files exist.
- All four TDD commits exist and the focused 10-test suite plus owned-file ESLint and git diff --check pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
