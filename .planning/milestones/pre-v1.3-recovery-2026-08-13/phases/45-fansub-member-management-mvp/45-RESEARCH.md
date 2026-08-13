# Phase 45: Fansub Member Management MVP - Research

**Researched:** 2026-05-13
**Domain:** Team4s app-user membership management, fansub-group permissions, legacy member seam replacement
**Confidence:** High for visible legacy member/admin seam findings, medium for final implementation path because Phase-43/44 runtime seams are still not confirmed in the currently open branch

---

## Existing Team4s Seams

### 1. The visible branch still has a legacy `fansub_members` admin flow

The currently visible codebase already contains:
- `backend/internal/handlers/fansub_group_members.go`
- `backend/internal/repository/fansub_repository.go`
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- `frontend/src/types/fansub.ts`

This flow is built around:
- `fansub_members`
- `handle`
- free-text `role`
- `since_year`, `until_year`
- `notes`

Implication:
- this seam looks more like contributor/persona membership than app-user access control
- it must not be reused as the permission-granting group-membership model for Phase 45

### 2. The visible member flow is still protected by legacy global admin checks

`FansubHandler.requireAdmin(...)` currently:
- reads the legacy auth identity from middleware
- checks one global role through `AuthzRepository`
- returns 401/403 directly from the handler layer

Implication:
- Phase 45 must adopt the Phase-44 permission engine rather than extending legacy `requireAdmin(...)`
- `fansub_group.members.view` and `fansub_group.members.manage` should become the only authorization seam for the touched member-management endpoints

### 3. App-user-based group membership is planned, but not clearly visible in runtime code yet

Prior planning artifacts for Phase 43 explicitly expect:
- `app_users`
- `app_user_global_roles`
- `fansub_group_members`
- `fansub_group_member_roles`
- Keycloak subject mapping

Current branch-reality inspection still does not show those tables or runtime seams clearly in code/migrations.

Implication:
- Phase 45 must start with a pre-flight schema/code analysis
- if the app-user/group-membership seam is absent in the executing branch, Phase 45 should stop with a blocker instead of retrofitting app permissions onto `fansub_members`

### 4. The frontend already has a dedicated fansub members page that can be repurposed

The visible page:
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`

already offers:
- list display
- create/edit/delete form blocks
- basic `ApiError` rendering

Implication:
- Phase 45 can likely reuse this route/page shell
- but the data model, forms, capability gating, and error handling must be refit from legacy `handle`/`role` entry to app-user search + role assignment

### 5. The API client already has fansub member DTOs, but they match the legacy model

`frontend/src/lib/api.ts` and `frontend/src/types/fansub.ts` already contain:
- `FansubMember`
- `FansubMemberCreateRequest`
- `FansubMemberPatchRequest`
- list/create/update/delete helpers

Implication:
- these are good client seams to evolve
- but the DTO contract must be shifted to app-user identity, membership status, role list, audit-friendly timestamps, and capability-driven actions

### 6. Audit remains a reuse decision rather than a greenfield opportunity

Phase 44 already established the design intent for generic audit logging.

Implication:
- if a reusable `audit_logs` or equivalent generic seam exists by the time Phase 45 executes, it should be reused
- if not, only a minimal extension or minimal migration is justified
- Phase 45 should not invent a second audit model just for membership events

---

## Architecture Recommendation

### Recommendation 1: Treat Phase 45 as the app-user membership admin surface, not as an extension of `fansub_members`

The user brief is explicit:
- add existing app users to a fansub group
- assign app roles
- use Phase-44 permissions

That means the main data model should be:
- app user identity
- group membership row
- role assignment rows

not:
- handle
- free-text role string

### Recommendation 2: Make the first task a hard seam-validation pass

Before any endpoint or UI change:
- verify the actual table names
- verify the actual membership/role columns
- verify the CurrentUser actor seam
- verify the actual capability endpoint shape from Phase 44

If these are missing:
- stop with a blocker
- do not silently widen Phase 45 into “finish all of Phase 43 and 44 first”

### Recommendation 3: Split the backend model into membership state and assigned roles

The clean MVP likely needs:
- one membership row with active/inactive status
- one or more assigned roles per membership/group

Useful operations:
- create membership with initial role set
- add/remove role
- activate/deactivate membership
- fetch a list with flattened active roles

This avoids overloading one row with one role string and makes self-lockout checks tractable.

### Recommendation 4: Centralize self-lockout protection in a backend service/repository seam

Self-lockout prevention is not a UI concern.

It should be enforced centrally when:
- removing `fansub_lead`
- removing any role that carries `fansub_group.members.manage`
- deactivating the current member
- deactivating another member who is currently the last manager

Recommended approach:
- compute current active managing membership set for the group
- simulate the requested mutation
- reject with `409 Conflict` if the remaining active set would be empty

This logic belongs in one service or repository-backed helper, not in each handler branch.

### Recommendation 5: Reuse group capability responses instead of introducing a separate member-policy payload

Phase 44 already established fansub-group capabilities.

Phase 45 should extend that existing response with:
- `canViewMembers`
- `canManageMembers`

The members page should fetch and use those capabilities instead of:
- reading role names
- assuming admins
- inferring permissions from page visibility

### Recommendation 6: Add a dedicated app-user search endpoint rather than overloading member list reads

The add-member flow needs a search across existing authenticated app users.

A focused endpoint is the simplest MVP:
- query by name or email
- return minimal app-user cards for selection
- exclude or mark already-active group members where useful

This keeps the member list endpoint clean and avoids overfetching.

### Recommendation 7: Keep the frontend intentionally thin

The frontend should do only four things:
- load group capabilities
- load member list when view is allowed
- search/select app users for add flow
- submit role/membership mutations and render 401/403/409 errors clearly

It should not:
- know what `fansub_lead` means semantically
- predict self-lockout locally
- cache capabilities globally per user

---

## Recommended Backend Surface

### Core reads

- members list for one fansub group
- app-user search for add flow
- optional role option list derived from central role constants if not already exposed elsewhere

### Core mutations

- add app user to group with initial roles
- update member roles
- deactivate member
- reactivate member

Potential modeling choice:
- one patch endpoint for status + role mutations
- or separate focused endpoints for role add/remove and activation toggles

For MVP, separate focused operations may be easier to audit and test.

---

## Error and Status Semantics

Recommended status behavior:
- `401` when unauthenticated
- `403` when authenticated but lacking `fansub_group.members.view/manage`
- `404` when group or target membership does not exist
- `409` for self-lockout prevention and duplicate active membership conflicts
- `400` for unknown roles or malformed payloads

Important:
- self-lockout is a business conflict, not a permission denial
- duplicate active membership is also a conflict, not a generic validation failure

---

## Testing Recommendation

Backend tests should cover at least:
- user without permission cannot view members
- `fansub_lead` of own group can view members
- `fansub_lead` can add an existing app user to own group
- same user cannot manage another group
- `designer` cannot manage members
- unknown role rejected
- duplicate active membership rejected
- deactivated member loses permissions
- last active `fansub_lead` cannot be removed
- last active manager role cannot be removed
- self-deactivation blocked when it would leave no manager

Frontend tests should cover the thin UI contract:
- members section only loads when `canViewMembers`
- add/edit/deactivate controls only render or enable when `canManageMembers`
- `401`, `403`, and `409` show understandable user-facing messages
- no hard-coded role-name branches remain in touched components

---

## Risks

### Biggest structural risk: mixing legacy contributor members with app-user access members

If Phase 45 tries to reuse `fansub_members` as the access-control membership model:
- permissions will be anchored to the wrong identity seam
- group admin logic will stay disconnected from Keycloak-authenticated app users
- later cleanup will become harder

Mitigation:
- enforce the pre-flight seam check
- explicitly document `fansub_members` as a different concern if it remains in the product

### Biggest execution risk: missing Phase-43/44 runtime seams

If the executing branch still lacks:
- `app_users`
- group membership tables
- permission engine hooks

then Phase 45 is blocked.

Mitigation:
- fail fast with a blocker
- do not silently expand scope backward

### Biggest UX risk: admin page drift between capability booleans and mutation enforcement

If the UI and backend diverge:
- operators will see buttons that fail
- or hidden actions they should be allowed to use

Mitigation:
- drive all member-management UI affordances from the same capability response that Phase 44 already defined

---

## Recommended Plan Shape

1. Pre-analysis and membership foundation / seam validation
2. Backend member-management endpoints, capabilities, audit, self-lockout logic
3. Thin frontend member-management UI wiring
4. Tests, docs, verification, and Phase-46 handoff
