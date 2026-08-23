---
phase: 138-effective-rights-administration-impact-ux
plan: 03
type: execute
wave: 2
depends_on: [138-01, 138-02]
files_modified:
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.module.css
  - frontend/src/app/admin/users/tabs/UserRightsGroupPicker.tsx
  - frontend/src/app/admin/users/tabs/EffectiveRightRow.tsx
  - frontend/src/app/admin/users/tabs/EffectiveRightDetail.tsx
  - frontend/src/app/admin/users/tabs/CapabilityOverrideDialog.tsx
  - frontend/src/app/admin/users/tabs/CapabilityOverrideHistory.tsx
autonomous: true
requirements: [CAP-08, UADM-01]
must_haves:
  truths:
    - "Rollen & Rechte is grouped by fansub group first and shows all roles for that membership together."
    - "The selected group displays the complete relevant capability set, not only granted capabilities."
    - "Each right shows effective result and source; detail expansion shows complete resolver provenance."
    - "Revoke/additional allow/remove deviation are understandable user intents, not raw allow/deny toggles."
    - "Non-deniable rights cannot offer an impossible revoke action."
    - "The guided revoke flow lists every granting source and recommends the narrow user deny first."
---

<objective>
Replace the old read-only group-rights table with the canonical user-in-group Effective Rights editor.

Purpose: satisfy UADM-01 and CAP-08 on the user surface administrators already use.
Output: group-first rights editor, provenance inspector, guided override mutation and per-right history.
</objective>

<context>
@138-CONTEXT.md
@138-02-SUMMARY.md
@frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
@frontend/src/app/admin/users/tabs/UserGroupMembershipsTab.tsx
@frontend/src/types/admin-users.ts
@frontend/src/types/admin-capability.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build the canonical group-first rights workspace</name>
  <read_first>UserGroupRightsTab.tsx; UserGroupMembershipsTab.tsx; effectiveRightsViewModel.ts; role-capability catalog types</read_first>
  <files>frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.module.css, frontend/src/app/admin/users/tabs/UserRightsGroupPicker.tsx, frontend/src/app/admin/users/tabs/EffectiveRightRow.tsx, frontend/src/app/admin/users/tabs/EffectiveRightDetail.tsx</files>
  <behavior>
    - Load real memberships to choose a concrete group; for one group auto-select it.
    - Show every role held in that group together.
    - Load effective rights for exactly `(group,user)`.
    - Join resolver action codes to matrix/catalog metadata for label/category/order/help.
    - Display category sections and rows `Capability | Effektiv | Quelle`.
    - Expanded row shows granting roles, user allow/deny, specialized grants, decisive source, reason and non-deniable.
    - Unknown catalog metadata falls back to action code without dropping the right.
  </behavior>
  <action>Retire `getAdminUserGroupRights` as the canonical rendering source. It may remain in `api.ts` until a later cleanup if other consumers exist, but this tab must no longer derive user authorization from its two booleans.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>The user sees the complete resolver result for the selected group, grouped and explained.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement guided direct-user allow/deny/remove actions</name>
  <read_first>CapabilityOverrideMutationRequest/Result types; Phase-137 handler error codes; EffectiveRightDetail.tsx</read_first>
  <files>frontend/src/app/admin/users/tabs/CapabilityOverrideDialog.tsx, frontend/src/app/admin/users/tabs/EffectiveRightDetail.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <behavior>
    - Allowed right with no user deny offers `Recht entziehen` only when `non_deniable=false`.
    - Denied right with no user allow and `user_overridable` catalog metadata offers `Recht zusätzlich erlauben`.
    - Existing personal allow/deny offers `Abweichung entfernen`.
    - Revoke dialog lists every `granting_roles` entry plus specialized grants and current decisive source.
    - The dialog explicitly states when another role would continue granting access and still recommends a narrow user deny.
    - A reason category is required according to the backend contract; `other` requires free text.
    - On success replace the affected row with `result.effective_right` and show `activation_status` without refetch races.
    - On API validation/authorization errors keep the dialog open and display the server-safe message.
  </behavior>
  <action>Use the existing Phase-137 mutation contract. Do not edit memberships or role matrices from this dialog; broader changes are navigation options only.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>User-specific changes are explainable, narrow, idempotent and immediately reflected from the canonical mutation response.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add per-right override history and cross-links</name>
  <read_first>CapabilityOverrideAuditItem; resolveRoleLink.ts; existing role capability URL query behavior</read_first>
  <files>frontend/src/app/admin/users/tabs/CapabilityOverrideHistory.tsx, frontend/src/app/admin/users/tabs/EffectiveRightDetail.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <behavior>
    - History is lazy-loaded only after a right detail asks for it.
    - Filter the returned group/user history client-side to the opened `action_code` only; do not reinterpret before/after semantics.
    - Show timestamp, actor user id, before → after and reason.
    - Role-source links navigate to `/admin/role-capabilities?role={roleCode}`.
    - Group links point to the existing group admin route.
  </behavior>
  <action>Keep the global Changes integration for Plan 06; this task only provides the local history needed to understand one right.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>Each right can be explained both by current provenance and its direct override history.</done>
</task>

</tasks>

<verification>Focused user rights tests, `npm run lint` for touched files, `git diff --check`.</verification>
<success_criteria>UADM-01 and CAP-08 are satisfied on the canonical user detail surface.</success_criteria>
<output>After completion, create `138-03-SUMMARY.md`.</output>
