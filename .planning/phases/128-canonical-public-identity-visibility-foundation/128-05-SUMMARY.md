---
phase: 128-canonical-public-identity-visibility-foundation
plan: 05
subsystem: backend-repository
tags: [postgresql, pgx, public-identity, slugs, concurrency]
requires:
  - phase: 128-01
    provides: Executable normalization, allocator, and creation-seam RED contracts
  - phase: 128-04
    provides: Required unique immutable members.public_slug schema
provides:
  - One deterministic canonical public-member slug normalizer
  - One globally serialized caller-transaction slug allocator
  - Canonical slug persistence in every production member creation seam
affects: [128-09, 128-11, 128-13, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Caller-owned pgx transaction allocation with one namespace advisory lock
    - Explicit German transliteration before NFD mark removal
key-files:
  created:
    - backend/internal/repository/member_public_slug.go
  modified:
    - backend/internal/repository/member_public_slug_test.go
    - backend/internal/repository/member_requests_repository.go
    - backend/internal/repository/fansub_group_app_members_repository.go
    - backend/internal/repository/fansub_group_app_members_repository_test.go
    - backend/internal/repository/hist_group_members_repository.go
key-decisions:
  - "The entire members.public_slug namespace uses one transaction advisory lock, including literal suffix collisions."
  - "All production member creation paths allocate exactly once inside their existing caller-owned transaction."
patterns-established:
  - "Canonical identity allocation: normalize, namespace-lock, select smallest readable candidate, then insert in the same transaction."
requirements-completed: [PMID-01, PMID-02]
metrics:
  duration: 16m
  completed: 2026-08-13
---

# Phase 128 Plan 05: Canonical Public Member Slug Allocation Summary

**A deterministic German-aware slug normalizer and globally serialized PostgreSQL allocator now persist immutable canonical identity through all three production member creation transactions.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-13T13:37:29Z
- **Completed:** 2026-08-13T13:53:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added one shared normalizer with explicit ?/?/?/? and ampersand transliteration, NFD accent removal, separator collapse, and fail-closed empty, numeric, reserved, control, path-separator, and length validation.
- Added one allocator that accepts a caller-owned `pgx.Tx`, takes a transaction advisory lock for the complete `members.public_slug` namespace, and selects the smallest available readable suffix without nested transactions or technical fallback.
- Wired `ApproveRequest`, `ensureAppUserMemberAnchorTx`, and `CreateWithAutoMember` to allocate and persist `public_slug` inside their existing transactions before dependent claim, membership, and history writes.
- Replaced Wave-0 placeholder collision checks with guarded executable race coverage, including same-base allocation and the literal `name-2` collision case.

## Task Commits

1. **Task 1 RED: executable allocator contracts** - `817783b5` (test)
2. **Task 1 GREEN: shared normalizer and allocator** - `51f74b66` (feat)
3. **Task 2 RED: creation transaction contracts** - `0b1b4803` (test)
4. **Task 2 GREEN: all production creation seams** - `cbd3dd0f` (feat)

## Files Created/Modified

- `backend/internal/repository/member_public_slug.go` - Shared validation, normalization, namespace locking, and suffix allocation.
- `backend/internal/repository/member_public_slug_test.go` - Direct unit, guarded concurrency, literal-suffix race, length, inventory, and call-order coverage.
- `backend/internal/repository/member_requests_repository.go` - Allocates after the pending request row is locked and inserts the canonical slug.
- `backend/internal/repository/fansub_group_app_members_repository.go` - Resolves the final app-user nickname, allocates on the supplied transaction, and inserts the canonical slug.
- `backend/internal/repository/fansub_group_app_members_repository_test.go` - Keeps the existing canonical-anchor source contract aligned with the required slug column.
- `backend/internal/repository/hist_group_members_repository.go` - Allocates before the auto-created member insert in the existing transaction.

## Verification

- Guarded repository race suite with `MemberSlug|PublicIdentity|ApproveRequest|AutoMember|MemberAnchor`: passed against `team4s_phase128_test` with `CGO_ENABLED=1`.
- Focused `go vet ./internal/repository`: passed.
- Production source inventory: exactly three repository files contain `INSERT INTO members`, and all three call `allocatePublicMemberSlugTx` and insert `public_slug`.
- Repository-wide `git diff --check`: passed with unrelated user changes preserved.
- Stub scan: no goal-blocking stubs or placeholder implementations found.
- Threat-surface scan: no endpoint, auth path, file-access, or schema trust boundary was added beyond the planned nickname-to-identity allocator and PostgreSQL namespace lock.

## Decisions Made

- Used a single constant transaction advisory lock for the entire slug namespace because per-base locks cannot serialize `name` against a literal `name-2` creator.
- Kept allocation inside caller-owned transactions and retained the database unique constraint as the final invariant; no allocator starts or commits a transaction.
- Limited canonical slugs to the migration's 120-character column and trims the base when a readable numeric suffix requires space.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Replaced placeholder concurrency assertions with executable guarded races**
- **Found during:** Task 1 RED
- **Issue:** The Wave-0 test only compared constant slices and skipped runtime allocator behavior.
- **Fix:** Added real concurrent transactions for base/base-2/base-3 allocation and a lock-blocking proof for literal suffix races.
- **Files modified:** `backend/internal/repository/member_public_slug_test.go`
- **Verification:** Guarded `-race` repository suite passed.
- **Committed in:** `817783b5`, completed by `51f74b66`

**2. [Rule 3 - Blocking] Updated the adjacent canonical-anchor source contract**
- **Found during:** Task 2 verification
- **Issue:** An existing source test required the pre-0145 member INSERT column list and failed after correctly adding `public_slug`.
- **Fix:** Updated only that required fragment to include `public_slug`.
- **Files modified:** `backend/internal/repository/fansub_group_app_members_repository_test.go`
- **Verification:** Focused repository tests and race suite passed.
- **Committed in:** `cbd3dd0f`

---

**Total deviations:** 2 auto-fixed (1 missing critical test coverage, 1 blocking source contract).
**Impact on plan:** Both changes directly enforce the planned allocator and creation-seam guarantees; no parallel identity seam, compatibility alias, backfill, or additional creation path was introduced.

## Issues Encountered

- The long-running backend container did not mount canonical backend source and its Alpine image requires CGO build tools for `-race`. Verification used disposable Compose containers with the canonical backend bind-mounted and temporary `gcc`/`musl-dev` installed only in the disposable container.

## Known Stubs

None.

## TDD Gate Compliance

- RED commits: `817783b5`, `0b1b4803`
- GREEN commits: `51f74b66`, `cbd3dd0f`
- Gate order verified in Git history.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Stored immutable slugs are now created consistently for every legitimate member writer.
- Later Phase-128 plans can replace derived public-profile reads and outbound links with `members.public_slug` without creation-path ambiguity.

## Self-Check: PASSED

The created helper, all five modified files, and commits `817783b5`, `51f74b66`, `0b1b4803`, and `cbd3dd0f` were verified in the canonical repository. All task and plan-level gates passed.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
