---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 08
subsystem: api
tags: [go, postgres, pgx, gin, fansub-groups, delete-guard, permissions]

# Dependency graph
requires:
  - phase: 187
    provides: "release_version_group_guard.go's DependencySummary/GermanReasonFragment/GroupHasDependentsError triad (Phase-187 guard pattern)"
provides:
  - "FansubGroupDependencySummary + countFansubGroupDependents (18 FK-verified categories, one QueryRow with scalar subqueries)"
  - "DeleteGroup pre-check: blocks deletion of any fansub group with a real dependent, returns *FansubGroupHasDependentsError before any transaction/DELETE runs"
  - "DeleteFansub 409 translation with a German, per-category, non-zero-only message (code fansub_group_has_dependents)"
  - "testsupport.OpenPhase189Postgres real-Postgres fixture for fansub-group-wide dependents testing"
affects: [189-05, fansub-admin-delete-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Group-scoped (not release-version-scoped) dependents summary, parallel to Phase-187's pair-scoped DependencySummary, sharing germanPluralCount/dependentsQueryRower"
    - "GermanReasonFragment that lists only non-zero categories (vs. the always-list-all-3 Phase-187 variant) once category count grows past a handful"

key-files:
  created:
    - backend/internal/repository/fansub_repository_groups_query.go
    - backend/internal/repository/fansub_repository_groups_hydrate.go
    - backend/internal/repository/fansub_repository_groups_delete.go
    - backend/internal/repository/fansub_repository_groups_delete_test.go
    - backend/internal/testsupport/phase189_postgres.go
    - backend/internal/handlers/fansub_groups_test.go
  modified:
    - backend/internal/repository/fansub_repository_groups.go
    - backend/internal/repository/fansub_repository_test.go
    - backend/internal/repository/release_version_group_guard.go
    - backend/internal/repository/errors.go
    - backend/internal/handlers/fansub_groups.go

key-decisions:
  - "FansubGroupDependencySummary ends up with 18 categories, not 19 as RESEARCH.md/the plan's own interfaces section listed -- fansub_collaboration_members was dropped from the live schema by migration 0102 (Phase 81, D-02) long before this phase, confirmed by live curl verification against the real team4s_v2 backend, not merely planning-stage research."
  - "GermanReasonFragment lists only non-zero categories (deliberate deviation from the Phase-187 pattern's always-list-all-3 convention), documented in a doc comment -- 18 always-listed zeros would be unreadable."
  - "DeleteFansub's existing requireAdmin gate already requires platform-admin for every caller before this plan's change -- no admin-bypass branch was introduced around the new dependents check, satisfying D-12's 'gilt auch für Plattform-Admins' by construction."

requirements-completed: [D-12]

duration: ~80min
completed: 2026-10-20
---

# Phase 189 Plan 08: Fansub-Gruppen-Lösch-Sperre Summary

**Delete-lock for fansub groups: 18 FK-verified dependent categories counted in one query, returning a 409 with a German per-category message instead of silent CASCADE or a raw, uncaught FK error — applies identically to platform admins.**

## Performance

- **Duration:** ~80 min
- **Tasks:** 3 planned + 1 critical post-hoc bug fix (found via mandatory live verification)
- **Files modified/created:** 11

## Accomplishments
- `fansub_repository_groups.go` (771 lines, over the 450-line limit) split into 4 files as a pure-refactor commit first, per CLAUDE.md — zero behavior change, all 4 files ≤450 lines.
- `FansubGroupDependencySummary` + `countFansubGroupDependents` added to `release_version_group_guard.go`, extending the Phase-187 guard pattern with a new, group-scoped (not release-version-scoped) type, reusing `germanPluralCount`/`dependentsQueryRower` as-is.
- `DeleteGroup` now pre-checks every real dependent BEFORE opening any transaction or issuing any `DELETE`, returning `*FansubGroupHasDependentsError` when blocked — unconditionally, with no admin-bypass branch.
- `DeleteFansub` translates the new error into a 409 with a German, non-zero-only message and `code: "fansub_group_has_dependents"`, mirroring `episode_version_update.go`'s existing 409 pattern exactly.
- A real production bug was found and fixed during mandatory live verification: the plan's own dependents list (and RESEARCH.md) included `fansub_collaboration_members`, a table migration `0102_drop_collaboration_schema.up.sql` (Phase 81) had already dropped from the live schema. Without this fix, every single `DeleteGroup` call — including the empty-group success case — would have hard-failed with a raw 500 `relation "fansub_collaboration_members" does not exist`. Caught by curl-testing the real creation+deletion path against the live backend, not by the unit tests alone (which used a hand-rolled fixture that happily included the stale table).

## Task Commits

1. **Task 1: Pure-refactor split of fansub_repository_groups.go** - `7d5c6ed43` (refactor)
2. **Task 2: FansubGroupDependencySummary + countFansubGroupDependents + DeleteGroup pre-check** - `9d6187cf7` (feat)
3. **Task 3: DeleteFansub 409 translation** - `9b9062723` (feat)
4. **Post-hoc fix: two more self-inspecting tests pointed at the wrong split file** - `a5d950f1d` (fix)
5. **Post-hoc fix: remove fansub_collaboration_members (dropped by migration 0102, confirmed live)** - `1d161f650` (fix)

_Note: steps 4-5 were found by the full `scripts/test-backend.sh` run and by mandatory live curl verification respectively — both are Rule 1 auto-fixes (broken code found during this plan's own execution scope), not new commits outside the task_commit_protocol._

## Files Created/Modified
- `backend/internal/repository/fansub_repository_groups.go` - trimmed to `ListGroups`/`CreateGroup`/`GetGroupByID`/`GetGroupBySlug`/`UpdateGroup` (394 lines)
- `backend/internal/repository/fansub_repository_groups_query.go` - `buildFansubGroupWhere`, `fansubRowScanner`, `scanFansubGroup` (85 lines)
- `backend/internal/repository/fansub_repository_groups_hydrate.go` - `attachGroupCounts`/`attachGroupLinks`/`attachGroupAliases`/`hydrateFansubGroup`/`populateCountMap`/`applyLegacyLinkProjection`/`firstLinkURL` (291 lines)
- `backend/internal/repository/fansub_repository_groups_delete.go` - `DeleteGroup`, now pre-checking dependents (56 lines)
- `backend/internal/repository/fansub_repository_test.go` - 3 self-inspecting tests repointed at the new split files (DeleteGroup, attachGroupCounts x2)
- `backend/internal/repository/release_version_group_guard.go` - `FansubGroupDependencySummary`, `HasAny`, `GermanReasonFragment`, `countFansubGroupDependents` (18 categories)
- `backend/internal/repository/errors.go` - `ErrFansubGroupHasDependents`/`FansubGroupHasDependentsError`
- `backend/internal/repository/fansub_repository_groups_delete_test.go` - 6 real-Postgres tests (empty/all-18-categories/excluded-tables/non-pending-invitations/block/success)
- `backend/internal/testsupport/phase189_postgres.go` - `OpenPhase189Postgres`, 14 trimmed stand-in tables on top of `OpenPhase187Postgres`
- `backend/internal/handlers/fansub_groups.go` - `DeleteFansub` 409 branch, no admin-bypass
- `backend/internal/handlers/fansub_groups_test.go` - 3 real-Postgres+httptest tests (409/404/204)

## Decisions Made
- **18, not 19, dependent categories.** `fansub_collaboration_members` was removed from the plan's scope entirely after live verification proved the table no longer exists (migration 0102, Phase 81, D-02) — see Deviations below.
- **`GermanReasonFragment` only lists non-zero categories**, documented as a deliberate deviation from Phase-187's always-list-all-3 convention (18 always-listed zeros would be unreadable noise).
- **No admin-bypass branch anywhere near the new check** — `requireAdmin` already gates every caller identically, satisfying D-12 by construction rather than by an explicit new check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two more self-inspecting tests still pointed at `fansub_repository_groups.go` after Task 1's split**
- **Found during:** The full `scripts/test-backend.sh` run after all 3 tasks were committed (targeted per-task test runs during Task 1 did not cover these two tests).
- **Issue:** `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers` and `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime` both do `os.ReadFile("fansub_repository_groups.go")` and search for `attachGroupCounts`, which Task 1 moved to `fansub_repository_groups_hydrate.go`.
- **Fix:** Repointed both `os.ReadFile` targets at `fansub_repository_groups_hydrate.go`, mirroring the `DeleteGroup` self-inspecting test fix already made in Task 1.
- **Files modified:** `backend/internal/repository/fansub_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run TestAttachGroupCounts -v` passes; full suite re-run GREEN.
- **Committed in:** `a5d950f1d`

**2. [Rule 1 - Bug] `fansub_collaboration_members` does not exist in the live schema**
- **Found during:** Mandatory live verification (CONTEXT.md/operational constraints) — creating a real test fansub group via the real admin creation endpoint, then deleting it via the real `DELETE /fansubs/:id` endpoint against the live `team4sv30-backend` container.
- **Issue:** `DeleteGroup`'s pre-check queried `fansub_collaboration_members`, a table `database/migrations/0102_drop_collaboration_schema.up.sql` (Phase 81, D-02) already dropped — along with `fansub_groups.group_type` — long before this phase. 189-RESEARCH.md's dependents table checked migration 0015 (the table's `CREATE`) but missed migration 0102 (the table's later `DROP`); a pre-existing test in `episode_import_repository_test.go` already documents this exact removal elsewhere in the codebase. Every live `DELETE /fansubs/:id` call — including the zero-dependents success case — failed with a raw 500 `relation "fansub_collaboration_members" does not exist`, the exact class of bug this plan exists to eliminate, reintroduced by the plan itself.
- **Fix:** Removed `CollaborationMemberships` entirely from `FansubGroupDependencySummary`, `countFansubGroupDependents`'s SQL/Scan, `GermanReasonFragment`'s candidate list, and the `fansub_collaboration_members` stand-in table from `testsupport/phase189_postgres.go` and the repository test. 18 categories remain (all independently confirmed to exist in the live `team4s_v2` schema via a read-only `\dt` check before and after the fix).
- **Files modified:** `backend/internal/repository/release_version_group_guard.go`, `backend/internal/testsupport/phase189_postgres.go`, `backend/internal/repository/fansub_repository_groups_delete_test.go`
- **Verification:** All 6 repository tests + 3 handler tests re-ran green; `scripts/test-backend.sh` full suite GREEN (exit 0); live re-verification: created `Phase189-Testgruppe-Loeschsperre` (id 151) via the real `POST /fansubs` endpoint, deleted it via the real `DELETE /fansubs/:id` endpoint — `204 No Content`, row gone. Read-only SQL against a real, non-empty bestandsgruppe (`New-Subs`, id 1 — 13 Releases, 6 Memberships, 97 Contributions, 11 historical members, 75 review decisions, 335 review audit events) confirmed the exact production query executes without error and returns correct non-zero counts, WITHOUT any mutation against that group.
- **Committed in:** `1d161f650`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs found and fixed within this plan's own execution scope, not pre-existing/out-of-scope issues)
**Impact on plan:** Both fixes were necessary for correctness; the second one is the more significant finding — it proves the value of this plan's own "confirm live before trusting research" operational constraint, since the bug would have shipped completely undetected by the automated test suite alone (the hand-rolled testsupport fixture happily created a table that production no longer has).

## Issues Encountered
- `FansubHandler`'s `fansubRepo`/`authzRepo` fields are concrete repository types, not interfaces, so `DeleteFansub`'s 409 path could not be unit-tested with a hand-rolled fake repository (the plan's `<behavior>` section assumed a stubbable `fansubRepo.DeleteGroup`). Resolved by testing against a real `testsupport.OpenPhase189Postgres` fixture end-to-end via `httptest`+`gin.Engine`, matching this package's existing precedent (`fansub_media_upload_namespace_test.go`). Required adding one extra stand-in table (`app_user_global_roles`, the real migration 0072 shape) to the Task 2-created fixture, outside this task's originally-declared file list — documented here as a Rule 3 (blocking test infrastructure) auto-fix rather than a separate deviation entry since it was mechanical and necessary to execute the test at all.
- `gin.Context.Status(http.StatusNoContent)` without a body write never flushes the header when calling a handler method directly on a bare `gin.CreateTestContext` — the empty-group success test initially misreported 204 as 200. Fixed by routing the test through a real `gin.Engine`+`router.ServeHTTP`, which properly flushes headers at the end of the middleware chain.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-12 is fully implemented, tested (6 repository + 3 handler tests, all against real Postgres), and live-verified. The replacement correction path (reassign release's group via the editor, then delete the now-empty wrong group) from Phase 187 is now safe against silently orphaning real data.
- No blockers for Wave 2 (189-05, 189-06), which depend on Wave 1 completing — 189-08 was the last Wave-1 plan; 189-01 through 189-04 were already complete.
- Full backend test suite (`scripts/test-backend.sh`) is GREEN after this plan. Backend container rebuilt and healthy with the final, bug-fixed code.

## Self-Check: PASSED

All 12 claimed files verified present on disk; all 5 claimed commit hashes verified present in `git log --oneline --all`.

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
