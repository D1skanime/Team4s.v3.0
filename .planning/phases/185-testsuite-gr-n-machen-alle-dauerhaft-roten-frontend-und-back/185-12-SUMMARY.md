---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 12
subsystem: testing
tags: [go, vitest, keycloak, docker, postgres, bluemonday, tiptap, phase134]

# Dependency graph
requires:
  - phase: 185-01
    provides: "Frontend contract-test fix (anime-detail-contract.test.ts), the single frontend cluster"
  - phase: 185-02
    provides: "public.unaccent fixture fix closing the 44-test Phase-139/167 cluster"
  - phase: 185-03
    provides: "ResolveMigrationsDir D-04 fix"
  - phase: 185-04
    provides: "Jellyfin-preview-EOF cluster fix, resolved as real bug not Alpine artifact"
  - phase: 185-05
    provides: "Phase-134-Matrix env-overridable base URLs (container-network addressing)"
  - phase: 185-06
    provides: "fansub display-url FK seed, group_release_version_count ID collision, search-bypass schema fix"
  - phase: 185-07
    provides: "episode_type_source/filler_source and role_capabilities fixture gaps"
  - phase: 185-08
    provides: "permissions.CacheLoader catalog-completeness gaps + duplicate member_claims table"
  - phase: 185-09
    provides: "OVA cover resolver, RVM uploader-identity columns, nil audit-log fake"
  - phase: 185-10
    provides: "member_claims_repository_test.go converted to real behavior tests"
  - phase: 185-11
    provides: "scripts/test-backend.sh reproducible full backend test runner, with the
      Phase-134-Matrix cluster (9 tests) left red due to a Keycloak dev-account credential
      issue -- this plan's starting point"
provides:
  - "Phase's own stated exit criterion (D-07, final sentence) met with concrete evidence:
    full frontend suite (vitest run) and full backend suite (scripts/test-backend.sh) each
    ran twice in a row, both 0 red"
  - "Keycloak accounts csubs-leader@team4s.local and sheppert@team4s.local recreated via
    kcadm (did not exist at all, not merely a password drift) in the live team4s realm,
    unblocking the Phase-134-Matrix cluster's identity/authz bootstrap step"
  - "team4s-team4sv30-backend Dockerfile.dev image rebuilt -- the temporary
    team4s-phase134-backend container (started via `docker compose run`) bakes its /app
    source at image-build time and is NOT covered by the long-running `docker compose
    watch` sync, so it was running Oct-14-era code, two days stale relative to the
    Oct-14-23:38 commit that dropped anime.cover_image -- causing a genuine
    db_schema_mismatch 500 on ListFansubAnime during the matrix seed script"
  - "Real, previously undetected production bug fixed: bluemonday's story-image src
    AllowAttrs regex in tiptap_service.go still only matched the pre-Plan-173-06
    'original.<ext>' path shape; since Oct 2 (Plan 173-06) media_assets.file_path has
    always pointed at the capped 'display.jpg' variant, so every story-image <img> in
    rendered member_story_html has been silently stripped of its src attribute in
    production since then -- undetected because unit tests mocked the resolver with
    'original.jpg' fixtures and no end-to-end seed/integration run had reached this code
    path (blocked earlier by the Keycloak and stale-image issues above)"
  - "All 94 originally-red tests from 185-CONTEXT.md's cluster table (1 frontend + 93
    backend) individually confirmed passing by exact name, cross-referenced against both
    full-suite runs' captured logs"
affects: [185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back-phase-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A temporary container started via `docker compose run --rm -d --name <other-name>
      <service>` uses the SERVICE's built image as of its last `docker compose build`,
      never the live-synced source that `docker compose watch <service>` keeps flowing
      into the already-running, differently-named long-lived container -- any script that
      spins up a short-lived sibling container from the same service definition must
      rebuild the image first if source has changed since the last build."
    - "When a repository-layer column is deliberately repurposed (media_assets.file_path
      pointing at a derived/capped variant instead of the literal original, per Plan
      173-06), grep every consumer that pattern-matches the OLD path shape (sanitizer
      allow-lists, URL regexes, mock resolver test fixtures) -- a passing unit-test suite
      built on mocked fixtures does not prove the real resolver's output still satisfies a
      downstream allow-list regex."

key-files:
  created: []
  modified:
    - backend/internal/services/tiptap_service.go
    - backend/internal/services/tiptap_service_test.go
    - backend/internal/handlers/app_profile_story_image_test.go

key-decisions:
  - "Keycloak accounts: created missing csubs-leader@team4s.local/sheppert@team4s.local
    users via kcadm (not merely a password reset -- `kcadm.sh get users -q email=...`
    returned an empty array for both, confirming they did not exist in the live `team4s`
    realm at all), set password '123' non-temporary, and granted csubs-leader the
    `platform_admin` realm role -- matching the exact convention already documented in
    STATE.md's Phase 134 history and provision-phase134-matrix-db.sh's own Step 4.5
    bootstrap SQL, which assumes these Keycloak accounts pre-exist."
  - "Rebuilt team4s-team4sv30-backend (docker-compose.override.yml's Dockerfile.dev) via
    `docker compose build team4sv30-backend` -- the fix target of a genuinely stale image,
    not a workaround; the long-running `team4sv30-backend` container stays current via
    `docker compose watch`, but `provision-phase134-matrix-db.sh`'s `docker compose run
    --rm -d --name team4s-phase134-backend ... team4sv30-backend` starts a NEW container
    from the image, which only reflects source as of the last build."
  - "Fixed the bluemonday src regex in tiptap_service.go to match
    `/media/profile/<id>/story/<uuid>/display.jpg` (the exact, hardcoded path shape
    app_profile_story_image.go always writes to media_assets.file_path since Plan 173-06),
    replacing the stale `original\\.(jpg|jpeg|png|webp)` pattern -- confirmed via
    member_profile_story_image_original_test.go's own existing, explicit assertion that
    file_path 'muss die Anzeige-Datei bleiben, nicht das Original'. Updated the two test
    files whose fixtures mocked the OLD 'original.jpg' shape to use 'display.jpg' instead,
    matching reality."
  - "Treated all three discoveries (Keycloak accounts missing, stale Docker image, stale
    sanitizer regex) as Rule 1/Rule 3 auto-fixes, not Rule 4 architectural questions: each
    is a narrow, verifiable, low-risk correction (recreate two documented dev accounts
    exactly as already established; rebuild an image from already-committed source; widen
    an allow-list regex to match the application's own already-shipped, already-tested
    intended behavior) required to reach the plan's own stated goal of two genuinely clean
    runs, not scope creep."

requirements-completed: [D-07]

# Metrics
duration: ~25min
completed: 2026-10-16
---

# Phase 185 Plan 12: Final Twice-Green Proof (D-07 Exit Criterion) Summary

**Both full suites (frontend `vitest run`, backend `scripts/test-backend.sh`) ran twice in a row with 0 red tests each; all 94 originally-red tests from 185-CONTEXT.md's cluster table are individually confirmed passing by name -- reached only after fixing three real, previously undiscovered blockers (missing Keycloak dev accounts, a stale Docker image, and a genuine production bug in the story-image sanitizer regex).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-16T21:48:57Z
- **Completed:** 2026-10-16T22:12:00Z (approx)
- **Tasks:** 3/3 completed
- **Files modified:** 3

## Accomplishments

- **Frontend suite ran twice, 0 red both times:** `docker exec team4sv30-frontend npm test`
  (`vitest run`) reported **390/391 test files passed (1 pre-existing, unrelated, intentional
  skip), 3548/3551 tests passed (3 intentional `it.todo`)** in both runs, identical results.
  `anime-detail-contract.test.ts`'s 4 tests (including the one named 185-CONTEXT.md cluster
  test) passed in both runs.
- **Backend suite ran twice via `scripts/test-backend.sh`, both ending in `GATE: GREEN (0)`:**
  all ~303 non-Phase-134-Matrix test functions across every package (`handlers`, `repository`,
  `services`, `migrations`, `permissions`, `testsupport`, `testquality`) passed, plus all 9
  Phase-134-Matrix tests, in both runs. `go test exit code: 0` both times; no expected
  `*_TEST_DSN` suite was silently skipped; the Phase-134-Matrix provisioning step itself reported
  `OK` both times (it had never once succeeded before in this phase's entire investigation).
- **Diagnosed and fixed the documented Keycloak-credential blocker from 185-11, confirming it
  was NOT a password drift but two genuinely missing accounts:** `kcadm.sh get users -r team4s
  -q email=csubs-leader@team4s.local` / `...sheppert@team4s.local` both returned `[ ]` (empty) --
  neither account existed anywhere in the live `team4s` realm, under any email domain. Created
  both via `kcadm.sh create users` + `kcadm.sh set-password` (non-temporary, password `123`,
  matching the already-documented local dev-account convention) and granted `csubs-leader` the
  `platform_admin` realm role. Verified both password-grant token fetches succeed afterward.
- **Discovered and fixed a second, independent blocker (not documented by 185-11, since
  185-11's own run never got past the Keycloak failure to reach it):** the temporary
  `team4s-phase134-backend` container (started by `provision-phase134-matrix-db.sh` via `docker
  compose run --rm -d --name team4s-phase134-backend ... team4sv30-backend`) was running a
  Docker image built **2026-10-14T07:45**, two days stale relative to commit `a2848ae31`
  (2026-10-14T23:38, Phase 182-03) which dropped `anime.cover_image` and rewired `ListFansubAnime`
  to the new cover-resolver columns. The long-running `team4sv30-backend` dev container stays
  current via `docker compose watch`, but a NEW container started from the same service
  definition via `docker compose run` is not covered by that watch/sync -- it only reflects
  source as of the image's last build. This caused a genuine `db_schema_mismatch` 500 on
  `GET /api/v1/admin/fansubs/1/anime` during the Phase-134-Matrix seed script, aborting
  provisioning. Fixed by `docker compose build team4sv30-backend`.
- **Discovered and fixed a third, genuine, previously undetected production bug** once the
  above two fixes let the seed script run far enough to reach its own internal scenario
  assertions for the first time in this phase: bluemonday's `src` allow-list regex in
  `tiptap_service.go` still only matched the pre-Plan-173-06 `original.<ext>` path shape, but
  `media_assets.file_path` has pointed at the capped `display.jpg` variant by deliberate design
  since commit `7ef8ed23d` (2026-10-02, Plan 173-06) -- meaning every story-image `<img>`
  embedded in a member's rendered `member_story_html` has had its `src` attribute silently
  stripped by the sanitizer in production since Oct 2, invisible to unit tests because they
  mock the resolver with `original.jpg`-shaped fixtures that never reflect the real,
  intentionally-changed file-path convention. Fixed the regex to match
  `/media/profile/<id>/story/<uuid>/display.jpg`; updated the two test files whose fixtures
  encoded the stale shape.
- After fixing all three, `scripts/provision-phase134-matrix-db.sh` run standalone went from
  **13/15 → 15/15** scenario checks, `RESULT: PASS`, exit code 0 -- for the first time in this
  phase's investigation history.
- **All 94 originally-red tests from 185-CONTEXT.md's cluster table individually confirmed
  passing by exact name** against both backend runs' captured logs and both frontend runs'
  captured logs (see checklist below). No test was deleted or silently skipped.
- `team4s_v2` was never touched by anything in this plan -- all database work (Keycloak account
  creation touches no database directly; `scripts/test-backend.sh`'s own 23 throwaway databases;
  the one diagnostic `pg_dump --schema-only`-sourced clone) stayed within the already-established
  throwaway-database pattern.

## Task Commits

1. **Task 1: Run the full frontend suite twice** - no commit (pure verification, 0 files
   changed; both runs' outputs captured and quoted below)
2. **Task 2: Run the full backend suite twice via scripts/test-backend.sh** - `a91731bfe` (fix) --
   the one code commit this plan produced, needed to unblock the Phase-134-Matrix cluster
   before the two required clean runs could happen (see Deviations)
3. **Task 3: Cross-reference all 94 originally-red tests by name** - no commit (pure
   verification/documentation; result is this SUMMARY.md)

**Plan metadata:** (this commit, created alongside STATE.md/ROADMAP.md update)

## Files Created/Modified

- `backend/internal/services/tiptap_service.go` - `newTipTapSanitizerPolicy`'s `AllowAttrs("src")`
  regex changed from `^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$` to
  `^/media/profile/\d+/story/[a-z0-9-]+/display\.jpg$`, with an updated doc comment explaining
  why (Plan 173-06's file_path repurposing).
- `backend/internal/services/tiptap_service_test.go` - 6 occurrences of the mock-resolver/
  assertion literal `/media/profile/1/story/abc/original.jpg` changed to
  `/media/profile/1/story/abc/display.jpg` across `TestTipTapRenderHTMLImageNode_WithResolver`,
  `TestTipTapSanitizeImage_AllowsValidImg`, `TestTipTapSanitizeImage_BlocksScript`, and
  `TestTipTapSanitizeImage_BlocksStyleBeyondWidth`.
- `backend/internal/handlers/app_profile_story_image_test.go` - `TestStoryImageRoundTrip`'s mock
  `StoryImageAssetRef.FilePath` and its `src="..."` assertion changed from `original.jpg` to
  `display.jpg` to match the real, current file-path convention (the test's own purpose --
  proving the sanitizer does not strip a legitimate internal src -- was previously passing only
  because the stale regex happened to still match the OLD convention the mock used).

(Not files, but part of this plan's fixes: the live Keycloak `team4s` realm now has
`csubs-leader`/`sheppert` user accounts, and the `team4s-team4sv30-backend` Docker image was
rebuilt from current source.)

## Decisions Made

See frontmatter `key-decisions` for the full list. In summary: all three fixes (Keycloak account
recreation, Docker image rebuild, sanitizer regex correction) were treated as in-scope Rule 1/3
auto-fixes rather than architectural questions or deferred gaps, because each was independently
narrow, low-risk, and verifiable, and all three were strictly necessary to reach this plan's own
stated goal (two genuinely clean, non-papered-over runs of both suites).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Keycloak accounts csubs-leader@team4s.local/sheppert@team4s.local did
not exist at all (not a password drift)**
- **Found during:** Task 2, pre-run diagnosis (per this plan's explicit instructions to attempt
  resolving 185-11's documented Keycloak blocker before the final proof runs)
- **Issue:** `kcadm.sh get users -r team4s -q email=csubs-leader@team4s.local` /
  `...sheppert@team4s.local` both returned `[ ]` -- neither account existed under any
  email domain in the live `team4s` realm (confirmed against the full 9-user realm listing).
- **Fix:** `kcadm.sh create users` for both (username/email matching the established
  `<nickname>@team4s.local` convention, `fansubName` attribute set, `enabled=true`), then
  `kcadm.sh set-password --new-password 123` (non-temporary, matching the documented local
  dev-account convention) for both, then `kcadm.sh add-roles --rolename platform_admin` for
  `csubs-leader` only (matching `provision-phase134-matrix-db.sh`'s own asymmetric grant).
- **Verification:** Direct `curl` password-grant token fetch against
  `http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token` succeeds for both
  accounts afterward (`access_token present: True`).
- **Committed in:** n/a (live Keycloak realm state, not a repo file)

**2. [Rule 3 - Blocking] team4s-team4sv30-backend Docker image was 2 days stale relative to the
live source**
- **Found during:** Task 2, after fix #1 let provisioning progress further and hit a NEW
  failure (`db_schema_mismatch` 500 on `GET /api/v1/admin/fansubs/1/anime` during the seed
  script's Step 5)
- **Issue:** `docker image inspect team4s-team4sv30-backend --format='{{.Created}}'` showed
  `2026-10-14T07:45:51Z`, but `admin_content_release_theme_assets.go`'s `ListFansubAnime` query
  (which the failing endpoint calls) was last changed by commit `a2848ae31` at
  `2026-10-14T23:38:22Z` -- 16 hours AFTER the image was built. The live schema (via full
  migration replay) already had the new resolver columns; the stale binary's compiled-in query
  predates them. `docker compose run --rm -d --name team4s-phase134-backend ... team4sv30-backend`
  starts a container from this image directly -- unlike the long-running `team4sv30-backend`
  container, which stays current via a separate, already-running `docker compose watch
  team4sv30-backend` process (confirmed running since Oct 2).
- **Fix:** `docker compose build team4sv30-backend` (uses `docker-compose.override.yml`'s
  `Dockerfile.dev`, auto-merged by Compose).
- **Verification:** Standalone `bash scripts/provision-phase134-matrix-db.sh` re-run: Step 5's
  seed script progressed past the previously-fatal `list group anime` call to its own internal
  scenario assertions (13/15 passed, 2 new unrelated failures -- see fix #3).
- **Committed in:** n/a (Docker image rebuild, not a repo file)

**3. [Rule 1 - Bug, real production defect] Story-image sanitizer `src` regex matched a path
shape that has not been written to the database since 2026-10-02**
- **Found during:** Task 2, after fixes #1/#2 let the seed script's own internal scenario
  assertions run for the first time in this phase's investigation; 2 of 15 checks failed
  (`story image referenced in public profile`, for both accounts).
- **Issue:** The rendered `member_story_html` contained `<img style="width:60%"
  class="story-img-align-center">` with NO `src` attribute. `media_assets.file_path` for both
  uploaded story images was confirmed (via direct `psql` query) to be
  `/media/profile/<id>/story/<uuid>/display.jpg` -- exactly matching
  `app_profile_story_image.go`'s own documented, intentional behavior since Plan 173-06
  ("`media_assets.file_path` zeigt weiterhin auf diese [display] Datei") and
  `member_profile_story_image_original_test.go`'s own explicit assertion of the same fact. The
  bluemonday sanitizer's `AllowAttrs("src")` regex in `tiptap_service.go`, however, still only
  matched `original\.(jpg|jpeg|png|webp)$` -- a pattern introduced before Plan 173-06 and never
  updated afterward -- so bluemonday silently stripped the `src` attribute on every real
  story-image upload since 2026-10-02. This bug was invisible to the existing unit test suite
  because `tiptap_service_test.go` and `app_profile_story_image_test.go`'s mock resolvers both
  hard-coded the OLD `original.jpg` shape, which still (correctly, by construction) matched the
  stale regex -- and no end-to-end integration/seed run had ever reached this code path before,
  since it was always blocked earlier by the Keycloak and stale-image issues above.
- **Fix:** Changed the regex to `^/media/profile/\d+/story/[a-z0-9-]+/display\.jpg$` (the one
  path shape the upload handler ever actually writes); updated 6 literal-string occurrences
  across `tiptap_service_test.go` and `app_profile_story_image_test.go` from `original.jpg` to
  `display.jpg` to match reality instead of the pre-173-06 convention.
- **Verification:** `go test ./internal/services/... -run TestTipTap -v` (28 tests) and
  `go test ./internal/handlers/... -run "StoryImage|MemberStory" -v` (11 tests, including the
  previously-silently-wrong `TestStoryImageRoundTrip`) both fully green; `go build ./...` and
  `go vet ./internal/handlers/... ./internal/services/...` clean. Standalone
  `provision-phase134-matrix-db.sh` re-run after rebuilding the image: **15/15** scenario
  checks pass, `RESULT: PASS`, exit 0.
- **Committed in:** `a91731bfe` (fix)

---

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking-issue fixes to shared dev infrastructure,
1 Rule 1 real production bug fix).
**Impact on plan:** All three were strictly necessary to reach the plan's own stated goal (two
genuinely clean runs of both suites, with the Phase-134-Matrix cluster passing for real rather
than being papered over). Fix #3 in particular is a real, previously undetected production
defect affecting the live site's rendering of member story-profile images for any upload made
since 2026-10-02 -- discovered only because this plan's live validation was the first full,
unblocked, end-to-end run of the Phase-134-Matrix seed script's own internal scenario
assertions in this entire phase's investigation history. No scope creep: all three fixes are
narrowly targeted at exactly the Phase-134-Matrix cluster's own blocking chain.

## Issues Encountered

None beyond the three auto-fixed deviations documented above. Both official two-in-a-row proof
runs (frontend and backend) completed cleanly once all three fixes were in place.

## User Setup Required

None - no further external service configuration required. All three blockers (missing
Keycloak accounts, stale Docker image, stale sanitizer regex) are now fully resolved and
verified; no manual follow-up action remains for this phase's D-07 exit criterion.

## Phase-Level Completeness Check

All 12 plans in this phase (185-01 through 185-12) now have a `SUMMARY.md` file present in
`.planning/phases/185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back/`, confirmed
via directory listing immediately before writing this SUMMARY. The phase is ready for
phase-level verification.

## 94-Test Checklist (185-CONTEXT.md Cluster Table Cross-Reference)

Every test named in 185-CONTEXT.md's cluster table, confirmed passing by exact name in this
plan's captured run logs (`grep` against both frontend `vitest` run logs and both backend
`scripts/test-backend.sh` run logs -- all 94 tests confirmed in BOTH of each suite's two runs).
Zero tests were deleted or silently skipped to reach this result, per 185-CONTEXT.md's own Ziel
section.

| # | Cluster | Tests (count) | Klasse | Closed by |
|---|---------|----------------|--------|-----------|
| 1 | Frontend: anime-detail-contract.test.ts | `preserves the complete relation payload including nullable cover and year` (1) | A | 185-01 |
| 2 | `internal/handlers`: Jellyfin-preview-EOF | `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes`, `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged`, `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` (3) | C | 185-04 |
| 3 | `internal/handlers`: search_bypass_integration_test.go | `TestSearchBypassTagOnlyFindsGermanTagTranslation`, `TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty`, `TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd`, `TestSearchNeverReturnsNullItemsForUnsearchedEntity` (4) | B | 185-06 |
| 4 | `internal/migrations`: D-04 ResolveMigrationsDir | `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` (1) | E | 185-03 |
| 5 | `internal/repository`: Phase-139 fixture | `TestListUserContributionsGroupsByAnimeAndProject`, `RangeCollapse`, `OverrideDetectionIndependentButIdentical`, `OverrideDetectionIndependentAndDifferent`, `RangeBreaksOnDeviation`, `FiltersServerSide`, `OnlyDeviationsFilter`, `PaginationNeverSplitsAProjectBlock`, `FilterOptionsScopedToUser`, `NoVerifiedClaimReturnsEmptyPage`; `TestGetUserMediaGroupsByReleaseOrEpisode`, `PublicURLAndFileSizeDerivedForReal`, `NoOwnerContextOrPermissionField`, `PaginationNeverSplitsAReleaseBlock`, `CountsFilteredBlocksNotRows`, `FiltersServerSide`, `FilterOptionsScopedToUser`; `TestGetUserRightsSummaryBatchesAcrossGroups`, `EmptyMembershipsSkipsBatchCall`; `TestPhase139ContributionsQueryBudgetIsConstant`, `MediaQueryBudgetIsConstant`, `RightsSummaryQueryBudgetIsConstant`, `ContributionsPaginationDriftAtScale`, `MediaPaginationDriftAtScale` (24) | B | 185-02 |
| 6 | `internal/repository`: anime_relations_public_postgres_test.go | `TestGetAnimeRelations_PerspectiveAndPosterCover` (1) | A | 185-09 |
| 7 | `internal/repository`: episode_import_source | `TestEpisodeImportSourceCreateRepeatAndInitialBinding`, `RejectsAndRollsBack`, `CompleteEmptyClearsTechnicalStreams`, `SiblingPersistence`, `AliasesAndCoverage`, `OpposingConcurrentBatches`, `UnresolvedDuplicateFilenameCannotBind`; `TestEpisodeVersionDeletePreservesSiblingSource`, `KeepsReferencedStreamSource` (9) | B | 185-07 |
| 8 | `internal/repository`: fansub_public_group_display_url_test.go | `TestGetPublicGroupBase_PrefersDisplayVariant`, `SVGLogoKeepsStoredURL` (2) | B | 185-06 (D-05) |
| 9 | `internal/repository`: group_release_version_count_test.go | `TestGetGroupReleaseVersionCount_MatchesLegacyRowCountForMultiVersionEpisode`, `MatchesSingleVersionCase` (2) | B | 185-06 |
| 10 | `internal/repository`: hist_group_member_roles_fansub_group_test.go | `TestListFansubGroupRoleDefinitionsGroupContextRoles` (1) | B | 185-07 |
| 11 | `internal/repository`: member_claims_repository_test.go | `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` (1) | A | 185-10 |
| 12 | `internal/repository`: membership_baseline_registry_test.go | `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` (1) | A | 185-08 |
| 13 | `internal/repository`: Phase-134 verification matrix | `TestPhase134MatrixAnonymousPublicProfile`, `MissingProfile`, `HiddenProfileIsIndistinguishableFromMissing`, `OwnerPreviewOfHiddenProfile`, `RefreshOnlyOwnerAccess`, `SparseProfileMatchesManifest`, `DenseProfileMatchesManifest`, `ErrorMalformedSlugDoesNotPanic`, `PaginationHonestAcrossPages` (9) | C | **185-12 (this plan)** |
| 14 | `internal/repository`: Phase-167 fixture | `TestFansubGroupKuerzelUniqueness_SetsFreshKuerzel`, `KuerzelVsKuerzelConflict`, `KuerzelVsAliasConflict`, `AliasVsKuerzelConflict`, `SameGroupOwnAliasIsNotAConflict`; `TestResolveFansubGroupMatches_KuerzelTierPrecedence`, `KuerzelCoexistsWithOtherTiers`, `ExactTiers`, `ConstantQueryBudget`, `UniquenessRespected`; `TestApplyDoesNotAutoCreateFansubGroup`, `ApplyLearnsNewAliasForExplicitGroup`, `ApplyDoesNotReassignConflictingAlias`; `TestFansubGroupCreateKuerzel_SetsFreshKuerzel`, `EmptyKuerzelBecomesNull`, `ConflictsWithExistingKuerzel`, `ConflictsWithExistingAlias`; `TestPhase178FansubGroupAliases_ListGroupsIncludesAliases`, `GetGroupByIDIncludesAliases`, `NoAliasesIsEmptyNotError` (20) | B | 185-02 |
| 15 | `internal/repository`: release_review_query_repository_test.go | `TestPhase141RevokedDelegationImmediateEffect` (1) | A | 185-08 |
| 16 | `internal/repository`: release_version_media_repository_test.go | `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`, `ListAllowsOrdinaryRowsWithoutHighlight`, `SoftDeleteQueryExcludesDeletedRows`, `TestReleaseVersionMediaHighlightsAreIndependentFromPreview` (4) | B | 185-09 |
| 17 | `internal/repository`: episode_version_dates_integration_test.go | `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure` (subtest `admin=true`) (1) | B | 185-07 |
| 18 | `internal/repository`: release_version_media_cross_package_test.go | `TestRVMHandler_ProzessmedienDefaults` (1) | B | 185-09 |
| 19 | `internal/services`: effective_rights_service_test.go | `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `Transitions`, `RequiresReasonForRealChange`, `RejectsInactiveOrMissingTarget`, `RetainedDormantWhenMembershipBecomesInactive`, `Authorization`, `CatalogValidation`, `RollsBackOnHistoryFailure` (8) | A+B | 185-08 |

**Total: 1 (frontend) + 93 (backend) = 94 tests, all individually confirmed passing in both
runs of each suite.** The Phase-137 cluster (row 19) is counted once in the 93/94 total per
185-CONTEXT.md's own accounting convention (it spans both Klasse A and B).

## Final Red-Test Count

- **Frontend (`vitest run`), run 1:** 0 failed test files, 0 failed tests (390/391 files, 1
  pre-existing unrelated skip; 3548/3551 tests, 3 intentional `it.todo`).
- **Frontend (`vitest run`), run 2:** identical -- 0 failed test files, 0 failed tests.
- **Backend (`scripts/test-backend.sh`), run 1:** `go test exit code: 0`, `GATE: GREEN (0)`,
  0 lines matching `--- FAIL`, no silently skipped suite, Phase-134-Matrix provisioning `OK`.
- **Backend (`scripts/test-backend.sh`), run 2:** identical -- `go test exit code: 0`,
  `GATE: GREEN (0)`, 0 `--- FAIL` lines, Phase-134-Matrix provisioning `OK`.
- **Keycloak credential fix:** succeeded (accounts were missing entirely, not just a password
  drift; recreated and verified).

## Next Phase Readiness

- Phase 185's own stated exit criterion (D-07, final sentence) is met with concrete, named,
  twice-repeated evidence for both suites.
- All 12 plans (185-01 through 185-12) have SUMMARY.md files; the phase is ready for
  phase-level verification by the orchestrator.
- Three real, previously undetected issues were fixed as part of reaching this proof (missing
  Keycloak dev accounts, a stale Docker image for the Phase-134-Matrix temporary backend
  container, and a genuine production bug in story-image `src` rendering) -- none require
  further follow-up; all are verified fixed and covered by passing tests.
- No blockers remain for phase closure.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
