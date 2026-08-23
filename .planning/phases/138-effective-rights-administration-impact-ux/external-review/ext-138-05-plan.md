---
phase: 138-effective-rights-administration-impact-ux
plan: 05
type: execute
wave: 2
depends_on: [138-01, 138-04]
files_modified:
  - frontend/src/lib/api.ts
  - frontend/src/types/admin-capability.ts
  - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx
  - frontend/src/app/admin/role-capabilities/roleCapabilities.module.css
autonomous: true
requirements: [CAP-09, CAP-10]
must_haves:
  truths:
    - "A role-capability switch never mutates immediately."
    - "The admin sees impact counts and user-level before/after outcomes before confirming."
    - "After confirmation the dialog remains open through persisted/active/failed state and only active is shown as final success."
    - "Role list/detail state and mobile drawer behavior survive matrix refreshes."
---

<objective>
Wire the new impact/activation backend into the existing role-capability master/detail UI.

Purpose: make global role-capability changes understandable and safe without discarding the already-good compact role-list shell.
Output: impact dialog, confirm mutation, activation state and refreshed matrix.
</objective>

<context>
@138-CONTEXT.md
@138-04-SUMMARY.md
@frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
@frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
@frontend/src/app/admin/role-capabilities/RoleMasterList.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add preview and typed mutation API helpers</name>
  <read_first>frontend/src/lib/api.ts; new admin-capabilities contract from 138-04</read_first>
  <files>frontend/src/lib/api.ts, frontend/src/types/admin-capability.ts</files>
  <behavior>
    - `previewRoleCapabilityImpact(roleCode, actionCode, operation)` POSTs to `/impact`.
    - `grantRoleCapability` and `revokeRoleCapability` return `RoleCapabilityMutationResult`.
    - All protected calls keep central auth-refresh behavior.
  </behavior>
  <action>Update the existing helpers rather than creating a parallel API module.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/lib/api.auth-refresh.test.ts --reporter=dot</automated></verify>
  <done>Role-capability UI has typed access to preview and activation status.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Replace immediate switch mutation with impact dialog</name>
  <read_first>RoleCapabilityClient.tsx; RoleCapabilityDetail.tsx; Switch component; 138-04 contract</read_first>
  <files>frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx, frontend/src/app/admin/role-capabilities/roleCapabilities.module.css</files>
  <behavior>
    - Switch intent opens dialog and leaves current matrix state unchanged.
    - Dialog loading state fetches impact.
    - Summary shows role holders, gain/loss/retain counts.
    - Detail table shows user, group, before, after, reason/source.
    - Confirm button clearly names the operation and is disabled while mutating.
    - Cancel closes with no write.
  </behavior>
  <action>Keep selected role and open category state controlled in `RoleCapabilityClient`; the dialog owns only one pending role/action/operation intent.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx --reporter=dot</automated></verify>
  <done>No role-capability write can occur without an inspected preview and explicit confirmation.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Keep the dialog open until activation outcome is truthful</name>
  <read_first>RoleCapabilityClient current mutation flow; RoleCapabilityMutationResult</read_first>
  <files>frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.tsx</files>
  <behavior>
    - After confirm display `Gespeichert` while processing the mutation response.
    - `active` becomes final success and then permits close.
    - `failed` displays that DB state changed but active permission cache did not confirm; never show a green success toast.
    - `pending` displays pending and offers explicit `Status erneut prüfen` only if a real backend status endpoint exists; otherwise do not fabricate polling.
    - Matrix refresh occurs after mutation without resetting selected role/category.
  </behavior>
  <action>Model dialog phases explicitly (`preview_loading`, `preview_ready`, `mutating`, `active`, `failed`, optional `pending`). Do not infer active from HTTP 200 alone.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx --reporter=dot</automated></verify>
  <done>CAP-10 is visible and testable in the admin UI.</done>
</task>

</tasks>

<verification>Focused role-capability tests, responsive sheet regression, `git diff --check`.</verification>
<success_criteria>Role-capability mutations are previewed, confirmed and truthfully activated.</success_criteria>
<output>After completion, create `138-05-SUMMARY.md`.</output>
