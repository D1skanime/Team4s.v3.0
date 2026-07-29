# Deferred Items — Phase 116

## From Plan 116-02

- **Pre-existing 450-line violation, `backend/internal/handlers/contributions_me_handler.go`**
  (CLAUDE.md "Modularity": production files should stay at or below 450 lines).
  The file was already 671 lines before Plan 116-02 touched it (verified via `Read` at the
  start of this plan's execution). Plan 116-02 Task 3 only replaced the 17-line
  `resolveVerifiedMemberID` body with a 7-line delegate to the new package-level
  `resolveVerifiedMemberIDForAppUser` (net -10 lines, now 661 lines) — this plan did not
  introduce the oversized-file condition and splitting the file is out of this plan's scope
  (files_modified list only calls for the one-line delegate change). Logged here per the
  deviation-rules scope boundary instead of performing an unplanned split.
  Follow-up: a future plan/quick-task should split `contributions_me_handler.go` (e.g. move
  the visibility-patch/reject/confirm mutation handlers into a sibling file) to bring it back
  under the 450-line ceiling.
