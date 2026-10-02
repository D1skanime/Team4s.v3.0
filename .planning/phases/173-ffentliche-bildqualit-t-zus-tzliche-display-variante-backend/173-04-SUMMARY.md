---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 04
subsystem: media
tags: [go, imaging, jpeg, png, webp, gif, gin, fansub, display-variant]

# Dependency graph
requires:
  - phase: 173-01
    provides: "the original global-uploader display-variant generation (media_upload_image.go) this plan deduplicated into a shared services helper"
  - phase: 173-02
    provides: "generateRVMDisplay/GenerateStaticDisplayVariant (JPEG, long edge <=1920px, never upscaled, quality 88) for release-version-media, rewired by this plan to use the new shared helper and gain animated-GIF handling"
provides:
  - "/media/fansub/<group_id>/... storage namespace for new fansub logo/banner/group-media uploads (D-09), with a 301 redirect from the legacy GET /api/v1/media/files/:filename route once an asset has migrated there (D-17)"
  - "a single shared services.EncodeStaticDisplayVariant (PNG when the source has visible alpha, JPEG >=88 otherwise, long edge <=1920 never upscaled) used by the global uploader, release-version-media upload/replace, and fansub logo/banner/group-media -- no duplicated resize/encode logic"
  - "services.StripWebPMetadata: lossless EXIF/XMP removal from WebP RIFF containers, applied to every WebP-original write path in this plan (global uploader, RVM upload/replace, fansub media)"
  - "real animated-GIF detection (services.IsAnimatedGIFData) and animated-WebP display generation (services.GenerateAnimatedWebPDisplayFromBytes) extended from the global uploader to RVM upload/replace and fansub media, with original-GIF-unchanged fallback on ffmpeg failure"
  - "display media_files row for fansub logo/banner (via MediaService.SaveUpload) and fansub group-media (reusing the same SaveUpload-produced variant, no second generateRVMDisplay call)"
affects: [173-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared display-variant encode/animate logic lives in internal/services (image_display_variant.go, animated_gif_display.go, webp_metadata.go) so both services-only callers (MediaService.SaveUpload) and handlers-package callers (RVM upload/replace, global uploader) use one implementation -- services cannot import handlers, so the shared code had to live on the services side of that boundary"
    - "Fansub group-media reuses MediaService.SaveUpload's auto-generated display Variant instead of calling generateRVMDisplay a second time, avoiding a duplicate decode/encode pass"
    - "Repository-layer buildPublicURLForAsset/fansubNamespacedPublicURL: once a storage path resolves under <storageDir>/fansub/..., every read path (CreateMediaAsset, GetMediaAssetByID/ByFilename, GetMediaFileByFilename) reports the new /media/fansub/... URL instead of recomputing the legacy /api/v1/media/files/<filename> form"

key-files:
  created:
    - backend/internal/services/image_display_variant.go
    - backend/internal/services/animated_gif_display.go
    - backend/internal/services/webp_metadata.go
    - backend/internal/handlers/fansub_media_upload_display.go
  modified:
    - backend/internal/services/media_service.go
    - backend/internal/repository/media_repository.go
    - backend/internal/repository/media_file_lookup_repository.go
    - backend/internal/handlers/media_upload_image.go
    - backend/internal/handlers/admin_content_release_version_media_display.go
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_replace.go
    - backend/internal/handlers/admin_content_release_version_media_replace_display.go
    - backend/internal/handlers/fansub_media_upload.go
    - backend/internal/handlers/fansub_media_serve.go

key-decisions:
  - "SaveUpload gained the display-variant generation that Task 2 originally specified, AND the groupID namespacing Task 1 specified, in one function change -- the two concerns are inseparable (the display file must be written into the same, possibly-namespaced directory as the original), so Task 0/1/2's production code landed as one coherent commit rather than three separate ones; see 'Deviations from Plan' for the full commit-structure rationale"
  - "Fansub group-media's display variant comes from SaveUpload's Variants slice, not a second generateRVMDisplay call -- Task 3's literal instruction ('reuse generateRVMDisplay') is satisfied at the algorithm level (same shared services.EncodeStaticDisplayVariant/animated-GIF logic underneath) without a redundant second decode/encode pass"
  - "D-20/D-21 (accept animated WebP outside segment_preview, resize via libvips/vipsthumbnail) explicitly deferred: vips-tools is not installed in either Docker image in this environment, and installing + rebuilding mid-session was judged a larger, riskier change than this plan's already-large core scope. The existing animated-WebP rejection is unchanged. See deferred-items.md."
  - "D-22 (crop-flow regression protection) required no special-case code: SaveUpload already generates the display variant from the 'data' parameter it receives, which for banner/logo crop-flow uploads is always the cropped artifact (the 'file' field), never 'source_file' -- verified with a dedicated end-to-end test instead of new production code."

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-06, REQ-173-12, REQ-173-15, REQ-173-20]

# Metrics
duration: ~4h
completed: 2026-10-02
---

# Phase 173 Plan 04: Fansub Media Namespacing, Display Variant, Legacy Redirect + Display-Logic Unification Summary

**Fansub logo/banner/group-media uploads now land under `/media/fansub/<group_id>/...` with an automatic `display` variant (PNG when transparent, JPEG otherwise, animated-GIF-stays-animated), the legacy `/api/v1/media/files/:filename` route 301-redirects once an asset has migrated, and the previously-duplicated static display-variant encode logic across the global uploader and release-version-media is now one shared `services.EncodeStaticDisplayVariant` helper.**

## Performance

- **Duration:** ~4h (includes an orchestrator-injected "Task 0" review correction covering transparency preservation, WebP EXIF stripping, display-logic deduplication, and animated-GIF handling across every write path in the phase, on top of the plan's original 3-task scope)
- **Completed:** 2026-10-02
- **Tasks:** 4 (Task 0 review correction + Tasks 1-3)
- **Files modified:** 14 (4 created, 10 modified)

## Accomplishments
- New fansub logo/banner/group-media uploads are stored under `/media/fansub/<group_id>/<filename>` (via `MediaService.SaveUpload`'s new `groupID int64` parameter) instead of flat in the media root; `isSaveUploadPathWithinBase` keeps the resolved path contained (groupID is always a validated int64, never free-text)
- `ServeMediaFile` 301-redirects `GET /api/v1/media/files/:filename` to the new namespaced URL once an asset's stored path has migrated there, built exclusively from the server-stored `PublicURL` (never request input, closing the open-redirect threat T-173-04-03); not-yet-migrated assets keep serving bytes at 200, unchanged
- `MediaRepository` gained `buildPublicURLForAsset`/`fansubNamespacedPublicURL` so every read path (`CreateMediaAsset`, `GetMediaAssetByID`/`ByFilename`, `GetMediaFileByFilename`) reports the new `/media/fansub/...` URL once a storage path has moved there -- without this repository-layer fix, the redirect logic would have had nothing correct to redirect to, since `CreateMediaAsset`/`GetMediaAssetByFilename` previously always recomputed the legacy URL from the bare filename regardless of the actual storage path
- Non-SVG fansub logo/banner uploads get an additional `display` `media_files` row (long edge <=1920, never upscaled); SVG uploads get none (no pixel dimensions to rasterize)
- Fansub group-media uploads get the same `display` row, reusing the exact variant `SaveUpload` already produced rather than a second decode/encode pass; `fansubGroupMediaFileResult` gained a `DisplayURL` field with full cleanup-on-failure parity (`cleanupGroupMediaFiles` now covers original/thumb/display across every DB-failure branch)
- **Review-correction scope (Task 0, done first):** a single shared `services.EncodeStaticDisplayVariant` now backs the global uploader, release-version-media upload, release-version-media replace, and fansub media -- removing the previous duplication between `media_upload_image.go`'s `generateStaticDisplayVariant` and `admin_content_release_version_media_display.go`'s `generateRVMDisplay`; transparent sources (PNG/WebP with visible alpha) now produce a PNG `display` variant instead of losing their alpha channel to an always-JPEG encode; WebP originals have EXIF/XMP chunks losslessly stripped from the RIFF container (`services.StripWebPMetadata`) in every write path that stores a WebP original; animated GIFs produce an animated WebP `display` variant (not a static frame) in every write path, including release-version-media upload/replace, which previously only produced a static frame-0 JPEG; a pre-existing bug, `MediaUploadHandler.isAnimatedGIF` unconditionally returning `true` regardless of actual frame count, is fixed; a pre-existing bug in the REPLACE handler, where WebP-mimetype originals fell through to the `imaging.Save`-cannot-encode-WebP path (only the upload handler had been fixed for this in 173-02), is also fixed
- No new HTTP route registered -- `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98

## Task Commits

Each logically-independent, separately-buildable unit was committed atomically (see "Deviations from Plan" for why this plan's 4 described tasks landed as 3 commits rather than 4):

1. **Task 0 (review correction, done before all other tasks): shared display-variant/webp/animated-gif helpers, transparency, EXIF-strip, isAnimatedGIF bugfix** - `10158096` (feat)
2. **Tasks 1-3: fansub namespacing, legacy redirect, logo/banner + group-media display variants** - `2071c598` (feat)
3. **D-22 regression test (added after noticing it was covered for free by Tasks 1-2's design, not separate production code)** - `d7f48e5b` (test)

**Plan metadata:** (pending -- see Next Phase Readiness)

## Files Created/Modified
- `backend/internal/services/image_display_variant.go` (new) - `EncodeStaticDisplayVariant` (the one shared static display encoder: long edge cap, PNG-if-alpha/JPEG-otherwise) and `ImageHasVisibleAlpha`.
- `backend/internal/services/animated_gif_display.go` (new) - `IsAnimatedGIFData` (real frame counting via `gif.DecodeAll`), `GenerateAnimatedWebPDisplay`/`GenerateAnimatedWebPDisplayFromBytes` (moved out of `handlers` so `MediaService` can call them directly without an import cycle).
- `backend/internal/services/webp_metadata.go` (new) - `StripWebPMetadata`: lossless RIFF-chunk-level EXIF/XMP removal, with VP8X flag-byte correction.
- `backend/internal/services/media_service.go` - `SaveUpload` gained a `groupID int64` parameter (namespaces fansub logo/banner/image uploads under `fansub/<groupID>/`), WebP EXIF/XMP stripping on write, and automatic `display`-variant generation into `MediaSaveResult.Variants`; new `FFmpegPath()` accessor and `isSaveUploadPathWithinBase` containment check.
- `backend/internal/repository/media_repository.go` / `media_file_lookup_repository.go` - `buildPublicURLForAsset`/`fansubNamespacedPublicURL`: every asset/media-file lookup now reports the namespaced `/media/fansub/...` URL once a storage path has migrated there.
- `backend/internal/handlers/media_upload_image.go` - rewritten to read raw bytes once (fixing `isAnimatedGIF`'s always-true bug), strip WebP EXIF/XMP, and call the shared `services.EncodeStaticDisplayVariant`/animated-GIF helpers instead of its own duplicated logic.
- `backend/internal/handlers/admin_content_release_version_media_display.go` - `generateRVMDisplay`/`GenerateStaticDisplayVariant` are now thin wrappers around the shared helper, plus real animated-GIF handling and an `ffmpegPath` parameter.
- `backend/internal/handlers/admin_content_release_version_media.go` / `_replace.go` / `_replace_display.go` - thread `h.rvmFFmpegPath()` (nil-safe) into `generateRVMDisplay`, widen/fix the WebP EXIF-strip branch (the replace handler had NO WebP branch at all before this plan), build the display file's path/extension from `generateRVMDisplay`'s returned `ext` instead of a hardcoded `display.jpg`.
- `backend/internal/handlers/fansub_media_upload.go` - both `SaveUpload` call sites now pass `fansubID` as `groupID`; `persistFansubMediaAsset` and `processOneFansubGroupMediaFile` insert the `display` media_files row(s) `SaveUpload` produced, with full cleanup-on-failure parity for group-media.
- `backend/internal/handlers/fansub_media_upload_display.go` (new) - `firstFansubDisplayVariant`/`persistFansubMediaDisplayVariants` glue, kept out of the already-533-line `fansub_media_upload.go`.
- `backend/internal/handlers/fansub_media_serve.go` - `ServeMediaFile` 301-redirects migrated fansub assets.
- Tests: `image_display_variant_test.go`, `webp_metadata_test.go`, `media_service_display_test.go` (services); `fansub_media_serve_namespace_test.go`, `fansub_media_upload_namespace_test.go` (handlers, real-Postgres end-to-end); `admin_content_release_version_media_test.go` updated for `GenerateStaticDisplayVariant`'s new 6-return-value/3-arg signature.

## Decisions Made
- See `key-decisions` in the frontmatter for the SaveUpload-unification, group-media-reuse, D-20/D-21-deferral, and D-22-no-new-code decisions.
- Chose 2 production-code commits instead of 4 literal per-task commits: Task 0's own mandate ("EINE gemeinsame Funktion...") required restructuring the exact same functions (`SaveUpload`, `generateRVMDisplay`, the RVM upload/replace call sites) that Tasks 1-3 also needed to touch. Splitting into 4 commits would have meant either (a) committing Task 0's dedup first and then re-touching the same lines again for Tasks 1-3 in a way that doesn't reflect real incremental development, or (b) committing intermediate states that don't build/pass tests. Two commits -- "shared helpers + RVM/global-uploader rewiring" and "fansub namespacing + display + redirect" -- are each independently buildable and fully test-covered, and together deliver exactly the plan's `must_haves`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `MediaUploadHandler.isAnimatedGIF` always returning `true`**
- **Found during:** Task 0 (explicitly called out in the plan's own Task 0 action text as a known defect from 173-01)
- **Issue:** `isAnimatedGIF(file multipart.File) bool { return true }` meant every single-frame GIF was treated as animated, taking the ffmpeg animated-display path unnecessarily.
- **Fix:** Replaced with `services.IsAnimatedGIFData(data)`, which decodes via `gif.DecodeAll` and checks `len(Image) > 1`. Required restructuring `processImage` to read raw bytes once (`io.ReadAll`) instead of decoding directly from the multipart stream.
- **Files modified:** `backend/internal/handlers/media_upload_image.go`, `backend/internal/services/animated_gif_display.go`
- **Verification:** `TestMediaUploadHandler_AnimatedDisplayGeneratesAnimatedWebP`/`AnimatedDisplayCapsLongEdge`/`AnimatedDisplayDegradesGracefullyWithoutFFmpeg` (pre-existing) still pass; new `TestIsAnimatedGIFData`/`TestSaveUpload_StaticGIFDisplayIsStatic` lock the fixed behavior.
- **Committed in:** `10158096`

**2. [Rule 1 - Bug] Fixed the REPLACE handler's missing WebP branch (silently hit the imaging.Save-cannot-encode-WebP path)**
- **Found during:** Task 0, while widening the EXIF-strip branch for WebP across every write path
- **Issue:** `admin_content_release_version_media_replace.go`'s original-save branch only special-cased `image/gif`; a WebP-mimetype replace fell into the `else` branch (`image.Decode` + `imaging.Save`), which 173-02's own summary documented as broken for WebP (decode-only, cannot encode) -- the upload handler had been fixed in 173-02, the replace handler had not.
- **Fix:** Added an explicit `else if mimeType == "image/webp"` branch that strips EXIF/XMP via `services.StripWebPMetadata` and writes the raw (stripped) bytes, mirroring the upload handler.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_replace.go`
- **Verification:** `go build`/`go vet` clean; existing `TestReplaceReleaseVersionMediaFile_*` tests still pass (no WebP-specific replace test existed before or was added in this plan -- the fix is covered by the same code-path reasoning as 173-02's `TestReleaseVersionMedia_WebPOriginalKeepsRealBytes` for the upload side).
- **Committed in:** `10158096`

---

**Total deviations:** 2 auto-fixed (Rule 1 - bugs), both explicitly anticipated by the plan's own Task 0 action text (not independently discovered scope creep).
**Impact on plan:** Both fixes are required for Task 0's stated `<done>` criteria ("keine doppelte Display-Logik", WebP EXIF stripping applying uniformly) to actually hold across every write path. No scope creep beyond what Task 0 explicitly asked for.

## Issues Encountered
- **Docker Compose Watch was not running** at session start (same gap 173-03 flagged): host-filesystem edits were not syncing into the running `team4sv30-backend` dev container. Resolved by running `docker compose watch team4sv30-backend` in the background for the remainder of the session; this is a session/tooling concern, not a code issue, and was not fixed in the compose files themselves.
- **Running Go toolchain:** `go` is not installed on the host PATH; all builds/tests in this session ran via `docker compose exec team4sv30-backend sh -lc "PATH=/usr/local/go/bin:$PATH go ..."` against the real dev container (which already has the project's dependencies cached).
- **`TEAM4S_PHASE107_TEST_DSN`** was not set in this session (unlike 173-02/173-03, which apparently had it set already). Created a fresh `team4s_phase107_test_173` database on the existing `team4sv30-db` Postgres container (`CREATE DATABASE`, `team4s` role already has `CREATEDB`) and passed the DSN via `docker compose exec -e` for every test run in this plan.
- **D-20/D-21 (animated WebP accept + libvips resize) deferred** -- see `deferred-items.md` for the full investigation (vips-tools absent from both Docker images; no working `govips`/`vipsthumbnail` integration currently exists despite `vips`/`vips-dev` libraries being present in the production Dockerfile) and suggested follow-up plan.
- **Pre-existing, unrelated failures observed** (confirmed identical before and after this plan's changes; fully documented in `deferred-items.md` from 173-02/173-03): `TestPatchReleaseVersionMediaResponseKeepsActorPermissions`, `TestPatchReleaseVersionMediaAllowsCategoryChange`, `TestReleaseVersionMedia_SoftDeleteExcludesFromList`, `TestReleaseVersionMedia_ReorderRequiresVersionOwnership`, `TestRVMTitlePatchPersistsIndependentMetadata` (all: `openRVMExecFixture`'s `app_users` fixture missing `display_name`/`preferred_username` columns that `ListReleaseVersionMedia` selects), plus 3 unrelated Jellyfin-fixture-file-missing tests and 3 unrelated `openapi.yaml` duplicate-mapping-key parse failures. None of these are in this plan's file list or touched by its diff.

## User Setup Required

None - no external service configuration required. (A live-UAT item remains: a transparent fansub logo uploaded through the real browser flow should visually confirm no black/white background appears on both light and dark page backgrounds, per D-18's human-UAT note -- not exercised in this automated session.)

## Next Phase Readiness
- `services.EncodeStaticDisplayVariant`, `services.StripWebPMetadata`, `services.IsAnimatedGIFData`, and `services.GenerateAnimatedWebPDisplay(FromBytes)` are all exported and ready for 173-05 (profile/avatar background images) and 173-07 (backfill CLI) to reuse directly, avoiding any further duplication.
- `GenerateStaticDisplayVariant`'s exported signature changed from `(data, mimeType) ([]byte, int, int, error)` to `(data, mimeType, ffmpegPath) ([]byte, ext, mimeType, int, int, error)` -- 173-07's backfill CLI (not yet executed) will need to call it with this actual signature, not the one described in 173-02's now-superseded summary.
- The fansub-media read-side `display_url` surfacing (173-08/173-09, already executed per `git log`) should automatically pick up these new `display` rows without further changes, since they already added the generic `display`-then-`original` fallback chain at the repository layer.
- D-20/D-21 (animated WebP accept + vips-based resize) remains open; see `deferred-items.md` for the concrete follow-up plan shape.
- No blockers identified for 173-05/173-06, which were already noted as depending on 173-01 (not this plan) in the original phase breakdown.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: backend/internal/services/image_display_variant.go
- FOUND: backend/internal/services/animated_gif_display.go
- FOUND: backend/internal/services/webp_metadata.go
- FOUND: backend/internal/handlers/fansub_media_upload_display.go
- FOUND: backend/internal/services/media_service.go
- FOUND: backend/internal/repository/media_repository.go
- FOUND: backend/internal/repository/media_file_lookup_repository.go
- FOUND: backend/internal/handlers/media_upload_image.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_display.go
- FOUND: backend/internal/handlers/admin_content_release_version_media.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_replace.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_replace_display.go
- FOUND: backend/internal/handlers/fansub_media_upload.go
- FOUND: backend/internal/handlers/fansub_media_serve.go
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
- FOUND commit: 10158096
- FOUND commit: 2071c598
- FOUND commit: d7f48e5b
