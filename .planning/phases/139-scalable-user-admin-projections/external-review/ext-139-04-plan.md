---
phase: 139-scalable-user-admin-projections
plan: 04
type: execute
wave: 2
depends_on: [139-03]
requirements: [UADM-05, UADM-06, UADM-07, UADM-08]
autonomous: true
files_modified:
  - frontend/src/lib/api.ts
  - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.module.css
---

<objective>
Replace nested raw media cards with the approved informational release-context UI.

Output: lazy previews, fachliche context, filters/pagination and one canonical workspace action per context.
</objective>

<context>
@139-CONTEXT.md
@139-UI-SPEC.md
@139-03-SUMMARY.md
@frontend/src/app/admin/users/tabs/UserMediaTab.tsx
@frontend/src/app/me/releases/[versionId]/workspace/page.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Consume server media projection</name>
  <files>frontend/src/lib/api.ts, frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx</files>
  <action>
Update `getAdminUserMedia` to accept server filter/page params and return projected context items/meta.
Delete UI dependence on parsing `owner_context`.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserMediaTab.test.tsx --reporter=dot</automated></verify>
  <done>No client grouping/parsing of technical owner_context remains.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build context-block media UI</name>
  <files>frontend/src/app/admin/users/tabs/UserMediaTab.tsx, frontend/src/app/admin/users/tabs/UserMediaTab.module.css, frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx</files>
  <action>
Render:
- informational purpose copy,
- Anime/group/release-or-episode/media-type/date filters,
- total context count,
- Anime/project context,
- release/episode semantic label,
- small bounded lazy previews/compact media entries,
- one `Release-Medien öffnen` action for the block,
- server pagination.

Remove:
- per-media nested Card chrome where unnecessary,
- `Berechtigung aktiv/fehlt`,
- raw `Release-Version <database id>` labels,
- technical storage/path details,
- per-media duplicate workspace buttons.

Use the canonical existing workspace route for the projected release_version_id.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserMediaTab.test.tsx --reporter=dot</automated></verify>
  <done>Media history is fachlich understandable and remains read-only in Team4s.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Lazy preview and narrow-width gate</name>
  <files>frontend/src/app/admin/users/tabs/UserMediaTab.tsx, frontend/src/app/admin/users/tabs/UserMediaTab.module.css, frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx</files>
  <action>
Use the project's existing responsive/lazy image primitive if available.
Do not load original assets for list previews.
Ensure bounded dimensions prevent layout shifts.
At 394px-equivalent layout, no page-level horizontal overflow; filters and pagination remain keyboard accessible.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserMediaTab.test.tsx --reporter=dot</automated></verify>
  <done>Large media histories do not imply loading full originals or overflowing the admin page.</done>
</task>

</tasks>
<output>Create `139-04-SUMMARY.md`.</output>
