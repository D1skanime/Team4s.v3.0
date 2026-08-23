---
phase: 138-effective-rights-administration-impact-ux
type: context
status: ready_for_execute
depends_on: [137-central-effective-rights-resolver-overrides]
requirements: [CAP-08, CAP-09, CAP-10, UADM-01]
---

# Phase 138 Context — Effective-Rights Administration & Impact UX

## Goal

Turn the existing Team4s user-rights and role-capability administration into one coherent admin module where an administrator can understand:

- which rights a user effectively has in a concrete group,
- why the user has them,
- which role / direct override / specialized source decides the result,
- how to grant or revoke one user-specific right safely,
- which users a role-capability mutation really changes,
- whether a persisted matrix mutation is already active in the permission cache,
- and how claims / relevant administrative changes relate back to the same user, group, role and capability context.

Phase 137 remains the canonical resolver and mutation foundation. Phase 138 must not introduce a second permission engine.

## Current code baseline

### User administration
- `frontend/src/app/admin/users/AdminUsersClient.tsx`
- `frontend/src/app/admin/users/AdminUsers.module.css`
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx`
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx`
- `frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`
- `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx`
- `frontend/src/app/admin/users/tabs/UserAuditTab.tsx`
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx`
- `frontend/src/types/admin-users.ts`
- `frontend/src/lib/api.ts`

The current `UserGroupRightsTab` is explicitly read-only and only projects:
- `can_edit_content`
- `can_view_members`

This is obsolete for Phase 138 because Phase 137 already exposes the complete provenance-capable `EffectiveRightState`.

### Role-capability administration
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`
- `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx`
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx`
- `frontend/src/app/admin/role-capabilities/roleCapabilities.module.css`
- `frontend/src/types/admin-capability.ts`
- `backend/internal/handlers/admin_capability_handler.go`
- `backend/internal/repository/authz_capability_mutations.go`
- `shared/contracts/admin-capabilities.yaml`

Current behavior mutates immediately from a switch. The backend persists the role-capability mutation and attempts `ReloadCache`, but reload failure is logged and HTTP 200 is still returned with a generic success message. This is exactly the CAP-10 gap.

### Effective-rights APIs from Phase 137
Backend endpoints already exist:
- `GET /api/v1/admin/fansubs/:id/app-members/:appUserId/effective-rights`
- `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides`
- `GET /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides/history`

Relevant frontend contract types already exist in `frontend/src/types/admin-capability.ts`:
- `EffectiveRightState`
- `CapabilityOverrideState`
- `CapabilityOverrideMutationRequest`
- `CapabilityOverrideMutationResult`
- `CapabilityOverrideAuditItem`
- `CapabilityActivationStatus`

The central frontend API helper does not yet expose the Phase-137 effective-rights endpoints.

## Agreed information architecture

Top-level admin module navigation:

`Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen`

User detail:

`Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen`

Important constraints:
- no giant statistics cards;
- user list is an administrative work list;
- contribution/media counts are not primary user-list columns;
- open claims and last activity are useful;
- Streaming is structural only in this phase: no fake feature/data;
- contribution redesign stays for Phase 139, except the known incorrect `release_version_id` presentation must not be carried forward.

## Canonical editors

### User-in-group editor
The same editor is opened from:
- Benutzer → user → Rollen & Rechte → group
- Gruppen → group → Benutzer → user
- Rollen → role → user/group assignment

It owns:
- all roles of the user in that group,
- complete relevant capability catalog,
- effective state,
- provenance,
- direct user deviations,
- per-right history,
- role assignment impact preview.

### Role-capability editor
The same editor owns role → capability changes.
Capability-detail pages are analysis/navigation surfaces, not a second mutation surface.

## Effective-rights UX decisions

Default row:
`Capability | Effektiv | Quelle`

Expanded detail:
- granting roles
- user allow
- user deny
- specialized grants
- decisive source
- reason code / human explanation
- non-deniable
- override history

Admin actions are phrased as:
- `Recht entziehen`
- `Recht zusätzlich erlauben`
- `Abweichung entfernen`

Do not expose `allow / deny / none` as the normal primary control.

If a right is non-deniable, `Recht entziehen` must be unavailable and the UI explains why.

## Guided revoke

Before setting a deny, show all granting sources and explain whether removing one role would still leave another source.
Recommend the narrow user-specific deny before offering a broader membership / role-matrix change.

## Role-capability impact

Before role-capability mutation, preview:
- role holders,
- users who gain,
- users who lose,
- users who retain via another source,
- users who retain via direct user allow / other decisive source.

The preview must be computed from the same resolver semantics as runtime enforcement.

## Activation status

A role-capability mutation must return and display one of:
- persisted
- pending
- active
- failed

The UI must not present final success until active enforcement is confirmed.

## Claims and changes

Claims are integrated as a work queue and context surface.
Changes is the user-facing label for audit/history. Technical audit vocabulary may remain in diagnostics, but normal UI should say who changed what, in what context, before → after.

## Responsive contract

Desktop may use split view.
Tablet/mobile must become list → detail / drawer, never a horizontally squeezed desktop matrix.
No page-level horizontal overflow.

## Existing regression constraints

Keep protected API calls on the central refresh-capable client.
Do not read tokens or construct bearer headers in components.
Reuse existing UI primitives and existing CSS variables.
Do not edit historical migrations for this phase unless a genuinely new additive schema requirement is proven.


## Concrete route mapping for the combined module

Use existing canonical routes where they already exist:
- Benutzer → `/admin/users`
- Gruppen → `/admin/fansubs`
- Capabilities → `/admin/role-capabilities`

Add dedicated analysis/work surfaces where the agreed perspective does not exist:
- Rollen → `/admin/roles`
- Claims → `/admin/claims`
- Änderungen → `/admin/changes`

The new `/admin/roles` surface is an assignment/analysis view and must deep-link into the canonical user-in-group editor and canonical role-capability editor. It is not another role-capability mutation surface.
