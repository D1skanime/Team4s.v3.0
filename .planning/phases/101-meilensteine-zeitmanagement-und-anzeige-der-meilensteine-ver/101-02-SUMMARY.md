---
phase: 101-meilensteine-zeitmanagement-und-anzeige-der-meilensteine-ver
plan: "02"
subsystem: api
tags: [go, react, validation, fansub-groups, milestones]

requires:
  - phase: 101-01
    provides: staged milestone selector and YearPicker min/max bounds
provides:
  - frontend pre-submit milestone year validation
  - backend create/update guards for founded-year and current-year bounds
  - source-inspection regression coverage for backend year guard behavior
affects: [fansub-group-history, milestone-save-validation, group-history-form]

tech-stack:
  added: []
  patterns:
    - "Backend optional year patch validation only inspects non-null **int payloads"
    - "History year validation stays in the existing handler/repository seam"

key-files:
  created: []
  modified:
    - frontend/src/components/groups/GroupHistorySection.tsx
    - backend/internal/handlers/fansub_group_history_handler.go
    - backend/internal/repository/fansub_group_history_repository.go
    - backend/internal/handlers/fansub_group_history_handler_test.go

key-decisions:
  - "Explicit null years remain valid on update; only submitted non-null years are bounded."
  - "No request or response shape changed, so frontend calls continue through the existing api.ts helpers."

patterns-established:
  - "Group history direct-write guards should return 422 with the same German messages the UI shows locally."
  - "Concrete-repository handler tests remain source-inspection tests until the handler has an interface seam."

requirements-completed:
  - "Phase 101 D-01"
  - "Phase 101 D-02"

duration: 5min
completed: 2026-07-13
---

# Phase 101 Plan 02: Save-Validierung und Backend-Jahresguard Summary

**Frontend and backend milestone year guards for founded-year/current-year bounds**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-13T08:37:09Z
- **Completed:** 2026-07-13T08:41:47Z
- **Tasks:** 4 completed
- **Files modified:** 4 implementation/test files

## Accomplishments

- Added local `GroupHistorySection` save validation so invalid milestone years are rejected before `createGroupHistory` or `updateGroupHistory` runs.
- Added `GetFansubFoundedYear` and `validateGroupHistoryYear` so direct backend create/update writes reject `year < founded_year` and `year > current year`.
- Preserved explicit `year: null` on update by only validating `req.Year != nil && *req.Year != nil`.
- Added focused backend source-inspection regression coverage for the new guard and ran the required frontend/backend checks.

## Task Commits

1. **Task 1: Add frontend pre-submit year validation** - `c38d4cc0` (feat)
2. **Task 2: Add backend founded/future year validation guard** - `7cc34e15` (feat)
3. **Task 3: Cover backend invalid year guards** - `b2060e8f` (test)
4. **Task 4: Run checks and prepare live UAT on :3000** - no code changes, no task commit needed

## Files Created/Modified

- `frontend/src/components/groups/GroupHistorySection.tsx` - Rejects pre-founding and future milestone years before the central API helper call.
- `backend/internal/handlers/fansub_group_history_handler.go` - Adds the save-time year guard and wires it into create/update while allowing explicit null years.
- `backend/internal/repository/fansub_group_history_repository.go` - Adds founded-year lookup from `fansub_groups`.
- `backend/internal/handlers/fansub_group_history_handler_test.go` - Adds `TestGroupHistoryYearValidation`.

## Decisions Made

- Explicit null years remain valid because optional timeline entries are still allowed by the domain model.
- The backend guard uses the URL `fansubID` already validated by existing handlers; no new route, DTO, or auth seam was introduced.
- Shared OpenAPI shape was not changed because requests and responses stayed the same and errors still use the existing project error envelope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The root command `go test ./backend/internal/handlers ./backend/internal/repository` cannot run because `go.mod` lives in `backend/`. The equivalent module command `go test ./internal/handlers ./internal/repository` passed from `backend/`.

## TDD Gate Compliance

- Task 3 was marked `type="tdd"`, but the plan orders backend implementation in Task 2 before the test task. A true RED commit was therefore not possible without reverting completed task work. Coverage was added as a test-only commit following the existing source-inspection test style.

## Known Stubs

None. Stub scans found no TODO/FIXME/placeholder text; broad empty-literal hits were normal assignments, existing optional-null logic, or test strings.

## Authentication Gates

None.

## Verification

- `npm --prefix frontend test -- GroupHistorySection.test.ts GroupHistoryForm.test.tsx` - passed, 47 tests
- `npm --prefix frontend run typecheck` - passed
- `go test ./backend/internal/handlers ./backend/internal/repository` - not applicable from repo root; root is not the Go module
- `go test ./internal/handlers ./internal/repository` from `backend/` - passed
- `git diff --check` - passed
- `node -e "fetch('http://127.0.0.1:3000')..."` - passed, HTTP 200

## Live UAT Notes

Use `http://127.0.0.1:3000/admin/fansubs/{id}/edit`, then open `Historie & Erfolge` / `Meilensteine`.

- No founding year: only locked `Gründung` should be visible.
- Founded year: `Gründung`, `Erstes Projekt`, and `Erstes Release` should be visible.
- Both first entries exist: the full catalog should appear behind the existing per-achievement rules.
- Year picker lower bound should be the founding year; upper bound should be the current calendar year.

## Next Phase Readiness

Phase 101 is complete from an implementation standpoint. Remaining validation is user-facing live UAT on the route above.

## Self-Check: PASSED

- Found all modified implementation/test files.
- Found all task commits: `c38d4cc0`, `7cc34e15`, `b2060e8f`.
- Confirmed `101-02-SUMMARY.md` exists in the phase directory.

---
*Phase: 101-meilensteine-zeitmanagement-und-anzeige-der-meilensteine-ver*
*Completed: 2026-07-13*
