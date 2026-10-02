---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 02
subsystem: media
tags: [go, imaging, jpeg, webp, gin, release-version-media]

# Dependency graph
requires: []
provides:
  - "display media-file variant (JPEG, long edge <=1920px, never upscaled, quality 88) for every release-version-media upload through UploadReleaseVersionMedia/processOneRVMFile"
  - "exported GenerateStaticDisplayVariant(data, mimeType) helper for reuse by the Phase 173 backfill CLI (173-07) and the REPLACE handler (173-03) / fansub group-media handler (173-04)"
  - "fix: WebP-mimetype release-version-media originals now keep their real RIFF/WEBP bytes instead of silently failing/misbehaving through imaging.Save (decode-only, cannot encode WebP)"
affects: [173-03, 173-04, 173-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generateRVMDisplay lives in a new sibling file (admin_content_release_version_media_display.go), not the already-1296-line admin_content_release_version_media.go, mirroring the Phase 172 theme_segment_preview.go -> theme_segment_preview_writes.go split precedent"
    - "GenerateStaticDisplayVariant is a one-line exported wrapper around the package-private generateRVMDisplay, matching the GenerateAnimatedWebPDisplay export pattern from 173-01"
    - "display.jpg gets full cleanup-on-failure parity with original/thumb: removeFileQuietly(displayPath) added to every error branch between the display write and tx commit"

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_display.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_test.go

key-decisions:
  - "Display variant is always re-encoded as JPEG (quality 88) regardless of source mimetype, matching generateRVMThumbnail's existing re-encode posture and 173-01's D-01 precedent"
  - "The WebP-original EXIF-strip bug fix widens the existing GIF-raw-bytes branch to also cover image/webp, rather than adding a third branch -- GIF and WebP share the same 'imaging cannot encode this format' root cause"
  - "newRVMExecHandler's missing auditLogRepo (nil-panics on every successful upload) is fixed as a Rule 3 blocking-issue fix, not deferred, since it blocked this plan's own verification command from running at all"

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-06, REQ-173-07, REQ-173-20]

# Metrics
duration: 55min
completed: 2026-10-02
---

# Phase 173 Plan 02: Release-Version-Media Display Variant + WebP-Original Fix Summary

**UploadReleaseVersionMedia now writes a third `display` media_files row (JPEG, long edge <=1920px, never upscaled, quality 88) via a new `generateRVMDisplay`/`GenerateStaticDisplayVariant` helper, and WebP-mimetype originals are stored with their real bytes instead of failing through `imaging.Save`.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-02T15:48:00Z (approx.)
- **Completed:** 2026-10-02T16:43:00Z
- **Tasks:** 1
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Every release-version-media upload through `POST /api/v1/admin/release-versions/:versionId/media` now produces an additional `display` `media_files` row (long edge <=1920px, never upscaled, JPEG quality 88) via the new `generateRVMDisplay` helper in a dedicated sibling file
- Exported `GenerateStaticDisplayVariant(data, mimeType) ([]byte, int, int, error)` for the Phase 173 backfill CLI (173-07) and the REPLACE handler (173-03) / fansub group-media handler (173-04) that depend on this plan's shared helper
- Fixed a pre-existing bug: WebP-mimetype release-version-media originals hit the EXIF-strip `imaging.Save` branch (decode-only, cannot encode WebP) instead of the raw-bytes path already used for GIF — WebP originals now keep their true `RIFF`/`WEBP` bytes
- Added `DisplayURL` to `rvmFileResult` and wired `displayPath` cleanup (`removeFileQuietly`) into every one of the ~10 existing error branches between the display write and `tx.Commit`, matching `original`/`thumb` parity exactly
- No new HTTP route registered — `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98 (unchanged from 173-01's baseline)
- `admin_content_release_version_media.go` grew from 1296 to 1333 lines (call-site edit only, as specified) — the new display-generation logic lives entirely in the new 73-line sibling file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generateRVMDisplay + GenerateStaticDisplayVariant in a new sibling file; fix the WebP-original-save bug** - `e5460b64` (feat)

**Plan metadata:** (pending — see Next Phase Readiness)

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_display.go` (new, 73 lines) - `generateRVMDisplay` (decodes GIF frame 0 / else via `image.Decode`, caps the long edge at 1920px via `imaging.Resize` only when needed, re-encodes JPEG quality 88) and the exported `GenerateStaticDisplayVariant` wrapper for cross-package reuse.
- `backend/internal/handlers/admin_content_release_version_media.go` - `rvmFileResult` gained `DisplayURL`; the EXIF-strip branch condition widened from `mimeType == "image/gif"` to `mimeType == "image/gif" || mimeType == "image/webp"` (fixes the WebP bug); `processOneRVMFile` now calls `generateRVMDisplay`, writes `display.jpg`, inserts a third `InsertMediaFileWithStatus(..., "display", ...)` row, and every error branch from the display write through `tx.Commit` now also calls `removeFileQuietly(displayPath)`. 1296 -> 1333 lines.
- `backend/internal/handlers/admin_content_release_version_media_test.go` - Added 4 new tests covering no-upscale, long-edge capping (3000x1500 -> 1920x960), the WebP-original regression (byte-for-byte `RIFF`/`WEBP` preservation), and `GenerateStaticDisplayVariant` as a pure unit-testable function; fixed `newRVMExecHandler`'s missing `auditLogRepo` (nil-panic on every successful upload).

## Decisions Made
- Display variant is always JPEG regardless of source mimetype (no new encoder dependency), consistent with `generateRVMThumbnail`'s existing posture and 173-01's precedent
- WebP and GIF now share one "store raw bytes" branch in the EXIF-strip logic, since both hit the same `imaging` encode limitation
- `newRVMExecHandler`'s audit-log nil-panic was fixed inline (Rule 3 — blocking issue) rather than deferred, since it blocked this plan's own mandated verification command (`go test ... -run TestUploadReleaseVersionMedia`) from running at all

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed `newRVMExecHandler`'s missing `auditLogRepo`, which nil-panicked on every successful upload**
- **Found during:** Task 1 (baseline verification, before any of this plan's production-code edits)
- **Issue:** `UploadReleaseVersionMedia` calls `h.auditLogRepo.Write(...)` unconditionally for every `"ready"` result (line ~325 at the time). `newRVMExecHandler` — the shared real-Postgres test handler constructor this plan's own `<interfaces>` section points to as the one to reuse — never set `auditLogRepo`, so every successful upload test (including this plan's own mandated verification command) panicked with a nil-pointer dereference. This predates this plan's changes entirely; it was simply never triggered before because the real-Postgres DSN env var (`TEAM4S_PHASE107_TEST_DSN`) was not set in this session until verification began.
- **Fix:** Set `auditLogRepo: repository.NewAuditLogRepository(nil)` in `newRVMExecHandler` — `AuditLogRepository.Write` is nil-safe when its `db` is nil (already the established no-op pattern elsewhere in this package's tests, e.g. `contribution_proposals_me_test.go`).
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** `TestUploadReleaseVersionMediaHandlerExists` and `TestUploadReleaseVersionMedia_FileSizeLimit` pass; the full `-run TestReleaseVersionMedia` battery no longer panics.
- **Committed in:** `e5460b64` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Necessary to run this plan's own mandated verification command at all. No scope creep — the fix is confined to a test-only constructor, not production code.

## Issues Encountered

- **Pre-existing, unrelated test failures observed in the broader `TestReleaseVersionMedia*` suite** (not caused by this plan; confirmed via `git diff` showing the affected production code and `openRVMExecFixture` SQL untouched by this plan):
  - `TestPatchReleaseVersionMediaResponseKeepsActorPermissions/allowed_actor's_response_carries_true_can_update/can_delete`, `TestPatchReleaseVersionMediaAllowsCategoryChange`, `TestReleaseVersionMedia_SoftDeleteExcludesFromList`, `TestReleaseVersionMedia_ReorderRequiresVersionOwnership` (both subtests) all fail with `db_schema_mismatch` (Postgres `42703`/`42P01`).
  - Root cause: `repository.MediaRepository.ListReleaseVersionMedia`'s SQL selects `au.display_name` and `au.preferred_username` from `app_users`, but the test fixture's `app_users` table (built by `testsupport.createPhase107Prerequisites` plus `openRVMExecFixture`'s own `ALTER TABLE`) never adds those two columns. Every List/Patch-reload/Reorder-reload code path that calls `ListReleaseVersionMedia` fails against this fixture — none of which this plan touches (this plan's only production-code changes are in the upload path).
  - Documented in full in `deferred-items.md` (this phase directory), not fixed, per the deviation rules' scope boundary (pre-existing issues in unrelated functionality).
  - Confirmed out of scope: this plan's own new tests (`TestReleaseVersionMedia_DisplayVariantNoUpscale`, `TestReleaseVersionMedia_DisplayVariantCapsLongEdge`, `TestReleaseVersionMedia_WebPOriginalKeepsRealBytes`, `TestGenerateStaticDisplayVariant`) and all pre-existing upload-path tests (`TestUploadReleaseVersionMediaHandlerExists`, `TestReleaseVersionMedia_UploadReturnsAuthoritativeSourceRevision`, etc.) pass cleanly against the identical fixture/DSN.
- The hardcoded `makeWebPBytes()` fixture already present in this test file (VP8L header with no valid pixel payload) fails full `image.Decode` with `vp8l: invalid Huffman tree` — it was only ever exercised by MIME-sniffing tests, not full-decode paths. The new WebP-original regression test instead reuses `testStaticWebPBytes(t)` (a genuinely decodable 4x4 WebP fixture already established in `media_upload_test.go`, same package) rather than duplicating a new fixture.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `GenerateStaticDisplayVariant` is exported and ready for 173-03 (REPLACE handler), 173-04 (fansub group-media handler), and 173-07 (backfill CLI) to call directly.
- `rvmFileResult.DisplayURL` gives the frontend a ready-made `/media/.../display.jpg` URL for any future UI wiring plans in this phase.
- The pre-existing `openRVMExecFixture` schema gap (missing `app_users.display_name`/`preferred_username`) remains open; any later plan touching List/Patch/Reorder test coverage in this file should fix it first (see `deferred-items.md`).
- No blockers identified for 173-03.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/admin_content_release_version_media_display.go
- FOUND: backend/internal/handlers/admin_content_release_version_media.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_test.go
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
- FOUND commit: e5460b64
