---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 17
subsystem: api
tags: [go, pgx, repository-pattern, fansub, refactoring]

# Dependency graph
requires:
  - phase: 174-16
    provides: fansub_repository.go reduced from 2657 to 1437 lines (Groups/Links/Aliases clusters already split), same D-15 same-package/same-receiver split precedent this plan continues
provides:
  - fansub_repository_public_profile.go (GetPublicProfileBySlug + 6 supporting read-model helpers — the rights/visibility-adjacent cluster)
  - fansub_repository_members.go (ListMembers/CreateMember/UpdateMember/DeleteMember)
  - fansub_repository_anime_links.go (ListAnimeFansubs/AttachAnimeFansub/DetachAnimeFansub + fansubGroupExists/animeExists/ResolveFansubGroupIDForAnime + story-preview helpers)
  - fansub_repository_merge_core.go (MergeGroups, GetMergePreview, normalizeAliasKey — the merge entry points)
  - fansub_repository_merge_duplicates.go (populateAliasMergePreview/populateMergeMemberDuplicates/populateMergeRelationDuplicates/populateMergeNameSlugCollisions/countExistingFansubGroups/countMergeVersionConflicts)
  - fansub_repository.go reduced to 37 lines (struct + constructor + groupLinkTx interface only) — the D-15 split of this hotspot is now complete across 174-16+174-17
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-15 same-package/same-receiver repository split continued: new sibling .go files declare no new struct/constructor, methods stay on *FansubRepository, moved verbatim with zero SQL/behavior drift"
    - "Stale self-inspection (os.ReadFile + strings.Contains/Index) tests following a same-package file split get their os.ReadFile target updated to the new sibling file as a pure D-03 import-path adjustment — now proven twice in this same package (174-16's 3 Groups-cluster tests, this plan's 2 public-profile/anime-links tests)"
    - "Cross-cluster helper placement: normalizeAliasKey (used by MergeGroups, populateAliasMergePreview, and 3 other unrelated files in the package) placed in fansub_repository_merge_core.go, the first file that defines/uses it; callers in other files use same-package reference with no import needed"

key-files:
  created:
    - backend/internal/repository/fansub_repository_public_profile.go
    - backend/internal/repository/fansub_repository_members.go
    - backend/internal/repository/fansub_repository_anime_links.go
    - backend/internal/repository/fansub_repository_merge_core.go
    - backend/internal/repository/fansub_repository_merge_duplicates.go
  modified:
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go

key-decisions:
  - "TestFansubRepository_PublicProfileSourceInvariants resolved per 174-01's documented verdict (174-HOTSPOTS.md): the 3 stale fragments (\"FROM anime_media am\", \"mt.name = 'banner'\", \"banner_resolved_url\") were remnants of a pre-Phase-173 banner-sourcing SQL shape Phase 173 (öffentliche Bildqualität zusätzliche Display-Variante Backend) intentionally replaced with the current media_files/variant='display' LATERAL-join pattern — a safe-to-fix-test verdict, not a real regression. Fixed the fragment assertions to track the current SQL shape (\"FROM fansub_groups\", \"variant = 'display'\", \"banner_display.path AS banner_display_path\") and updated the os.ReadFile target to the new public-profile sibling file"
  - "fansubGroupExists/animeExists placed in fansub_repository_anime_links.go per the plan's explicit instruction, even though both are called from many other repository files across the package (Groups/Aliases/Links clusters, admin_content_*.go, comment.go, episode_classification.go, watchlist.go, etc.) — same-package reference works regardless of physical file location, matching 174-16's established cross-cluster-helper-placement precedent"
  - "Merge cluster sub-split into core (MergeGroups/GetMergePreview/normalizeAliasKey, 236 lines) vs. duplicates (the 6 duplicate-detection helpers, 396 lines) per the plan's D-24 budget-driven instruction — both files land comfortably under 450 lines, so no D-24 justification comment was needed"
  - "TestListAnimeFansubs_SummaryIncludesFansubStoryFacts (undiscovered until the post-Task-3 full-suite run) is a 3rd instance of the same Category E self-inspection staleness this plan's Task 1 already anticipated for the public-profile cluster — its os.ReadFile target also pointed at fansub_repository.go and broke when Task 2 moved ListAnimeFansubs/AttachAnimeFansub out. Fixed with the identical D-03 import-path-only adjustment, now pointing at fansub_repository_anime_links.go"

requirements-completed: [D-15, D-17, D-02, D-03, D-19, D-22]

# Metrics
duration: 12min
completed: 2026-10-05
---

# Phase 174 Plan 17: Fansub Repository Public-Profile/Members/Links/Merge Split Summary

**Completed the D-15 split of the #1 backend hotspot `fansub_repository.go` (2,657 lines → 37 lines across 174-16+174-17) by relocating its final four clusters — the ASVS V4-adjacent public-profile read-model, members CRUD, anime-fansub association, and the file's single largest cluster (merge, sub-split into core+duplicates for D-24) — into same-struct sibling files, and resolved all 3 self-inspection test staleness cases this split triggered.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-05T16:03:00Z
- **Completed:** 2026-10-05T16:15:00Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `fansub_repository_public_profile.go` (267 lines): `GetPublicProfileBySlug` and its 6 supporting read-model helpers (`getPublicGroupBase`, `attachPublicReleaseVersionsCount`, `listPublicFansubStories/Projects/History/Media`, `publicAnimeSlugSQL`), moved byte-for-byte per the threat model's ASVS V4-adjacent mitigation requirement
- `fansub_repository_members.go` (184 lines): `ListMembers`/`CreateMember`/`UpdateMember`/`DeleteMember`
- `fansub_repository_anime_links.go` (232 lines): `ListAnimeFansubs`/`AttachAnimeFansub`/`DetachAnimeFansub` plus `fansubGroupExists`/`animeExists`/`ResolveFansubGroupIDForAnime` and the story-preview truncation helpers
- `fansub_repository_merge_core.go` (236 lines) + `fansub_repository_merge_duplicates.go` (396 lines): the ~900-line merge cluster sub-split by D-24 into entry points vs. duplicate-detection helpers
- `fansub_repository.go` reduced to 37 lines — struct, constructor, and the `groupLinkTx` interface only
- `TestFansubRepository_PublicProfileSourceInvariants` resolved per 174-01's documented, evidence-based verdict (safe-to-fix-test); 2 additional self-inspection tests discovered and fixed the same way
- `go build ./...` clean after every task; `go test ./internal/repository/... -v` shows 59 failures, all pre-existing and documented in `174-HOTSPOTS.md` (one fewer than the pre-task-3 59+1=60 baseline, confirming zero new regressions)
- Verified the `ANY($1)` batch-query pattern (D-17) survived unmodified in all 6 relocated merge-duplicate-detection methods — no new N+1 introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the public-profile cluster and resolve the pre-existing baseline test failure** - `a2d81f07` (refactor)
2. **Task 2: Extract the members and anime-fansub-association clusters** - `5fa362ed` (refactor)
3. **Task 3: Extract the merge cluster (sub-split for D-24), finalize the core file, and run the full gate** - `666bb567` (refactor)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/fansub_repository_public_profile.go` - public-profile read-model cluster (new)
- `backend/internal/repository/fansub_repository_members.go` - members CRUD cluster (new)
- `backend/internal/repository/fansub_repository_anime_links.go` - anime-fansub association cluster + existence helpers (new)
- `backend/internal/repository/fansub_repository_merge_core.go` - merge entry points + normalizeAliasKey (new)
- `backend/internal/repository/fansub_repository_merge_duplicates.go` - merge duplicate-detection helpers (new)
- `backend/internal/repository/fansub_repository.go` - reduced to struct/constructor/groupLinkTx only (37 lines)
- `backend/internal/repository/fansub_repository_test.go` - 2 self-inspection test os.ReadFile targets updated, 1 stale fragment set fixed per 174-01's verdict (see Decisions/Deviations)

## Decisions Made
See `key-decisions` in frontmatter above for the 4 substantive decisions: the `TestFansubRepository_PublicProfileSourceInvariants` resolution, cross-cluster helper placement for `fansubGroupExists`/`animeExists`, the merge-cluster D-24 sub-split rationale, and the 3rd self-inspection test discovery.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed a 3rd stale self-inspection test (`TestListAnimeFansubs_SummaryIncludesFansubStoryFacts`) not named in the plan's interfaces list**
- **Found during:** Task 3's full-suite verification run (surfaced after Task 2's move, but only discovered once the complete `go test ./internal/repository/... -v` ran)
- **Issue:** `fansub_repository_test.go`'s `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` does `os.ReadFile("fansub_repository.go")` and bounds the `ListAnimeFansubs` function body via `strings.Index` against both `ListAnimeFansubs` and `AttachAnimeFansub`'s signatures. Task 2 moved both functions to `fansub_repository_anime_links.go`, breaking the read target with zero behavior change — the exact Category E pattern 174-HOTSPOTS.md documented as a real, independent precedent (174-16 already hit 3 instances of this same pattern for the Groups cluster; the plan's own interfaces section named only `TestFansubRepository_PublicProfileSourceInvariants` explicitly, but flagged the general risk class).
- **Fix:** Updated the `os.ReadFile` target from `"fansub_repository.go"` to `"fansub_repository_anime_links.go"` — a pure import-path adjustment per D-03, identical in kind to 174-16's 3 precedent fixes and this plan's Task 1 fix.
- **Files modified:** `backend/internal/repository/fansub_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestListAnimeFansubs_SummaryIncludesFansubStoryFacts' -v` passes; full-suite failure count dropped from 60 to 59 with this fix, confirming no other test regressed
- **Committed in:** `666bb567` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — Rule 3, package-manager-install exclusion not applicable)
**Impact on plan:** Necessary, minimal, same-class fix as the plan's own Task 1 instruction anticipated for a different test. No scope creep, no behavior change, no new test assertions invented.

## Issues Encountered
- Local Go toolchain is not installed on the host; all `go build`/`go test` verification ran via `docker run --network team4s_default -v "$(pwd)/backend:/app" -v gomodcache:/go/pkg/mod golang:1.25-alpine`, the same documented container-network protocol 174-16 used.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `fansub_repository.go`'s full D-15 split is complete: 2,657 lines (pre-174-16) → 37 lines, across 8 sibling files total (174-16's groups/links/aliases + 174-17's public-profile/members/anime-links/merge-core/merge-duplicates), all on the same `*FansubRepository` receiver, zero new structs.
- The one pre-existing baseline test this plan was scoped to resolve (`TestFansubRepository_PublicProfileSourceInvariants`) is fixed and passing; the SQL question 174-01 flagged is now closed, not deferred.
- `go build ./...` clean; `go test ./internal/repository/... -v` has exactly the pre-existing, 174-HOTSPOTS.md-documented 59-test baseline remaining (0 new failures, 3 total self-inspection-staleness fixes applied across this plan).
- No blockers for subsequent Welle-4/5 plans.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

- FOUND: backend/internal/repository/fansub_repository_public_profile.go
- FOUND: backend/internal/repository/fansub_repository_members.go
- FOUND: backend/internal/repository/fansub_repository_anime_links.go
- FOUND: backend/internal/repository/fansub_repository_merge_core.go
- FOUND: backend/internal/repository/fansub_repository_merge_duplicates.go
- FOUND: backend/internal/repository/fansub_repository.go
- FOUND: backend/internal/repository/fansub_repository_test.go
- FOUND commit: a2d81f07 (Task 1)
- FOUND commit: 5fa362ed (Task 2)
- FOUND commit: 666bb567 (Task 3)
