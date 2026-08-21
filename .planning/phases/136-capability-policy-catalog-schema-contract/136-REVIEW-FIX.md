---
phase: 136-capability-policy-catalog-schema-contract
fixed_at: 2026-08-21T14:53:00Z
review_path: .planning/phases/136-capability-policy-catalog-schema-contract/136-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 136: Code Review Fix Report

**Fixed at:** 2026-08-21T14:53:00Z
**Source review:** .planning/phases/136-capability-policy-catalog-schema-contract/136-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Migration 0148 rollback deletes or corrupts pre-existing catalog state

**Files modified:** `database/migrations/0148_role_catalog_uat_corrections.up.sql`, `database/migrations/0148_role_catalog_uat_corrections.down.sql`, `backend/internal/migrations/phase136_role_catalog_uat_corrections_test.go`
**Commit:** e6c326a9
**Applied fix:** Migration 0148 now snapshots every mutated role-definition field plus the pre-existing Karaoke-FX contributor row, restores that exact state on Down (including admin/other), and proves real PostgreSQL Up/Down/Up restoration from deliberately non-default fixtures.

### CR-02: The focused admin capability contract defines a different, incomplete schema

**Files modified:** `shared/contracts/admin-capabilities.yaml`, `backend/internal/handlers/phase136_contract_parity_test.go`, `frontend/src/types/fansub.ts` and focused capability fixtures
**Commit:** fa5ba918
**Applied fix:** Added the focused capabilities endpoint and complete response schema, made the three always-emitted TypeScript fields required, and replaced subset assertions with exact structural schema/response-reference parity against canonical OpenAPI.

### CR-03: can_edit_technical_links grants workspace access but no usable edit path

**Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`, `FansubBasicInfoTab.test.tsx`, `fansubEditTypes.ts`, `fansubEditFormMapping.ts`, `useFansubDetailsForm.ts`, `page.test.tsx`
**Commit:** c07c8619
**Applied fix:** Reused the basic-info form and central API helper to expose validated Website, Discord, and IRC controls only to the technical-link capability and construct a PATCH containing only those guarded fields for a Tech-Admin. Existing backend field-level authorization remains authoritative and its focused enforcement test passes.

### WR-01: Disabled technical-link fields can block unrelated authorized saves

**Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts`, `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`
**Commit:** e213ae9c
**Applied fix:** Scoped technical-link validation to actors with the effective technical-link edit capability. Added focused coverage proving invalid stored disabled URLs do not block a general-only save or leak technical-link fields into its PATCH, while technical-link editors still receive blocking validation.

---

_Fixed: 2026-08-21T14:53:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_
