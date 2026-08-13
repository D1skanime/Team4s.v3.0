---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "05"
subsystem: api-ui
tags: [go, postgres, openapi, nextjs, react, fansubprojekt, releases, public-title-safety]

# Dependency graph
requires:
  - phase: 102-04
    provides: "Code-complete story/member public project slice with live UAT deferred to final Phase 102 acceptance"
provides:
  - "Public release titles use curated names only when safe and otherwise fall back to neutral episode/group/version labels"
  - "Public release section renders a single conservative list titled `Releases zum Fansub`"
  - "Standalone `Neuestes Release` composition is no longer rendered on the public Fansub project release section"
affects: [phase-102, public-fansub-project-detail, public-release-list, public-release-detail, openapi]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use `publicReleaseTitleSQL` for public release list/detail title projection instead of raw `release_versions.title` fallback."
    - "Keep the cursor release list as the single conservative public project release section."

key-files:
  created:
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-05-SUMMARY.md"
  modified:
    - "backend/internal/repository/group_repository.go"
    - "backend/internal/repository/group_repository_cursor.go"
    - "backend/internal/repository/release_detail_public_repository.go"
    - "backend/internal/repository/group_repository_test.go"
    - "shared/contracts/openapi.yaml"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx"

key-decisions:
  - "Task 3 live release-section acceptance is deferred to final Phase 102 UAT by explicit user direction, not approved."
  - "The actual public cursor release-list query was updated alongside the plan-listed offset query because the visible UI consumes the cursor route."

patterns-established:
  - "Public release titles must be projected by backend repository reads as curated-or-neutral labels before reaching the public UI."
  - "Raw import/file names such as `.mkv`, `.mp4`, `.avi`, `.m2ts`, `.ass`, slash/backslash paths, or bracket-prefixed file names are unsafe for public release titles."

requirements-completed:
  - "D-01"
  - "D-05"
  - "D-06"
  - "D-07"
  - "D-15"
  - "D-16"
  - "D-18"
  - "D-27"

# Metrics
duration: 9min
completed: 2026-07-14
---

# Phase 102 Plan 05: Release Section Title Safety Summary

**Public release labels now use curated-or-neutral backend titles, and the project release section renders one conservative list titled `Releases zum Fansub`**

## Performance

- **Duration:** 9min implementation window.
- **Started:** 2026-07-14T16:02:05Z
- **Completed:** 2026-07-14T16:10:53Z
- **Tasks:** 2 implemented; Task 3 live acceptance deferred, not approved.
- **Files modified:** 8 code/contract files plus this summary.

## Accomplishments

- Added `publicReleaseTitleSQL` so public release list/detail reads accept curated `release_versions.title` only when it is not a raw filename/import/path-like label.
- Built neutral fallbacks from episode title, fansub group name, and release version, e.g. `Kanonenschuss (Honto) Version 1`.
- Applied the title fallback to offset release reads, cursor release-list reads, and public release detail header reads.
- Documented OpenAPI public release `title` semantics with `raw import` and `neutral fallback` language.
- Removed `LatestReleaseSection` from the public project release section composition.
- Retitled the visible release list to exact string `Releases zum Fansub` and removed active `Weitere Releases` UI copy.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Enforce public release-title fallback safety** - `e34bdc16` (`fix`)
2. **Task 2: Retitle release section and remove newest-release composition** - `cf16b4b0` (`fix`)

**Plan metadata:** final docs commit is created after this summary self-check.

## Files Created/Modified

- `backend/internal/repository/group_repository.go` - Adds shared public release title SQL helper and applies it to offset list/count filtering.
- `backend/internal/repository/group_repository_cursor.go` - Applies the same public title projection to the cursor list consumed by the visible release section.
- `backend/internal/repository/release_detail_public_repository.go` - Applies the same public title projection to release detail headers.
- `backend/internal/repository/group_repository_test.go` - Covers raw filename fallback and curated title preservation for list, cursor list, and detail reads.
- `shared/contracts/openapi.yaml` - Documents public release `title` as curated-or-neutral, never raw import/file labels.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` - Removes standalone latest-release rendering and delegates to the list.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` - Retitles the list to `Releases zum Fansub` and keeps cursor loading/`Mehr laden`.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx` - Pins the new title and absence of the latest-release block.

## Verification

- `cd backend; go test ./internal/repository -run "Test.*Public.*Release.*Title|Test.*Release.*Title.*Fallback"` - passed.
- PowerShell OpenAPI assertion for `raw import` and `neutral fallback` semantics - passed.
- `npm --prefix frontend run test -- src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx` - passed, 3 tests.
- `npm --prefix frontend run typecheck` - passed.
- `rg -n "Weitere Releases" "frontend/src/app/anime/[id]/group/[groupId]/sections"` - no matches.
- `git diff --check` - passed.

## Decisions Made

- Task 3 live acceptance was not auto-approved. Per explicit user direction, it is deferred to final Plan 102-07 UAT.
- `group_repository_cursor.go` was included because `OlderReleasesList` calls the cursor endpoint; leaving it unchanged would keep the actual public UI path vulnerable to raw-title leakage.
- The old `LatestReleaseSection` file remains in the tree but is no longer imported or rendered by `ReleasesSection`; this plan removed the page composition, not unrelated dead-file cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Included cursor public release list title fallback**
- **Found during:** Task 1.
- **Issue:** The plan-listed files covered `group_repository.go`, but the visible public release section loads via `GetGroupReleasesCursor` in `group_repository_cursor.go`.
- **Fix:** Applied the same `publicReleaseTitleSQL` projection and fansub-group join to the cursor list query.
- **Files modified:** `backend/internal/repository/group_repository_cursor.go`.
- **Verification:** Backend test covers `GetGroupReleasesCursor`; focused frontend test and typecheck passed.
- **Committed in:** `e34bdc16`.

---

**Total deviations:** 1 auto-fixed Rule 2 issue.
**Impact on plan:** Required for correctness/security of the actual public UI path. No new endpoint, migration, media path, or admin mutation scope was introduced.

## Known Stubs

- `backend/internal/repository/group_repository.go:237` contains a pre-existing TODO for future `episode_extras`-backed OP/ED/Karaoke defaults. It was not introduced by this plan and does not affect D-18 title safety or the release-section title cleanup.

Stub scan also matched ordinary empty strings, arrays, JSX attributes, and test literals; none are placeholder UI/data stubs introduced by this plan.

## Threat Flags

None. The plan mitigated T-102-05-01 on existing public DTO reads and did not add new network endpoints, auth paths, file access patterns, schema changes, upload flows, or media ownership surfaces.

## Issues Encountered

- The first OpenAPI edit matched earlier generic `title` fields; it was corrected before commit so only `EpisodeReleaseSummary.title` and `ReleaseDetailResponse.title` document the new semantics.
- The first stub scan command had PowerShell quoting issues; it was rerun with an explicit file array.
- `state.update-progress` reported `Progress field not found in STATE.md`; `roadmap.update-plan-progress` updated the Phase-102 plan count but did not tick the individual `102-05-PLAN.md` checkbox, so the status line was corrected manually, matching the prior 102-04 closeout pattern.
- `state.record-session` reported success through the SDK but did not update the visible Session Continuity lines; those lines were corrected manually to `Completed 102-05-PLAN.md`.
- The working tree still contains unrelated untracked files under `frontend/src/app/admin/dev/` and `tmp/history-event-icons/`. They were not touched, staged, or committed.

## Auth Gates

None.

## Deferred Live UAT

Task 3 live release-section acceptance is deferred to final Phase 102 UAT in Plan 102-07 by explicit user direction: "code mal alles fertig dann testen wir".

Final UAT must still verify:

1. Visible release heading is exactly `Releases zum Fansub`.
2. `Neuestes Release` and `Weitere Releases` are absent from the public project release section.
3. Visible release labels do not contain `.mkv`, `.mp4`, `.avi`, `.m2ts`, `.ass`, slash/backslash paths, or raw import/Jellyfin labels.
4. No admin member Basisdaten editing or version uniqueness behavior was added by this slice.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 102-06 must not start from an assumed live approval of this release-section slice. The code and automated checks are complete; final live acceptance remains parked for Plan 102-07.

## Self-Check: PASSED

- Created file exists: `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-05-SUMMARY.md`.
- Modified files exist: all 8 code/contract files listed above.
- Task commits exist in git history: `e34bdc16`, `cf16b4b0`.
- Required automated checks passed: backend focused test, OpenAPI assertion, focused Vitest test, frontend typecheck, `git diff --check`.
- `STATE.md` advanced to Plan 7 of 8, records Phase 102 P05 metrics and the 102-05 decisions.
- `ROADMAP.md` shows 6/8 Phase-102 plans executed and marks `102-05-PLAN.md` complete.
- Unrelated untracked files remained unmodified and uncommitted.
- Task 3 is documented as deferred to final Plan 102-07 UAT, not approved.

---
*Phase: 102-fansubprojekte-ui-schrittweise-verbessern*
*Completed: 2026-07-14*
