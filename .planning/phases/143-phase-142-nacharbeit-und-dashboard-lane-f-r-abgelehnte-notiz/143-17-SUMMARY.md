---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 17
subsystem: database
tags: [postgresql, pgx, go-testing, openapi, typescript, review-lifecycle]

# Dependency graph
requires:
  - phase: 143
    provides: "143-11's corrected has_own_notes EXISTS subquery (Kriterium 5) and its has_own_notes_test.go seed-helper fixture"
provides:
  - "has_own_rejected_notes EXISTS subquery in anime_contributions_member_project_repository.go, sourced from an INNER JOIN to release_version_note_review_lifecycle filtering review_state = 'rejected'"
  - "MeProjectReleaseVersion.has_own_rejected_notes required boolean synced across openapi.yaml and contributions.ts"
affects: [dashboard, me-projects, release-review-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "For a review-state-derived boolean that requires a lifecycle row to exist (as opposed to has_own_notes' 'absence of rejection' semantics), use an INNER JOIN to release_version_note_review_lifecycle rather than has_own_notes' LEFT JOIN -- a rejected state cannot exist without a lifecycle row."

key-files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_member_project_repository.go
    - backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/contributions.ts
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"

key-decisions:
  - "has_own_rejected_notes uses an INNER JOIN (not LEFT JOIN like has_own_notes) to release_version_note_review_lifecycle, since a 'rejected' state is only representable when a lifecycle row exists -- a note with no lifecycle row can never be has_own_rejected_notes=true."
  - "Reused the existing anime_contributions_member_project_repository_has_own_notes_test.go fixture and all seed helpers (seedPhase143Member/AppUser/Anime/FansubGroup/ConfirmedProjectContribution/Episode/ReleaseVersion/ContributorRole/ReleaseVersionNote/NoteReviewLifecycle) verbatim; new tests only add new unique ID ranges (114xxx/115xxx/116xxx) to avoid collision with the existing 111xxx/112xxx/113xxx has_own_notes tests."
  - "Zero change to page.tsx rendering in this plan -- has_own_rejected_notes flows through the contract only; frontend consumption of the new field is 143-18's scope."

patterns-established: []

requirements-completed: ["UAT-02"]

# Metrics
duration: ~15min
completed: 2026-09-02
---

# Phase 143 Plan 17: Add has_own_rejected_notes Backend/Contract Signal Summary

**Added a new `has_own_rejected_notes` EXISTS subquery (INNER JOIN to `release_version_note_review_lifecycle` on `review_state = 'rejected'`), flowing through the Go struct's JSON tag, `openapi.yaml`, and `contributions.ts`, closing the backend/contract half of UAT-02 without touching any rendered UI.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-02T08:29:15Z (approx., first task commit at 08:31:28Z)
- **Completed:** 2026-09-02T08:32:14Z
- **Tasks:** 2 completed
- **Files modified:** 5

## Accomplishments
- `anime_contributions_member_project_repository.go`'s `listMemberProjectReleaseVersions` query gained a new `has_own_rejected_notes` `EXISTS` subquery alongside the existing `has_own_notes`/`has_own_media` clauses, requiring an `INNER JOIN` to `release_version_note_review_lifecycle` (a rejected state requires a lifecycle row to exist, unlike `has_own_notes`' `LEFT JOIN`)
- `MemberProjectReleaseVersionRow` gained `HasOwnRejectedNotes bool` with JSON tag `has_own_rejected_notes`, scanned immediately after `has_own_media`
- Three new proving tests confirm the field is `true` only for a rejected-only note (and complementary to `has_own_notes=false` on the same row), `false` for a confirmed note, and `false` for a tombstoned note (via the pre-existing `deleted_at IS NULL` clause, no new tombstone-specific logic)
- `shared/contracts/openapi.yaml`'s `MeProjectReleaseVersion` schema and `frontend/src/types/contributions.ts`'s matching interface both declare `has_own_rejected_notes` as a required boolean
- The sole TS object-literal factory constructing `MeProjectReleaseVersion` values (`makeRelease` in the `/me/projects` page test file) was updated so `tsc --noEmit` stays clean; zero change to `page.tsx`'s rendering logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Add has_own_rejected_notes to the repository query, struct, and tests** - `bc5e1d14` (feat)
2. **Task 2: Sync the OpenAPI contract and TypeScript type** - `291d233d` (docs)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_member_project_repository.go` - new `has_own_rejected_notes` EXISTS subquery (INNER JOIN to `release_version_note_review_lifecycle`, `review_state = 'rejected'`), new `HasOwnRejectedNotes` struct field, new `Scan` target
- `backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go` - three new tests (`TestGetMemberProjectDetailHasOwnRejectedNotesTrueForRejectedOnlyNote`, `...FalseForConfirmedNote`, `...FalseForTombstonedNote`), reusing all existing seed helpers with new 114xxx/115xxx/116xxx ID ranges
- `shared/contracts/openapi.yaml` - `MeProjectReleaseVersion.required` gained `has_own_rejected_notes`; new `has_own_rejected_notes: { type: boolean }` property
- `frontend/src/types/contributions.ts` - `MeProjectReleaseVersion` interface gained `has_own_rejected_notes: boolean;`
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - `makeRelease`'s default object gained `has_own_rejected_notes: overrides.has_own_rejected_notes ?? false,`

## Decisions Made
- Used an `INNER JOIN` (not `LEFT JOIN`) for the new subquery's lifecycle join, since `has_own_rejected_notes` can only ever be true when a lifecycle row with `review_state = 'rejected'` exists — no `IS NULL` fallback branch is meaningful for this flag, unlike `has_own_notes`.
- Placed the new struct field and SQL column immediately after `has_own_media` (matching the plan's literal instruction), keeping the existing `has_own_notes`/`has_own_media` fields and their locked Kriterium-5 semantics completely untouched.
- Test fixture reused every existing seed helper from `anime_contributions_member_project_repository_has_own_notes_test.go` verbatim — no new seeding logic, only new unique ID ranges to avoid collision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker Compose backend container has no live source bind-mount; `docker cp` needed to sync edited files before verification**
- **Found during:** Task 1 verification
- **Issue:** `team4sv30-backend` (per `docker-compose.override.yml`) relies on `develop: watch` file sync, which requires an actively running `docker compose watch` process — not running in this session. Host edits to the two backend Go files were therefore invisible to `docker compose exec team4sv30-backend go build/go test` until synced. This matches the exact same gap already documented and worked around in Plan 143-11's SUMMARY.
- **Fix:** Used `docker compose cp` to copy the edited repository file and test file into the running container before each `go build`/`go test` invocation. After running `gofmt -w` inside the container (which reformatted the pre-existing struct's field alignment to accommodate the new, longer `HasOwnRejectedNotes` field name), copied the gofmt'd file back out to the host with `docker compose cp` so host and container stay byte-identical.
- **Files modified:** none beyond the plan's own two backend files (operational sync workaround only; final content was already the correct code, gofmt only realigned existing struct-tag whitespace)
- **Verification:** `go build ./...` and `go test ./internal/repository/... -run TestGetMemberProjectDetail -v` both ran successfully against host-identical container content afterward.
- **Committed in:** `bc5e1d14` (host files, already correct)

**2. [Rule 3 - Blocking] `TEAM4S_PHASE107_TEST_DSN` not set by default in the backend container's environment**
- **Found during:** Task 1 verification
- **Issue:** Running the new tests without the env var caused all three to report `SKIP` (`TEAM4S_PHASE107_TEST_DSN is not set; skipping PostgreSQL integration test`) rather than actually running — a false-green result that would have hidden a real bug.
- **Fix:** Passed the DSN inline to each `docker compose exec` test invocation, pointing at the already-provisioned `team4s_phase107_test_run143` fixture database (created in Plan 143-09, confirmed present via `psql -lqt`, and already reused by Plan 143-11's identical test file). Both the existing `has_own_notes` tests and the three new `has_own_rejected_notes` tests are schema-isolated per test run (`CREATE SCHEMA`/`DROP SCHEMA CASCADE`), so reuse is safe.
- **Files modified:** none (operational workaround only)
- **Verification:** All 6 tests in the file (`TestGetMemberProjectDetail*`) reported `PASS`, not `SKIP`, confirming they actually exercised real Postgres.
- **Committed in:** n/a (no file change; environment-only)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking test-infrastructure issues, neither an architectural change to the plan's intended fix). Both mirror deviations already documented and accepted in Plan 143-11's SUMMARY for the same test file/harness.
**Impact on plan:** Zero change to the plan's intended behavior, SQL shape, struct shape, or contract shape. Both deviations are operational workarounds required to actually build/run/verify the change in this session's Docker environment.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend/contract half of UAT-02 is closed: `has_own_rejected_notes` flows from a new, tested repository `EXISTS` subquery through the Go struct's JSON tag, `openapi.yaml`, and the TypeScript type, with `tsc --noEmit` clean and zero rendered-UI change.
- This was the last Wave-1 plan in Phase 143. Plan 143-18 (frontend rendering half of UAT-02, distinguishing "Offen" from "Überarbeitung nötig" using this new field) depends directly on this plan's contract and can now proceed.
- No blockers.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: backend/internal/repository/anime_contributions_member_project_repository.go
- FOUND: backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
- FOUND: shared/contracts/openapi.yaml
- FOUND: frontend/src/types/contributions.ts
- FOUND: frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
- FOUND commit: bc5e1d14
- FOUND commit: 291d233d
