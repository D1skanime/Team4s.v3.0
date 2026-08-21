---
phase: 136-capability-policy-catalog-schema-contract
plan: 25
subsystem: authorization
tags: [go, permissions, openapi, typescript, contract-parity]
requires:
  - phase: 136-20
    provides: catalog-driven role presentation baseline
provides:
  - exact five-action narrow group capability projection
  - narrow-only workspace admission
  - synchronized Go, root/focused OpenAPI, and TypeScript capability contract
affects: [phase-138, group-admin-workspace]
tech-stack:
  added: []
  patterns: [exact-action capability projection, semantic cross-layer parity]
key-files:
  created: []
  modified:
    - backend/internal/handlers/app_auth.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/handlers/phase136_contract_parity_test.go
    - shared/contracts/openapi.yaml
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/fansub.ts
key-decisions:
  - "Narrow capability booleans mirror exact permission actions and never synthesize broad can_edit_group."
  - "Narrow-only actors are admitted when any exact projected action is allowed."
requirements-completed: [CAP-12, CAP-13, QUAL-01]
duration: 14min
completed: 2026-08-21
---

# Phase 136 Plan 25: Narrow Group Capability Projection Summary

**Five exact group-scoped authorization decisions now reach the browser through a required, parity-tested Go/OpenAPI/TypeScript contract without granting broad edit authority.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-21T10:16:04Z
- **Completed:** 2026-08-21T10:30:00Z
- **Tasks:** 2 TDD tasks
- **Files modified:** 11

## Accomplishments

- Projected general page edit, group-media update, technical-links edit, founding-history edit, and group-links update from the existing permission service.
- Admitted gfxler, techadmin, founder, and co_leader actors whose only rights are narrow defaults while preserving fail-closed lookup behavior.
- Added semantic parity coverage for required non-nullable booleans across Go JSON, both OpenAPI documents, and TypeScript.
- Synchronized existing capability fixtures/defaults with conservative false values.

## Task Commits

1. **Task 1 RED:** `2d77c435` — specify narrow group capability projection
2. **Task 1 GREEN:** `f1cc72c5` — project narrow group capabilities
3. **Task 2 RED:** `ebe1e302` — enforce group capability contract parity
4. **Task 2 GREEN:** `0d6315c4` — synchronize group capability contracts
5. **Rule-3 fix:** `ccb8b625` — align capability fixtures with required contract

## Files Created/Modified

- `backend/internal/handlers/app_auth.go` — exact narrow permission lookups, response fields, and admission guard.
- `backend/internal/handlers/app_auth_test.go` — role projection, narrow-only admission, and fail-closed tests.
- `backend/internal/handlers/phase136_contract_parity_test.go` — semantic Go/YAML/TypeScript parity gate.
- `shared/contracts/openapi.yaml` — canonical required narrow response fields.
- `shared/contracts/admin-capabilities.yaml` — focused narrow capability schema.
- `frontend/src/types/fansub.ts` — required frontend capability fields.
- Five existing admin edit fixtures/defaults — conservative false values for new narrow fields.

## Decisions Made

- Kept `can_edit_group_general` distinct from broad `can_edit_group`.
- Reused `CanForFansubGroup` for every exact action; no resolver, endpoint, or parallel authorization seam was added.
- The focused admin contract documents the five Phase-136 narrow projection fields while the root contract retains the complete response.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Initialized the permission cache explicitly in handler capability tests**
- **Found during:** Task 1 RED
- **Issue:** Package-global permission cache state was unset, causing existing focused handler tests to fail before exercising capability projection.
- **Fix:** Added a test-local database-style cache loader in the declared handler test file.
- **Files modified:** `backend/internal/handlers/app_auth_test.go`
- **Verification:** Focused handler suite passes after cache initialization.
- **Committed in:** `2d77c435`

**2. [Rule 3 - Blocking] Synchronized existing capability fixtures/defaults**
- **Found during:** Task 2 verification
- **Issue:** Making the new TypeScript fields required exposed five structurally stale existing capability objects.
- **Fix:** Added conservative false defaults to the five exact authorized files.
- **Files modified:** ContributionsReviewSection.test.tsx, FansubDetailsTab.test.tsx, FansubEditAccessGate.tsx, GroupMediaReviewSection.test.tsx, ReleaseVersionMediaReviewSection.test.tsx
- **Verification:** 39 focused Vitest tests pass; typecheck no longer reports capability-object errors.
- **Committed in:** `ccb8b625`

**3. [Rule 3 - Blocking] Cleared stale backend Go build cache**
- **Found during:** Task 1 GREEN and overall verification
- **Issue:** The mounted source was current but the persistent container build cache compiled an older handler.
- **Fix:** Ran `go clean -cache` in the backend Compose service before rerunning focused tests.
- **Files modified:** None
- **Verification:** Focused backend suites pass.

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** Required for deterministic tests and cross-surface contract correctness; no authorization scope was broadened.

## Verification

- `docker compose exec -T team4sv30-backend go test ./internal/handlers -run 'GetFansubGroupCapabilities|NarrowRoleDefaults|Phase136ContractParity' -count=1` — PASS.
- Four focused admin capability component suites — PASS, 39 tests.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — Plan-owned and authorized capability errors resolved; command remains blocked by unrelated generated `.next/dev` route declarations and pre-existing page exports outside this plan.
- `git diff --check` — PASS before unrelated concurrent work was excluded from task staging.

## Known Stubs

None.

## Threat Review

- Exact server decisions are projected independently; broad `can_edit_group` is never inferred.
- Every permission lookup error returns an internal error before a response or admission decision.
- Mutation authorization remains server-owned and unchanged.

## Deferred Issues

- Frontend generated-route typecheck errors in `.next/dev/types` remain outside Plan 136-25. They include route-context Promise constraints and pre-existing page helper exports.

## Self-Check: PASSED

- All plan-owned and authorized files exist.
- Commits `2d77c435`, `f1cc72c5`, `ebe1e302`, `0d6315c4`, and `ccb8b625` exist in Git history.
- No tracked files were deleted by any Plan 136-25 commit.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
