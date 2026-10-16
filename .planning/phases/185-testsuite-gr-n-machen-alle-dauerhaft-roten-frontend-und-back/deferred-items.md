# Deferred Items — Phase 185 Testsuite

Out-of-scope test failures discovered while executing individual plans. Logged per the
executor's scope-boundary rule (only auto-fix issues directly caused by the current task's
changes) — not fixed here, left for a dedicated plan in this phase to triage.

## Found during 185-08 (backend/internal/repository full-package run)

All of the following were failing before and after 185-08's changes (local
`permissions.ActionReleaseVersionMediaReorder`/`Highlight`/`ActionReleaseVersionNotesViewAll`
CacheLoader stub additions + `member_claims` duplicate-table removal in
`effective_rights_service_test.go`). None of these files were touched by 185-08 and none
share a root cause with 185-08's fix:

- `member_archive_repository_test.go`: `TestArchiveUsesCanonicalStoredMemberSlug`,
  `TestArchiveVisibilityFilterExcludesNonPublicRows`, `TestArchivePaginationBounds`,
  `TestArchiveRoleFilter` — likely missing dedicated test DSN env var (not investigated).
- `member_claims_repository_test.go`: `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
  — static source-inspection assertion (`os.ReadFile` + `strings.Contains` against
  `member_claims_repository.go`) fails; looks like the asserted substrings have drifted from
  the current source, or this is one of the pre-existing `os.ReadFile`-based tests the
  project's "Teststil" convention already flags as legacy pattern to be replaced.
- `member_point_totals_*`, `contribution_badges_*`, `dashboard_*`, `public_member_profile_*`,
  `public_badges_*`, `role_volume_*` repository tests (many `TestLoad*Postgres*`,
  `TestGetOwnDashboardPostgres*`, `TestLoadPublicBadgesPostgres*` etc.) — likely all share one
  missing/misconfigured test DSN env var or migration-chain gap; not triaged individually.
- `phase128_*`: `TestPhase128VisibilityFirstReferenceMatrix`,
  `TestPhase128MemberSlugConcurrentAllocationScenarios` — DSN/migration-chain related,
  not triaged.
- `phase134_verification_matrix_access_test.go` / `phase134_verification_matrix_test.go`:
  all `TestPhase134Matrix*` tests — fail with Keycloak `invalid_grant` (`sheppert@team4s.local`
  password grant) and `connect: connection refused` to `192.168.235.196:18093`; these need a
  running Keycloak realm user and a backend listening on port 18093 that aren't available in
  this environment/run.
- `release_version_media_repository_test.go`: `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`,
  `TestReleaseVersionMedia_ListAllowsOrdinaryRowsWithoutHighlight`,
  `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`,
  `TestReleaseVersionMediaHighlightsAreIndependentFromPreview` — all fail with
  `ERROR: column au.display_name does not exist (SQLSTATE 42703)`; looks like a genuine
  schema/migration drift in the repository's SQL vs. the fixture it runs against.
- `release_version_media_cross_package_test.go`: `TestRVMHandler_ProzessmedienDefaults` —
  panics with a nil-pointer dereference inside
  `AdminContentHandler.UploadReleaseVersionMedia` (`admin_content_release_version_media_upload.go:251`);
  genuine handler bug, unrelated to 185-08's permissions/member_claims scope.

None of these touch `permissions.ActionReleaseVersionMediaReorder`/`Highlight`,
`ActionReleaseVersionNotesViewAll`, or `member_claims`, and `go test ./internal/services/...`
(the package 185-08's Task 2 fix lives in) is fully green with no new failures.
