---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 03
subsystem: database
tags: [postgres, pgx, go, release-versions, fansub-groups, dependents-guard, episode-import]

# Dependency graph
requires:
  - phase: 187-01
    provides: "DependencySummary, countReleaseVersionGroupDependents, queryCurrentReleaseVersionGroupIDs, diffRemovedReleaseVersionGroupIDs, ensureReleaseVersionGroupsNotReducedToEmpty, ensureRemovedReleaseVersionGroupsHaveNoDependents, ErrGroupHasDependents/ErrReleaseVersionGroupsEmpty/GroupHasDependentsError"
  - phase: 187-02
    provides: "syncEpisodeVersionSelectedGroups as the editor-path precedent for the same guard-wiring shape"
provides:
  - "episode_import_repository_release_groups.go: upsertReleaseVersionGroup (guard-wired), ensureAnimeFansubGroupLinksForMembers, buildAnimeFansubLinkGroupIDs -- extracted out of the over-450-line episode_import_repository_release_helpers.go"
  - "upsertReleaseVersionGroup calls the Plan-01 guard before any DELETE/INSERT: empty-reduction rejection (D-06/D-14) and dependents-having-replace rejection (D-01/D-07/D-08/D-09/D-12), with the same-group-update/add-only exception falling out of diffRemovedReleaseVersionGroupIDs' set difference -- no isImportPath-style branching"
affects: [187-04, 187-05, 187-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import-path group-write guard reuses the exact Plan-01/Plan-02 call sequence (queryCurrentReleaseVersionGroupIDs -> ensureReleaseVersionGroupsNotReducedToEmpty -> diffRemovedReleaseVersionGroupIDs -> ensureRemovedReleaseVersionGroupsHaveNoDependents), proving D-12's narrower-than-editor behavior is a structural consequence of the shared set-diff, not a divergent exception"

key-files:
  created:
    - backend/internal/repository/episode_import_repository_release_groups.go
    - backend/internal/repository/episode_import_repository_release_groups_test.go
  modified:
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_import_repository_test.go
    - backend/internal/repository/episode_version_repository_write_helpers_test.go

key-decisions:
  - "Moving only upsertReleaseVersionGroup out of episode_import_repository_release_helpers.go left it at 468 lines (still over the 450-line limit) -- also moved ensureAnimeFansubGroupLinksForMembers and buildAnimeFansubLinkGroupIDs into the new file, a thematically coherent grouping (all three deal with writing release-version/anime group relationships), bringing the helpers file to 423 lines"
  - "That additional move broke a third, pre-existing source-grep test the plan did not anticipate (TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup in episode_version_repository_write_helpers_test.go, Phase 81's own D-03) -- deleted as superseded by TestBuildAnimeFansubLinkGroupIDs_IsIdempotentAcrossRepeatedApply, which already proves the flat-signature claim by compiling against it, per the same CLAUDE.md Teststil rule the plan applied to its own two anticipated breaks"
  - "The new Task-2 test fixture extends openEpisodeImportSourceFixture (Phase-117-based) additively with hand-rolled trimmed point_rules/point_ledger_entries stand-ins before applying real migration 0137, rather than switching to the lighter testsupport.OpenPhase187Postgres -- migration 0137 needs those two tables to pre-exist (FK target + seed INSERT) but Phase-117's base does not create them (unlike Phase-107, which Plan 01's own fixture builds on via migrations 0131-0133); upsertReleaseVersionGroup also needs the fuller episode/anime/release-graph chain only the Phase-117-based fixture already provides"

patterns-established:
  - "diffRemovedReleaseVersionGroupIDs' set-difference is now proven to unify BOTH write paths (editor D-07/no-partner-exception and import D-12/same-group-and-add-exception) with the identical, unparameterized guard call sequence"

requirements-completed: [D-06, D-07, D-12, D-14]

# Metrics
duration: ~35min
completed: 2026-10-19
---

# Phase 187 Plan 03: Gruppenwechsel-Import-Guard-Verdrahtung Summary

**Import "Übernehmen"-Pfad (`upsertReleaseVersionGroup`) wendet jetzt denselben Plan-01-Dependents-Guard wie der Editor an, aber mit der schmaleren D-12-Ausnahme (Gleich-Gruppe/Partner-Zusatz immer erlaubt, nur ein echter Ersatz blockiert) -- die Ausnahme entsteht rein aus der leeren Differenzmenge, ohne eigenen Sonderfall-Code.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-19T11:46:00Z (approx.)
- **Completed:** 2026-10-19T12:28:00Z (approx.)
- **Tasks:** 2/2 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Split the over-450-line `episode_import_repository_release_helpers.go` (525 lines) into itself (423 lines) plus a new `episode_import_repository_release_groups.go` (154 lines), moving `upsertReleaseVersionGroup`, `ensureAnimeFansubGroupLinksForMembers`, and `buildAnimeFansubLinkGroupIDs` verbatim as a pure, behavior-preserving move.
- Fixed the two source-grep tests the plan anticipated this move would break (`TestEpisodeImportReleaseHelpers_SourceLinksAnimeFansubsAfterReleaseVersionGroupWrite` deleted as superseded by the real-Postgres `TestEpisodeImportSourceCreateRepeatAndInitialBinding`; `TestEpisodeImportApply_UsesReleaseNativeTablesOnly` rewritten to drop its now-impossible presence-grep while keeping its two CLAUDE.md-permitted absence checks) plus a third, plan-unanticipated break caused by also moving `buildAnimeFansubLinkGroupIDs` (`TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup`, Phase 81's own leftover D-03 grep test) -- deleted as superseded by an existing real-signature-proving behavior test.
- Wired the Plan-01 guard into `upsertReleaseVersionGroup`: resolve `memberGroups` -> `queryCurrentReleaseVersionGroupIDs` -> `ensureReleaseVersionGroupsNotReducedToEmpty` (reject 0-groups reduction) -> alias-learning/animeID lookup/anime lock (unchanged) -> `diffRemovedReleaseVersionGroupIDs` -> `ensureRemovedReleaseVersionGroupsHaveNoDependents` (reject an actual dependents-having replace) -- all strictly before the existing DELETE/INSERT.
- Proved the full D-12 behavior table against a real-Postgres fixture (`TestUpsertReleaseVersionGroup_GuardBehavior`, extending `openEpisodeImportSourceFixture` additively with migration 0137 + a trimmed `release_version_media` stand-in): a same-group re-apply with real dependents succeeds, adding a partner group with real dependents on the existing group succeeds, replacing a dependents-having group with a different group is rejected (`GroupHasDependentsError`/`ErrGroupHasDependents`), and reducing an existing (>0-group) release to zero groups is rejected (`ErrReleaseVersionGroupsEmpty`) instead of the old silent no-op.
- Verified RED-before-GREEN by hand for Task 2: temporarily reverted the guard-wiring edit, confirmed the replace-guarded and reduce-to-zero subtests failed as expected (the same-group/add subtests trivially "pass" either way since they assert no-change-in-behavior), then restored the guard wiring and confirmed all four subtests pass.
- Full backend suite (`scripts/test-backend.sh`) run end to end: `GATE: GREEN (0)`, 24 throwaway databases created/dropped, `TestUpsertReleaseVersionGroup_GuardBehavior` and both fixed tests passing alongside the rest of the suite with zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure split of episode_import_repository_release_helpers.go + replace the two broken source-grep tests (plus one plan-unanticipated third)** - `6dfbd668f` (refactor)
2. **Task 2: Wire the guard into the import group-replace path** - `7274c3ddb` (feat)

**Plan metadata:** (this commit) `docs(187-03): complete plan`

## Files Created/Modified
- `backend/internal/repository/episode_import_repository_release_groups.go` - `upsertReleaseVersionGroup` (guard-wired), `ensureAnimeFansubGroupLinksForMembers`, `buildAnimeFansubLinkGroupIDs`
- `backend/internal/repository/episode_import_repository_release_groups_test.go` - `TestUpsertReleaseVersionGroup_GuardBehavior` (4-case D-12 behavior table) + its fixture helper `openEpisodeImportReleaseGroupsGuardFixture`
- `backend/internal/repository/episode_import_repository_release_helpers.go` - the three moved functions removed (525 -> 423 lines)
- `backend/internal/repository/episode_import_repository_test.go` - deleted the superseded source-grep test, rewrote the other to drop its impossible presence-grep
- `backend/internal/repository/episode_version_repository_write_helpers_test.go` - deleted the third, plan-unanticipated broken source-grep test (Phase 81's own D-03 leftover)

## Decisions Made
- Moved `ensureAnimeFansubGroupLinksForMembers`/`buildAnimeFansubLinkGroupIDs` alongside `upsertReleaseVersionGroup` (not just the one function the plan named) because moving only `upsertReleaseVersionGroup` left the helpers file at 468 lines, still over CLAUDE.md's 450-line limit -- the additional move is thematically coherent (all three write release-version/anime group relationships), not a line-count-only workaround.
- Deleted (did not relocate) the third broken source-grep test this additional move caused, following the identical pattern the plan specified for its own two anticipated breaks, per CLAUDE.md's Teststil rule.
- Extended `openEpisodeImportSourceFixture` additively with hand-rolled trimmed `point_rules`/`point_ledger_entries` stand-ins (not the full migration 0131-0133 chain) before applying real migration 0137 -- the trimmed shape is sufficient since no test here inserts a real `point_ledger_entries` row (every seeded `release_role_credit_lifecycles` row stays `lifecycle_status='pending'`, requiring `award_entry_id`/`reversal_entry_id` to be NULL).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved two additional functions out of episode_import_repository_release_helpers.go to actually satisfy the 450-line limit**
- **Found during:** Task 1 (first `wc -l` check after moving only `upsertReleaseVersionGroup`)
- **Issue:** The plan's own line-count estimate ("525 minus the ~60-line extracted function... drops well under 450") undercounted: the file was still 468 lines after moving only `upsertReleaseVersionGroup`.
- **Fix:** Additionally moved `ensureAnimeFansubGroupLinksForMembers` and `buildAnimeFansubLinkGroupIDs` (both group-link-writing helpers, called directly by `upsertReleaseVersionGroup`) into the same new file, bringing the helpers file to 423 lines.
- **Files modified:** `backend/internal/repository/episode_import_repository_release_helpers.go`, `backend/internal/repository/episode_import_repository_release_groups.go`
- **Verification:** `wc -l` <= 450; `go build ./...` succeeds.
- **Committed in:** `6dfbd668f` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed a third, plan-unanticipated broken source-grep test caused by the additional move above**
- **Found during:** Task 1 (first full-package test run)
- **Issue:** `TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup` (`episode_version_repository_write_helpers_test.go`, a Phase-81 leftover, unrelated to Phase 187) was a file-path-coupled `strings.Index` check expecting `buildAnimeFansubLinkGroupIDs`'s flat-signature definition inside `episode_import_repository_release_helpers.go`. Moving the function out made the grep permanently false.
- **Fix:** Deleted the test with a comment pointing to `TestBuildAnimeFansubLinkGroupIDs_IsIdempotentAcrossRepeatedApply` (`episode_import_repository_test.go`), which already proves the identical flat-signature claim by actually compiling against and calling it -- a stronger guarantee than a string match, and the same superseding pattern the plan specified for its own two anticipated test breaks.
- **Files modified:** `backend/internal/repository/episode_version_repository_write_helpers_test.go`
- **Verification:** Scoped `go test ./internal/repository/...` run confirmed no FAIL; full `scripts/test-backend.sh` run confirmed `GATE: GREEN (0)`.
- **Committed in:** `6dfbd668f` (Task 1 commit -- caught and fixed before the task commit was made, not a follow-up commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs directly caused by this task's own file-split, required to keep CLAUDE.md's 450-line rule and the full test suite green)
**Impact on plan:** Both fixes are necessary consequences of correctly satisfying the plan's own `wc -l <= 450` acceptance criterion; no product behavior changed beyond what Task 2 intentionally wired in. No scope creep into files this plan did not need to touch.

## TDD Gate Compliance

Task 2 was marked `tdd="true"`. The plan directed a single combined commit (consistent with Plan 01/02's precedent of not always splitting RED/GREEN into separate commits for this phase), so `7274c3ddb` contains both the test and the guard wiring together. RED was nonetheless verified by hand before committing: the guard-wiring edit was temporarily reverted in place, `TestUpsertReleaseVersionGroup_GuardBehavior`'s replace-guarded and reduce-to-zero subtests were confirmed to fail against the pre-guard code (the same-group and add-only subtests "pass" under both old and new code by construction, since they assert no regression, not new behavior), then the guard wiring was restored and all four subtests were confirmed green before commit.

## Issues Encountered
None beyond the two auto-fixed items documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 04 (handler/UI dependents display) and Plan 05 can proceed; the import write path now shares the identical guard surface the editor path (187-02) already wired, with D-12's narrower behavior proven structurally rather than via a divergent exception.
- Plan 08 (Docker rebuild + full-stack verification across all backend plans) has no new blockers from this plan: `scripts/test-backend.sh` is green end to end.
- No blockers identified for the remaining plans in this phase.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 5 claimed files found on disk; both claimed commit hashes (`6dfbd668f`, `7274c3ddb`) found in git log.
