---
phase: 136-capability-policy-catalog-schema-contract
reviewed: 2026-08-21T15:04:29Z
depth: deep
files_reviewed: 62
files_reviewed_list:
  - backend/internal/handlers/app_auth.go
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/handlers/phase136_contract_parity_test.go
  - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
  - backend/internal/migrations/phase136_role_catalog_palette_correction_test.go
  - backend/internal/migrations/phase136_role_catalog_uat_corrections_test.go
  - backend/internal/repository/anime_contributions_member_project_repository.go
  - backend/internal/repository/anime_contributions_member_project_repository_test.go
  - backend/internal/repository/group_contributors_repository.go
  - backend/internal/repository/member_profile_memberships_repository.go
  - backend/internal/repository/member_profile_recent_repository.go
  - backend/internal/repository/phase136_role_definition_label_authority_test.go
  - backend/internal/repository/project_member_public_repository.go
  - backend/internal/repository/release_detail_public_repository.go
  - backend/internal/repository/release_detail_public_repository_helpers.go
  - backend/internal/repository/release_version_notes_repository.go
  - backend/internal/repository/release_version_notes_repository_test.go
  - database/migrations/0148_role_catalog_uat_corrections.down.sql
  - database/migrations/0148_role_catalog_uat_corrections.up.sql
  - database/migrations/0149_role_catalog_palette_correction.down.sql
  - database/migrations/0149_role_catalog_palette_correction.up.sql
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts
  - frontend/src/app/admin/fansubs/[id]/edit/sections/FansubEditWorkspaceSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
  - frontend/src/components/contributions/AnimeGroupCard.test.tsx
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/groups/GroupHistorySection.test.tsx
  - frontend/src/components/groups/GroupHistorySection.tsx
  - frontend/src/lib/roleCatalog.accessibility.test.ts
  - frontend/src/lib/roleCatalog.test.ts
  - frontend/src/lib/roleCatalog.ts
  - frontend/src/styles/globals.css
  - frontend/src/types/fansub.ts
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 136: Final Code Review Report

**Reviewed:** 2026-08-21T15:04:29Z
**Depth:** deep
**Files Reviewed:** 62
**Status:** issues_found

## Summary

The deep re-review covered the committed gap-closure changes from Plans 136-21 through 136-31 and all files changed by fix commits `e6c326a9`, `fa5ba918`, `c07c8619`, and `e213ae9c`. CR-01 through CR-03 and WR-01 are genuinely closed. The final fix introduced one warning-level React callback dependency defect, so the phase is not yet clean.

Phase 137, the unused legacy release route, Finding 33 documentation, Finding 34 badge redesign, and unrelated dirty worktree files were excluded.

## Resolved Critical Issues

### CR-01: Migration 0148 rollback deletes or corrupts pre-existing catalog state — fixed (`e6c326a9`)

**File:** `database/migrations/0148_role_catalog_uat_corrections.down.sql:5-14`

**Issue:** The up migration uses `ON CONFLICT DO UPDATE` for `contributor_roles.karaoke_fx` and conditionally appends `fansub_group`, but the down migration unconditionally deletes `karaoke_fx` and unconditionally removes the context/sets `assignable=false` for eight roles. If the row or any metadata existed before 0148, rollback destroys that prior state. The up migration also changes `admin` and `other` at lines 17-20, while down never restores those rows. This violates the declared reversible migration contract and creates a data-loss/configuration-loss path. The current migration test begins from a fixture chosen to match the desired assumptions, so it cannot prove restoration of arbitrary pre-migration state.

**Fix:** Make 0148 additive-only where the exact prior state is guaranteed by 0146, or encode the exact 0147-era values and restore every mutated row. Do not combine `ON CONFLICT DO UPDATE` with unconditional delete. Add an Up/Down test seeded with an existing `karaoke_fx` row and non-default contexts/assignability, and assert exact restoration of all rows changed by up.

### CR-02: The focused admin capability contract defines a different, incomplete schema — fixed (`fa5ba918`)

**File:** `shared/contracts/admin-capabilities.yaml:276-294`

**Issue:** `FansubGroupCapabilities` in the focused contract contains only five fields, while the canonical `shared/contracts/openapi.yaml` schema and the Go/TypeScript runtime contain the full capability response. The focused file does not define the `/api/v1/admin/fansubs/{id}/capabilities` operation that would reference this schema, so the addition is both orphaned and contract-divergent. A generator or validator using the focused contract receives a materially different API type. The parity test checks presence of the five new names, not equality of the two schemas, which is why it passes.

**Fix:** Add the capabilities operation to the focused contract and reference a complete schema identical to the canonical OpenAPI definition, or remove the orphan schema if this endpoint is intentionally outside the focused surface. Replace substring/presence assertions with structural parity over required fields, property names, types, and endpoint response references. Align `frontend/src/types/fansub.ts:240-242` as well: fields required by OpenAPI and always emitted by Go must not be optional in TypeScript.

### CR-03: can_edit_technical_links grants workspace access but no usable edit path — fixed (`c07c8619`)

**File:** `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts:14-20`

**Issue:** A Tech-Admin with only `can_edit_technical_links` is admitted to the Basic tab, but the capability is never consumed by `FansubBasicInfoTab`, `formToPayload`, or `useFansubDetailsForm.save`. All basic fields remain disabled and the save payload never includes the backend fields (`website_url`, `discord_url`, `irc_url`) guarded by `ActionFansubGroupPageTechnicalLinksEdit`. Community-link editing uses the separate `can_update_group_links`/`can_manage_links` actions. The API therefore advertises a narrow permission and the UI routes the actor into an unusable screen.

**Fix:** Wire `can_edit_technical_links` to the intended existing technical-link controls and include only those fields in the capability-specific PATCH payload, or remove that default grant/workspace admission if the canonical UI ownership is the community-link collection. Add a Tech-Admin component/integration test that edits an allowed technical field, submits it, and asserts forbidden general/lifecycle/link-collection fields remain absent.

## Resolved Warnings

### WR-01: Disabled technical-link fields can block unrelated authorized saves

**File:** `frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts:232-253`

**Issue:** `technicalLinkErrors` is computed from the stored group URLs and included unconditionally in the form-wide `invalid` flag. For an actor without `can_edit_technical_links`, those inputs are disabled, but any legacy or otherwise nonconforming stored URL still disables Save. That actor can neither correct the URL nor submit an unrelated change they are authorized to make (for example founding history or group media). The focused test covers only valid URLs for a technical-link editor and does not exercise this cross-capability case.

**Resolution:** Fixed in `e213ae9c`. Technical-link validation now participates in the form-wide invalid gate only when the actor can edit those fields. Focused tests prove a general-only actor can save with an invalid stored technical URL and sends no technical-link keys, while a technical-link editor remains blocked by an invalid URL.

## Warnings

### WR-02: The save callback omits its new captured permission dependency

**File:** `frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts:346-365`
**Issue:** Commit `e213ae9c` moved `canEditBroad` outside the `save` callback and now captures it inside that callback, but the dependency array does not include `canEditBroad`. The focused ESLint run reports `react-hooks/exhaustive-deps`. Although the primitive inputs currently appear separately in the dependency array, leaving a captured authorization-derived value implicit makes future changes prone to stale permission/payload behavior and leaves the changed file non-clean under project lint rules.
**Fix:** Add `canEditBroad` to the `useCallback` dependency array (or compute it inside the callback as before), then rerun the focused tests and ESLint.

## Verification

- WR-01 focused regression tests: 2 passed, 36 skipped.
- Full `page.test.tsx`: 26 passed and 12 unrelated pre-existing fixture/provider failures; both new WR-01 tests pass in that run.
- Frontend typecheck remains non-green on unrelated generated Next route/page typing errors outside `e213ae9c`.
- Focused ESLint: zero errors and one warning, recorded as WR-02.
- Fix-commit `git diff --check`: passed.
- No source files were modified.

---

_Reviewed: 2026-08-21T15:04:29Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
