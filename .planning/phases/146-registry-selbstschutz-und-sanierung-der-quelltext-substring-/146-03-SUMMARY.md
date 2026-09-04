---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 03
subsystem: authz
tags: [go, gin, permissions, capability-registry, mutation-guard]

# Dependency graph
requires:
  - phase: 146-01
    provides: exported permissions.MembershipBaselineActionCodes as the single Go source for the 3 membership-baseline action codes, plus permissions.RoleMembershipBaseline ("group_member")
provides:
  - Unconditional server-side revoke guard rejecting removal of any of the 3 baseline actions from group_member, independent of CountRolesWithAction (closes ROADMAP.md Success Criterion 1)
  - Action-specific server-side grant guard rejecting assignment of any non-baseline action to group_member, while keeping the 3 baseline actions grantable (D-16)
  - httptest+fake-repo proof for both guards, real status code + response body assertions per CLAUDE.md's Teststil convention
affects: [146-02 RoleCapabilityImpactPreviewModal.tsx mutationError rendering path, later 146-XX Block-2 test-remediation plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Registry-consistency mutation guards live action-specific inside the handler (GrantCapability/RevokeCapability), never as a blanket filter on the shared LoadCapabilityRoles/IsCapabilityBearingRole query both directions depend on (D-17 trap)"

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/internal/handlers/testmain_test.go

key-decisions:
  - "Both new guards reuse the same error.code 'membership_baseline_guard' for grant and revoke directions, so RoleCapabilityImpactPreviewModal.tsx's existing generic mutationError rendering handles both with zero frontend code change — only the message text differs"
  - "The revoke-direction rejection message is copied verbatim (byte-for-byte, correct Umlaute) from 146-UI-SPEC.md's locked Copywriting Contract; the grant-direction message was Claude's Discretion per D-19's scope note (not locked by the UI-SPEC, which only covers Criterion 2's revoke-attempt copy) and uses the same tone/structure"
  - "Rule 3 auto-fix: testmain_test.go's handlerTestCatalogLoader.LoadCapabilityRoles did not include group_member, so IsCapabilityBearingRole('group_member') was false in every handler test, making both new guards structurally unreachable (masked by the earlier role_not_capability_bearing 422). Added group_member only to LoadCapabilityRoles (not LoadFansubGroupRoles), mirroring production's real LoadCapabilityRoles (authz_permissions.go), which deliberately has no 'AND NOT reserved' filter — the same D-17 trap the plan warned against, this time on the test-fixture side rather than the production query"

patterns-established:
  - "A reserved pseudo-role's registry-consistency guard is added as an independent, unconditional check placed before an existing per-role guard (D-07 lockout), never by repurposing or filtering the existing guard's shared query"

requirements-completed: ["Criterion 1"]

# Metrics
duration: 8min
completed: 2026-09-04
---

# Phase 146 Plan 03: Registry-Selbstschutz Backend-Guards Summary

**Two new unconditional, action-specific 409 guards in `admin_capability_handler.go` stop a platform admin from ever removing one of the 3 membership-baseline actions from the reserved `group_member` pseudo-role, or granting it anything else — closing the exact gap that previously crash-looped the next backend start.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-04T15:52:00Z (approx.)
- **Completed:** 2026-09-04T15:57:07Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Closed ROADMAP.md Success Criterion 1: `RevokeCapability` now rejects revoking any of the 3 membership-baseline actions from `group_member` with HTTP 409 `membership_baseline_guard`, unconditionally — proven to fire even when `CountRolesWithAction` reports 16 (far above the lockout threshold of 1), because the new guard runs before that call
- Closed the D-16 extension: `GrantCapability` now rejects assigning any non-baseline action to `group_member` with the same error code, while the 3 baseline actions remain grantable (needed for a legitimate revoke-then-fix cycle)
- Deliberately did NOT touch `LoadCapabilityRoles`/`IsCapabilityBearingRole` — both guards are action-specific and live only inside `GrantCapability`/`RevokeCapability`, avoiding the documented D-17 trap where a blanket filter there would make the reserved role fail `IsCapabilityBearingRole` entirely for both mutation directions
- Proved both guards via 3 new `httptest`-based tests against real handler calls (status code + parsed JSON `error.code`), per CLAUDE.md's Teststil convention — no source-substring inspection
- Full existing `internal/handlers` package regression (all prior tests, including the D-07 lockout guard and the two `role_not_capability_bearing` 422 tests) still passes unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the unconditional membership-baseline revoke guard (Criterion 1)** - `82ab8836` (feat)
2. **Task 2: Add the action-specific grant guard (D-16)** - `c2cf0874` (feat)
3. **Task 3: Prove both guards via httptest + fake repository** - `e6a1c9b7` (test)

## Files Created/Modified
- `backend/internal/handlers/admin_capability_handler.go` - `RevokeCapability` gained an unconditional guard (before the D-07 lockout-guard block) rejecting revocation of any of the 3 `permissions.MembershipBaselineActionCodes` from `permissions.RoleMembershipBaseline`; `GrantCapability` gained an action-specific guard (before `GrantRoleCapability`) rejecting any non-baseline action for the same role. Both return `409` with `error.code == "membership_baseline_guard"`. Added `"slices"` to the import block.
- `backend/internal/handlers/admin_capability_handler_test.go` - Added `TestRevokeCapabilityMembershipBaselineGuardRejectsUnconditionally`, `TestGrantCapabilityMembershipBaselineGuardRejectsNonBaselineAction`, `TestGrantCapabilityMembershipBaselineAllowsBaselineAction` — each builds a real gin context, stubs the repos, calls the handler method directly, and asserts `rec.Code` plus the parsed JSON `error.code` (or, for the allow case, `200` + exactly 1 audit entry)
- `backend/internal/handlers/testmain_test.go` - `handlerTestCatalogLoader.LoadCapabilityRoles` now appends `permissions.RoleMembershipBaseline` to the assignable-role list it reuses from `LoadFansubGroupRoles`, so `IsCapabilityBearingRole("group_member")` is true in tests, mirroring production's real (unfiltered-by-reserved) `LoadCapabilityRoles` query

## Decisions Made
- Reused the exact `error.code` value (`membership_baseline_guard`) for both grant and revoke directions so the frontend's existing `mutationError` rendering path (146-02, `RoleCapabilityImpactPreviewModal.tsx`) needs zero code changes — the plan's `<action>` block for Task 2 explicitly required this
- Copied the revoke-direction rejection message byte-for-byte from `146-UI-SPEC.md`'s locked Copywriting Contract (verified via `grep` diff against the spec file — identical string, correct Umlaute); wrote the grant-direction message at Claude's Discretion per the plan's D-19 scope note, matching the same "what happened / why / not saved" structure
- Reformatted the grant guard's `c.JSON` call onto fewer lines (`gin.H{"error": gin.H{...}}` on one line instead of nested across 3) purely so the plan's own acceptance-criteria grep (`grep -B2 "membership_baseline_guard" ... | grep -c "!slices.Contains"`) would find the inverted condition within 2 lines — a cosmetic formatting choice, not a behavior change; `gofmt -l` confirms the result is still canonically formatted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `testmain_test.go`'s test catalog fixture did not include `group_member`, making both new guards unreachable in tests**
- **Found during:** Task 3 (writing the httptest proofs)
- **Issue:** `handlerTestCatalogLoader.LoadCapabilityRoles` (the fake `permissions.CatalogLoader` populated once in `TestMain`) only listed the 12 real assignable fansub-group roles. `permissions.IsCapabilityBearingRole` reads a package-level cache populated from this exact list. Since `group_member` was absent, `IsCapabilityBearingRole("group_member")` returned `false` in every handler test, so both `RevokeCapability` and `GrantCapability` would return the pre-existing `422 role_not_capability_bearing` response before ever reaching the new 146-03 guards — the guards would appear to "pass" tests that in fact never exercised them.
- **Fix:** Added `permissions.RoleMembershipBaseline` ("group_member") to `LoadCapabilityRoles`'s returned slice only (not to `LoadFansubGroupRoles`, which correctly stays assignable-roles-only). This exactly mirrors the real production `LoadCapabilityRoles` SQL in `authz_permissions.go`, which intentionally carries no `AND NOT reserved` filter (the same D-17 trap this plan's own `<behavior>` block warns against, this time on the test-fixture side).
- **Files modified:** `backend/internal/handlers/testmain_test.go`
- **Commit:** `e6a1c9b7`

## Issues Encountered
- No `go` binary is available directly on the host PATH (per `CLAUDE.md`'s canonical-environment note and the 146-01 SUMMARY's precedent); all `go build`/`go vet`/`go test`/`gofmt` verification commands were run via `docker exec team4sv30-backend` against the already-running backend container instead.

## User Setup Required

None - no external service configuration required. This is a pure backend mutation-guard change; no migration, no new endpoint, no frontend change.

## Next Phase Readiness
- Criterion 1 (ROADMAP.md) is closed: revoking a baseline action from the reserved role is server-side-rejected unconditionally, proven by a real mutation-path test; the existing D-07 lockout guard is completely unchanged for every other role.
- D-16's grant-direction extension is also closed: the reserved role's registry state stays structurally limited to its 3 intended actions even if the frontend badge/filter is ever bypassed.
- 146-02's noted dependency is now satisfied: `RoleCapabilityImpactPreviewModal.tsx`'s existing `mutationError` path will render the exact locked German copy from `146-UI-SPEC.md`'s Copywriting Contract for a blocked revoke attempt, with zero frontend code change.
- This plan closes Block 1 (Kriterien 1-4) of Phase 146 before any Block 2 remediation plan begins, per D-01's required block ordering — Plan 146-04 (or whichever plan starts Block 2's test-substring remediation) can now proceed.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: 146-03-SUMMARY.md
- FOUND: commit 82ab8836
- FOUND: commit c2cf0874
- FOUND: commit e6a1c9b7
