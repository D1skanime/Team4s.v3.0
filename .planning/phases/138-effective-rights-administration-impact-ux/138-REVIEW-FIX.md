---
phase: 138-effective-rights-administration-impact-ux
fixed_at: 2026-08-23T20:05:00Z
review_path: .planning/phases/138-effective-rights-administration-impact-ux/138-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 138: Code Review Fix Report

**Fixed at:** 2026-08-23T20:05:00Z
**Source review:** .planning/phases/138-effective-rights-administration-impact-ux/138-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (fix_scope: critical_warning — CR-01, WR-01..WR-04; the 2 Info findings were out of scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `/admin/changes` `benutzer`/`akteur` filters do not implement their documented, distinct semantics and silently collide

**Files modified:** `backend/internal/repository/audit_logs_query.go`, `backend/internal/handlers/admin_changes_handler.go`
**Commit:** 88a26fe2
**Applied fix:** Added a new `ChangeListFilter.ActorAppUserID *int64` field with its own strict `al.actor_app_user_id = $N` WHERE clause, independent of and AND-combinable with the existing broad-OR `AppUserID` (`benutzer`) clause. The handler now binds `akteur` to `ActorAppUserID` instead of overwriting `AppUserID`, so `benutzer` and `akteur` can both be supplied simultaneously without one silently discarding the other, matching the OpenAPI contract's documented semantics. Verified with `go build ./...` and `go vet` inside the backend container (both pass); the existing `audit_logs_query_test.go` `TestListChanges` requires a live Postgres DSN and is skipped in this environment (pre-existing condition, unrelated to this change).

### WR-01: `GuidedRevokeFlow` can never remove a dormant personal deny-override on a non-deniable actor

**Files modified:** `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx`
**Commit:** 66a43e91
**Applied fix:** Reordered the early-return guard from `if (isNonDeniable)` to `if (isNonDeniable && !isRemoveMode)`, so an existing personal `user_deny` override remains removable even when the effective right is currently decided by a non-deniable source (e.g. `platform_admin`). Removing an override is treated as a distinct operation from attempting to newly deny a non-deniable right. All 6 existing tests in `GuidedRevokeFlow.test.tsx` pass unchanged.

**Note:** This is a conditional-logic fix (branch-order change). Per verification_strategy, logic fixes are flagged for human confirmation — status recorded as **fixed: requires human verification**. No test currently exercises the exact `non_deniable=true && user_deny=true` combination the finding describes; recommend adding one before considering this fully closed.

### WR-02: CAP-09 role→capability impact-preview endpoint is missing from the OpenAPI contract

**Files modified:** `shared/contracts/admin-capabilities.yaml`
**Commit:** 8e3c92fc
**Applied fix:** Added the missing `GET /api/v1/admin/role-capabilities/{roleCode}/{actionCode}/impact-preview` path entry, mirroring the style/response-envelope of the existing PUT/DELETE entries at the same path prefix and the sibling `role-assignment-impact`/`claim-activation-impact` GET entries. References the existing `CapabilityOverrideImpactPreview` schema for the 200 response and documents the required `add` boolean query parameter plus 400/401/403/422/500 responses matching the handler's actual behavior (`admin_capability_impact_handler.go`). Verified the YAML still parses via `js-yaml` inside the frontend container.

### WR-03: `AdminChangeEntry.payload` is typed as non-nullable but the backend can emit a null payload

**Files modified:** `frontend/src/types/admin-users.ts`, `frontend/src/app/admin/changes/ChangeEntryTranslator.ts`
**Commit:** 76b479e0
**Applied fix:** Widened `AdminChangeEntry.payload` to `Record<string, unknown> | null` and updated `payloadString`'s parameter type from `Record<string, unknown> | undefined` to `Record<string, unknown> | null | undefined` so the nullable contract is honored end-to-end. Verified with `npx tsc --noEmit` (no new errors in either file) and the existing `ChangeEntryTranslator.test.ts`/`ChangesClient.test.tsx` suites (8 tests, all passing).

### WR-04: `UserGroupMembershipsTab.tsx` is now dead code with no consumer

**Files modified:** `frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx` (deleted)
**Commit:** 3d6cc8b2
**Applied fix:** Confirmed via repo-wide grep that the component had zero remaining importers (only stale doc comments in `UserDetailPageClient.tsx`/`.test.tsx` referenced it by name) and no dedicated test file existed for it. Deleted the file. Verified with `npx tsc --noEmit` that no references remain.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-08-23T20:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
