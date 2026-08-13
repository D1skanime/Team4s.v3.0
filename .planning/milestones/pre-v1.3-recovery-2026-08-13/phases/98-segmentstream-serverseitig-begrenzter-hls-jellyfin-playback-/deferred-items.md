# Deferred Items - Phase 98

Items discovered during execution that are out of scope for the current plan
(pre-existing issues, not caused by the task's changes).

## 98-02: jellyfin_client.go pre-existing 450-line violation

- **File:** `backend/internal/handlers/jellyfin_client.go`
- **Found during:** 98-02 (subtitle burn-in wiring)
- **Issue:** File was already at 485 lines before this plan's changes (line count
  confirmed via `git diff --stat`: only 6 net lines were added by 98-02, bringing it
  to 491). This pre-dates the current task and is unrelated to subtitle wiring.
- **Why deferred:** Out of scope per executor scope-boundary rule -- only auto-fix
  issues directly caused by the current task's changes. Splitting this file is a
  separate refactor (likely extracting the series/episode listing helpers into a
  new `jellyfin_client_episodes.go` or similar) and should be its own task/plan.
- **Action needed:** A future phase or cleanup plan should split
  `jellyfin_client.go` into smaller files to bring it back under the 450-line
  project limit.
