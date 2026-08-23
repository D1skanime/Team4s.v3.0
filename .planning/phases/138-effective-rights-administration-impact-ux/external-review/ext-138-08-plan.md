---
phase: 138-effective-rights-administration-impact-ux
plan: 08
type: execute
wave: 4
depends_on: [138-01, 138-03, 138-05, 138-06, 138-07]
files_modified:
  - frontend/src/app/admin/users/AdminUsersClient.test.tsx
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
  - frontend/src/app/admin/roles/AdminRolesClient.test.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx
  - scripts/phase138-green-gate.sh
  - .planning/phases/138-effective-rights-administration-impact-ux/138-UAT.md
autonomous: true
requirements: [CAP-08, CAP-09, CAP-10, UADM-01]
must_haves:
  truths:
    - "The complete Phase-138 admin flow works at desktop, tablet and mobile widths without page overflow."
    - "Keyboard users can navigate module tabs, role list, capability sections and impact/override dialogs."
    - "Protected direct access and refresh-capable API behavior remain intact."
    - "Guided revoke, role-capability preview and cache activation each have success/failure regression coverage."
    - "A reproducible Linux green gate and live UAT define completion."
---

<objective>
Harden and verify the complete Phase-138 administration flow.

Purpose: make execute completion evidence-based and reproducible on team4s-linux.
Output: integrated tests, green-gate script, UAT and final verification inputs.
</objective>

<context>
@138-CONTEXT.md
@138-01-SUMMARY.md
@138-03-SUMMARY.md
@138-05-SUMMARY.md
@138-06-SUMMARY.md
@138-07-SUMMARY.md
@scripts/phase135-green-gate.sh
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add cross-surface regression coverage</name>
  <read_first>all touched Phase-138 frontend tests and auth-refresh tests</read_first>
  <files>frontend/src/app/admin/users/AdminUsersClient.test.tsx, frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx, frontend/src/app/admin/roles/AdminRolesClient.test.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx, frontend/src/app/admin/role-capabilities/RoleCapabilityImpactDialog.test.tsx</files>
  <behavior>
    - User → group rights → role link works.
    - Group → user and Role → user/group open the canonical editor.
    - Guided revoke lists multiple sources and blocks non-deniable revoke.
    - Matrix switch opens impact and performs no mutation before confirm.
    - Failed activation is not presented as active success.
    - User list filter/back query preservation remains stable.
  </behavior>
  <action>Add integration-level component tests around existing mocked API boundaries; do not duplicate every lower-level assertion.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users src/app/admin/roles src/app/admin/role-capabilities --reporter=dot</automated></verify>
  <done>Critical cross-navigation and mutation states have regression coverage.</done>
</task>

<task type="auto">
  <name>Task 2: Create a Linux Phase-138 green gate</name>
  <read_first>scripts/phase135-green-gate.sh; frontend/package.json; backend/go.mod</read_first>
  <files>scripts/phase138-green-gate.sh</files>
  <behavior>
    - Run focused backend capability/effective-rights/role-assignment tests.
    - Run focused frontend users/roles/role-capabilities/claims/changes tests.
    - Run central auth-refresh regression.
    - Run available lint/type-check commands.
    - Run `git diff --check`.
    - Exit non-zero on any failure.
  </behavior>
  <action>Follow existing project shell conventions and current Docker service names. Execute on team4s-linux, never Windows VM.</action>
  <verify><automated>bash -n scripts/phase138-green-gate.sh</automated></verify>
  <done>One command reproduces the automated completion gate.</done>
</task>

<task type="auto">
  <name>Task 3: Write live Phase-138 UAT</name>
  <read_first>138-CONTEXT.md; prior UAT files; roadmap Phase-138 success criteria</read_first>
  <files>.planning/phases/138-effective-rights-administration-impact-ux/138-UAT.md</files>
  <behavior>
    - Verify user with multiple roles in one group shows all grant sources.
    - Verify guided personal deny and subsequent local history.
    - Verify non-deniable explanation.
    - Verify role holder view and group → canonical user rights navigation.
    - Verify role-capability preview with at least one retain-via-other-source example.
    - Verify failed/pending activation does not show final success.
    - Verify Claims/Änderungen context links.
    - Verify desktop, tablet and mobile no-overflow behavior.
  </behavior>
  <action>Write explicit prerequisites, actions and visible pass/fail expectations. Use disposable/test data only.</action>
  <verify><automated>grep -q "Recht entziehen" .planning/phases/138-effective-rights-administration-impact-ux/138-UAT.md &amp;&amp; grep -q "Aktivierung" .planning/phases/138-effective-rights-administration-impact-ux/138-UAT.md</automated></verify>
  <done>Live UAT covers the roadmap criteria plus the agreed combined-admin navigation.</done>
</task>

</tasks>

<verification>`scripts/phase138-green-gate.sh` plus live UAT.</verification>
<success_criteria>Phase 138 can only be declared complete after automated and live gates pass.</success_criteria>
<output>After completion, create `138-08-SUMMARY.md` and `138-VERIFICATION.md`.</output>
