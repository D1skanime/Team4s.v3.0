---
phase: 128-canonical-public-identity-visibility-foundation
plan: 12
subsystem: backend-handler-access
tags: [go, gin, public-member, optional-auth, bola, privacy]
requires:
  - phase: 128-02
    provides: seven-route access matrix and zero-loader denial contract
  - phase: 128-10
    provides: resolved-ID contribution loader and project-member relation gate
  - phase: 128-11
    provides: shared public-member resolver, neutral writer, and cache helper
provides:
  - Deny-first member contribution and project-member handlers
  - One shared member access resolver across all three public handler families
  - Optional authentication on all seven member-specific GET routes
affects: [128-13, 128-15, 128-16, public-member-routes]
tech-stack:
  added: []
  patterns:
    - Resolve public member access before relation or detail loading
    - Inject narrow ID-only loaders beside one shared access authority
key-files:
  created: []
  modified:
    - backend/internal/handlers/contributions_public_handler.go
    - backend/internal/handlers/project_member_public_handler.go
    - backend/internal/handlers/project_member_public_handler_test.go
    - backend/internal/handlers/public_member_access_matrix_test.go
    - backend/cmd/server/main.go
key-decisions:
  - "One MemberProfileRepository instance is the access resolver for profile, contribution, and project-member handler families."
  - "All seven member-specific GET routes use the existing optional-auth middleware; no role bypass or token seam was added."
patterns-established:
  - "Subresource gate: validate domain IDs, resolve member access, verify relation, then load detail."
  - "Neutral denial: access and relation misses share the public-member unavailable writer and never return empty 200."
requirements-completed: [PMPR-01, PMPR-02, PMPR-03, PMPR-05]
metrics:
  duration: 14min
  completed: 2026-08-13
---

# Phase 128 Plan 12: Unified Member Subresource Access Summary

**Contributions and every retained project-member route now resolve canonical member access before ID-only detail loading through one optional-auth authority.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-13T15:50:59Z
- **Completed:** 2026-08-13T16:04:59Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced the final slug-shaped contribution call with `GetPublicMemberContributionsByID` after shared access resolution.
- Replaced the final project-local member resolver with shared access resolution followed by the ID-based `HasMemberRelation` gate.
- Applied neutral 404 denial, zero detail loads before authorization, and owner-preview cache isolation across contributions, summary, notes, media, and releases.
- Injected one `memberProfileRepo` access resolver into all three handler families and attached existing optional auth middleware to exactly seven member routes.
- Closed the Plan-128-11 transient compile gap; exact handler tests, full handler tests, whole-backend compile, and whole-backend vet pass.

## Task Commits

1. **Task 1 RED: Member subresource access tests** - `7af736d9` (test)
2. **Task 1 GREEN: Deny-first contribution/project handlers** - `e18fe144` (feat)
3. **Task 2 RED: Composition-root resolver/auth contract** - `a753d212` (test)
4. **Task 2 GREEN: Shared resolver and seven-route optional auth wiring** - `24beb206` (feat)

## Files Created/Modified

- `backend/internal/handlers/contributions_public_handler.go` - Narrow contribution loader interface and resolver-first member timeline.
- `backend/internal/handlers/project_member_public_handler.go` - Shared access resolution before relation and project detail loaders.
- `backend/internal/handlers/project_member_public_handler_test.go` - Runtime denial/order/owner tests and server wiring invariants.
- `backend/internal/handlers/public_member_access_matrix_test.go` - Corrected cache-header ownership assertion for the shared access helper.
- `backend/cmd/server/main.go` - One resolver injection and optional auth on all seven routes.
- `.planning/phases/128-canonical-public-identity-visibility-foundation/deferred-items.md` - Records closure of the transient handler compile gap.

## Decisions Made

- Reused `memberProfileRepo` as the sole access authority instead of adding a resolver, DI container, or compatibility seam.
- Preserved fansub/anime contribution routes and release-version media URL ownership unchanged.
- Kept `Vary: Authorization` owned once by `public_member_access.go`; handlers consume the helper instead of duplicating cache headers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected stale shared-cache source assertion**

- **Found during:** Task 1 GREEN verification
- **Issue:** The Wave-0 matrix still required the literal word `Vary` inside each handler, although Plan 128-11 centralized that header in `public_member_access.go`.
- **Fix:** Changed the test to require `Vary: Authorization` in the shared helper and forbid duplicate handler-level header writes.
- **Files modified:** `backend/internal/handlers/public_member_access_matrix_test.go`
- **Verification:** Seven-route matrix and full handler package pass.
- **Committed in:** `e18fe144`

**2. [Rule 3 - Blocking] Mounted shared contracts for package-wide verification**

- **Found during:** Overall verification
- **Issue:** A disposable verification container mounted only `backend/`, so an unrelated handler contract test could not read `/shared/contracts/openapi.yaml`.
- **Fix:** Mounted the canonical repository root and reran the complete verification suite.
- **Files modified:** None
- **Verification:** Full handler package, whole-backend compile, and whole-backend vet pass.
- **Committed in:** No code change required

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes preserved the planned shared seam and verification scope; no API, auth, or domain ownership expansion occurred.

## Issues Encountered

- Two early remote regex commands were parsed by local PowerShell and failed before repository changes; commands were rerun through a temporary verification script.
- The first broad stub scan matched the pre-existing FFmpeg log phrase “not available” in `main.go`; the scan was narrowed to the changed handler/test code, where no stubs exist.

## Verification

- Exact Task 1 matrix: passed.
- Exact Task 2 server/handler matrix: passed.
- Full `internal/handlers` package: passed.
- Whole backend compile-only (`go test ./... -run '^$'`): passed.
- Handler/server and whole-backend `go vet`: passed.
- Seven-route optional-auth, one-resolver, and stale-call source invariants: passed.
- Stub scan and `git diff --check`: passed.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All seven public member routes now share one deny-first access boundary and are ready for contract/frontend owner-preview work.
- The transient Plan-128-11 handler/backend compile gap is resolved; only the unrelated repository fixture drift already listed in `deferred-items.md` remains.

## Self-Check: PASSED

All five implementation/test files and the deferred-item update exist; all four task commits exist; exact matrices, full handler tests, whole-backend compile/vet, route/DI invariants, stub scan, and diff checks pass.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
