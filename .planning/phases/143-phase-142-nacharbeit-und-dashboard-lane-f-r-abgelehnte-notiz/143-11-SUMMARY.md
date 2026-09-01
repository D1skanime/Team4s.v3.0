---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 11
subsystem: database
tags: [postgresql, pgx, go-testing, react, vitest, review-lifecycle]

# Dependency graph
requires:
  - phase: 143
    provides: "143-CONTEXT.md Kriterium 5's exact defect location and lifecycle-join analog (release_version_notes_repository.go's ListReleaseVersionNotesForMember)"
provides:
  - "has_own_notes EXISTS subquery in anime_contributions_member_project_repository.go now excludes rejected release_version_notes via a LEFT JOIN to release_version_note_review_lifecycle"
  - "A hand-assembled Phase-107-style Postgres fixture proving the fix's 3 must_haves (rejected excluded, no-lifecycle included, tombstoned still excluded)"
  - "Frontend regression proof that isDone()/the Offen-Erledigt counter and filters already trust the corrected has_own_notes with zero source change"
affects: [dashboard, me-projects, release-review-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "For repository tests that need the full production JOIN shape of listMemberProjectReleaseVersions/GetMemberProjectDetail, prefer a hand-assembled testsupport.OpenPhase107Postgres fixture (mirroring release_review_query_repository_test.go's openReleaseReviewQueryFixture) over testsupport.OpenPhase139Postgres's full real migration chain -- the full chain's migration 0152 hardcodes an unqualified 'public.unaccent' text-search-dictionary reference that cannot resolve inside OpenPhase139Postgres's isolated, non-'public' per-test schema."

key-files:
  created:
    - backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
  modified:
    - backend/internal/repository/anime_contributions_member_project_repository.go
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"

key-decisions:
  - "Rejected OpenPhase139Postgres's full real migration chain for the new repository test after empirically reproducing a genuine, pre-existing infra defect (migration 0152's hardcoded public.unaccent reference fails against the harness's isolated non-public schema, even against the already-provisioned team4s_phase139_test_r03 database). Used a hand-assembled minimal schema (testsupport.OpenPhase107Postgres + inline CREATE TABLE, matching release_review_query_repository_test.go's established pattern) instead -- out of this plan's scope to fix the migration/harness gap itself."
  - "NULL lifecycle (note never entered review) still counts has_own_notes true; only an explicit review_state = 'rejected' excludes it. No new tombstoned special-casing was added -- the pre-existing rvn.deleted_at IS NULL clause already excludes tombstoned notes, confirmed by reading release_review_cleanup_repository.go's tombstone path (sets deleted_at via COALESCE alongside review_state='tombstoned')."

patterns-established: []

requirements-completed: ["Criterion-5"]

# Metrics
duration: ~30min
completed: 2026-09-01
---

# Phase 143 Plan 11: Rejected Release Note No Longer Counts as "Done" Summary

**Added a `LEFT JOIN release_version_note_review_lifecycle` + `review_state <> 'rejected'` filter to `has_own_notes`'s EXISTS subquery, closing the false-positive "Erledigt" signal a rejected note produced on `/me/projects/{animeId}/group/{fansubGroupId}` — zero frontend source change needed, only a new regression test proving `isDone()` already trusted the corrected value.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-01T21:50:00Z (approx.)
- **Completed:** 2026-09-01T22:20:51Z
- **Tasks:** 2
- **Files modified:** 3 (1 new)

## Accomplishments
- `anime_contributions_member_project_repository.go`'s `has_own_notes` `EXISTS` subquery now joins `release_version_note_review_lifecycle` and excludes rows where `review_state = 'rejected'`; a `NULL` lifecycle (note never submitted for review) still counts as done
- Three new repository tests prove all three must_haves against a real Postgres fixture: rejected note excluded, no-lifecycle note still included, tombstoned note stays excluded via the pre-existing `deleted_at IS NULL` clause (regression guard, no new tombstone-specific logic added)
- New frontend test proves `isDone()`, the "X offen · Y erledigt" counter, and the Offen/Erledigt filter buttons all correctly treat a `has_own_notes: false, has_own_media: false` release (the corrected backend value for a rejected-only note) as open — with zero change to `page.tsx`'s existing `isDone()` function

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the review-state filter to the has_own_notes EXISTS subquery** - `8d9695ba` (fix)
2. **Task 2: Frontend test proving isDone() reflects the corrected has_own_notes** - `562c135a` (test)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_member_project_repository.go` - `has_own_notes` EXISTS subquery gained a `LEFT JOIN release_version_note_review_lifecycle` and a `review_state IS NULL OR review_state <> 'rejected'` filter
- `backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go` (new) - three fixture tests (`TestGetMemberProjectDetailHasOwnNotesExcludesRejectedNote`, `TestGetMemberProjectDetailHasOwnNotesIncludesNoLifecycleNote`, `TestGetMemberProjectDetailHasOwnNotesExcludesTombstonedNote`) plus their seed helpers, against a hand-assembled `testsupport.OpenPhase107Postgres` fixture carrying the real 0135 lifecycle-table DDL
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - one new test case ("treats a release whose only note was rejected as open, not done (Kriterium 5)") proving the counter and both filter buttons honor a `has_own_notes: false` release correctly

## Decisions Made
- Reused `admin_users_contributions_query_test.go`'s seed-helper naming convention (`seedPhase143*`) but built a fully self-contained hand-assembled schema rather than depending on `testsupport.OpenPhase139Postgres`'s full migration chain, after that chain's migration 0152 (`f_unaccent_search_path_fix`) was empirically confirmed to fail inside the isolated per-test schema (`ERROR: text search dictionary "public.unaccent" does not exist`) even against the already-provisioned `team4s_phase139_test_r03` database. This is a genuine pre-existing infra gap (migration 0152 hardcodes `public.unaccent`, assuming schema="public"), out of this plan's scope to fix — logged here as a discovered constraint for future full-migration-chain fixture authors in this codebase, not fixed.
- No `tombstoned` special-casing was added to the SQL, per the plan's explicit instruction and CONTEXT.md's Kriterium 5 confirmation — `release_review_cleanup_repository.go`'s tombstone path sets `deleted_at = COALESCE(deleted_at, $2)` alongside `review_state = 'tombstoned'`, so the pre-existing `rvn.deleted_at IS NULL` clause already excludes tombstoned notes. The new `TestGetMemberProjectDetailHasOwnNotesExcludesTombstonedNote` test locks this as a regression guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker Compose `develop: watch` sync was not active; the backend container ran stale code**
- **Found during:** Task 1 verification
- **Issue:** `go test -list` found zero tests matching the new test file even after editing on the host, because `team4sv30-backend` has no bind-mounted source volume (only `develop.watch` sync, which requires `docker compose watch` to be running) — matching the operational note in this plan's prompt.
- **Fix:** Used `docker cp` to copy the edited repository file and new test file directly into the running container before each verification run.
- **Files modified:** none (operational workaround only)
- **Verification:** `go test -list` and subsequent `-run` invocations found and ran the new tests after `docker cp`.
- **Committed in:** n/a (host files were already correct; only the container's stale copy needed syncing)

**2. [Rule 3 - Blocking] `testsupport.OpenPhase139Postgres`'s full migration chain fails on a genuinely fresh isolated schema due to migration 0152's hardcoded `public.unaccent` reference**
- **Found during:** Task 1, first test-writing attempt
- **Issue:** The pattern map (`143-PATTERNS.md`) suggested using `OpenPhase139Postgres`'s full real migration chain for this repository test. Running it surfaced two sequential failures: (a) `CREATE EXTENSION IF NOT EXISTS unaccent` inside an isolated non-`public` schema either creates the extension objects inside that isolated schema (fine) or, if `public.unaccent` was pre-provisioned by a prior manual step, silently no-ops and leaves the isolated schema's `unaccent(...)` calls unresolvable; (b) migration `0152_f_unaccent_search_path_fix.up.sql` hardcodes `public.unaccent` in `f_unaccent`'s function body regardless of which schema actually holds the extension, so it fails with `ERROR: text search dictionary "public.unaccent" does not exist` whenever the isolated test schema (not literally named `public`) is the one holding the extension. This reproduced against the already-provisioned `team4s_phase139_test_r03` fixture database, confirming it is not specific to a database I created.
- **Fix:** Switched the new repository test file to `testsupport.OpenPhase107Postgres` plus a hand-assembled minimal schema (mirroring the already-established `release_review_query_repository_test.go` pattern), which never touches the `unaccent`/search-foundation migrations at all.
- **Files modified:** `backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go` (written directly against this fixture; no separate revert needed since this was discovered before the file was committed)
- **Verification:** All three new tests pass against `team4s_phase107_test_run143` (already-provisioned per 143-09-SUMMARY.md).
- **Committed in:** `8d9695ba`

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues, neither an architectural change to the plan's actual fix)
**Impact on plan:** Zero change to the plan's intended behavior or acceptance criteria; both deviations are test-infrastructure workarounds needed to actually run and verify the fix. The `OpenPhase139Postgres` full-migration-chain gap (deviation 2) is a real, reproducible, pre-existing infra defect that will resurface for any future test author who reaches for that harness in an isolated schema — worth a dedicated follow-up (either qualify migration 0152's dictionary reference more robustly, e.g. via `pg_catalog.set_config`-aware resolution, or document the constraint in `phase139_postgres.go`'s doc comment).

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Criterion-5 is closed: a rejected release note no longer makes a release count as "Erledigt" on either the backend (`has_own_notes`) or the frontend (`isDone()`, the counter, and both filter buttons).
- The `OpenPhase139Postgres` + migration-0152 gap discovered during this plan is not fixed and not blocking any other Phase 143 work observed so far, but is a real landmine for any future plan reaching for that harness against an isolated schema — flagged above for a possible follow-up.
- No blockers for subsequent Phase 143 plans.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*
