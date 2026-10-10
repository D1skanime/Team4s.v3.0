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
