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
