# Deferred Items — Phase 173

## 173-02: pre-existing `openRVMExecFixture` schema gap (out of scope)

**Found during:** Task 1 verification (`go test ./internal/handlers/... -run TestReleaseVersionMedia -v` against `TEAM4S_PHASE107_TEST_DSN`).

**Symptom:** 4 tests unrelated to this plan's display-variant work fail with `db_schema_mismatch`
(Postgres `42703`/`42P01`, surfaced via `classifyInternalError`):
- `TestPatchReleaseVersionMediaResponseKeepsActorPermissions/allowed_actor's_response_carries_true_can_update/can_delete`
- `TestPatchReleaseVersionMediaAllowsCategoryChange`
- `TestReleaseVersionMedia_SoftDeleteExcludesFromList`
- `TestReleaseVersionMedia_ReorderRequiresVersionOwnership` (both subtests)

**Root cause:** `repository.MediaRepository.ListReleaseVersionMedia`'s SQL selects
`au.display_name` and `au.preferred_username` from `app_users` (`au`), but the test fixture's
`app_users` table — built by `testsupport.createPhase107Prerequisites` (`id`, `status` only) plus
`openRVMExecFixture`'s own `ALTER TABLE app_users ADD COLUMN legacy_user_id ...` — never adds
`display_name` or `preferred_username`. Every code path that calls `ListReleaseVersionMedia`
(List, Patch's response reload, Delete-adjacent list assertions, Reorder's story-order reload)
fails against this fixture.

**Why out of scope for 173-02:** This plan's files are the upload handler
(`UploadReleaseVersionMedia` / `processOneRVMFile`) and the new display-variant helper file. None
of the failing tests exercise the upload path — they exercise List/Patch/Reorder, which this plan
does not modify. The gap pre-exists this plan's changes (confirmed: it reproduces identically with
and without this plan's edits, and the affected SQL/fixture files are untouched by this plan's
diff).

**Suggested fix (for whichever later plan touches `openRVMExecFixture` or the list query):** add
`display_name TEXT NULL, preferred_username TEXT NULL` columns to the fixture's `app_users` ALTER
block in `admin_content_release_version_media_test.go`'s `openRVMExecFixture`, or add a dedicated
regression test asserting the fixture matches the production `app_users` migration shape.

**Verification that 173-02's own changes are unaffected:** `TestUploadReleaseVersionMediaHandlerExists`,
`TestReleaseVersionMedia_UploadReturnsAuthoritativeSourceRevision`, and all 4 new display-variant
tests (`TestReleaseVersionMedia_DisplayVariantNoUpscale`,
`TestReleaseVersionMedia_DisplayVariantCapsLongEdge`,
`TestReleaseVersionMedia_WebPOriginalKeepsRealBytes`, `TestGenerateStaticDisplayVariant`) pass
cleanly against the same fixture/DSN.

## 173-09: pre-existing `TestFansubRepository_PublicProfileSourceInvariants` source-text gap (out of scope)

**Found during:** Task 2 verification (`go test ./internal/repository/... -count=1` full-package run).

**Symptom:** `TestFansubRepository_PublicProfileSourceInvariants` fails with
`expected public profile repository to contain "FROM anime_media am"`.

**Root cause:** The test reads `fansub_repository.go`'s own source text via `os.ReadFile` and
checks for the literal substring `"FROM anime_media am"` (a CLAUDE.md-"Verboten" absence/presence
source-text assertion, not a real-DB behavioral test). That SQL fragment lives in
`publicProjectBannerJoinSQL`, which was already extracted into the separate
`fansub_project_artwork.go` file in an earlier, uncommitted revision of this phase (visible in
`git status` as modified `173-04-PLAN.md`/`173-05-PLAN.md`/`173-CONTEXT.md` at session start) —
`fansub_repository.go` itself only references the constant by name. This is unrelated to 173-09's
display-variant SQL edits: confirmed via `git stash`, the string is absent from
`fansub_repository.go` with or without this plan's changes (count `0` either way).

**Why out of scope for 173-09:** This plan's files are `theme_segment_preview.go`,
`anime_v2.go`, `anime_assets.go`, and `fansub_project_artwork.go`. `fansub_repository.go` itself
is untouched by this plan's diff, and the test's failure mode (a stale source-text substring
check surviving a prior cross-file refactor) is orthogonal to display-variant SQL priority.

**Suggested fix (for whichever later plan touches `fansub_repository_test.go`):** either update
the test to check `fansub_project_artwork.go` for the `anime_media`/banner fragments it moved to,
or replace the source-text assertion with a real-DB behavioral test per CLAUDE.md's Teststil
convention (the newly-added `TestListPublicFansubProjects_BannerPrefersDisplayOverOriginal` in
this plan is one such example already covering the same query).

## 173-04 Task 0: D-20/D-21 (animated WebP accept + libvips resize) explicitly deferred — RESOLVED in 173-05 Task 0

**Status update (173-05 Task 0, 2026-10-02):** `vips-tools` (CLI `vipsthumbnail`) has been added to
both `backend/Dockerfile` and `backend/Dockerfile.dev`; the dev backend container was rebuilt
and `vipsthumbnail -8.18.2` confirmed present and working (verified against real animated GIF/
WebP fixtures: all frames preserved via `[n=-1]`, never-upscale via the `WxH>` geometry suffix).
Animated WebP is now accepted everywhere except `asset_type=segment_preview` (D-20): the global
uploader (`media_upload_image.go`), release-version-media upload/replace, and fansub logo/banner/
group-media (`MediaService.SaveUpload`) all generate an animated `display` variant via the new
`services.GenerateAnimatedDisplayViaVips`/`services.ExtractFirstFrameViaVips` helpers, with a
non-fatal fallback to the unchanged original on failure (never a static frame for an animation).
The original deferred-items entry below is kept for historical context on why it was deferred in
173-04; it no longer reflects the current state of the codebase.

**Scope:** Task 0's action text asks for (a) narrowing the existing animated-WebP upload
rejection to `asset_type=segment_preview` only (D-20) and (b) accepting animated WebP for all
other asset types/write paths, producing an animated `display` variant via `vipsthumbnail
"[n=-1]"` (D-21, `vips-tools` added to `backend/Dockerfile` and `backend/Dockerfile.dev`).

**What was verified:** `vipsthumbnail` is NOT present in the currently-running dev container
(`team4sv30-backend`, built from `Dockerfile.dev`, which installs `ffmpeg` but not `vips`/
`vips-tools`); only `ffmpeg`/`ffprobe` are installed. `Dockerfile` (production) installs `vips`/
`vips-dev` for `govips` CGO bindings, but no Go code in this repository actually imports/uses
`govips` (`grep -rn "govips\|vips\." --include="*.go"` returns nothing) — the packages appear to
be scaffolding from an earlier, never-landed integration, not a working `vipsthumbnail` CLI
install (`vips`/`vips-dev` are libvips shared libraries/headers, not the separate `vips-tools`
package that ships the `vipsthumbnail` binary).

**Why deferred rather than implemented:** Accepting animated WebP uploads without a working
resize/decode path would mean either (1) storing them unprocessed with no real `display`
variant (silently violating D-19/D-20's "must stay animated" requirement for the `display` row
specifically, since there would be none), or (2) adding `vips-tools` to both Dockerfiles and
rebuilding the long-running dev container mid-session, which is a meaningfully larger and
riskier change (new system package, two Dockerfile edits, full image rebuild on the shared dev
host) than this task's core, already-large scope of shared display-variant/EXIF/transparency
fixes. Shipping a half-correct accept-path was judged worse than leaving the existing,
safe, already-tested rejection in place.

**What was NOT changed:** `isAnimatedWebP`/`rvmFileRejection`/`image_animated_webp.go`'s
rejection message and scope are untouched — animated WebP uploads are still rejected for ALL
asset types (not narrowed to `segment_preview` only), exactly as before this plan.

**Suggested follow-up:** A small, dedicated later plan should (1) add `vips-tools` to both
Dockerfiles, (2) rebuild/verify `vipsthumbnail` is present in both the dev and prod images, (3)
implement the accept-and-resize path using `vipsthumbnail "<path>[n=-1]" -s
960x960 -o display.webp` per D-21, with the same original-on-failure fallback this plan already
established for animated GIFs, and (4) narrow the existing rejection to `asset_type=
segment_preview` only as D-20 specifies.
