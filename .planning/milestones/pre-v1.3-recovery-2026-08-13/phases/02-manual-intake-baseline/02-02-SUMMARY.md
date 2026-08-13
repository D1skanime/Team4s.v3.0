---
phase: 02-manual-intake-baseline
plan: 02
subsystem: api
tags: [go, gin, validation, admin, anime]
requires:
  - phase: 01-ownership-foundations
    provides: ownership-aware admin create/edit foundation and auditable create path
provides:
  - server-enforced title-plus-cover contract for manual anime create
  - regression coverage for cover-required create validation and manual-only payloads
affects: [phase-02-manual-intake-baseline, admin-create, manual-intake]
tech-stack:
  added: []
  patterns: [server-side create contract enforcement, isolated file-scoped Go verification for blocked package builds]
key-files:
  created: [.planning/phases/02-manual-intake-baseline/02-02-SUMMARY.md]
  modified: [backend/internal/handlers/admin_content_anime_validation.go, backend/internal/handlers/admin_content_test.go]
key-decisions:
  - "Manual anime create now requires a normalized non-empty cover_image in the backend, not only in the UI."
  - "The create contract remains manual-only and continues accepting the existing upload-cover file_name as cover_image."
patterns-established:
  - "Manual create validation must enforce the same minimum contract server-side as the admin UI."
  - "When unrelated cross-agent breakage blocks package-wide Go tests, verify the touched seam with an isolated file-scoped harness and document the blocker."
requirements-completed: [INTK-04, INTK-05, ASST-04]
duration: 19min
completed: 2026-03-24
---

# Phase 02 Plan 02: Manual Create Contract Summary

**Backend manual anime create now enforces normalized `title + cover_image` while preserving the existing uploaded cover filename contract and avoiding Jellyfin coupling.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-03-24T16:04:00+01:00
- **Completed:** 2026-03-24T16:23:12+01:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added Phase 2 regression coverage for required `cover_image`, successful cover preservation, and manual-only create behavior.
- Updated `validateAdminAnimeCreateRequest` to reject missing or whitespace-only `cover_image`.
- Kept the existing create path unchanged beyond validation: `cover_image` still maps directly into `models.AdminAnimeCreateInput`, with no Jellyfin identifiers or branching added.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing Go coverage for the Phase 2 create minimum contract** - `66e3cd5` (`test`)
2. **Task 2: Enforce `title + cover` in backend create validation without broadening scope** - `1b0d396` (`fix`)

## Files Created/Modified
- `backend/internal/handlers/admin_content_test.go` - Added create-validation regressions for required cover, cover preservation, and manual-only payload handling.
- `backend/internal/handlers/admin_content_anime_validation.go` - Requires normalized non-empty `cover_image` and reuses that normalized value in the create input.
- `.planning/phases/02-manual-intake-baseline/02-02-SUMMARY.md` - Captures execution, verification, and deviations for this plan.

## Decisions Made
- Enforced the Phase 2 minimum create contract in the authoritative backend validator so non-UI callers cannot create title-only anime.
- Reused the existing `cover_image` normalization path so the `file_name` returned by `/api/admin/upload-cover` remains valid input without any alternate asset handling.

## Deviations from Plan

None in implementation scope. Verification needed one adjustment because the plan's standard package-wide Go command is currently blocked by unrelated cross-agent compile errors in `backend/internal/services`.

**Total deviations:** 0 auto-fixed
**Impact on plan:** No scope creep. The shipped behavior matches the plan; only verification execution was narrowed to the touched seam.

## Issues Encountered

- `go test ./internal/handlers -run 'TestValidateAdminAnimeCreateRequest' -count=1` currently fails before running handler tests because `backend/internal/services/anime_metadata_backfill.go` references an undefined `repository.AnimeMetadataRepository`.
- To keep this plan isolated and avoid modifying another agent's in-flight work, verification used an isolated file-scoped Go harness against the create-validation seam. That harness produced a clean RED signal before the fix and a clean GREEN signal after it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The backend now matches the Phase 2 UI minimum contract for manual create.
- Full package-wide handler verification should be re-run after the unrelated `internal/services` compile break is resolved.

## Self-Check: PASSED

- Found summary file: `.planning/phases/02-manual-intake-baseline/02-02-SUMMARY.md`
- Found task commit: `66e3cd5`
- Found task commit: `1b0d396`

---
*Phase: 02-manual-intake-baseline*
*Completed: 2026-03-24*
