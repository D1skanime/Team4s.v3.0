# Deferred items (Quick-Task 260923-amz)

## Pre-existing, out of scope (not caused by GAP-22/GAP-23 changes)

- `TestEpisodeVersionDeletePreservesSiblingSource` / `TestEpisodeVersionDeleteKeepsReferencedStreamSource`
  (`backend/internal/repository/episode_version_delete_integration_test.go`) fail with
  `column "episode_type_source" of relation "episodes" does not exist` inside
  `upsertImportEpisode`'s INSERT branch. The INSERT statement's column list is unchanged by
  this quick task (confirmed via `git diff` showing no changes to that INSERT). The fixture
  `openEpisodeImportSourceFixture` (`episode_import_source_integration_test.go`) never adds an
  `episode_type_source` column to its stub `episodes` table -- a pre-existing fixture/schema
  drift unrelated to GAP-22/GAP-23. Not fixed here (scope boundary).

- `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure`
  (`backend/internal/repository/episode_version_dates_integration_test.go`) fails with
  `column e.filler_source does not exist` inside `GetEpisodeClassificationByReleaseVersion`
  (`episode_classification.go`, untouched by this quick task). The fixture never adds a
  `filler_source` column to its stub `episodes` table -- pre-existing, unrelated to
  GAP-22/GAP-23. Not fixed here (scope boundary).

- Same `episode_type_source` fixture gap as above also pre-existing-fails these tests, all
  sharing `openEpisodeImportSourceFixture`:
  `TestEpisodeImportSourceCreateRepeatAndInitialBinding`,
  `TestEpisodeImportSourceRejectsAndRollsBack`,
  `TestEpisodeImportSourceCompleteEmptyClearsTechnicalStreams`,
  `TestEpisodeImportSourceSiblingPersistence`, `TestEpisodeImportSourceAliasesAndCoverage`,
  `TestEpisodeImportSourceOpposingConcurrentBatches`,
  `TestEpisodeImportSourceUnresolvedDuplicateFilenameCannotBind`. Confirmed via `git diff`
  that `upsertImportEpisode`'s INSERT column list is byte-identical before/after this quick
  task's edits -- these tests were already broken before Task 1/2 touched anything.

## Other pre-existing failures observed during full-suite verification (unrelated files)

- `TestEvaluateMemberMutationConflictBlocksLastActiveManager`
  (`fansub_group_app_members_repository_test.go`) and
  `TestFansubRepository_PublicProfileSourceInvariants` (`fansub_repository_test.go`): neither
  file is touched by this quick task (confirmed via `git diff --stat`, no output).
- All `TestPhase128*`/`TestArchive*`/`TestClaim*`/`TestMemberPointTotals*`/
  `TestLoadContributionBadges*`/`TestGetOwnDashboardPostgres*`/`TestLoadBadgeProgress*`/
  `TestGetPublicMemberProfilePostgres*`/`TestLoadPublicBadges*`/`TestLoadRoleVolume*` tests:
  fail with `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` (env var not
  set in this session) -- documented pre-existing environment dependency, unrelated to this
  quick task.
- All `TestPhase134Matrix*` tests: fail with `connect: connection refused` on
  `192.168.235.196:18093` (no server running on that port in this session) or keycloak
  password-grant `invalid_grant` -- documented pre-existing environment dependency (STATE.md
  already lists `Phase134Matrix*` as requiring a server on port 18093 that "in dieser Session
  nicht lief").
