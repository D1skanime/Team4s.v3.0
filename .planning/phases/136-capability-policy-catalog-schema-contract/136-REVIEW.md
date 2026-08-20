---
phase: 136-capability-policy-catalog-schema-contract
reviewed: 2026-08-20T19:10:00Z
depth: standard
files_reviewed: 84
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/handlers/admin_capability_handler_test.go
  - backend/internal/handlers/fansub_group_history_handler.go
  - backend/internal/handlers/fansub_group_links.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/fansub_media_review_handler.go
  - backend/internal/handlers/phase136_contract_parity_test.go
  - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
  - backend/internal/handlers/role_catalog_handler.go
  - backend/internal/handlers/role_catalog_handler_test.go
  - backend/internal/handlers/role_catalog_router_integration_test.go
  - backend/internal/migrations/phase136_capability_policy_catalog_test.go
  - backend/internal/permissions/capability_registry_test.go
  - backend/internal/permissions/permissions.go
  - backend/internal/permissions/permissions_reload_test.go
  - backend/internal/repository/authz_capability_mutations.go
  - backend/internal/repository/hist_group_member_roles_repository.go
  - backend/internal/repository/hist_group_member_roles_whitelist_test.go
  - backend/internal/repository/member_claims_repository_claim_activation_test.go
  - backend/internal/repository/member_claims_role_activation_repository.go
  - backend/internal/repository/member_profile_repository_postgres_test.go
  - backend/internal/repository/member_profile_role_volume_repository_test.go
  - backend/internal/repository/role_catalog_repository.go
  - backend/internal/repository/role_catalog_repository_test.go
  - backend/internal/repository/role_definitions_context_test.go
  - database/migrations/0146_capability_policy_catalog.down.sql
  - database/migrations/0146_capability_policy_catalog.up.sql
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.test.ts
  - frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.ts
  - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/RoleToggleGroup.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
  - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
  - frontend/src/app/archiv/page.test.tsx
  - frontend/src/app/archiv/page.tsx
  - frontend/src/app/layout.test.tsx
  - frontend/src/app/layout.tsx
  - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
  - frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/app/me/profile/page.test.tsx
  - frontend/src/components/archive/MemberSearchCard.test.tsx
  - frontend/src/components/archive/MemberSearchCard.tsx
  - frontend/src/components/contributions/AnimeGroupCard.test.tsx
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/contributions/ContributionCard.test.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/contributions/contributionRoles.ts
  - frontend/src/components/contributions/MyProposalsSection.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx
  - frontend/src/components/profile/badgeArtwork.ts
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/memberBadgeLabels.ts
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
  - frontend/src/lib/api.ts
  - frontend/src/lib/profileLabels.ts
  - frontend/src/lib/roleCatalog.test.ts
  - frontend/src/lib/roleCatalog.ts
  - frontend/src/lib/roleColors.ts
  - frontend/src/providers/RoleCatalogProvider.test.tsx
  - frontend/src/providers/RoleCatalogProvider.tsx
  - frontend/src/types/admin-capability.ts
  - frontend/src/types/fansub.ts
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 4
  warning: 2
  info: 0
  total: 6
status: issues_found
---

# Phase 136: Code Review Report

**Reviewed:** 2026-08-20T19:10:00Z
**Depth:** standard
**Files Reviewed:** 84
**Status:** issues_found

## Summary

The canonical catalog direction is present, but the submitted implementation over-grants two seeded roles, records false successful audit events, and seeds presentation keys that the shared adapter rejects. Those are release-blocking correctness and authorization defects. Two further catalog seams still require hard-coded edits or silently turn contract corruption into an empty catalog.

Known baseline build/lint/test failures documented in the summaries were not counted as Phase-136 findings.

## Critical Issues

### CR-01: `founder` can mutate every history event, not only founding history

**File:** `backend/internal/handlers/fansub_group_history_handler.go:283-292,396-405`
**Issue:** Migration 0146 grants `founder` only `fansub_group_page.founding_history_edit`, but both the generic create and generic update handlers authorize their entire payload with that action. A founder can therefore create or rewrite unrelated events such as disbanding, awards, collaborations, release milestones, and team changes. The supposedly narrow default is an authorization over-grant.
**Fix:** Split founding fields/events from general history mutations. Require `founding_history_edit` only for the founding date/event subset, and retain a stronger existing history-management action for every other event type. For PATCH, load the existing row first and authorize both the existing and requested event type before mutation. Add negative tests for founder attempts against `disbanding`, `award`, and `team_change`.

### CR-02: `co_leader` receives group-state administration through “general edit”

**File:** `backend/internal/handlers/fansub_groups.go:332-354`
**Issue:** The seeded `fansub_group_page.general_edit` grant for `co_leader` covers `Status` and `GroupType` in addition to ordinary page content. This lets the role change lifecycle/state fields through the same narrow capability, including states that can effectively deactivate or disband a group. That exceeds the approved “general contents and links” default and bypasses the stronger `fansub_group.edit` boundary formerly required for the whole endpoint.
**Fix:** Keep lifecycle fields (`status`, `group_type`, and any similarly administrative identity fields) behind `fansub_group.edit` or a separate explicitly approved non-overridable capability. Restrict `general_edit` to the confirmed page-content fields and add a test proving `co_leader` is denied for state/type changes and mixed patches.

### CR-03: Link updates are audited as allowed before validation or mutation

**File:** `backend/internal/handlers/fansub_group_links.go:138-169`
**Issue:** The handler writes `fansub_group_link.updated` with outcome `allowed` before validating the request and before calling the repository. Invalid input, a foreign/missing link, a conflict, or a database failure therefore leaves a successful audit record for a mutation that never occurred. This breaks the approved “only actual state transitions are audited” rule and makes security provenance unreliable.
**Fix:** Validate first, perform the scoped repository mutation, and write the success audit only after the repository returns the updated row. Record denied/failed attempts separately with the correct outcome if required; never emit the domain transition event for a failed/no-op request.

### CR-04: The canonical `karaoke_fx` presentation is always discarded

**File:** `database/migrations/0146_capability_policy_catalog.up.sql:74-89`; `frontend/src/lib/roleCatalog.ts:4-6,25-28`
**Issue:** The database seeds `color_key='karaoke_fx'` and `icon_key='karaoke_fx'`, while the sole shared adapter allowlists neither value. Consequently every `karaoke_fx` consumer receives the neutral `other/user` presentation despite valid canonical metadata. This directly defeats the cross-surface role/badge requirement and makes the DB catalog and frontend contract disagree.
**Fix:** Seed stable semantic keys already supported by the adapter (for example an approved creative color and media/music icon), or extend the documented semantic-key contract and adapter mapping in the same change. Add a contract test that feeds the exact migration row through `presentationForRole` and asserts a non-neutral Karaoke-FX presentation.

## Warnings

### WR-01: Role badge artwork still depends on a second hard-coded role authority

**File:** `frontend/src/components/profile/badgeArtwork.ts:12-15,27-32`
**Issue:** `APPROVED_ROLE_ARTWORK` is a static list of role-derived asset names. Every new catalog role requires another source edit, and `karaoke_fx` is already absent. This recreates the precise cross-surface hardcoding Phase 136 was meant to eliminate and will make future roles silently lose artwork.
**Fix:** Use an explicit generated/maintained artwork manifest keyed by presentation metadata, or return an optional catalog artwork key that is mapped through one bounded asset registry. Keep path construction allowlisted, but do not make raw role codes a second role catalog.

### WR-02: Malformed public catalog responses silently become a successful empty catalog

**File:** `frontend/src/lib/api.ts:9925-9942`
**Issue:** `listRoleDefinitions` casts arbitrary JSON to `RoleDefinitionOption[]` and returns `[]` whenever the top level is not an array. Missing required fields inside array items are also unchecked. Contract drift or a proxy error that happens to return 200 is therefore treated as a legitimate empty catalog, disabling selectors and degrading labels without exposing the real failure through the provider's error state.
**Fix:** Validate the response shape and required row fields at the boundary. Throw `ApiError` (or a catalog-contract error) for malformed payloads so `loadRoleCatalogs` records `catalog_unavailable`; add tests for object payloads and incomplete rows.

---

_Reviewed: 2026-08-20T19:10:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
