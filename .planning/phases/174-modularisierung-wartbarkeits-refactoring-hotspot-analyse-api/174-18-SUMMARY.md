---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 18
subsystem: backend-repository
tags: [go, pgx, postgres, repository-split, admin-content, theme-segments, refactoring]

# Dependency graph
requires:
  - phase: 174-15
    provides: "backend/internal/repository/admin_content_anime_themes_test.go — real-Postgres characterization tests for the Theme-CRUD and Segment-CRUD clusters (first-ever repository-layer coverage for this file), used here as the regression gate for the structural split"
provides:
  - "admin_content_anime_themes.go (2,482 lines, 39 public/private methods) fully split into 5 sibling files, same package/receiver, zero signature changes: admin_content_anime_themes_core.go (Theme-CRUD), admin_content_anime_segments_crud.go (Segment-CRUD + shared source-codec helpers), admin_content_anime_segments_library.go (segment-library-asset handling), admin_content_anime_segments_playback.go (segment-playback-source-sync, the most transaction-sensitive cluster), admin_content_release_theme_assets.go (release-theme-asset/fansub-anime-release cluster)"
affects: [174-23]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same-package, same-struct file split (no new struct/constructor) — matches the existing anime.go/anime_relations.go family convention already established elsewhere in backend/internal/repository/"
    - "Cross-file shared helper placement resolved by call-site majority count, not by physical proximity in the original file (e.g. encodeThemeSegmentSource/loadSegmentByID placed in segments_crud.go despite also being called from segments_library.go; hasTable kept in exactly one file per the plan's explicit anti-duplication instruction)"

key-files:
  created:
    - backend/internal/repository/admin_content_anime_themes_core.go
    - backend/internal/repository/admin_content_anime_segments_crud.go
    - backend/internal/repository/admin_content_anime_segments_library.go
    - backend/internal/repository/admin_content_anime_segments_playback.go
    - backend/internal/repository/admin_content_release_theme_assets.go
  modified:
    - backend/internal/repository/admin_content_test.go
    - backend/internal/repository/admin_content_theme_asset_locks_test.go
    - backend/internal/repository/segment_playback_resolution_test.go
    - backend/internal/handlers/segment_validation_test.go

key-decisions:
  - "admin_content_anime_themes.go deleted rather than left as an empty stub: after moving all 39 methods plus every package-private helper type/function/const, zero content remained (confirmed via grep; no shared struct/constructor was ever declared in that file — AdminContentRepository's struct lives in admin_content.go)."
  - "Shared source-codec helpers (const block, encodeThemeSegmentSource, hydrateThemeSegmentSource, loadSegmentByID) placed in admin_content_anime_segments_crud.go rather than duplicated or kept in a 6th file, following the plan's call-site-majority tie-break rule; segments_library.go calls them cross-file (same package, no import needed)."
  - "hasTable kept in exactly one file (admin_content_anime_segments_playback.go, since both segmentLibraryTablesAvailable and segmentPlaybackSourcesTableAvailable call it and the playback file has the higher-risk pgx.Tx-based callers) — no duplicate definition."
  - "D-03 import-path exception invoked for 4 pre-existing source-string-assertion tests (admin_content_test.go x2, segment_playback_resolution_test.go x5, admin_content_theme_asset_locks_test.go x1, segment_validation_test.go x1) that read admin_content_anime_themes.go by filename via os.ReadFile — updated each to read the new sibling file(s) that now contain the asserted code. One test (TestAdminContentRepository_SegmentLibrarySourceContainsLookupAndAttachSeams) now concatenates two files (library + playback) because its assertion spans a seam the plan's own cluster boundary intentionally split (ListSegmentLibraryCandidates calls loadStableSegmentAnimeSource, which the plan assigns to the playback cluster, not the library cluster). No assertion content/semantics changed — only which file(s) are read."

requirements-completed: [D-15, D-17, D-02, D-19, D-22]

# Metrics
duration: ~75min
completed: 2026-10-05
---

# Phase 174 Plan 18: Split admin_content_anime_themes.go Summary

**Split the 2,482-line, 39-method admin_content_anime_themes.go into 5 sibling files along its real cluster boundaries (Theme-CRUD, Segment-CRUD, Segment-library-asset, Segment-playback-source-sync, Release-theme-asset), with 174-15's characterization suite proving zero behavior change.**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-10-05T16:20:00Z
- **Completed:** 2026-10-05T17:35:49Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 test files updated; 1 original file deleted)

## Accomplishments
- Moved all 39 public/private methods of `admin_content_anime_themes.go` verbatim (byte-for-byte SQL literals, unchanged transaction-boundary semantics) into 5 purpose-named sibling files, all `package repository`, all on the existing `*AdminContentRepository` receiver — no new struct, no new constructor anywhere.
- The highest-risk cluster (segment-playback-source-sync, 9 methods doing cross-table consistency work inside caller-supplied `pgx.Tx`) landed in `admin_content_anime_segments_playback.go` with its exact decision-tree logic and transaction-parameter flow untouched.
- `admin_content_anime_themes.go` itself is now deleted (0 methods, 0 shared types remained after the move — confirmed via grep before deletion).
- 174-15's full characterization suite (`TestAdminContentAnimeThemes_ThemeCRUD`, `TestAdminContentAnimeThemes_SegmentCRUD`, 24 sub-tests) passes unchanged against the restructured files after every task.
- Fixed 4 pre-existing source-string-assertion tests that hardcoded the old filename, under the D-03 import-path exception — documented individually above; no test assertion content changed.
- No query-in-loop regression introduced: `ListFansubAnime` and `ListReleaseThemeAssetsByFansubAnime` (the plan's flagged bulk-lookup methods, D-17) were moved verbatim with their existing single-query/join shape intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract Theme-CRUD and Segment-CRUD clusters** - `9fbd683f` (refactor)
2. **Task 2: Extract the segment-library-asset and segment-playback-source-sync clusters** - `8577b8cf` (refactor)
3. **Task 3: Extract the release-theme-asset cluster, finalize, and run the full gate** - `59c778d2` (refactor)

## Files Created/Modified
- `backend/internal/repository/admin_content_anime_themes_core.go` - New; Theme-CRUD cluster (ListThemeTypes, ListAdminAnimeThemes, CreateAdminAnimeTheme, ReleaseVariantBelongsToAnime, UpdateAdminAnimeTheme, DeleteAdminAnimeTheme), 262 lines.
- `backend/internal/repository/admin_content_anime_segments_crud.go` - New; Segment-CRUD cluster (ListAnimeSegments, CreateAnimeSegment, UpdateAnimeSegment, DeleteAnimeSegment, GetAnimeSegmentByID, ListAnimeSegmentSuggestions) plus shared source-codec helpers (consts, encodeThemeSegmentSource, hydrateThemeSegmentSource, loadSegmentByID), 694 lines.
- `backend/internal/repository/admin_content_anime_segments_library.go` - New; segment-library-asset cluster (ListSegmentLibraryCandidates, AttachSegmentLibraryAsset, IsReusableSegmentAsset, hydrateSegmentLibraryMetadata(List), segmentLibraryTablesAvailable, BindUploadedSegmentAsset, ClearSegmentAsset), 570 lines.
- `backend/internal/repository/admin_content_anime_segments_playback.go` - New; segment-playback-source-sync cluster (hydrateSegmentPlaybackMetadata(List), segmentPlaybackSourcesTableAvailable, hasTable, syncThemeSegmentPlaybackSourceTx, syncThemeSegmentPlaybackSourceForReleaseVersionTx, loadStableSegmentAnimeSource/Tx, GetStableSegmentAnimeSource) plus the playback-snapshot type and helper (parseSegmentClockSeconds, loadThemeSegmentPlaybackSnapshotTx), 535 lines.
- `backend/internal/repository/admin_content_release_theme_assets.go` - New (rename-detected by git from the original file); release-theme-asset/fansub-anime-release cluster (GetSegmentReleaseDuration, GetCanonicalFansubAnimeRelease, GetFansubRelease, ListFansubAnime, ListReleaseThemeAssets, ListReleaseThemeAssetsByFansubAnime, HasGlobalThemeSegmentCoverageForRelease, HasReleaseAssetSegmentUploadBlockedForRelease, CreateReleaseThemeAsset, DeleteReleaseThemeAsset) plus buildThemeAssetPublicURL, 472 lines.
- `backend/internal/repository/admin_content_anime_themes.go` - Deleted; fully emptied by the move across Tasks 1-3.
- `backend/internal/repository/admin_content_test.go` - Updated 2 source-string-assertion tests to read the new sibling file(s) instead of the deleted original.
- `backend/internal/repository/admin_content_theme_asset_locks_test.go` - Updated 1 source-string-assertion test to read `admin_content_release_theme_assets.go`.
- `backend/internal/repository/segment_playback_resolution_test.go` - Updated 5 source-string-assertion tests to read `admin_content_anime_segments_playback.go` (4 of them) or `admin_content_release_theme_assets.go` (1, for `GetSegmentReleaseDuration`).
- `backend/internal/handlers/segment_validation_test.go` - Updated 1 source-string-assertion test to read `admin_content_anime_segments_playback.go`.

## Decisions Made
- Placed shared, multi-caller helpers (source-codec functions, `loadSegmentByID`) in whichever cluster file had the plan-assigned "core" role rather than creating a 6th shared file, following the plan's explicit same-package cross-file-call guidance.
- Deleted the original file outright instead of leaving an empty `package repository` stub, since the plan's own wording anticipated "nothing retained" as the likely outcome and confirmed it via a pre-deletion grep showing 0 methods and 0 shared declarations remaining.
- Invoked the plan's/CLAUDE.md's D-03 import-path exception for 4 pre-existing source-string-assertion test files; documented each touch-point above rather than silently editing test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [D-03 exception, documented per plan] Updated 4 pre-existing tests that hardcoded the deleted filename**
- **Found during:** Task 3's full verification gate (`go test ./internal/repository/... ./internal/handlers/... -run "AdminContentAnimeTheme|AdminContentAnimeSegment"` plus a follow-up `ThemeSegment|SegmentPlayback|SegmentLibrary` sweep)
- **Issue:** `admin_content_test.go`, `segment_playback_resolution_test.go`, `admin_content_theme_asset_locks_test.go`, and `internal/handlers/segment_validation_test.go` each called `os.ReadFile`/`readRepositorySource(t, "admin_content_anime_themes.go")` — a file this plan deletes. Four of these are the forbidden "read the handler's own .go source and `strings.Contains`" pattern CLAUDE.md's Teststil rule flags as legacy debt (not to be newly copied), but they are pre-existing Altlast (the rule's documented exception explicitly covers this scenario: a test imports/reads an internal module path, and only the path needs to change for a refactor to stay green).
- **Fix:** Repointed each `ReadFile`/`readRepositorySource` call to the specific new sibling file that now contains the asserted method/SQL fragment. One test (`TestAdminContentRepository_SegmentLibrarySourceContainsLookupAndAttachSeams`) now concatenates `admin_content_anime_segments_library.go` + `admin_content_anime_segments_playback.go`, because its assertion (`anime_source_links` alongside `segment_library_definitions`/`reuse_attach`) spans a seam the plan's own cluster assignment intentionally separated (the library cluster's lookup/attach methods call `loadStableSegmentAnimeSource`, which Task 2's action text explicitly assigns to the playback cluster).
- **Files modified:** `backend/internal/repository/admin_content_test.go`, `backend/internal/repository/segment_playback_resolution_test.go`, `backend/internal/repository/admin_content_theme_asset_locks_test.go`, `backend/internal/handlers/segment_validation_test.go`
- **Commit:** `59c778d2`

### Out-of-Scope / Pre-existing (not fixed, documented for traceability)

- `TestListThemeSegmentContributors_RequiresCapabilityThenSucceeds` (`internal/handlers/admin_content_anime_theme_segment_contributors_test.go`) fails identically (403 instead of 200 on its "allowed with capability" sub-test) both before and after this plan's changes — confirmed by running the exact same test against the pre-174-18 baseline commit (`e178b1ca`) in a disposable `git worktree`, then removing the worktree. It is a pure in-memory handler test with no DB/network dependency and is unrelated to any file this plan touches (permission-resolution stub behavior, not the repository split). Out of scope per the plan's exact verification command, which does not match this test name.
- Running the full, untargeted `go test ./internal/repository/...` (beyond the plan's exact verification command) surfaces the same pre-existing, environment-dependent failures 174-15's SUMMARY already documented (`TestPhase134Matrix*`, `TestPhase141RevokedDelegationImmediateEffect`, `TestEpisodeImportSource*`, several `TestMemberPointTotalsPostgres*`/`TestLoadContributionBadges*` tests) caused by the live backend container/Keycloak/PHASE128 DSN not being reachable in the ad-hoc Go test container used for this plan's verification. None reference admin_content_anime_themes.go or any of this plan's output files.

## Known File-Size Note (for 174-23 Abschlussaudit, D-24)

Three of the five new sibling files exceed the 450-line D-24 budget: `admin_content_anime_segments_crud.go` (694 lines), `admin_content_anime_segments_library.go` (570 lines), `admin_content_anime_segments_playback.go` (535 lines); `admin_content_release_theme_assets.go` (472 lines) is only slightly over. This plan's task boundaries were pre-defined by the plan itself (the 5-cluster inventory in `<interfaces>`), not chosen by this executor — each file is already a single, real-world-cohesive cluster (confirmed live method inventory, not a guess), and further splitting within a cluster would mean either (a) duplicating transaction/query helper code across files or (b) introducing artificial sub-files with no independent reason to exist, both of which D-02 explicitly forbids ("Datei wird kleiner ist keine ausreichende Begründung"). Flagging here per D-24 ("wo eine Datei bewusst größer bleibt, im Report begründen") for the phase's Wave 6 `174-REPORT.md` to carry forward as a documented, intentional exception rather than a silent one.

## Issues Encountered
- The Phase-117 real-Postgres test fixture requires a DSN to a dedicated `team4s_phase117_test_*`-named database; reused the existing `team4s_phase117_test_17415` database (created by 174-15's own test run) rather than creating a new one, since it already has the correct schema/migrations applied for this exact test suite.
- `go build`/`go test` against this repo's module requires the full repo root mounted (not just `backend/`), because the Phase-117 fixture resolves migration files via a relative path outside `backend/` — used the same `-v /home/d1sk/team4s:/workspace -w /workspace/backend` mount pattern 174-15 already established, plus a persistent `team4s_gomodcache` Docker volume to avoid re-downloading all Go module dependencies on every container run.

## User Setup Required

None — no external service configuration required beyond the existing Docker Compose stack (`team4sv30-db`, already running).

## Next Phase Readiness
- `admin_content_anime_themes.go`'s D-15 split is complete across 5 sibling files; all downstream handler call sites (`backend/internal/handlers/admin_content_anime_theme*.go`) continue to call the same `*AdminContentRepository` methods with unchanged signatures — no caller-side changes were needed or made.
- The file-size note above should feed directly into 174-23's (Wave 6 Abschlussaudit) `174-REPORT.md` "bewusst nicht weiter aufgeteilte Bereiche" section.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

- FOUND: backend/internal/repository/admin_content_anime_themes_core.go
- FOUND: backend/internal/repository/admin_content_anime_segments_crud.go
- FOUND: backend/internal/repository/admin_content_anime_segments_library.go
- FOUND: backend/internal/repository/admin_content_anime_segments_playback.go
- FOUND: backend/internal/repository/admin_content_release_theme_assets.go
- CONFIRMED-DELETED: backend/internal/repository/admin_content_anime_themes.go
- FOUND: commit 9fbd683f
- FOUND: commit 8577b8cf
- FOUND: commit 59c778d2
