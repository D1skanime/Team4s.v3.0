# Phase151 backend checks

Backend production remains byte-identical to Phase150 baseline `052858dc48576024518c5c527ae82c9d2027ac7b`.

- `docker exec team4sv30-backend go build ./...`: PASS.
- `docker exec team4sv30-backend go vet ./...`: PASS.
- Focused badges/repository regression command in `/tmp/team4s-151-final-badge-regressions.log`: PASS; all seven authoritative threshold families plus role-volume metadata, generic Karaoke-FX codes, contribution tiers and public progress metadata. 19 top-level tests.
- Guarded schema-only scratch PostgreSQL tests: PASS, public-profile2/6-project query counts20/20 and exact-once entry; reproducible `checks/check-postgres.py`. Repeated post-integration run on 2026-09-07 at 14:25 UTC PASS; both scratch databases were dropped in the guarded `finally` cleanup. Logs: `evidence/after/postgres-{131,150}.log` and `postgres-tests.json`.

## Broader repository diagnostic
An exploratory command incorrectly named `./internal/service` (the actual directory is `services`), causing one setup error. Its other target `./internal/repository` also reported 49 existing failures. No backend source was modified: `git diff 052858dc -- backend` is empty. Phase150's verification already records full-suite baseline failures.

The broader suite requires Phase128 PostgreSQL DSN fixtures and the Phase134 fixture runtime on port18093 with fixture accounts; these were absent. Other pre-existing failures include last-manager conflict and source-fragment expectations for member-claim guards. These unrelated tests are not made green by weakening tests, restoring old test data, changing credentials, or altering the backend in a presentation phase.

Broad diagnostic log: `/tmp/team4s-151-final-backend.log`; it is not the phase's PASS gate. Relevant focused tests, Go build/vet and real isolated PostgreSQL gates are reported separately.

Failed broad repository tests:
- `TestEvaluateMemberMutationConflictBlocksLastActiveManager`
- `TestArchiveUsesCanonicalStoredMemberSlug`
- `TestArchiveVisibilityFilterExcludesNonPublicRows`
- `TestArchivePaginationBounds`
- `TestArchiveRoleFilter`
- `TestClaimSubmitBlockedForMemorialProfile`
- `TestClaimBlockWritesDeniedAudit`
- `TestClaimBlockDeniedAuditOutcomeColocated`
- `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
- `TestMemberPointTotalsRankingUsesCanonicalStoredSlug`
- `TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly`
- `TestMemberPointTotalsPostgresRetrySameAwardDoesNotDoubleCount`
- `TestMemberPointTotalsPostgresReversalLowersTotal`
- `TestMemberPointTotalsRankingOrderAndTieBreak`
- `TestMemberPointTotalsRankingPageBounds`
- `TestLoadContributionBadgesPostgres`
- `TestLoadContributionBadgesProjectsCountPostgresMatchesRawValueAndBadgeDerivation`
- `TestLoadContributionBadgesChronicleCountPostgresMatchesRawValueAndBadgeDerivation`
- `TestLoadContributionBadgesArchivistCountPostgresMatchesRawValueAndBadgeDerivation`
- `TestGetOwnDashboardPostgresZeroStateForMemberWithoutActivity`
- `TestGetOwnDashboardPostgresPointMilestoneIncrementsBadgesCount`
- `TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount`
- `TestGetOwnDashboardPostgresRoleVolumeEntryCarriesRegistryTierAndThreshold`
- `TestGetOwnDashboardPostgresPointsProgressUsesRegistry`
- `TestGetOwnDashboardPostgresProjectsCountDivergesFromFamilyOneRawCount`
- `TestGetOwnDashboardPostgresImagesAndContributionsCountsUsePitfall2Sources`
- `TestLoadBadgeProgressPostgresIncludesRoleVolumeEntryPerRoleWithSynthesizedEntryStage`
- `TestLoadBadgeProgressPostgresZeroAwardedRolesProducesNoRoleVolumeEntries`
- `TestGetPublicMemberProfilePostgresIncludesTotalPoints`
- `TestLoadPublicBadgesPostgresRoleEntryAwardedVisible`
- `TestLoadPublicBadgesPostgresKaraokeFXAwardedVisible`
- `TestLoadPublicBadgesPostgresRoleEntryReversedHidden`
- `TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears`
- `TestLoadPublicBadgesPostgresRoleVolume`
- `TestLoadRoleVolumeCountsPostgresMatchesRawValueAndBadgeDerivation`
- `TestLoadRoleVolumeCountsPostgresEmptyForMemberWithoutCredits`
- `TestLoadRoleVolumeBadgesPostgresProgressBoundaries`
- `TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive`
- `TestPhase128VisibilityFirstReferenceMatrix`
- `TestPhase128MemberSlugConcurrentAllocationScenarios`
- `TestPhase134MatrixAnonymousPublicProfile`
- `TestPhase134MatrixMissingProfile`
- `TestPhase134MatrixHiddenProfileIsIndistinguishableFromMissing`
- `TestPhase134MatrixOwnerPreviewOfHiddenProfile`
- `TestPhase134MatrixRefreshOnlyOwnerAccess`
- `TestPhase134MatrixSparseProfileMatchesManifest`
- `TestPhase134MatrixDenseProfileMatchesManifest`
- `TestPhase134MatrixErrorMalformedSlugDoesNotPanic`
- `TestPhase134MatrixPaginationHonestAcrossPages`
