---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 16
subsystem: api
tags: [go, pgx, repository-pattern, fansub, refactoring]

# Dependency graph
requires:
  - phase: 174-14
    provides: same-package/same-struct D-15 split precedent (admin fansub create page split), confirming the file-sibling shape to replicate
provides:
  - fansub_repository_groups.go (Groups CRUD + count/link read-model helpers)
  - fansub_repository_links.go (Group-link CRUD + legacy-column sync helpers)
  - fansub_repository_aliases.go (Alias CRUD + Kürzel-owner resolution)
  - fansub_repository.go reduced from 2657 to 1437 lines, struct/constructor intact
affects: [174-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-15 same-package/same-receiver repository split: new sibling .go files declare no new struct/constructor, methods stay on *FansubRepository, moved verbatim with zero SQL/behavior drift"
    - "Cross-cluster helper sharing resolved by precedence: a helper used by both a moved cluster and a not-yet-moved cluster stays in the first-created sibling file; the not-yet-moved cluster calls it via same-package reference (no import needed)"

key-files:
  created:
    - backend/internal/repository/fansub_repository_groups.go
    - backend/internal/repository/fansub_repository_links.go
    - backend/internal/repository/fansub_repository_aliases.go
  modified:
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go

key-decisions:
  - "populateCountMap and applyLegacyLinkProjection (shared by Groups-cluster methods AND the still-undivided public-profile cluster) were placed in fansub_repository_groups.go (first-created sibling file) per plan instruction; GetPublicProfileBySlug/attachPublicReleaseVersionsCount (staying in fansub_repository.go) call them via same-package reference with no import"
  - "scanFansubGroupLink (used by both the moved Links-cluster ListGroupLinks and the moved Groups-cluster attachGroupLinks) was placed in fansub_repository_links.go as the Links-domain row scanner; attachGroupLinks in the groups file calls it via same-package reference"
  - "The D-17 ANY($1) alias-normalization batch query lives in populateAliasMergePreview, a helper of GetMergePreview (Merge cluster) -- not the 7-method Alias CRUD cluster this plan moves. Left untouched in fansub_repository.go, confirmed present and unmodified, for 174-17 to relocate alongside Merge"
  - "fansub_repository_test.go's 3 os.ReadFile-based self-inspection assertions (TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers, TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime, TestFansubRepository_DeleteGroupCleansRestrictedChildrenFirst) were updated to read fansub_repository_groups.go instead of fansub_repository.go -- pure import-path adjustment per the D-03 precedent 174-HOTSPOTS.md documented for Phase 143's member_claims_repository.go split, not a behavior change"

requirements-completed: [D-15, D-17, D-02, D-19, D-22]

# Metrics
duration: 25min
completed: 2026-10-05
---

# Phase 174 Plan 16: Fansub Repository Groups/Links/Aliases Split Summary

**Split the 2,657-line `fansub_repository.go` hotspot's three lowest-risk clusters (Groups CRUD, Group-Link CRUD, Alias CRUD — 28 of 61 functions) into same-package sibling files with zero SQL/behavior drift, fixing 3 self-inspection tests whose os.ReadFile targets broke from the move.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-05T14:55:00Z
- **Completed:** 2026-10-05T15:17:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `fansub_repository_groups.go` (705 lines): ListGroups/CreateGroup/GetGroupByID/GetGroupBySlug/UpdateGroup/DeleteGroup plus attachGroupCounts/attachGroupLinks/hydrateFansubGroup/populateCountMap/applyLegacyLinkProjection/firstLinkURL/buildFansubGroupWhere/scanFansubGroup/fansubRowScanner
- `fansub_repository_links.go` (297 lines): ListGroupLinks/CreateGroupLink/UpdateGroupLink/DeleteGroupLink plus equalNullableString/scanFansubGroupLink/validateFansubGroupLinkType/allowedFansubGroupLinkTypes/syncLegacyLinkColumns(WithDB)/firstGroupLinkURL(WithDB)
- `fansub_repository_aliases.go` (253 lines): ListAliases/CreateAlias/DeleteAlias/ReassignAlias/ListAnimeAliasCandidates plus findFansubKuerzelOwner/findFansubKuerzelOrAliasOwner
- `fansub_repository.go` reduced from 2657 to 1437 lines; struct `FansubRepository`, constructor `NewFansubRepository`, and the public-profile/members/anime-fansub-association/merge clusters (174-17's scope) stay intact
- `go build ./...` clean after every task; `go test ./internal/repository/... -run TestFansubRepository -v` shows only the pre-existing, documented `PublicProfileSourceInvariants` failure (unrelated to this plan's clusters, same cause as before)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the Groups cluster** - `c7a9e4fe` (refactor)
2. **Task 2: Extract the Links cluster** - `63ffbc5b` (refactor)
3. **Task 3: Extract the Aliases cluster, run N+1/query-count checks, and run the full gate** - `302c1535` (refactor)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/fansub_repository_groups.go` - Groups CRUD + count/link read-model helpers (new)
- `backend/internal/repository/fansub_repository_links.go` - Group-link CRUD + legacy-column sync helpers (new)
- `backend/internal/repository/fansub_repository_aliases.go` - Alias CRUD + Kürzel-owner resolution (new)
- `backend/internal/repository/fansub_repository.go` - shrunk from 2657 to 1437 lines; struct/constructor and remaining clusters intact
- `backend/internal/repository/fansub_repository_test.go` - 3 os.ReadFile targets updated to the new file location (see Deviations)

## Decisions Made
- **Helper placement for cross-cluster-shared functions:** `populateCountMap` and `applyLegacyLinkProjection` are called by both a Groups-cluster method (moved) and the public-profile cluster (not yet moved, stays in `fansub_repository.go` until 174-17). Per the plan's explicit instruction, both helpers were placed in the first-created sibling file (`fansub_repository_groups.go`); the still-main-file public-profile methods (`GetPublicProfileBySlug`, `attachPublicReleaseVersionsCount`) call them via the same-package reference — Go requires no import for this, confirmed by `go build ./...`.
- **scanFansubGroupLink placement:** used by both `ListGroupLinks` (Links cluster) and `attachGroupLinks` (Groups cluster) — placed in `fansub_repository_links.go` as the Links-domain row scanner since it scans a `FansubGroupLink`; `attachGroupLinks` in the groups file calls it via same-package reference.
- **ANY($1) batch-pattern location clarified:** the plan's Task 3 action text referenced an "alias-normalization-check" ANY($1) batch query that must "move intact" into `fansub_repository_aliases.go`. Grep + manual read confirmed this pattern actually lives in `populateAliasMergePreview`, a helper exclusively called by `GetMergePreview` (part of the Merge cluster the plan's own objective explicitly defers to 174-17), not any of the 7 Alias-CRUD methods this plan moves. It was correctly left untouched in `fansub_repository.go` — present, unmodified, confirmed via `grep -n "normalized_alias = ANY" fansub_repository.go`. 174-17 will relocate it alongside the rest of Merge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated 3 self-inspection test os.ReadFile targets after the Groups-cluster move**
- **Found during:** Task 1 (Extract the Groups cluster) / confirmed via Task 3's full test-suite run
- **Issue:** `fansub_repository_test.go` has pre-existing tests (`TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers`, `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime`, `TestFansubRepository_DeleteGroupCleansRestrictedChildrenFirst`) that call `os.ReadFile("fansub_repository.go")` and search for function-body fragments via `strings.Index`/`strings.Contains` — the exact "Teststil Altlast" pattern CLAUDE.md documents as forbidden for new tests but tolerated as pre-existing debt. Moving `attachGroupCounts`/`attachGroupLinks`/`DeleteGroup` out of `fansub_repository.go` into the new sibling file broke all 3 tests (function fragments no longer found in the file they read), with zero actual behavior change.
- **Fix:** Updated the `os.ReadFile` path in all 3 tests from `"fansub_repository.go"` to `"fansub_repository_groups.go"` — a pure import-path adjustment, not a logic rewrite. This exact class of breakage was already documented and resolved the same way for Phase 143's `member_claims_repository.go` split (174-HOTSPOTS.md's precedent analysis), confirming it is not a real regression.
- **Files modified:** `backend/internal/repository/fansub_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestFansubRepository|TestAttachGroupCounts' -v` — all 3 pass; only the pre-existing, documented `TestFansubRepository_PublicProfileSourceInvariants` failure remains (unaffected by this plan's clusters)
- **Committed in:** `c7a9e4fe` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — Rule 3, package-manager-install exclusion not applicable)
**Impact on plan:** Necessary and minimal fix to keep the test suite green after the mandated file move; no scope creep, no behavior change, no new test logic introduced. This plan did not rewrite the pre-existing Altlast self-inspection pattern into real behavior assertions — that is out of scope for a D-15 structural move and remains tracked as pre-existing debt per CLAUDE.md's Teststil section.

## Issues Encountered
- Local Go toolchain is not installed on the host; all `go build`/`go test` verification ran via `docker run --network team4s_default -v "$(pwd)/backend:/app" -v gomodcache:/go/pkg/mod golang:1.25-alpine`, matching the documented container-network protocol (`golang:1.25-alpine` in `team4s_default`, DSN `postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable` resolved from the live backend container's env). A named `gomodcache` Docker volume was created to avoid re-downloading all Go module dependencies on every container run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `fansub_repository.go` is down to 1437 lines with the struct, constructor, and the public-profile/members/anime-fansub-association/merge clusters still in place for 174-17 to split next.
- The pre-existing `TestFansubRepository_PublicProfileSourceInvariants` failure (targeting the public-profile cluster) is explicitly in scope for 174-17 to resolve per that plan's own must-haves.
- No blockers. Build and the fansub-scoped test suite are green except the one documented, unrelated pre-existing failure.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

- FOUND: backend/internal/repository/fansub_repository_groups.go
- FOUND: backend/internal/repository/fansub_repository_links.go
- FOUND: backend/internal/repository/fansub_repository_aliases.go
- FOUND commit: c7a9e4fe (Task 1)
- FOUND commit: 63ffbc5b (Task 2)
- FOUND commit: 302c1535 (Task 3)
