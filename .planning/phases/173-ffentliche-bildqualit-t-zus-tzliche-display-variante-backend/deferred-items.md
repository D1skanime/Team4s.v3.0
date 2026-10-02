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
