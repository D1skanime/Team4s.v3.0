# Quick Plan: Phase 73 Fansub Members UX-Schnitt

Task ID: `260610-fhn`
Scope: Handoff-only plan for the agent currently editing the admin fansub collaboration/member table UI. Do not edit source code as part of this task.

## Goal

Document the locked Phase 73 UX/domain decision for `/admin/fansubs/[id]/edit`: the collaboration/member area uses two domain-separated tables in one tab, with one primary add action and no manual admin linking path between historical members and app profiles.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `docs/api/api-contracts.md` if endpoint payloads/status handling need to change
- `docs/frontend/auth-api-client.md` for protected admin/API behavior
- `frontend/src/components/ui/Table.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx`
- `frontend/src/lib/api.ts` around app members, group members, member claims, group invitations, and claim invitations
- `frontend/src/types/fansub.ts`
- `frontend/src/types/profile.ts`

## Non-Goals

- Do not add backend tables, merge APIs, or invent a new membership aggregate DTO.
- Do not implement manual admin linking from a historical member to an app profile.
- Do not add active/disabled/pending workflow status to historical members.
- Do not replace the page with card stacks or a single mixed table.
- Do not create local table/card primitives when global `Table`, `Button`, `Badge`, `EmptyState`, `Modal`, or `Drawer` fit.
- Do not move leader/admin behavior out of `/admin/fansubs/[id]/edit`.

## Implementation Tasks For Table Agent

1. Establish the one-tab, two-table composition.
   - Use one collaboration/member tab surface with exactly two primary tables: `App-/Fansub-Members` and `Historische Mitglieder`.
   - Keep app/admin membership data sourced through existing app-member helpers and DTOs such as `listFansubAppMembers`, `listFansubGroupInvitations`, `FansubAppMember`, and `FansubGroupInvitation`.
   - Keep historical member data sourced through existing historical group-member/role helpers and DTOs such as `listGroupMembers`, `listMemberRoles`, `HistFansubGroupMember`, and `HistGroupMemberRole`.
   - Reuse `frontend/src/components/ui/Table.tsx` exports: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, and `TableEmptyState`.

2. Implement the locked table semantics.
   - Table 1 columns: `Profil`, `Rollen`, `Zugriff/Status`, `Seit/Aktualisiert`, `Aktionen`.
   - Table 1 statuses are only app/admin membership and invitation/access states, for example active/disabled/pending invite where already represented by the existing APIs.
   - Table 2 columns: `Name`, `Aufgaben/Rollen`, `Claim`, `Aktionen`.
   - Table 2 must not show historical members as active/disabled/pending. Historical member rows are public/historical entries independent of app account access.
   - The `Claim` column derives state from claims/linkage only: `Nicht beansprucht`, `Claim offen`, `Bestätigt/verknüpft`.
   - Claim rejection belongs to claim history/review handling, not to a historical member row status.

3. Consolidate the add action without merging domain flows.
   - Use one primary button labeled `Mitglied hinzufügen`.
   - The modal or drawer opened by that button offers two explicit paths: `App-Mitglied/Einladung` and `Historischen Eintrag anlegen`.
   - The app-member path may reuse existing candidate search, app member creation, role assignment, and invitation flows.
   - The historical-entry path may reuse existing historical member creation and role creation forms/handlers.
   - If these flows cannot be safely hosted in one modal/drawer without duplicating logic, extract only small presentational primitives and keep API calls/domain state in their current ownership seams.

4. Preserve claim/linkage ownership.
   - Historical member to app-profile linkage happens only through user self-claim plus admin/leader confirmation.
   - Do not add a dropdown, search, hidden button, or API call that manually links a historical member to an app account from this UI.
   - Existing claim actions such as `listPendingMemberClaims`, `verifyMemberClaim`, `rejectMemberClaim`, `generateClaimInvitation`, `listClaimInvitations`, and `cancelClaimInvitation` remain claim/invitation concepts, not historical member status mutations.

## Acceptance Criteria

- The collaboration/member tab presents two tables in one tab, not one mixed table and not card stacks.
- `App-/Fansub-Members` contains columns `Profil`, `Rollen`, `Zugriff/Status`, `Seit/Aktualisiert`, `Aktionen`.
- `Historische Mitglieder` contains columns `Name`, `Aufgaben/Rollen`, `Claim`, `Aktionen`.
- Historical members have no active/disabled/pending member workflow status in row UI, filters, badges, or form labels.
- Claim labels are derived as `Nicht beansprucht`, `Claim offen`, or `Bestätigt/verknüpft`.
- No UI path lets an admin manually link a historical member to an app profile.
- One primary `Mitglied hinzufügen` action exists; its modal/drawer clearly separates `App-Mitglied/Einladung` from `Historischen Eintrag anlegen`.
- Existing global UI primitives are reused; no new local table/card primitive is introduced.
- Protected admin calls continue through central API helpers/session seams; no ad hoc bearer handling or direct Keycloak refresh code is added.
- German UI text uses correct umlauts: `hinzufügen`, `Bestätigt`, `verknüpft`, `wählen`, `für`, `zurückziehen`.

## Verification Checklist

- Run the relevant frontend checks available in this repo, at minimum targeted tests for the touched fansub edit components and `git diff --check`.
- Grep check: no new manual linking wording or handler exists in the touched UI, for example no new admin action labeled `Profil verknüpfen`, `App-Profil zuordnen`, or equivalent.
- Grep check: historical member rows do not introduce active/disabled/pending labels as member status. If existing backend fields still exist, they must not be presented as the locked UX status model.
- Browser/UAT check at `/admin/fansubs/[id]/edit`: with a valid refresh session and absent/expired access token, the protected tab/action still proceeds through the central API client without showing logged-out UI.
- Visual check: table text fits at desktop and mobile widths, row actions remain readable, empty states are scoped to the correct table.
- Contract check: if any endpoint payload, response shape, status branch, or DTO changes, update `shared/contracts/openapi.yaml` or `shared/contracts/admin-content.yaml` plus `frontend/src/types/*` and `frontend/src/lib/api.ts` in the same implementation.

## Risks And Stop Conditions

- Stop if implementation requires a backend/API contract change not covered by existing contract files.
- Stop if persisted data ownership is unclear between app/admin membership, historical group member entries, claims, and invitations.
- Stop if the UI would need a manual admin linking path to satisfy a requirement; that conflicts with the locked decision.
- Stop if another active edit has already changed the same table files in a conflicting way; coordinate before overwriting.
- Stop if auth/session changes are needed beyond using the central browser API client seam.
- Document any unavoidable deviation from existing global UI primitives before creating new local UI structure.
