---
phase: 136-capability-policy-catalog-schema-contract
reviewed: 2026-08-20T20:52:00Z
depth: deep
files_reviewed: 27
files_reviewed_list:
  - backend/internal/handlers/capability_policy_contract.go
  - backend/internal/handlers/fansub_admin.go
  - backend/internal/handlers/fansub_group_history_handler.go
  - backend/internal/handlers/fansub_group_links.go
  - backend/internal/handlers/fansub_group_links_test.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/phase136_contract_parity_test.go
  - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
  - backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go
  - backend/internal/migrations/phase136_capability_policy_catalog_test.go
  - backend/internal/repository/fansub_repository.go
  - backend/internal/repository/fansub_repository_group_links_test.go
  - database/migrations/0146_capability_policy_catalog.up.sql
  - docker-compose.yml
  - frontend/src/app/layout.test.tsx
  - frontend/src/app/layout.tsx
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/badgeArtwork.test.ts
  - frontend/src/components/profile/badgeArtwork.ts
  - frontend/src/lib/api.role-catalog.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/roleCatalog.test.ts
  - frontend/src/providers/RoleCatalogProvider.test.tsx
  - frontend/src/types/admin-capability.ts
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 5
  warning: 1
  info: 0
  total: 6
status: issues_found
---

# Phase 136: Post-Gap Code Review Report

**Reviewed:** 2026-08-20T20:52:00Z
**Depth:** deep
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Plans 136-14 through 136-19 close the original founder/co-leader, truthful-link-audit, metadata, malformed-catalog, and missing-schema gaps in their primary paths. The gap closure is still not shippable: Plan 136-20 disconnects every existing role artwork from real migration metadata and retains source-level role authorities; history PATCH authorization still follows unauthorized event probes; and the new Go/OpenAPI policy request family has semantic and trust-boundary defects.

Focused backend authorization, audit, repository, and contract tests passed. The combined frontend run passed 130 tests but retained four known failing `MemberBadgeChain` tests; those pre-existing failures are not separately counted.

## Critical Issues

### CR-01: Real catalog rows disable all existing role artwork

**File:** `database/migrations/0146_capability_policy_catalog.up.sql:24-28`; `frontend/src/components/profile/badgeArtwork.ts:13-31,51-65`
**Issue:** Migration 0146 gives every pre-existing role `icon_key='other'` and changes only `karaoke_fx` to `image`. The new artwork registry contains assets only under `user`. Real rows for translator, timer, typesetter, encoder, and the other established roles therefore resolve no raster/layered art. Tests mask this by directly passing `user`, which the migration never assigns.
**Fix:** Seed a documented artwork semantic for every existing role with shipped art, or key the bounded registry by metadata migration 0146 actually populates. Test exact migration metadata for all established role rows.

### CR-02: Role validity retains hard-coded `admin` and `other` exceptions

**File:** `frontend/src/components/profile/MemberBadgeChain.tsx:642-645`
**Issue:** `orderedRoleCodes` unconditionally appends `admin` and `other` outside the catalog and admits them when an earned badge has a count. A missing or removed catalog role remains renderable, so D-22/D-23's second-authority gap remains.
**Fix:** Derive valid role codes exclusively from `orderForContext(contributionRoles, 'anime_contribution')`; represent any compatibility role in canonical catalog data. Add a negative test with earned admin/other badges absent from the catalog.

### CR-03: Unauthorized history transitions probe event state before authorization

**File:** `backend/internal/handlers/fansub_group_history_handler.go:400-423`
**Issue:** `validateSingleUseEvent` and `validateEventUnlocked` run for the requested type before `authorizeHistoryEventTypes`. A founder-only caller can receive event-specific responses and trigger repository probes before the stronger `members.manage` denial, contrary to Plan 136-14's authorization-before-validation contract.
**Fix:** Compute the effective type after syntactic allowlist validation, authorize the stored/requested pair, then perform uniqueness/unlocked/domain validation. Assert denied cross-type PATCHes call neither validator.

### CR-04: Go accepts an invalid `other` reason rejected by OpenAPI and TypeScript

**File:** `backend/internal/handlers/capability_policy_contract.go:51-54`; `backend/internal/handlers/phase136_contract_parity_test.go:19-27`
**Issue:** OpenAPI/TypeScript require non-empty `text` for `other`; Go uses one struct with optional `*string`. `CapabilityOverrideReason{Category: CapabilityOverrideReasonOther}` is valid Go/JSON but violates the canonical schema and database constraint. The parity test checks only fields/pointers/enums.
**Fix:** Add validated unmarshalling or request validation enforcing non-blank text for `other`, and parity-test valid/invalid JSON fixtures across the boundary.

### CR-05: Mutation requests let clients assert platform-admin identity

**File:** `shared/contracts/admin-capabilities.yaml:380-401`; `shared/contracts/openapi.yaml:8861-8882`; `backend/internal/handlers/capability_policy_contract.go:101-119`; `frontend/src/types/admin-capability.ts:128-147`
**Issue:** Reason optionality is selected by client-supplied `actor_is_platform_admin`. Platform-admin status is IdP/server-owned provenance. Go booleans also cannot enforce the OpenAPI true/false branches. A future handler following this contract can be steered into the reasonless admin branch by request JSON.
**Fix:** Remove `actor_is_platform_admin` from external requests. Derive it from authenticated identity and enforce reason requirements server-side. Keep any internal actor flag in a separate backend-only command type.

## Warnings

### WR-01: The validated public DTO remains partially optional

**File:** `frontend/src/types/admin-capability.ts:55-65`; `frontend/src/lib/api.ts:9926-9965`
**Issue:** Runtime parsing rejects missing contexts, assignability, semantic keys, and operative fields, yet `RoleDefinitionOption` types all of them optional. Consumers retain unsafe fallbacks and tests can construct incomplete supposedly valid rows.
**Fix:** Make required public fields non-optional, or split a strict public DTO from genuinely partial admin DTOs, and update fixtures.

---

_Reviewed: 2026-08-20T20:52:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
