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

## From Plan 116-06

- **Pre-existing, unrelated full-suite failures (`npm run test`)**: the full-suite verification
  run (required by this plan's `<verification>` block) showed 5 failed test files / 11 failed
  tests out of 224 files / 1452 tests. None of the failing files are in `frontend/src/app/me/dashboard/`
  or touch any file this plan modified (`page.tsx`, `page.module.css`, `page.test.tsx` — confirmed
  via `git diff`/`git status`, no other files changed). Two confirmed examples from the captured
  tail: `src/app/me/profile/page.test.tsx` (a crop-dialog `waitFor` timing assertion on a fetch
  URL, pre-existing timing flakiness unrelated to this plan) and
  `src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` (an absolute-vs-relative
  Jellyfin asset URL host mismatch, `http://localhost:8092/...` vs `/api/...` — an existing
  base-URL-resolution test issue in the Anime-Create AniSearch merge path, also unrelated to
  Phase 116). The remaining 3 failed files were not visible in the captured terminal tail (buffer
  truncated to the last ~80 lines) but are, by elimination, none of the 7 files under
  `src/app/me/dashboard/` (re-verified green in isolation: `npx vitest run src/app/me/dashboard`
  — 7 files / 30 tests, all passing) nor `AppShell.test.tsx`/`api.dashboard.test.ts` (also
  re-verified green: 2 files / 43 tests). Out of this plan's scope per the deviation-rules scope
  boundary — logged here instead of fixed. Follow-up: a future quick-task should re-run
  `npm run test` with full un-truncated output to identify and fix/triage the remaining 3 failing
  files.
