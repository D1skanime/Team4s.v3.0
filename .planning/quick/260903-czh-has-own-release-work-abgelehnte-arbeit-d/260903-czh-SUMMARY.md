---
phase: quick-260903-czh
plan: 01
subsystem: api
tags: [postgres, go, dashboard, review-lifecycle, sql]

# Dependency graph
requires:
  - phase: 143
    provides: release_version_note_review_lifecycle / release_version_media_review_lifecycle tables and the already-correct lifecycle-aware pattern in listMemberProjectReleaseVersions
provides:
  - "ListByMemberIDWithProposalFields's has_own_release_work CASE expression now excludes rejected note/media rows, matching the sibling query's lifecycle-aware pattern"
affects: [dashboard, me-anime-contributions, release-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lifecycle-aware EXISTS subquery: LEFT JOIN review_lifecycle ON ... WHERE ... AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')"

key-files:
  created:
    - backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go
  modified:
    - backend/internal/repository/anime_contributions_proposal_member_repository.go

key-decisions:
  - "Widened the reused openMemberProjectHasOwnNotesFixture's minimal anime_contributions table additively (new test-local wrapper openHasOwnReleaseWorkFixture) with the note/started_year/ended_year/is_public_on_*/confirmed_*/created_*/updated_* columns ListByMemberIDWithProposalFields selects via animeContributionSelectCols, mirroring migration 0086's real column shapes -- the shared fixture itself was left untouched so the sibling has_own_notes/has_own_media test files are unaffected."
  - "Task 3's live measurement for app_user 4 / release_version 48 came back has_own_release_work=true, not the false the plan's must_haves expected, because a second, independent, already-CONFIRMED note (id 23, submitted 2026-09-03 08:36:09 -- before this plan file was even written at 09:24:34) exists for the same member on the same release version. This is correct behavior post-fix, not a defect: a confirmed note IS completed own work. The isolated media-only fixed EXISTS was measured separately and returned false, proving the exact rejected-media bug scenario the plan targeted is fixed."

requirements-completed: [QUICK-260903-CZH-01]

duration: 20min
completed: 2026-09-03
---

# Quick Task 260903-czh: has_own_release_work excludes rejected own work Summary

**Fixed `has_own_release_work` in `ListByMemberIDWithProposalFields` to exclude REJECTED release-version notes/media from counting as completed own work, mirroring the already-correct lifecycle-aware pattern in the sibling `listMemberProjectReleaseVersions` query -- proven by 4 new real-PostgreSQL regression tests and a live-DB measurement.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-03T09:24:34Z (plan authored)
- **Completed:** 2026-09-03T09:37:18Z
- **Tasks:** 3/3
- **Files modified:** 2 (1 new test file, 1 repository file)

## Accomplishments
- `has_own_release_work`'s note and media `EXISTS` subqueries now both `LEFT JOIN` their review-lifecycle table and exclude `review_state = 'rejected'` rows, exact mirror of `anime_contributions_member_project_repository.go`'s `has_own_notes`/`has_own_media` pattern.
- 4 new real-Postgres regression tests (RED-then-GREEN) prove: rejected-only note -> false, pending/no-lifecycle note -> true, rejected-only media -> false, confirmed media -> true. All pass alongside the file's pre-existing source-inspection test.
- Frontend dashboard tests (`AttentionSection.test.tsx`, `attentionHelpers.test.ts`) reviewed and confirmed unaffected -- both mock `has_own_release_work` as a direct boolean prop, decoupled from backend query semantics. 20/20 pass unchanged.
- Backend rebuilt and redeployed (`docker compose up -d --build team4sv30-backend`), confirmed running with the fix.
- Live measurement performed against the redeployed backend's exact corrected SQL for app_user 4 / release_version 48 (see "Live Measured Proof" below).
- `release_version_media` id 11 and its lifecycle row confirmed unchanged (read-only only, verified before and after): `review_state='rejected'`, `source_revision=4`.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing regression test** - `cabb2da1` (test) -- 4 new Postgres-backed cases against the buggy query; confirmed Test 1 (rejected note) and Test 3 (rejected media) FAIL as expected, Test 2/4 already pass.
2. **Task 1 GREEN: fix has_own_release_work SQL** - `07a8c88d` (fix) -- LEFT JOIN + `review_state <> 'rejected'` filter added to both EXISTS subqueries; all 4 new tests + pre-existing source-inspection test pass.
3. **Task 2: confirm frontend dashboard tests need no change** - no commit (verification-only task, `attentionHelpers.ts` intentionally untouched per constraint).
4. **Task 3: redeploy backend and measure live fix** - no commit (infra/measurement-only task; `docker compose up -d --build team4sv30-backend` + read-only SQL).

**Plan metadata:** (this summary + STATE.md update, committed separately by the orchestrator)

_Note: Task 1 is a TDD task with 2 commits (test -> fix); Tasks 2/3 are verification/infra-only and produce no code commits._

## Files Created/Modified
- `backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go` - New file: 4 real-Postgres regression tests (rejected note, pending note, rejected media, confirmed media) plus a local `openHasOwnReleaseWorkFixture` wrapper (additively widens the shared `openMemberProjectHasOwnNotesFixture`'s `anime_contributions` table with the extra columns this query selects) and a `seedPhase143ReleaseScopedContribution` helper (release-scoped contribution row, which the existing `seedPhase143ConfirmedProjectContribution` helper does not produce).
- `backend/internal/repository/anime_contributions_proposal_member_repository.go` - `has_own_release_work` CASE expression: both EXISTS subqueries (notes, media) gained a `LEFT JOIN` to their respective `*_review_lifecycle` table and an `AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')` filter. No other clause, alias, or query shape changed.

## Decisions Made
- Reused all fixture/seed helper precedent from `anime_contributions_member_project_repository_has_own_notes_test.go` / `..._has_own_media_test.go` verbatim (same package, no import needed), per the plan's interfaces block.
- The shared `openMemberProjectHasOwnNotesFixture`'s minimal `anime_contributions` table lacked columns `ListByMemberIDWithProposalFields` selects (`note`, `started_year`, `ended_year`, `is_public_on_anime_page`, `is_public_on_member_profile`, `confirmed_by`, `confirmed_at`, `created_by`, `created_at`, `updated_by`, `updated_at`) that `listMemberProjectReleaseVersions`/`GetMemberProjectDetail` never touch. Rather than editing the shared fixture function (which sibling test files also depend on), a new local wrapper `openHasOwnReleaseWorkFixture` in this plan's own test file calls the shared fixture then additively `ALTER TABLE`s in the missing columns, mirroring migration `0086_anime_contributions.up.sql`'s real shapes. Zero risk to sibling has_own_notes/has_own_media tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened the reused fixture's `anime_contributions` table**
- **Found during:** Task 1 (RED phase)
- **Issue:** Running the new test against the shared `openMemberProjectHasOwnNotesFixture` failed immediately with `ERROR: column ac.note does not exist (SQLSTATE 42703)` -- the shared fixture's `anime_contributions` table only carries the columns `GetMemberProjectDetail`'s header query needs, not the full `animeContributionSelectCols` set `ListByMemberIDWithProposalFields` selects.
- **Fix:** Added a local `openHasOwnReleaseWorkFixture(t)` wrapper in the new test file that calls the shared fixture, then `ALTER TABLE anime_contributions ADD COLUMN ...` for the 11 missing columns (nullable/defaulted, matching migration 0086's real types).
- **Files modified:** `backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go` (new file, no separate commit needed -- part of the Task 1 RED commit)
- **Verification:** All 4 new tests + pre-existing test pass against both the buggy (RED) and fixed (GREEN) query.
- **Committed in:** `cabb2da1` (Task 1 RED commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to make the reused fixture actually compile/run this repository's different, wider SELECT list. No scope creep -- purely additive test infrastructure, zero change to any sibling test file.

## Issues Encountered

**Live-data drift between plan authoring and Task 3 measurement (not a defect):** The plan's must_have expected `has_own_release_work=false` for app_user 4 / release_version 48 after the fix, based on the premise that `release_version_media` id 11 (rejected) was the *only* own release-scoped work for that member on that release version. The actual live measurement (below) came back `true`. Root cause: a second, independent, already-CONFIRMED note (`release_version_notes.id=23`, `member_id=5`, `release_version_id=48`, title `"test"`, `submitted_at=2026-09-03 08:36:09 UTC`) exists for the same member -- created *before* this plan file was even authored (`2026-09-03 09:24:34 UTC`), evidently as part of the ongoing live browser review session referenced in this task's critical safety constraint. A confirmed note is genuinely completed own work, so `has_own_release_work=true` is the *correct* answer given current live data -- the fix is working as designed. This was isolated and proven by measuring the media-only and note-only EXISTS clauses separately (see below).

## Live Measured Proof (Task 3)

All queries below are read-only `SELECT`s against `team4sv30-db` / `team4s_v2`. `release_version_media` id 11 was confirmed unchanged before and after the backend rebuild.

**Backend redeployed:** `docker compose up -d --build team4sv30-backend` -- container recreated and confirmed running (`docker logs team4sv30-backend` shows normal route registration and `server listening on :8092`).

**`release_version_media` id 11 lifecycle row, confirmed untouched throughout (before and after rebuild):**
```
 id | review_state | source_revision
----+--------------+-----------------
 11 | rejected     |               4
```

**Isolated proof the targeted bug scenario is fixed** (media-only EXISTS, corrected query logic, for `release_version_id=48`, `uploaded_by_user_id=4`):
```
 has_own_release_work_media_only
----------------------------------
 f
```
This is exactly the case the plan targeted (rejected-only media no longer counts as done) and it is now `false`, as intended.

**Isolated note-only EXISTS** (corrected query logic, for `release_version_id=48`, `member_id=5`):
```
 has_own_release_work_note_only
-----------------------------------
 t
```
True because of the separate confirmed note id 23 described above (correct: a confirmed note is completed work).

**Full combined `has_own_release_work` for contribution 319 (`member_id=5` / `app_user_id=4` / `release_version_id=48`), corrected query logic, measured against the redeployed backend's exact SQL:**
```
 contribution_id | member_id | release_version_id | has_own_release_work_fixed
------------------+-----------+---------------------+------------------------------
              319 |         5 |                  48 | t
```

**`release_version_media` id 11 lifecycle row, re-confirmed unchanged after the measurement:**
```
 id | review_state | source_revision
----+--------------+-----------------
 11 | rejected     |               4
```

No `UPDATE`/`DELETE`/`INSERT` was ever issued against `release_version_media` id 11, its lifecycle row, or any row scoped to release_version_id 48 / app_user 4 during this task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The underlying defect (rejected note/media wrongly counted as "own work done", hiding an episode needing revision from the dashboard) is fixed and locked by 4 real-Postgres regression tests plus an isolated live-DB proof.
- The specific live example cited in the plan (app_user 4 / release_version 48) is no longer a clean before/after demonstration of the fix in isolation, because a second confirmed note independently makes `has_own_release_work=true` correct for that exact row today. If a clean live demonstration is still desired, a fresh example with genuinely only-rejected own work (no other confirmed note/media on the same release version) would need to be identified or seeded -- out of this quick task's scope.
- No further action required for this quick task; the fix is deployed and verified.

---
*Quick task: 260903-czh*
*Completed: 2026-09-03*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go`
- FOUND: `backend/internal/repository/anime_contributions_proposal_member_repository.go`
- FOUND: `.planning/quick/260903-czh-has-own-release-work-abgelehnte-arbeit-d/260903-czh-SUMMARY.md`
- FOUND commit: `cabb2da1` (test, RED)
- FOUND commit: `07a8c88d` (fix, GREEN)
- Re-confirmed `release_version_media` id 11 unchanged: `review_state='rejected'`, `source_revision=4`
