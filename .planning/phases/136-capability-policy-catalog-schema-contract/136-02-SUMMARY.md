---
phase: 136-capability-policy-catalog-schema-contract
plan: 02
subsystem: auth
tags: [postgres, go, permissions, capability-catalog, role-catalog]
requires:
  - phase: 136-01
    provides: canonical capability policy and role presentation schema
  - phase: 136-09
    provides: narrow role default capabilities
provides:
  - enriched protected capability and member role catalog projections
  - database-owned fail-closed permission cache
  - atomic validated catalog publication
affects: [136-03, 136-04, 137-effective-rights]
tech-stack:
  added: []
  patterns: [database-owned authorization catalog, fail-closed cache, derived zero-right state]
key-files:
  created: []
  modified:
    - backend/internal/repository/authz_capability_mutations.go
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/permissions/permissions.go
key-decisions:
  - "Protected role and action metadata is projected directly from PostgreSQL; handlers do not maintain a second role catalog."
  - "A missing permission cache denies access; validated reloads replace the prior catalog only after complete loading."
patterns-established:
  - "Catalog metadata, order, presentation keys, and operative counts travel together in typed repository DTOs."
requirements-completed: [CAP-04, CAP-11, CAP-12, CAP-13, CAP-14, QUAL-01]
duration: 32min
completed: 2026-08-20
---

# Phase 136 Plan 02: Protected Catalog and Permission Cache Summary

**Protected catalog consumers now receive complete PostgreSQL-owned policy and presentation metadata, while unloaded permission state denies access instead of falling back to static grants.**

## Performance

- **Duration:** 32 min
- **Completed:** 2026-08-20
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Enriched capability-matrix actions with description, help text, ordering, and override policy.
- Enriched role projections with contexts, assignability, semantic presentation keys, operative capability counts, and derived zero-right state.
- Kept IdP-owned global roles separate from group role rows.
- Removed the runtime static-grant fallback and added atomic/failure-path cache coverage, including a zero-right `karaoke_fx` role.

## Task Commits

1. **Task 1: Enrich protected admin and member-scoped catalog projections** - `afedbf9a`
2. **Task 2: Make the permission catalog fail closed and database-owned** - `2207c082`

## Files Created/Modified

- `backend/internal/repository/authz_capability_mutations.go` - complete protected matrix projection.
- `backend/internal/repository/hist_group_member_roles_repository.go` - complete member-scoped role definitions.
- `backend/internal/handlers/admin_capability_handler.go` - preserves repository metadata and adds only IdP global rows.
- `backend/internal/handlers/admin_capability_handler_test.go` - verifies projected assignability behavior.
- `backend/internal/permissions/permissions.go` - fail-closed, validated catalog publication.
- `backend/internal/permissions/capability_registry_test.go` - fail-closed, atomic failure, review, and zero-right coverage.
- `backend/internal/permissions/permissions_reload_test.go` - isolates cache reload tests under fail-closed semantics.

## Decisions Made

- Database projections, not handler maps, own role metadata.
- Platform-admin provenance remains an independent IdP bypass and is never represented as a group grant.
- The previous cache remains available on failed reload; startup with no cache remains denied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test isolation] Updated reload tests for fail-closed cache semantics**
- **Found during:** Task 2
- **Issue:** Existing tests reset the package cache to nil after completion because they depended on the removed static fallback.
- **Fix:** Restore a test-only fixture after reload tests, without adding runtime authority.
- **Files modified:** `backend/internal/permissions/permissions_reload_test.go`
- **Verification:** `go test ./internal/permissions -count=1`
- **Committed in:** `2207c082`

---

**Total deviations:** 1 auto-fixed bug
**Impact on plan:** Test-only isolation adjustment required by the planned fail-closed behavior; no product scope added.

## Issues Encountered

- The unfiltered repository package suite contains pre-existing Phase-128 PostgreSQL tests that require `TEAM4S_PHASE128_TEST_DSN` and live Phase-134 credentials. The plan-focused repository catalog suite passes; those unrelated environment-dependent failures were not changed.

## User Setup Required

None.

## Next Phase Readiness

- Plan 136-03 can align OpenAPI and TypeScript DTOs with these protected projections.
- Phase 137 can consume the fail-closed catalog for effective-right resolution.

## Self-Check: PASSED

- Both task commits exist.
- All plan-owned implementation files exist.
- Focused permission, repository catalog, and handler suites pass.
- `git diff --check` passes.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
