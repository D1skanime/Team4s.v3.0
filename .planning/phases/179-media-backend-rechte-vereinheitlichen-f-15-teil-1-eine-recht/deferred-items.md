# Deferred Items — Phase 179

Out-of-scope findings discovered while verifying Plan 179-01's `go test ./...` acceptance
criterion. None of these are caused by Plan 179-01's changes (migration 0182, the new
`ActionReleaseThemeAssetUpload` constant, or the 9 fixture edits) — all were independently
confirmed to already fail against the pre-plan `main` commit (`fda8b921`) by temporarily
reverting the touched files and re-running the affected tests. Logged here per the executor's
Scope Boundary rule instead of being fixed inline.

## 1. `TestPhase141RevokedDelegationImmediateEffect` / `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`

- **Files:** `backend/internal/repository/release_review_query_repository_test.go`,
  `backend/internal/services/effective_rights_service_test.go`
- **Symptom:** `permission cache: Action "release_version_media.reorder" fehlt in
  role_capabilities und ist keine standalone-Action — Startup abgebrochen`
- **Root cause:** Both fixtures' hardcoded capability-catalog maps were already missing
  `permissions.ActionReleaseVersionMediaReorder` (an older, pre-existing action, unrelated to
  this phase's new `release_version_theme_asset.upload` action) before Plan 179-01 touched
  these files.
- **Verified pre-existing:** Reverted both files plus `permissions.go` to commit `fda8b921`
  (the commit immediately preceding this plan's work) and re-ran each test in isolation —
  both failed with the identical `release_version_media.reorder fehlt` message.
- **Action:** Not fixed in this plan. A future plan/task should add
  `permissions.ActionReleaseVersionMediaReorder` to both fixtures' catalog-completeness bucket.

## 2. Missing `TEAM4S_PHASE128_TEST_DSN` / `TEAM4S_PHASE134_TEST_DSN` / `TEAM4S_PHASE134_MIGRATION_DSN`

- **Files:** `backend/internal/repository/member_archive_repository_test.go`,
  `member_point_totals_repository_test.go`, `member_profile_role_volume_repository_test.go`,
  `member_public_access_repository_test.go`, `member_public_slug_test.go`,
  `phase134_verification_matrix_test.go`, `backend/internal/migrations/phase143_role_capability_defaults_reset_test.go`,
  and others.
- **Symptom:** `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` /
  equivalent for the Phase-134 DSNs.
- **Root cause:** These tests require dedicated, pre-provisioned ephemeral Postgres databases
  reachable via mandatory, fail-closed env vars. The env vars are not set when running
  `go test ./...` without first exporting them (Task 1 of this plan exported
  `TEAM4S_PHASE134_MIGRATION_DSN` only for its own targeted migration-proof test run).
- **Action:** Pre-existing environment/tooling gap, unrelated to Phase 179's media/rights
  scope. Not fixed in this plan.

## 3. Keycloak/network-dependent `TestPhase134Matrix*` tests

- **Files:** `backend/internal/repository/phase134_verification_matrix_access_test.go`,
  `phase134_verification_matrix_test.go`
- **Symptom:** `dial tcp 192.168.235.196:18093: connect: connection refused` and
  `keycloak password grant for sheppert@team4s.local: {"error":"invalid_grant",...}`
- **Root cause:** These tests expect a live backend listening on port 18093 and valid
  Keycloak credentials for the `sheppert` fixture user — both external to this plan's
  migration/permissions-registry work.
- **Action:** Pre-existing environment dependency, not fixed in this plan.

## 4. Missing Jellyfin audit fixture files

- **Files:** `backend/internal/handlers/admin_episode_import_test.go`,
  `jellyfin_media_source_test.go`, `jellyfin_source_batch_test.go`
- **Symptom:** `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no
  such file or directory`
- **Root cause:** Fixture JSON files referenced by these tests are absent from the current
  checkout/container filesystem — unrelated to permissions or media-upload handlers touched by
  this plan.
- **Action:** Pre-existing, not fixed in this plan.

## 6. `release_version_media_repository_test.go` fixture drift from Phase 169's `display_name` join (blocks Plan 179-04's own cited regression test)

- **Files:** `backend/internal/repository/release_version_media_repository_test.go`,
  `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Symptom:** Every test that calls `ListReleaseVersionMedia` against the
  `openReleaseVersionMediaReplaceFixture` schema fails with `ERROR: column au.display_name
  does not exist (SQLSTATE 42703)` — including `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`,
  the exact pre-existing regression test Plan 179-04's Task 1 `<verify>` step cites as "unaffected."
- **Root cause:** Commit `41fb9e49` (Phase 169, `fix(169): unify release media curation view`)
  added a `LEFT JOIN LATERAL` against `app_users.display_name`/`preferred_username` and
  `users.username` to `ListReleaseVersionMedia`'s SELECT, but
  `openReleaseVersionMediaReplaceFixture` still creates only a minimal `app_users (id BIGINT
  PRIMARY KEY)` / `users (id BIGINT PRIMARY KEY)` shape (from `createPhase106Prerequisites` plus
  its own `legacy_user_id` column) with no `display_name`/`preferred_username`/`username`
  columns at all.
- **Verified pre-existing and unrelated to Plan 179-04's changes:** Plan 179-04 only edits
  `SoftDeleteFansubGroupMedia`/`SoftDeleteReleaseVersionMedia` and adds a new
  `execSoftDelete` helper — it never touches `ListReleaseVersionMedia` or any of the three
  affected tables' schemas. Confirmed by running `go test ./internal/repository/... -run
  TestReleaseVersionMedia` (no `-run` filter restricted to this plan's own tests): 4 pre-existing
  failures (`TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`,
  `TestReleaseVersionMedia_ListAllowsOrdinaryRowsWithoutHighlight`,
  `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`,
  `TestReleaseVersionMediaHighlightsAreIndependentFromPreview`), all with the identical
  `au.display_name does not exist` error, all calling `ListReleaseVersionMedia` — none of which
  this plan's diff can cause.
- **Action:** Not fixed in this plan (out of scope per Scope Boundary — pre-existing fixture
  drift in a file this plan does not modify). Task 2's own new tests call
  `SoftDeleteReleaseVersionMedia`/`SoftDeleteFansubGroupMedia` directly and assert via raw
  `pool.QueryRow`, never through `ListReleaseVersionMedia`, so they are unaffected by this gap.
  A future plan should add `display_name`/`preferred_username` to `app_users` and `username` to
  `users` in `openReleaseVersionMediaReplaceFixture`.

## 8. `TestSearchBypass*`/`TestSearchNeverReturnsNullItemsForUnsearchedEntity` fail once `TEAM4S_PHASE106_TEST_DSN` is actually set (Plan 179-02)

- **Files:** `backend/internal/handlers/search_bypass_integration_test.go`
  (`TestSearchBypassTagOnlyFindsGermanTagTranslation`,
  `TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty`,
  `TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd`,
  `TestSearchNeverReturnsNullItemsForUnsearchedEntity`)
- **Symptom:** `status = 500 ... "code":"db_schema_mismatch","details":"Datenbank-Schema ist
  unvollstaendig oder Tabelle fehlt. Suche konnte nicht geladen werden."`
- **Root cause:** These tests are also gated by `testsupport.OpenPhase106Postgres`'s
  `TEAM4S_PHASE106_TEST_DSN` opt-in and therefore normally run as `SKIP` (not `FAIL`) in prior
  phases' `go test ./...` baselines, exactly like this plan's own two persistence tests before
  Plan 179-02 set the DSN to prove them for real. Plan 179-02 is the first plan in Phase 179 to
  export `TEAM4S_PHASE106_TEST_DSN` for a *full* `go test ./...` run (rather than only a
  `-run`-scoped one), which surfaces this pre-existing, unrelated fixture/schema issue that was
  previously hidden behind the SKIP gate.
- **Verified pre-existing and unrelated to Plan 179-02's changes:** `git log --oneline` on
  `search_bypass_integration_test.go` shows its last change was commit `cea49488` (`fix(160):
  search crash, tag divider and display-name sort`), long before Phase 179 started; Plan 179-02
  touches only `admin_content_release_theme_assets*.go` and
  `admin_content_fansub_releases_test.go` (theme-asset upload permission/persistence code),
  which the search subsystem never calls. Confirmed by running `go test ./... ` both with and
  without `TEAM4S_PHASE106_TEST_DSN` set: without it, these 4 tests simply do not appear in the
  failure list (they `SKIP`, matching the pre-179-02 baseline exactly); with it, the only new
  failures introduced are these 4 pre-existing search tests — no `ReleaseThemeAsset`-related
  test regresses in either run.
- **Action:** Not fixed in this plan (out of scope per Scope Boundary — pre-existing, unrelated
  subsystem). A future plan should repair `openSearchBypassFixture`'s isolated schema to match
  whatever the search repository's current SELECT actually requires.

## 7. `TestRVMHandler_ProzessmedienDefaults` panics the whole `internal/repository` test binary (nil `auditLogRepo`)

- **Files:** `backend/internal/repository/release_version_media_cross_package_test.go` (test),
  `backend/internal/handlers/admin_content_release_version_media_upload.go` (production code,
  line 251: `h.auditLogRepo.Write(...)`)
- **Symptom:** `go test ./internal/repository/...` panics with `invalid memory address or nil
  pointer dereference` inside `AdminContentHandler.UploadReleaseVersionMedia`, which aborts the
  entire test binary (not just this one test) — every test that would otherwise run after it in
  the same binary never executes.
- **Root cause:** The test's `AdminContentHandler` is constructed via `.WithMediaDeps(...)
  .WithPermissionDeps(...)` only, leaving `auditLogRepo` nil; the handler's upload success path
  unconditionally calls `h.auditLogRepo.Write(...)` with no nil guard. Unrelated to this plan —
  `admin_content_release_version_media_upload.go` and this cross-package test file are not
  touched by Plan 179-04 (which only edits `media_repository.go`,
  `release_version_media_repository.go`, and adds `media_soft_delete.go`/`media_soft_delete_test.go`).
- **Verified pre-existing:** Ran `go test ./internal/repository/... -run
  TestRVMHandler_ProzessmedienDefaults -v` in isolation — identical panic, confirming it is not
  an interaction with the new soft-delete code (the panic site is deep inside an unrelated
  upload handler's audit-logging call).
- **Action:** Not fixed in this plan. Because the panic aborts the whole test binary, a full
  `go test ./internal/repository/...` run cannot produce a complete pass/fail list in one
  invocation until this is fixed — Plan 179-04's own two new tests and the one pre-existing
  test it cites were each verified by running with a `-run` filter that isolates them from this
  panic. A future plan should either give `AdminContentHandler` a nil-safe audit-log call or make
  the cross-package test wire a no-op `auditLogRepo`.

## 5. Stale source-grep test referencing a renamed method

- **File:** `backend/internal/repository/member_claims_repository_test.go`
- **Test:** `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
- **Symptom:** `Should not be: -1` — the test does `strings.Index(content, "func (r
  *MemberClaimsRepository) SubmitClaim")` against `member_claims_repository.go`'s own source,
  but that exact method name/signature appears to have been refactored away; only
  `SearchHistoricalMembers` still exists in the expected form.
- **Root cause:** This is exactly the kind of source-grep (`os.ReadFile` +
  `strings.Contains`/`strings.Index`) test the project's `CLAUDE.md` Teststil rule flags as
  forbidden legacy debt (Altlast) — pre-existing, unrelated to the `MediaRepository`/permissions
  code this plan touches.
- **Action:** Pre-existing, not fixed in this plan.

## 9. `media_files.size` for the `original` variant diverges from the on-disk file size (found during live UAT, 2026-10-11)

- **Found during:** Human live-UAT of Phase 179 (release-media upload as a non-admin, Release-
  Version 28), not an automated test.
- **Symptom:** For `media_asset` 198's `original` variant, `media_files.size = 420918`, but the
  actual file on disk is `411456` bytes — a 9462-byte mismatch.
- **Suspected root cause:** The recorded size is likely captured before a downstream metadata-
  strip step runs on the uploaded file, so the persisted `size` reflects the pre-strip byte count
  while the file on disk is the post-strip (smaller) version.
- **Scope:** Not caused by, and not fixed in, Phase 179 (none of this phase's six plans touch
  the media upload/size-recording path — they touch permission checks, soft-delete SQL, and the
  anime-asset UI gate). Confirmed by the user as a non-blocker for this phase.
- **Action:** Not fixed here. A future phase should either record `size` after any metadata-strip
  step, or re-stat the file on disk after all post-processing completes, so `media_files.size`
  always matches the persisted file's actual byte count.
