# Phase 187 — Deferred Items

## 1. Pre-existing full-suite failure: `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true`

- **Found during:** 187-05 Task 1's final full-backend-suite gate run (`scripts/test-backend.sh`).
- **Status:** Confirmed pre-existing, NOT caused by 187-05. Out of scope for this plan (SCOPE BOUNDARY:
  only auto-fix issues directly caused by the current task's own changes).
- **Root cause:** `backend/internal/handlers/admin_content_episode_version_editor_helpers.go:78`
  (added by Plan 187-04, "Editor-Context-Dependents-Anreicherung") unconditionally calls
  `GetReleaseVersionGroupDependents`, which queries `release_role_credit_lifecycles`
  (`release_version_group_guard.go:52`), for every selected group whenever the episode-version
  editor-context handler runs. `backend/internal/repository/episode_version_dates_integration_test.go`'s
  `openEpisodeVersionPublicFixture` (a pre-existing, earlier-phase fixture) does not create that
  table, so the handler fails with `relation "release_role_credit_lifecycles" does not exist` (500)
  instead of 200 whenever this specific test exercises the editor-context handler.
- **Proof this is pre-existing, not introduced by 187-05:** reproduced identically in a throwaway
  git worktree checked out at `b21506aba` (the last commit before 187-05 started, i.e. the tip of
  187-04) with no 187-05 changes applied at all:
  ```
  docker run ... golang:1.25-alpine sh -c "go test ./internal/repository/... -run TestEpisodeVersionDateEditorContextBothSurfacesAndFailure -v"
  --- FAIL: TestEpisodeVersionDateEditorContextBothSurfacesAndFailure (0.19s)
      --- FAIL: TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true (0.02s)
  ```
  Identical failure, identical error message, at the 187-04 commit -- 187-05 touches none of
  `admin_content_episode_version_editor_helpers.go`,
  `episode_version_dates_integration_test.go`, or `openEpisodeVersionPublicFixture`.
- **Impact on the full `scripts/test-backend.sh` gate:** this is the ONLY failure in the entire
  suite when run with 187-05's changes applied (everything else, including every test this plan's
  own acceptance criteria name, is green). The gate currently reports `GATE: RED (1)` purely because
  of this one pre-existing, out-of-scope item.
- **Suggested fix (not applied here, per CLAUDE.md "Produktverhalten nie ändern, nur um Tests grün
  zu machen" and the scope-boundary rule):** either extend `openEpisodeVersionPublicFixture` to
  create a trimmed `release_role_credit_lifecycles` stand-in (mirroring
  `episode_import_repository_release_groups_test.go`'s `openEpisodeImportReleaseGroupsGuardFixture`
  precedent), or make the dependents-enrichment call in
  `admin_content_episode_version_editor_helpers.go` tolerate a missing-relation error without
  failing the whole editor-context response. Needs a decision, not a silent pick.
- **Recommended owner:** whichever later 187 plan closes the full backend suite gate (187-06/07/08
  or a dedicated follow-up fix task), since 187-04 (already committed) introduced the call site and
  187-05 only discovered it via the full-suite run.
