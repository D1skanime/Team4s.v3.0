---
phase: 139-scalable-user-admin-projections
plan: 06
type: execute
wave: 3
depends_on: [139-02, 139-04, 139-05]
requirements: [UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-07, UADM-08, QUAL-06]
autonomous: true
files_modified:
  - scripts/phase139-green-gate.sh
  - .planning/phases/139-scalable-user-admin-projections/139-UAT.md
  - .planning/phases/139-scalable-user-admin-projections/139-VERIFICATION.md
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx
---

<objective>
Run the integrated Phase-139 scale, projection, responsive and baseline-regression gate.

Output: reproducible Linux green gate, live UAT and verifier-ready evidence.
</objective>

<context>
@139-CONTEXT.md
@139-UI-SPEC.md
@139-01-SUMMARY.md
@139-02-SUMMARY.md
@139-03-SUMMARY.md
@139-04-SUMMARY.md
@139-05-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Capture baseline debt and run focused regression suite</name>
  <files>scripts/phase139-green-gate.sh</files>
  <action>
Before judging Phase 139, capture current known repository baseline failures.
Green gate must separately run:
- contribution projection repository/handler tests,
- media projection repository/handler tests,
- rights membership scaling tests,
- contribution/media/rights frontend tests,
- user-detail composition regression,
- type/lint/build commands that the repository currently supports,
- `git diff --check`.

Known unchanged Phase-136/137 failures must be reported as baseline debt, not silently ignored. Any new touched-file failure blocks Phase 139.
  </action>
  <verify><automated>bash -n scripts/phase139-green-gate.sh</automated></verify>
  <done>One Linux script distinguishes Phase-139 regressions from documented baseline debt.</done>
</task>

<task type="auto">
  <name>Task 2: High-volume integrated verification</name>
  <files>.planning/phases/139-scalable-user-admin-projections/139-VERIFICATION.md</files>
  <action>
Verify with representative large fixtures:
- 200+ release contexts contribution project,
- multiple projects and filter combinations,
- large media history,
- large membership rights user.

Record:
- query counts,
- item/count coherence,
- page boundaries,
- no duplicate/missing page keys,
- no client-side regrouping,
- selected-group-only rights request behavior.
  </action>
  <verify><automated>scripts/phase139-green-gate.sh</automated></verify>
  <done>QUAL-06 evidence is recorded, not inferred.</done>
</task>

<task type="auto">
  <name>Task 3: Live responsive/admin UAT</name>
  <files>.planning/phases/139-scalable-user-admin-projections/139-UAT.md, frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx</files>
  <action>
UAT must explicitly verify:
1. contribution Anime→Project hierarchy,
2. project standard always visible,
3. standard range collapse,
4. true deviation individual highlighting,
5. `Nur Abweichungen` filter,
6. contribution project-level count/pagination,
7. media Anime→Project→Episode/Release hierarchy,
8. lazy/small previews,
9. exactly one `Release-Medien öffnen` action per context,
10. no fake permission badge/raw owner_context/storage diagnostics,
11. media context-level count/pagination,
12. rights selected-group lazy load,
13. keyboard operation,
14. narrow width (including ~394px) with no page horizontal overflow.
  </action>
  <verify><automated>grep -q "Nur Abweichungen" .planning/phases/139-scalable-user-admin-projections/139-UAT.md && grep -q "Release-Medien öffnen" .planning/phases/139-scalable-user-admin-projections/139-UAT.md</automated></verify>
  <done>Every roadmap success criterion has an explicit live or automated check.</done>
</task>

</tasks>
<output>Create `139-06-SUMMARY.md` and final `139-VERIFICATION.md`; do not mark Phase 139 complete before the green gate and UAT pass.</output>
