---
phase: 136-capability-policy-catalog-schema-contract
fixed_at: 2026-08-20T21:03:00Z
review_path: .planning/phases/136-capability-policy-catalog-schema-contract/136-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 136: Code Review Fix Report

**Fixed at:** 2026-08-20T21:03:00Z
**Source review:** .planning/phases/136-capability-policy-catalog-schema-contract/136-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Real catalog rows disable all existing role artwork

**Files modified:** `database/migrations/0146_capability_policy_catalog.up.sql`, `backend/internal/migrations/phase136_capability_policy_catalog_test.go`
**Commit:** 51d14e3a
**Applied fix:** Seeded the bounded `user` artwork semantic for every established contribution role with shipped artwork and asserted exact migration metadata.

### CR-02: Role validity retains hard-coded admin and other exceptions

**Files modified:** `frontend/src/components/profile/MemberBadgeChain.tsx`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
**Commit:** acb11232
**Applied fix:** Role validity now comes only from the contextual catalog; absent compatibility roles have a negative regression test.

### CR-03: Unauthorized history transitions probe event state before authorization

**Files modified:** `backend/internal/handlers/fansub_group_history_handler.go`, `backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go`
**Commit:** caf24b0e
**Applied fix:** Authorization now precedes event-specific uniqueness and unlock probes.

### CR-04: Go accepts an invalid other reason

**Files modified:** `backend/internal/handlers/capability_policy_contract.go`, `backend/internal/handlers/phase136_contract_parity_test.go`
**Commit:** a2dcd053
**Applied fix:** Added validated JSON unmarshalling plus direct Go validation and valid/invalid fixtures.

### CR-05: Mutation requests let clients assert platform-admin identity

**Files modified:** `shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml`, `backend/internal/handlers/capability_policy_contract.go`, `backend/internal/handlers/phase136_contract_parity_test.go`, `backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go`, `frontend/src/types/admin-capability.ts`
**Commit:** 59b9f271
**Applied fix:** Removed client-owned actor provenance and kept it in a backend-only command derived from authenticated identity.

### WR-01: The validated public DTO remains partially optional

**Files modified:** `frontend/src/types/admin-capability.ts`, `frontend/src/lib/api.ts`, `frontend/src/providers/RoleCatalogProvider.tsx` and focused fixtures
**Commit:** ecbd5390
**Applied fix:** Split strict public catalog rows from genuinely partial protected/admin role options.

---

_Fixed: 2026-08-20T21:03:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
