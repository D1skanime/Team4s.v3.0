---
phase: 128-canonical-public-identity-visibility-foundation
plan: 02
subsystem: backend-testing
tags: [postgresql, access-control, privacy, gin, tdd]
requires:
  - phase: 128-01
    provides: Fail-closed Phase-128 PostgreSQL fixture and compilable source-inspection RED pattern
provides:
  - Executable repository access matrix for stored slugs and verified-claim ownership
  - Seven-route handler access matrix with zero-loader denial spies
  - Byte-identical neutral 404 and owner cache-isolation contracts
affects: [128-07, 128-08, 128-09, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Source-inspection RED gates paired with passing executable reference matrices
    - Shared test-local resolver and per-detail loader recorders across route families
key-files:
  created:
    - backend/internal/repository/member_public_access_repository_test.go
    - backend/internal/handlers/public_member_access_matrix_test.go
  modified:
    - backend/internal/handlers/app_public_profile_test.go
    - backend/internal/handlers/project_member_public_handler_test.go
key-decisions:
  - "Repository access tests expose only member ID, canonical stored slug, and server-computed ownership/private-preview facts."
  - "The same eight-case access matrix applies to profile, projects, contributions, summary, notes, media, and releases."
  - "Wave-0 access gates remain compilable and fail only their named missing production contracts until Plan 128-09."
patterns-established:
  - "Deny-first matrix: resolve access exactly once before any protected detail loader."
  - "Privacy-neutral denial: missing and every unauthorized private request share byte-identical 404 output."
requirements-completed: [PMPR-01, PMPR-02, PMPR-03, PMPR-05]
metrics:
  duration: 15m
  completed: 2026-08-13
---

# Phase 128 Plan 02: Public Identity Access Matrix Summary

**Compilable RED repository and seven-route handler contracts now enforce verified-claim ownership, pre-load denial, neutral 404s, and private owner caching.**

## Performance

- **Duration:** 15m
- **Started:** 2026-08-13T12:21:34Z
- **Completed:** 2026-08-13T12:36:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added an eight-case guarded PostgreSQL reference matrix covering public anonymous, private anonymous, verified owner, private non-owner, admin non-owner, missing, numeric, and guessed post-nickname slugs.
- Required ownership to come only from an exact verified `member_claims(member_id, app_user_id)` row; pending/rejected claims, login, `members.user_id`, and admin state do not grant private access.
- Applied the same access decision to profile, projects, contributions, and four project-member routes, proving every denial invokes zero protected detail loaders.
- Replaced legacy hidden-200 expectations with byte-identical neutral 404 contracts and asserted `Vary: Authorization` plus `private, no-store` for owner responses.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the repository access matrix** - `027ef57e` (test)
2. **Task 2: Add shared handler resolver and zero-loader spies** - `de563720` (test)

## Files Created/Modified

- `backend/internal/repository/member_public_access_repository_test.go` - Guarded access reference matrix and expected production resolver source contract.
- `backend/internal/handlers/public_member_access_matrix_test.go` - Shared resolver/loader recorders, seven-route matrix, denial equality, and cache assertions.
- `backend/internal/handlers/app_public_profile_test.go` - Neutral byte-identical missing/private response contract replacing `members_only` hidden-200 tests.
- `backend/internal/handlers/project_member_public_handler_test.go` - Neutral byte-identical project-member denial contract while preserving adjacent route/source coverage.

## Decisions Made

- Kept production authorization absent in Wave 0 and represented the expected interfaces through compilable source-inspection assertions, so RED is caused by missing Phase-128 contracts rather than undefined Go symbols.
- Used a test-local executable reference resolver against the Plan-01 fixture to prove access semantics independently of the future production method.
- Kept platform-admin input in the denial matrix but deliberately excluded it from resolver authorization.

## Verification

- Guarded repository reference matrix: passed with the explicit `TEAM4S_PHASE128_TEST_DSN`.
- Repository RED gate: passed; only `TestPhase128PublicMemberAccessContract` failed because `member_public_access_repository.go` is intentionally absent.
- Handler seven-route reference matrix and unavailable-response tests: passed.
- Handler RED gate: passed; only `TestPhase128PublicMemberAccessMatrix` failed because `public_member_access.go` and production integration are intentionally absent.
- `go vet ./internal/repository ./internal/handlers`: passed in a disposable Compose backend container with the canonical backend bind-mounted.
- Task commit whitespace checks and repository `git diff --check`: passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ran verification against the canonical bind-mounted source**

- **Found during:** Task 1 verification
- **Issue:** The long-running backend container does not expose newly written source files.
- **Fix:** Used disposable Compose backend containers with `/home/d1sk/team4s/backend` bind-mounted at `/app` for formatting, tests, and vet.
- **Files modified:** None
- **Verification:** Both named RED gates and all supporting passing suites executed from the canonical source.
- **Committed in:** No code change required

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Verification transport changed only; test contracts and production scope remained exactly as planned.

## Issues Encountered

- One malformed shell redirection briefly created a root-level file named ` 2`; it was identified by timestamp and removed immediately. No user-owned file or repository state was changed.

## Known Stubs

- `TestPhase128PublicMemberAccessContract` intentionally remains RED until Plan 128-09 adds `member_public_access_repository.go` and the production resolver.
- `TestPhase128PublicMemberAccessMatrix` intentionally remains RED until Plan 128-09 adds `public_member_access.go` and injects the shared resolver/loaders into all seven routes.
- These are the planned Wave-0 contracts and do not prevent this plan's test-foundation goal.

## TDD Gate Compliance

This Wave-0 plan intentionally establishes RED contracts only. Both task commits are `test(128-02)` commits; GREEN production work is assigned to Plan 128-09.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 128-07 and 128-08 can extend frontend and contract RED coverage using the same neutral denial/cache vocabulary.
- Plan 128-09 can implement the shared repository resolver and handler access seam directly against these executable matrices.

## Self-Check: PASSED

All four created/modified files and both task commits were verified. The required RED suites stop only at their named missing Phase-128 production contracts.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
