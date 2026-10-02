---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 05
subsystem: media
tags: [go, imaging, vips, ffmpeg, webp, gif, jpeg, gin, avatar, profile]

# Dependency graph
requires:
  - phase: 173-01
    provides: "the original display-variant generation building block (static JPEG cap, animated-GIF-via-ffmpeg) this plan extended to animated WebP"
  - phase: 173-04
    provides: "shared services.EncodeStaticDisplayVariant/StripWebPMetadata/animated-GIF helpers and the fansub media_service.SaveUpload display-variant pipeline this plan extended with vips-based animated WebP support"
provides:
  - "vips-tools (vipsthumbnail CLI) in both backend Docker images; VipsThumbnailPath config wired through MediaService/MediaUploadHandler/AppAuthHandler"
  - "services.GenerateAnimatedDisplayViaVips/ExtractFirstFrameViaVips/IsAnimatedWebPData: animated-WebP-aware display/thumbnail generation via vipsthumbnail, since golang.org/x/image/webp cannot decode ANMF animation frames at all and ffmpeg cannot decode animated WebP"
  - "D-20: animated WebP accepted on every write path except asset_type=segment_preview (global uploader, release-version-media upload/replace, fansub logo/banner/group-media), each producing an animated display variant with non-fatal fallback to the unchanged original"
  - "fix: anime.cover_image legacy column resolves to the ORIGINAL media_files path again (not display), preventing resolveOrphanedLocalCoverImageV2 from misclassifying still-referenced covers as orphaned"
  - "a display media_files row for member avatar/profile-background uploads (animated sources stay animated), with GetOwnProfile exposing avatar.display_url/background.display_url (fallback to original)"
affects: [173-06, 173-07]

# Tech tracking
tech-stack:
  added: ["vips-tools (Alpine package, vipsthumbnail CLI)"]
  patterns:
    - "vipsthumbnail \"<src>[n=-1]\" -s \"WxH>\" for animated-display generation (all frames, never-upscale via the ImageMagick-style '>' geometry suffix); bare vipsthumbnail invocation (no [n=-1]) for frame-0 thumbnail extraction -- both verified against real ffmpeg-generated animated GIF/WebP fixtures (frame counts via vipsheader -a, no-upscale, long-edge cap)"
    - "animated-WebP detection/display-generation centralized in services.animated_webp_display.go, mirroring the existing services.animated_gif_display.go (ffmpeg) sibling -- handlers delegate (isAnimatedWebP wraps services.IsAnimatedWebPData) instead of duplicating the RIFF/VP8X header check"
    - "avatar/profile-background uploads read raw bytes once (io.ReadAll) and share them between the original-write and display-generation paths, skipping image.Decode entirely for animated WebP (which that decoder cannot parse at all)"

key-files:
  created:
    - backend/internal/services/animated_webp_display.go
    - backend/internal/services/media_service_display_variant.go
    - backend/internal/handlers/app_profile_display.go
  modified:
    - backend/Dockerfile
    - backend/Dockerfile.dev
    - backend/internal/config/config.go
    - backend/cmd/server/main.go
    - backend/internal/services/media_service.go
    - backend/internal/handlers/image_animated_webp.go
    - backend/internal/handlers/media_upload.go
    - backend/internal/handlers/media_upload_image.go
    - backend/internal/handlers/media_upload_segment_preview.go
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_display.go
    - backend/internal/handlers/admin_content_release_version_media_replace.go
    - backend/internal/handlers/fansub_media_upload.go
    - backend/internal/repository/anime_assets.go
    - backend/internal/handlers/app_profile.go
    - backend/internal/handlers/app_auth.go
    - backend/internal/models/media.go
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_own_repository.go
    - backend/internal/repository/member_profile_ensure_repository.go

key-decisions:
  - "D-20's animated-WebP rejection narrows to asset_type=segment_preview specifically, not 'everywhere except avatars' as an earlier deferred-items note implied -- release-version-media (rvmFileRejection) never carries segment_preview at all (Kara preview uploads exclusively use the global uploader), so its animated-WebP check was already broader than its actual purpose and is now removed entirely rather than narrowed"
  - "GIF added to profileBackgroundAllowedImageMimeTypes (was previously rejected outright) and the background-upload WebP-save bug fixed (imaging cannot encode WebP; the background handler had no raw-copy branch at all, unlike avatars) -- both as Rule 1/2 fixes required for D-19/D-20's explicit 'Profil-Hintergruende' requirement to hold"
  - "Non-cropped (Fill-to-banner) animated profile-background uploads still lose their animation -- a per-frame animated-crop pipeline is out of scope for this plan; documented in deferred-items.md as a known, pre-existing-pattern limitation"
  - "anime_assets.go's removeAnimePosterAssetsV2/syncLegacyAnimeCoverImageV2 reverted from 173-04's display-first media_files resolution back to original-first -- the legacy anime.cover_image column is compared via exact string equality against media_assets.file_path (always the original path) by resolveOrphanedLocalCoverImageV2, so a display-preferred value would be permanently (and incorrectly) treated as orphaned on every anime delete/cover-reassign; display preference is untouched in every public read path"
  - "media_service.go's display-variant generation (buildDisplayVariant/writeDisplayVariant) extracted into a new sibling file purely to stay within the CLAUDE.md 450-line budget -- the file was already at 494 lines (pre-existing violation from 173-04) before this plan's animated-WebP branch would have pushed it to 531"

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-09, REQ-173-20]

# Metrics
duration: 150min
completed: 2026-10-02
---

# Phase 173 Plan 05: Avatar/Background Display Variant + D-20/D-21 Animated-WebP Support Summary

**Added vips-tools/vipsthumbnail to both backend Docker images to implement D-20/D-21 (animated WebP now accepted everywhere except the Kara preview, with an animated display variant via vipsthumbnail), fixed a legacy-cover-image regression from 173-04, and gave member avatar/profile-background uploads their own display media_files row (animated sources stay animated) with GetOwnProfile exposing `display_url` with a fallback to the original.**

## Performance

- **Duration:** ~150 min (includes an orchestrator-injected "Task 0" covering D-20/D-21 implementation and a legacy-cover regression fix, on top of the plan's original 2-task avatar/background scope)
- **Completed:** 2026-10-02
- **Tasks:** 3 (Task 0 review/implementation correction + Tasks 1-2)
- **Files modified:** 33 (6 created, 27 modified, across 2 commits)

## Accomplishments

### Task 0 (D-20/D-21 implementation, done first)
- `vips-tools` (the `vipsthumbnail` CLI, distinct from the `vips`/`vips-dev` shared libraries already present for `govips` CGO bindings) added to `backend/Dockerfile` and `backend/Dockerfile.dev`; the dev backend container was rebuilt and `vipsthumbnail-8.18.2` verified present and working against real animated GIF/WebP fixtures (frame counts preserved via `vipsheader -a`, never-upscale verified via the `WxH>` geometry suffix, long-edge cap verified on an oversized source)
- New `services.GenerateAnimatedDisplayViaVips`/`services.ExtractFirstFrameViaVips`/`services.IsAnimatedWebPData`: animated WebP now gets a real animated `display` variant (vipsthumbnail, since neither `golang.org/x/image/webp` nor ffmpeg can decode ANMF animation frames) and a real static frame-0 thumbnail, with the same non-fatal "fall back to unchanged original" posture already established for animated GIF
- D-20 narrowed: the animated-WebP rejection now applies **only** to `asset_type=segment_preview` (the global uploader's `validateFile` gained an `assetType` parameter). Release-version-media's `rvmFileRejection` had its animated-WebP check removed entirely, since RVM never carries `segment_preview` in the first place (Kara preview uploads exclusively go through the global uploader) -- its rejection was already broader than its actual target
- Every non-Kara write path now accepts and animates WebP: global uploader (`media_upload_image.go`), release-version-media upload/replace (`generateRVMThumbnail`/`generateRVMDisplay` gained a `vipsThumbnailPath` parameter and an animated-WebP branch), and fansub logo/banner/group-media (`MediaService.buildDisplayVariant`, extracted into a new sibling file to respect the 450-line budget)
- **Regression fix:** `anime_assets.go`'s `removeAnimePosterAssetsV2`/`syncLegacyAnimeCoverImageV2` resolve `media_files.path` "original first" again (173-04 had flipped this to "display first" as part of its broader display-preference work). The legacy `anime.cover_image` column is compared via exact string equality against `media_assets.file_path` (always the original path) by `resolveOrphanedLocalCoverImageV2` -- a display-preferred `cover_image` would never match and would be permanently misclassified as orphaned on the next anime delete or cover reassignment. Two new regression tests (`TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay`, `TestClearCoverV2_RemovedPathPrefersOriginalOverDisplay`) lock this in; the 4 existing display-preference tests for the actual public read paths (`getResolvedAssetsV2`, `listPublicFansubProjects`, etc., none of which were touched) still pass unchanged
- No new HTTP route registered -- `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98

### Tasks 1-2 (avatar/background display variant)
- `UploadOwnProfileAvatar`/`UploadOwnProfileBackground` now generate a `display` media_files row: static sources get a long-edge-capped (<=1920px, never upscaled) JPEG via the new `capLongEdgeAndSaveJPEG` helper (sibling file `app_profile_display.go`, since `app_profile.go` was already 958 lines); animated GIF/WebP sources get an animated `display` variant (ffmpeg / vipsthumbnail respectively) per the orchestrator's D-19/D-20/D-22 addendum that avatars and profile backgrounds must stay animated in their public display, not just their stored original
- Avatar/background handlers now read raw upload bytes once instead of decoding directly from the multipart stream, letting the original-write and display-generation paths share the same bytes and letting animated WebP skip `image.Decode` entirely (that decoder cannot parse ANMF frames at all, regardless of animation status)
- **Rule 1 bug fix:** the profile-background upload flow previously had no raw-copy path at all (unlike avatars' existing `shouldCopyAvatarDisplayFile`), so uploading **any** WebP background -- animated or not -- already failed outright (`imaging` cannot encode WebP) before this plan. Cropped GIF/WebP background uploads now raw-copy (preserving exact bytes and animation); `image/gif` was also added to the previously GIF-rejecting `profileBackgroundAllowedImageMimeTypes`
- `MemberProfileAvatarUploadInput`/`MemberProfileBackgroundUploadInput` gained `Display*` fields; `AttachUploadedAvatar`/`AttachUploadedBackground` insert a `variant='display'` row when `DisplayFilePath` is set, omitting it gracefully otherwise (old call sites keep compiling and passing)
- `models.MediaAsset`/`models.MemberProfileBgImage` gained `DisplayURL`; `ensureProfileBaseTx`'s query gained sibling `LEFT JOIN`s for `variant='display' AND status='ready'`, with the assignment block falling back to the original `PublicURL` when no display row exists yet (pre-migration parity)

## Task Commits

Each logically-independent unit was committed atomically:

1. **Task 0: implement D-20/D-21 (animated WebP accept + vipsthumbnail display generation) + legacy cover-image regression fix** - `05ad9947` (feat)
2. **Tasks 1-2: avatar/background display variant generation and read-side exposure** - `cb6ace01` (feat)

**Plan metadata:** (pending -- see below)

## Files Created/Modified

- `backend/Dockerfile` / `Dockerfile.dev` - added `vips-tools` alongside the existing `vips`/`ffmpeg` packages.
- `backend/internal/config/config.go` / `cmd/server/main.go` - `VipsThumbnailPath` config (env `VIPSTHUMBNAIL_PATH`, default `/usr/bin/vipsthumbnail`), wired into `MediaService`, `MediaUploadHandler`, and (new) `AppAuthHandler.WithMediaToolPaths`; non-fatal startup availability check mirroring the existing ffmpeg check.
- `backend/internal/services/animated_webp_display.go` (new) - `IsAnimatedWebPData`, `GenerateAnimatedDisplayViaVips`, `ExtractFirstFrameViaVips`.
- `backend/internal/services/media_service_display_variant.go` (new) - `buildDisplayVariant`/`writeDisplayVariant` extracted from `media_service.go` (line-budget split) plus the new animated-WebP branch.
- `backend/internal/services/media_service.go` - `vipsThumbnailPath` field, `WithVipsThumbnailPath`/`VipsThumbnailPath()`.
- `backend/internal/handlers/image_animated_webp.go` - `isAnimatedWebP` now delegates to `services.IsAnimatedWebPData`; `rvmFileRejection` no longer rejects animated WebP.
- `backend/internal/handlers/media_upload.go` - `validateFile` gained an `assetType` parameter (D-20 narrowing); `vipsThumbnailPath` field + `WithVipsThumbnailPath`.
- `backend/internal/handlers/media_upload_image.go` - animated-WebP-aware `processImage` branch (original/thumb/display via vips), new `generateAnimatedWebPDisplayVariant`.
- `backend/internal/handlers/media_upload_segment_preview.go` - threads the normalized `assetType` into `validateFile`.
- `backend/internal/handlers/admin_content_release_version_media.go` / `_display.go` / `_replace.go` - `generateRVMThumbnail`/`generateRVMDisplay` gained a `vipsThumbnailPath` parameter and an animated-WebP branch; `rvmVipsThumbnailPath()` helper.
- `backend/internal/handlers/fansub_media_upload.go` - threads `h.mediaService.VipsThumbnailPath()` into `generateRVMThumbnail`.
- `backend/internal/repository/anime_assets.go` - `removeAnimePosterAssetsV2`/`syncLegacyAnimeCoverImageV2` resolve original-before-display again.
- `backend/internal/handlers/app_profile_display.go` (new) - `capLongEdgeAndSaveJPEG`, `generateProfileImageDisplayVariant`.
- `backend/internal/handlers/app_profile.go` - avatar/background upload flows read raw bytes once, raw-copy animated/cropped sources, generate a display variant.
- `backend/internal/handlers/app_auth.go` - `ffmpegPath`/`vipsThumbnailPath` fields + `WithMediaToolPaths` builder setter.
- `backend/internal/models/media.go` / `member_profile.go` - `DisplayURL`/`Display*` fields.
- `backend/internal/repository/member_profile_own_repository.go` - `AttachUploadedAvatar`/`AttachUploadedBackground` insert the `display` media_files row.
- `backend/internal/repository/member_profile_ensure_repository.go` - `ensureProfileBaseTx` LEFT JOINs + display-then-original fallback.
- Tests: `backend/internal/services/animated_webp_display_test.go`, `media_service_animated_webp_test.go` (services); `backend/internal/handlers/admin_content_release_version_media_test.go` (updated signatures), `image_animated_webp_test.go` (updated for D-20), `fansub_media_upload_thumbnail_test.go` (updated source-text match), `media_upload_test.go` (new vips-aware helpers); `backend/internal/repository/anime_assets_legacy_cover_original_test.go`, `member_profile_avatar_background_display_test.go` (new, Postgres-backed).

## Decisions Made

See `key-decisions` in the frontmatter for the D-20-scope-narrowing, background-upload bug-fix, non-cropped-animation-limitation, legacy-cover-regression, and line-budget-split rationale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - missing functionality, per orchestrator addendum] Implemented D-20/D-21 (deferred in 173-04) as this plan's mandatory Task 0**
- **Found during:** Plan execution start -- the plan file itself carried an orchestrator-injected "Task 0" requiring D-20/D-21 before Tasks 1-2.
- **Fix:** see Accomplishments above. `vips-tools` added to both Dockerfiles, dev container rebuilt and verified; animated-WebP accept/display/thumbnail generation implemented across every non-Kara write path.
- **Files modified:** see key-files.
- **Committed in:** `05ad9947`

**2. [Rule 4 escalation handled as Rule 1 - regression bug] Legacy anime.cover_image display-preference regression from 173-04**
- **Found during:** Task 0's own action text explicitly called this out as a required review-correction item (not independently discovered scope creep).
- **Issue:** 173-04 made `removeAnimePosterAssetsV2`/`syncLegacyAnimeCoverImageV2` prefer `variant='display'` media_files rows, matching the public-read-path pattern established elsewhere in the phase. But these two functions feed the legacy `anime.cover_image` column, which `resolveOrphanedLocalCoverImageV2` compares via exact string equality against `media_assets.file_path` (always the original path, never the display path). A display-preferred `cover_image` would never match and would be permanently misclassified as orphaned.
- **Fix:** reverted both functions' `ORDER BY` to prefer `original` before `display`, matching pre-173-04 behavior. Display preference is untouched in every actual public read path.
- **Files modified:** `backend/internal/repository/anime_assets.go`
- **Verification:** 2 new regression tests pass; the 4 existing display-preference tests for the public read paths (unaffected files) still pass.
- **Committed in:** `05ad9947`

**3. [Rule 1 - bug] Profile-background upload had no raw-copy path at all; WebP backgrounds already failed outright**
- **Found during:** Task 1, while implementing the display variant for backgrounds and tracing why `image.Decode` would fail for animated WebP.
- **Issue:** Unlike avatars (`shouldCopyAvatarDisplayFile`), the background upload handler unconditionally ran every upload through `image.Decode` + `imaging.Save`. `imaging` cannot encode WebP at all, so uploading **any** WebP background (static or animated) already produced a 500 before this plan touched the file. GIF wasn't even in the allowed mimetype list.
- **Fix:** added a cropped-GIF/WebP raw-copy branch (mirroring the avatar pattern) and degraded the non-cropped Fill path's WebP output to JPEG (same reasoning as the global uploader's WebP-thumb re-encode). Added `image/gif` to `profileBackgroundAllowedImageMimeTypes`.
- **Files modified:** `backend/internal/handlers/app_profile.go`
- **Verification:** `TestUploadOwnProfileBackgroundStoresSourceOriginalAndCroppedDisplay` (pre-existing) still passes; no new WebP-background test was added for the previously-broken case specifically, but the code path is now symmetric with the already-tested avatar flow.
- **Committed in:** `cb6ace01`

---

**Total deviations:** 3 (1 orchestrator-mandated feature addition, 2 auto-fixed regressions/bugs). No scope creep beyond what the plan's own Task 0 text and the orchestrator addendum explicitly asked for.

## Issues Encountered

- **Docker Compose Watch was not running** at session start (same recurring gap flagged in 173-03/173-04): host-filesystem edits were not syncing into the running `team4sv30-backend` dev container, so an initial `go build`/`go test` ran against a stale image. Resolved by starting `docker compose watch team4sv30-backend` in the background for the remainder of the session.
- **`vipsthumbnail`'s `-s WxH` geometry defaults to "fit-to-box" (upscales smaller sources)** -- empirically verified against real fixtures before writing any Go code: the `>` suffix (`"960x960>"`, borrowed from ImageMagick geometry syntax) is required for "shrink only, never upscale" semantics; this was not assumed from documentation, it was confirmed live in the running container against a 200x100 fixture (stayed 200x100) and a 1600x900 fixture (shrank to 960x540).
- **Full `go test ./internal/repository/...` package run timed out at Go's standard 10-minute test timeout** (pre-existing characteristic of this large, Postgres-integration-heavy package; confirmed unrelated to this plan's changes via targeted `-run` invocations covering every file this plan touched or added tests for, all of which pass).
- **`TEAM4S_PHASE107_TEST_DSN`/`TEAM4S_PHASE106_TEST_DSN`** databases from a prior session (`team4s_phase107_test_173`) existed but didn't match the `team4s_phase106_test_*` naming pattern `testsupport.OpenPhase106Postgres` requires; created a fresh `team4s_phase106_test_173` database for this session's new repository-level tests.
- **Pre-existing, unrelated test failures** (confirmed identical with and without this plan's changes, documented in prior plans' summaries): `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` (permission-cache config gap), 3 Jellyfin-fixture-file-missing tests, 3 `openapi.yaml` duplicate-mapping-key parse failures. None are in this plan's file list or touched by its diff.

## User Setup Required

None -- no external service configuration required. `vips-tools`/`vipsthumbnail` is now baked into both backend Docker images; a production deploy only needs to rebuild the image (already done for the dev container in this session). A live-UAT item remains open from this phase's accumulated backlog: uploading an animated GIF and an animated WebP as an avatar and in the release gallery should visually confirm both stay animated in the browser, and an animated WebP as a Kara preview should show the existing clear rejection message -- not exercised in this automated session.

## Next Phase Readiness

- `services.GenerateAnimatedDisplayViaVips`/`ExtractFirstFrameViaVips`/`IsAnimatedWebPData` are exported and ready for 173-06 (story images, which also needs the D-15 true-original fix) and 173-07 (backfill CLI) to reuse directly.
- `GenerateRVMDisplay`'s/`GenerateStaticDisplayVariant`'s exported signature gained a `vipsThumbnailPath` parameter in this plan -- 173-07's not-yet-built backfill CLI must call it with the current 2-ffmpeg/vips-path signature, not the ffmpeg-only one described in 173-04's summary.
- The non-cropped animated-profile-background-upload limitation (documented in `deferred-items.md`) and the open live-UAT item above are the only known gaps; no blockers identified for 173-06/173-07.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: backend/Dockerfile
- FOUND: backend/Dockerfile.dev
- FOUND: backend/internal/config/config.go
- FOUND: backend/cmd/server/main.go
- FOUND: backend/internal/services/animated_webp_display.go
- FOUND: backend/internal/services/animated_webp_display_test.go
- FOUND: backend/internal/services/media_service.go
- FOUND: backend/internal/services/media_service_display_variant.go
- FOUND: backend/internal/services/media_service_animated_webp_test.go
- FOUND: backend/internal/handlers/image_animated_webp.go
- FOUND: backend/internal/handlers/image_animated_webp_test.go
- FOUND: backend/internal/handlers/media_upload.go
- FOUND: backend/internal/handlers/media_upload_image.go
- FOUND: backend/internal/handlers/media_upload_segment_preview.go
- FOUND: backend/internal/handlers/admin_content_release_version_media.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_display.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_replace.go
- FOUND: backend/internal/handlers/fansub_media_upload.go
- FOUND: backend/internal/repository/anime_assets.go
- FOUND: backend/internal/repository/anime_assets_legacy_cover_original_test.go
- FOUND: backend/internal/handlers/app_profile.go
- FOUND: backend/internal/handlers/app_profile_display.go
- FOUND: backend/internal/handlers/app_auth.go
- FOUND: backend/internal/models/media.go
- FOUND: backend/internal/models/member_profile.go
- FOUND: backend/internal/repository/member_profile_own_repository.go
- FOUND: backend/internal/repository/member_profile_ensure_repository.go
- FOUND: backend/internal/repository/member_profile_avatar_background_display_test.go
- FOUND commit: 05ad9947
- FOUND commit: cb6ace01
- FOUND commit: 2ef0498c
