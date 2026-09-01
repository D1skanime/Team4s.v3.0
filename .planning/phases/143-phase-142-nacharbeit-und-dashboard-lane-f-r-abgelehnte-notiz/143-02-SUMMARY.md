---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 02
subsystem: database
tags: [go, repository-split, modularity, member-claims]

# Dependency graph
requires:
  - phase: 143-01
    provides: precedent for splitting an oversized backend/internal/repository/*.go file (app_auth.go split into four files by responsibility) used as the naming/commit-message pattern for this plan
provides:
  - member_claims_repository.go reduced from 516 to 344 lines (under CLAUDE.md's 450-line cap)
  - member_claims_submit_repository.go (SubmitClaim + SubmitClaimInput)
  - member_claims_queries_repository.go (ListPendingClaimsForGroup, GetMyClaim, UpdateNoindex)
affects: [any future phase touching MemberClaimsRepository or the claims/dashboard handlers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Oversized repository struct split by responsibility across multiple same-package files (submit path vs. read-query path vs. core/mutation/scan helpers), mirroring the existing member_claims_list_repository.go / member_claims_activate_repository.go / member_claims_role_activation_repository.go convention"

key-files:
  created:
    - backend/internal/repository/member_claims_submit_repository.go
    - backend/internal/repository/member_claims_queries_repository.go
  modified:
    - backend/internal/repository/member_claims_repository.go

key-decisions:
  - "SubmitClaimInput moved alongside SubmitClaim into the new submit file since it is SubmitClaim's sole parameter type and has no other production reference outside repository.SubmitClaim{...} (verified via grep); same-package visibility makes the external reference (handlers/member_claims_handler.go) unaffected by which file declares it."

requirements-completed: ["Randbedingung-450-line-member_claims_repository"]

# Metrics
duration: ~8min
completed: 2026-09-01
---

# Phase 143 Plan 02: Split member_claims_repository.go Summary

**Pure relocation split of the 516-line member_claims_repository.go into three files (344/93/96 lines) with zero behavior change, closing the CLAUDE.md 450-line modularity violation.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-01T20:38:49Z
- **Completed:** 2026-09-01T20:41:02Z
- **Tasks:** 2 (1 code task, 1 verification-only task)
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments
- `member_claims_repository.go` shrunk from 516 to 344 lines, under the 450-line cap
- `SubmitClaim` (+ `SubmitClaimInput`) relocated to a new `member_claims_submit_repository.go` (93 lines)
- `ListPendingClaimsForGroup`, `GetMyClaim`, `UpdateNoindex` relocated to a new `member_claims_queries_repository.go` (96 lines)
- Backend builds clean (`go build ./...`), `gofmt -l` and `go vet` report zero issues on all three touched files
- Existing `TestMemberClaimsRepository*` suite passes unmodified (2 real DB-backed tests pass, 4 pre-existing stubs still skip — unrelated to this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Move SubmitClaim and the three read-query methods into two new sibling files** - `8bd28db6` (refactor)
2. **Task 2: Build and run existing MemberClaimsRepository tests unchanged** - verification-only, no file changes; folded into Task 1's commit since `go build`/`gofmt -l`/`go vet`/`go test` were all run and confirmed clean as part of the same session with zero additional edits required

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `backend/internal/repository/member_claims_repository.go` - now holds `NewMemberClaimsRepository`, `WithAuditLog`, `ListPendingClaimAttentionCandidates`, `SearchHistoricalMembers`, `VerifyClaim`, `RejectClaim`, `ClaimMutationError`/`AsClaimMutationError`, and the shared scan helpers/types (344 lines)
- `backend/internal/repository/member_claims_submit_repository.go` - `SubmitClaimInput` + `SubmitClaim` (93 lines)
- `backend/internal/repository/member_claims_queries_repository.go` - `ListPendingClaimsForGroup`, `GetMyClaim`, `UpdateNoindex` (96 lines)

## Decisions Made
- `SubmitClaimInput` travels with `SubmitClaim` into the submit file rather than staying behind, since it is used nowhere else in production code except as `SubmitClaim`'s own parameter type (confirmed via `grep -rn "SubmitClaimInput"`); the one external caller (`handlers/member_claims_handler.go`) references it as `repository.SubmitClaimInput`, which resolves identically regardless of which file in the `repository` package declares it.

## Deviations from Plan

None - plan executed exactly as written. Both new files hit their target line counts (~90 lines each vs. the plan's ~79/~90 estimate), and the remaining core file landed at 344 lines against the plan's ~345 target.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- No blockers. `MemberClaimsRepository`'s three constituent files are now all under the 450-line cap and match the codebase's existing split convention (`member_claims_list_repository.go`, `member_claims_activate_repository.go`, `member_claims_role_activation_repository.go`).
- Plan 143-03 (or whichever next plan touches claims/dashboard handlers) can proceed without further repository-layer restructuring here.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: backend/internal/repository/member_claims_submit_repository.go
- FOUND: backend/internal/repository/member_claims_queries_repository.go
- FOUND: backend/internal/repository/member_claims_repository.go
- FOUND commit: 8bd28db6
