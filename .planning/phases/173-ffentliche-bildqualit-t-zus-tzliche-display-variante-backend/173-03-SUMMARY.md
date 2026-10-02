---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 03
subsystem: media
tags: [go, imaging, jpeg, gin, release-version-media, replace-endpoint]

# Dependency graph
requires:
  - phase: 173-02
    provides: "generateRVMDisplay/GenerateStaticDisplayVariant helper (JPEG, long edge <=1920px, never upscaled, quality 88)"
provides:
  - "display media-file variant for the release-version-media REPLACE endpoint (PUT .../media/:relationId/file), matching the upload path's 1920px/never-upscale/JPEG>=88 contract"
  - "cleanup-on-failure parity: displayPath folded into the existing cleanupNewFiles() closure, covering all ~10 downstream error branches with one edit"
affects: [173-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rvmReplaceDisplayPath helper lives in a new sibling file (admin_content_release_version_media_replace_display.go), not the already-over-450-line admin_content_release_version_media_replace.go, mirroring the 173-02/Phase-172 split precedent"
    - "The replace handler's cleanupNewFiles() closure (not ~8 separate inline edits like the upload handler) made wiring displayPath into every error path a single edit point"

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_replace_display.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media_replace.go
    - backend/internal/handlers/admin_content_release_version_media_replace_test.go

key-decisions:
  - "No DisplayURL field was added to the replace handler's JSON response: it returns repository.ReleaseVersionMediaItem (via loadReleaseVersionMediaResponseItem), not the rvmFileResult type 173-02 added DisplayURL to. The plan's own wiring instruction for that field was explicitly conditional (\"if this handler also returns a rvmFileResult-shaped response\") and does not apply here. Surfacing display_url on ReleaseVersionMediaItem/ListReleaseVersionMedia is a separate read-path concern, out of this plan's write-path-only scope."
  - "Display-variant generation/error-handling/write/insert exactly mirrors the order and error-code conventions already established by the upload handler (processOneRVMFile) in 173-02, for consistency across both write paths."

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-20]

# Metrics
duration: 50min
completed: 2026-10-02
---

# Phase 173 Plan 03: Release-Version-Media Replace Display-Variant Wiring Summary

**ReplaceReleaseVersionMediaFile now writes a `display` media_files row (JPEG, long edge <=1920px, never upscaled, quality 88) via 173-02's `generateRVMDisplay`, with displayPath folded into the existing `cleanupNewFiles()` closure for full cleanup-on-failure parity.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-10-02T16:24:00Z (approx.)
- **Completed:** 2026-10-02T17:14:00Z
- **Tasks:** 1
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `PUT /api/v1/admin/release-versions/:versionId/media/:relationId/file` now generates a `display` variant via `generateRVMDisplay(data, mimeType)` right after the existing thumbnail generation, with a new `DISPLAY_FAILED` error code on decode/encode failure
- `displayPath` (`rvmReplaceDisplayPath(assetDir)`, a tiny helper in a new sibling file to keep the already-over-450-line `_replace.go`'s diff to call sites) is written to disk right after `thumbPath`, and a new `InsertMediaFileWithStatus(..., "display", ...)` call persists the third `media_files` row next to the existing thumb insert
- `displayPath` was folded into the existing `cleanupNewFiles()` closure — a single edit point that automatically covers every one of the ~10 downstream error branches between the display write and `tx.Commit`, proven by a new test that forces a post-write DB-insert failure and confirms zero files (original, thumb, or display) survive on disk
- No new HTTP route registered — `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98 (unchanged from the 173-01/02 baseline)
- Fixed four pre-existing test-fixture gaps that blocked this plan's own mandated verification command (`go test ... -run TestReplaceReleaseVersionMedia`) from reaching the success path at all: missing `app_users.display_name`/`preferred_username` columns, missing `users.username` column, the missing `release_version_media_highlights` table (added in migration 0172, after this fixture was last touched), and a missing `auditLogRepo` on the handler construction (nil-interface panic on the post-commit audit write) — all four confined to `admin_content_release_version_media_replace_test.go`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire generateRVMDisplay into the replace handler's cleanupNewFiles closure** - `adca39aa` (feat)

**Plan metadata:** (pending — see Next Phase Readiness)

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_replace_display.go` (new, 18 lines) - `rvmReplaceDisplayPath(assetDir)` helper, keeping the display-path-construction logic out of the already-oversized `_replace.go` file.
- `backend/internal/handlers/admin_content_release_version_media_replace.go` - Added `generateRVMDisplay` call + `DISPLAY_FAILED` error branch; `displayPath` computed via the new helper; `os.WriteFile(displayPath, ...)` added right after the `thumbPath` write (with its own `STORAGE_FAILED` branch cleaning up all three new files); `displayPath` added to `cleanupNewFiles()`; a third `InsertMediaFileWithStatus(..., "display", ...)` call added next to the thumb insert. 454 -> 475 lines (call-site edits only; the plan's own `<done>` criterion was "does not meaningfully grow" — this file was already over CLAUDE.md's 450-line cap before this plan, and remains so; splitting it below 450 is a separate, out-of-scope refactor).
- `backend/internal/handlers/admin_content_release_version_media_replace_test.go` - Added `display_name`/`preferred_username` columns to the fixture's `app_users` ALTER block, a `username` column to the fixture's `users` table, a minimal `release_version_media_highlights` table, and `auditLogRepo: repository.NewAuditLogRepository(nil)` to the "allowed actor" handler construction (all four Rule-3 fixes); added `replaceRVMMultipartRequestWithFileBytes` (parameterized file payload); added `TestReplaceReleaseVersionMediaFile_DisplayVariant` (end-to-end replace with a 3000x1500 PNG, asserting the persisted `display` row is capped at 1920x960 and the file exists on disk) and `TestReplaceReleaseVersionMediaFile_DisplayInsertFailureCleansUpAllNewFiles` (a `CHECK (variant <> 'display')` constraint forces the display insert to fail post-write; asserts the relation's `media_asset_id` is unchanged and zero files remain under the storage dir).

## Decisions Made
- Did not add a `DisplayURL` field anywhere in the replace handler's response. The replace handler returns `repository.ReleaseVersionMediaItem` (via the pre-existing `loadReleaseVersionMediaResponseItem` helper), not the `rvmFileResult` type 173-02 added `DisplayURL` to — the plan's instruction for that wiring was explicitly conditional on the response being `rvmFileResult`-shaped, which it is not here. Exposing `display_url` on `ReleaseVersionMediaItem`/`ListReleaseVersionMedia` is a read-path concern for a different plan.
- Mirrored the upload handler's (173-02) exact generation-order, error-code, and cleanup conventions for the display variant, rather than inventing a new shape, to keep both write paths consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed four pre-existing test-fixture gaps that blocked this plan's own mandated verification from reaching the replace handler's success path**
- **Found during:** Task 1 (running the plan's own verification command, `go test ./internal/handlers/... -run TestReplaceReleaseVersionMedia -v`, against `TEAM4S_PHASE107_TEST_DSN`)
- **Issue:** `h.loadReleaseVersionMediaResponseItem` (called unconditionally at the end of a successful replace, pre-existing code untouched by this plan) calls `ListReleaseVersionMedia`, whose SQL selects `au.display_name`/`au.preferred_username` from `app_users` and `uploader.username` from `users`, and LEFT JOINs a `release_version_media_highlights` table (added by migration 0172, after this fixture was last updated) — none of which the fixture's minimal ad hoc schema provided. Separately, the handler's post-commit audit-log write (`h.auditLogRepo.Write(...)`) nil-pointer-panicked because the existing "allowed actor" test's handler construction never set `auditLogRepo` — the exact same gap 173-02 found and fixed in its own upload-path fixture (`newRVMExecHandler`).
- **Fix:** Added `display_name TEXT NULL, preferred_username TEXT NULL` to the `app_users` ALTER block; added `username TEXT NULL` to the `users` table; added a minimal `release_version_media_highlights (release_version_media_id BIGINT PRIMARY KEY, highlight_order INT NOT NULL DEFAULT 0)` table; set `auditLogRepo: repository.NewAuditLogRepository(nil)` (nil-safe no-op `Write`) on both handler constructions that reach the success path.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_replace_test.go`
- **Verification:** The pre-existing `TestReplaceReleaseVersionMediaFileRequiresUpdatePermission` (both subtests) and the two new display-variant tests all pass against the real Postgres fixture; `go build ./...` and `go vet ./internal/handlers/...` are clean.
- **Committed in:** `adca39aa` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed group (Rule 3 - blocking, 4 related fixture gaps)
**Impact on plan:** Necessary to run this plan's own mandated verification command at all — without these fixes, every success-path test of `ReplaceReleaseVersionMediaFile` (not just this plan's new display-variant tests) would fail or panic before reaching its assertions. Confined entirely to a test-only fixture file; no production code touched by these fixes.

## Issues Encountered
- The project's Docker Compose Watch sync (configured in `docker-compose.override.yml`) was not actively running in this session, so edits made on the host filesystem were not automatically reflected inside the `team4sv30-backend` container. Verified this directly (an initial `go build` inside the container silently built stale, pre-edit source) and worked around it for this session by `docker cp`-ing each edited/created file into the running container before every build/test invocation. No production or planning artifacts were affected — this is a local verification-environment quirk, not a code or plan issue, and is left for a human to address (e.g. by running `docker compose watch` during active development sessions) rather than fixed here, since it is infrastructure tooling outside this plan's file list.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The release-version-media REPLACE endpoint now has full write-path parity with the upload endpoint (173-02) for the `display` variant, including cleanup-on-failure.
- `rvmReplaceDisplayPath` is intentionally package-private (not exported) since it is only ever needed by this one call site; no other plan depends on it.
- The read-side gap noted in Decisions Made (`ReleaseVersionMediaItem`/`ListReleaseVersionMedia` not exposing `display_url`) remains open; if a later plan in this phase needs the admin UI to prefer the display variant when listing/patching release-version-media, that plan will need to add the LEFT JOIN + field, following the pattern already used in `group_release_media_repository.go`/`release_detail_public_repository.go`'s `DisplayURL *string` fields.
- The Docker Compose Watch sync gap (see Issues Encountered) may affect subsequent plans' verification in this same session if the watch process still isn't running — worth flagging to the user if it recurs.
- No blockers identified for 173-07 (backfill CLI), which depends only on the already-exported `GenerateStaticDisplayVariant` from 173-02, not on this plan's handler wiring.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*
