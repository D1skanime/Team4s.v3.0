# Phase 161 baseline checks

Baseline revision: b3b07ff0. These results were collected before any runtime source edits.

| Check | Result |
|---|---|
| Focused Jellyfin handler tests | PASS |
| Backend build and vet | PASS |
| Frontend typecheck | FAIL: two existing Next page export/type errors; formatEditLoadError and AdminAnimePageProps |
| Global frontend lint | FAIL: 13 errors, 328 warnings |
| Full frontend tests | 2714 pass, two existing CSS custom-property guard failures, three todo; 320 files pass, one fails, one skips |
| Isolated full production build | Webpack compilation succeeds; Next page validation fails on existing formatEditLoadError export |
| Broad Go handler/repository/service suite | FAIL: existing source invariants and unavailable legacy fixture services/DSNs; see failure list |

No failing global gate is presented as passed. Phase-specific checks must pass and final broad failures must be compared with this baseline. The build ran in a unique /tmp directory inside the existing frontend container and did not touch the running dev server's .next directory.

## Existing broad Go failures

- TestEvaluateMemberMutationConflictBlocksLastActiveManager
- TestFansubRepository_PublicProfileSourceInvariants
- TestArchiveUsesCanonicalStoredMemberSlug
- TestArchiveVisibilityFilterExcludesNonPublicRows
- TestArchivePaginationBounds
- TestArchiveRoleFilter
- TestClaimSubmitBlockedForMemorialProfile
- TestClaimBlockWritesDeniedAudit
- TestClaimBlockDeniedAuditOutcomeColocated
- TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers
- TestMemberPointTotalsRankingUsesCanonicalStoredSlug
- TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly
- TestMemberPointTotalsPostgresRetrySameAwardDoesNotDoubleCount
- TestMemberPointTotalsPostgresReversalLowersTotal
- TestMemberPointTotalsRankingOrderAndTieBreak
- TestMemberPointTotalsRankingPageBounds
- TestLoadContributionBadgesPostgres
- TestLoadContributionBadgesProjectsCountPostgresMatchesRawValueAndBadgeDerivation
- TestLoadContributionBadgesChronicleCountPostgresMatchesRawValueAndBadgeDerivation
- TestLoadContributionBadgesArchivistCountPostgresMatchesRawValueAndBadgeDerivation
- TestGetOwnDashboardPostgresZeroStateForMemberWithoutActivity
- TestGetOwnDashboardPostgresPointMilestoneIncrementsBadgesCount
- TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount
- TestGetOwnDashboardPostgresRoleVolumeEntryCarriesRegistryTierAndThreshold
- TestGetOwnDashboardPostgresPointsProgressUsesRegistry
- TestGetOwnDashboardPostgresProjectsCountDivergesFromFamilyOneRawCount
- TestGetOwnDashboardPostgresImagesAndContributionsCountsUsePitfall2Sources
- TestLoadBadgeProgressPostgresIncludesRoleVolumeEntryPerRoleWithSynthesizedEntryStage
- TestLoadBadgeProgressPostgresZeroAwardedRolesProducesNoRoleVolumeEntries
- TestGetPublicMemberProfilePostgresIncludesTotalPoints
- TestLoadPublicBadgesPostgresRoleEntryAwardedVisible
- TestLoadPublicBadgesPostgresKaraokeFXAwardedVisible
- TestLoadPublicBadgesPostgresRoleEntryReversedHidden
- TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears
- TestLoadPublicBadgesPostgresRoleVolume
- TestLoadRoleVolumeCountsPostgresMatchesRawValueAndBadgeDerivation
- TestLoadRoleVolumeCountsPostgresEmptyForMemberWithoutCredits
- TestLoadRoleVolumeBadgesPostgresProgressBoundaries
- TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive
- TestPhase128VisibilityFirstReferenceMatrix
- TestPhase128MemberSlugConcurrentAllocationScenarios
- TestPhase134MatrixAnonymousPublicProfile
- TestPhase134MatrixMissingProfile
- TestPhase134MatrixHiddenProfileIsIndistinguishableFromMissing
- TestPhase134MatrixOwnerPreviewOfHiddenProfile
- TestPhase134MatrixRefreshOnlyOwnerAccess
- TestPhase134MatrixSparseProfileMatchesManifest
- TestPhase134MatrixDenseProfileMatchesManifest
- TestPhase134MatrixErrorMalformedSlugDoesNotPanic
- TestPhase134MatrixPaginationHonestAcrossPages
