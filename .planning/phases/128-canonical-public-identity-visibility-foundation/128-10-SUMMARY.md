---
phase: 128-canonical-public-identity-visibility-foundation
plan: 10
subsystem: backend-repository
tags: [go, postgres, public-member, identity, access-control]

requires:
  - phase: 128-06
    provides: canonical stored public member identity
  - phase: 128-07
    provides: stored slug projection across group/domain repositories
  - phase: 128-08
    provides: stored slug projection across archive/ranking repositories
  - phase: 128-09
    provides: deny-first public member access resolver and ID-based profile detail loaders
provides:
  - ID-only public member contribution timeline loader
  - ID-only project member relation gate
  - stored public_slug project summary projection
  - package invariant rejecting legacy nickname-derived slug helpers
affects: [128-12, public-member-handlers, project-member-routes]

tech-stack:
  added: []
  patterns: [handler-resolved stable member ID passed into detail repositories]

key-files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_public_repository.go
    - backend/internal/repository/anime_contributions_public_member_test.go
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/repository/project_member_public_repository_test.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_test.go

key-decisions:
  - "Contribution and project-member repositories accept only a stable member ID resolved by the shared access boundary."
  - "Project summaries expose members.public_slug directly; nickname-derived aliases and numeric fallbacks are not detail-loader concerns."

patterns-established:
  - "Resolver boundary: handlers authorize a raw public slug once, then repositories receive only the resulting member ID."
  - "Stored identity projection: outbound member links use members.public_slug without derivation or fallback."

requirements-completed: [PMID-03, PMPR-02, PMPR-03]

duration: 15min
completed: 2026-08-13
---

# Phase 128 Plan 10: Resolved-ID Subresource Repositories Summary

**Member contribution and project-detail repositories now consume handler-resolved stable IDs, with stored public slugs and no nickname/numeric fallback seam.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-13T15:13:00Z
- **Completed:** 2026-08-13T15:28:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced slug-based contribution lookup and missing-as-empty behavior with `GetPublicMemberContributionsByID`.
- Replaced project-local member resolution with `HasMemberRelation`, preserving anime/group ownership predicates.
- Removed `memberSlugExpr`, `deriveMemberSlug`, and `normalizeMemberProfileSlug`, enforced by a package-wide source invariant.
- Changed project summary identity projection to the stored immutable `members.public_slug`.

## Task Commits

Each task followed RED then GREEN:

1. **Task 1 RED: resolved-ID contribution contract** - `43d93528`
2. **Recovery: exclude pre-staged frontend changes** - `70dadc69`
3. **Task 1 GREEN: ID-based contribution loader** - `f2a91415`
4. **Task 2 RED: resolved-ID project relation contract** - `335a210a`
5. **Task 2 GREEN: ID-based project relation gate** - `ed7bd169`

## Files Created/Modified

- `backend/internal/repository/anime_contributions_public_repository.go` - ID-based contribution timeline loader.
- `backend/internal/repository/anime_contributions_public_member_test.go` - resolved-ID and package legacy-helper invariants.
- `backend/internal/repository/project_member_public_repository.go` - ID-based relation check and stored slug summary.
- `backend/internal/repository/project_member_public_repository_test.go` - relation/access boundary source contracts.
- `backend/internal/repository/member_profile_repository.go` - removed obsolete slug derivation helpers.
- `backend/internal/repository/member_profile_repository_test.go` - asserts legacy helper removal.

## Decisions Made

- The contribution and project repositories do not parse, normalize, resolve, or alias inbound public identity.
- Existing contribution visibility predicates, release/fansub ownership joins, uploader resolution, and pagination remain unchanged.
- Handler integration is intentionally left to dependent Plan 128-12, which owns the handler and composition-root files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed obsolete helper definitions outside the frontmatter file list**
- **Found during:** Task 1
- **Issue:** The task explicitly required package-wide deletion of legacy helpers, but their final definitions and assertions lived in the member profile repository files omitted from `files_modified`.
- **Fix:** Removed only the obsolete definitions/imports and updated the existing invariant assertions.
- **Files modified:** `member_profile_repository.go`, `member_profile_repository_test.go`
- **Verification:** Package invariant, compile-only test, and vet pass.
- **Committed in:** `f2a91415`

**2. [Rule 3 - Blocking] Synced canonical source into the stale development container**
- **Found during:** Task 1 RED
- **Issue:** Docker Compose watch was not running, so the container initially tested stale source and produced a false RED pass.
- **Fix:** Copied the canonical `backend/internal` source into the running backend container before verification.
- **Files modified:** None
- **Verification:** RED tests failed for the intended missing contracts, then passed after implementation.

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to execute the specified package invariant and test the canonical checkout; no domain or API scope was expanded.

## Issues Encountered

- Two unrelated, pre-staged frontend files were captured by the first RED commit. A dedicated corrective commit (`70dadc69`) reversed only those committed hunks, then restored the user's original staged/unstaged file state exactly.
- The full repository integration suite has pre-existing fixture/schema drift. Details are recorded in `deferred-items.md`; focused suites, repository compilation, and vet pass.

## Verification

- `go test ./internal/repository -run 'PublicMemberContributions|ProjectMember|MemberSlugInvariant' -count=1` - passed.
- `go test ./internal/repository -run '^$' -count=1` - passed (compile-only).
- `go vet ./internal/repository` - passed.
- Legacy-helper and local-resolver source scans - passed.
- Stub scan of changed code - passed.
- `git diff --check` - passed.
- Full repository integration suite - unrelated existing fixture failures documented in `deferred-items.md`.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-12 can inject the shared resolver into contribution/project handlers and call the new ID-based repository interfaces.
- No repository-level blocker remains.

## Self-Check: PASSED

- All six modified implementation/test files exist.
- All five execution commits exist.
- Focused verification and source invariants pass.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
