---
phase: 139-scalable-user-admin-projections
plan: 02
type: execute
wave: 2
depends_on: [139-01]
requirements: [UADM-02, UADM-03, UADM-04, UADM-06, UADM-07, UADM-08]
autonomous: true
files_modified:
  - frontend/src/lib/api.ts
  - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.module.css
---

<objective>
Replace the four raw contribution tables with the approved grouped project UI.

Output: filterable/paginated Anime→Project presentation with visible project standard, compact standard ranges and individual real deviations.
</objective>

<context>
@139-CONTEXT.md
@139-UI-SPEC.md
@139-01-SUMMARY.md
@frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
@frontend/src/components/contributions/AnimeGroupCard.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add typed query client</name>
  <files>frontend/src/lib/api.ts, frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx</files>
  <action>
Update `getAdminUserContributions` to accept the server filter/page object and return the new projection contract.
Use the central protected API client.
Do not retain a client-side conversion back into the old four arrays.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserContributionsTab.test.tsx --reporter=dot</automated></verify>
  <done>Frontend consumes the bounded server projection directly.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build grouped contribution projection UI</name>
  <files>frontend/src/app/admin/users/tabs/UserContributionsTab.tsx, frontend/src/app/admin/users/tabs/UserContributionsTab.module.css, frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx</files>
  <action>
Render:
- purpose copy marking the section informational,
- server-backed filters for Anime, group/project, role/type, only deviations, date range,
- total project count,
- project blocks grouped visually under Anime,
- project standard always visible,
- standard ranges compact,
- real deviations individually highlighted,
- dispute/legacy truthfully labelled when present,
- page controls using server meta.

Do not call `buildEpisodeRanges` or reproduce `AnimeGroupCard` client grouping.
No raw release_version_id may be user-visible.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserContributionsTab.test.tsx --reporter=dot</automated></verify>
  <done>The UI mirrors the server projection one-to-one and no longer presents release-version noise.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Responsive/keyboard behavior</name>
  <files>frontend/src/app/admin/users/tabs/UserContributionsTab.module.css, frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx</files>
  <action>
Use existing admin layout variables and container-responsive patterns.
At narrow widths filters stack/wrap, project blocks remain readable, and no table forces horizontal page scrolling.
All filter inputs, deviation toggle and pagination controls are keyboard-operable with visible focus.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserContributionsTab.test.tsx --reporter=dot</automated></verify>
  <done>UADM-08 is covered on the contribution surface.</done>
</task>

</tasks>
<output>Create `139-02-SUMMARY.md`.</output>
