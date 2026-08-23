---
phase: 138-effective-rights-administration-impact-ux
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/page.tsx
  - frontend/src/app/admin/users/AdminUsersClient.tsx
  - frontend/src/app/admin/users/AdminUsers.module.css
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx
  - frontend/src/app/admin/users/AdminUsersClient.test.tsx
  - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
  - frontend/src/app/admin/users/tabs/UserStreamingGrantsTab.tsx
  - frontend/src/app/admin/identity-access/AdminIdentityAccessNav.tsx
  - frontend/src/app/admin/identity-access/adminIdentityAccess.module.css
  - frontend/src/app/admin/fansubs/page.tsx
  - frontend/src/app/admin/role-capabilities/page.tsx
autonomous: true
requirements: [UADM-01]
must_haves:
  truths:
    - "User/right administration presents one coherent top-level module navigation: Benutzer, Gruppen, Rollen, Capabilities, Claims, Änderungen."
    - "The user list is an administrative work list; contribution/release/media counts are not primary columns."
    - "The user detail uses stable section navigation instead of the current nine-section accordion."
    - "Streaming remains visible only as a clearly non-functional future section; no fake grants or data are introduced."
    - "Existing back-link/query preservation from user detail to user list remains intact."
---

<objective>
Create the shared Phase-138 admin shell and simplify the canonical user surfaces before rights-specific logic is added.

Purpose: all later rights, role, claims and changes work must land in one information architecture rather than preserving the current split between user administration and capability administration.
Output: shared navigation, cleaned user list, and tabbed user detail shell.
</objective>

<context>
@AGENTS.md
@CLAUDE.md
@AI-HANDOFF.md
@.planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md
@frontend/src/app/admin/page.tsx
@frontend/src/app/admin/users/AdminUsersClient.tsx
@frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
@frontend/src/app/admin/users/AdminUsers.module.css
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Introduce the shared identity/access admin navigation</name>
  <read_first>138-CONTEXT.md; frontend/src/app/admin/page.tsx; existing PageHeader/Tabs/Navigation primitives under frontend/src/components/ui</read_first>
  <files>frontend/src/app/admin/identity-access/AdminIdentityAccessNav.tsx, frontend/src/app/admin/identity-access/adminIdentityAccess.module.css, frontend/src/app/admin/page.tsx, frontend/src/app/admin/fansubs/page.tsx, frontend/src/app/admin/role-capabilities/page.tsx</files>
  <behavior>
    - Render links for Benutzer `/admin/users`, Gruppen `/admin/fansubs`, Rollen `/admin/roles`, Capabilities `/admin/role-capabilities`, Claims `/admin/claims`, Änderungen `/admin/changes`.
    - Preserve existing canonical URLs where they already exist; do not create duplicate editors.
    - Highlight the active section using pathname-derived state.
    - Keyboard navigation and focus styles must use existing UI conventions.
    - No route may expose a blank placeholder except Streaming inside a user detail.
  </behavior>
  <action>Create one reusable admin-module navigation component and mount it immediately on `/admin/users`, `/admin/fansubs` and `/admin/role-capabilities`; later plans mount it on new `/admin/roles`, `/admin/claims` and `/admin/changes`. On the admin landing page replace the two competing user-rights/capability entry cards with one clear entry into the combined module while preserving any unrelated admin links.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/AdminUsersClient.test.tsx src/app/admin/users/[id]/UserDetailPageClient.test.tsx --reporter=dot</automated></verify>
  <done>One navigation component defines the Phase-138 module and no duplicate mutation surface is introduced.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Turn the user list into an administrative work list</name>
  <read_first>frontend/src/app/admin/users/AdminUsersClient.tsx; frontend/src/types/admin-users.ts; 138-CONTEXT.md</read_first>
  <files>frontend/src/app/admin/users/AdminUsersClient.tsx, frontend/src/app/admin/users/AdminUsers.module.css, frontend/src/app/admin/users/AdminUsersClient.test.tsx</files>
  <behavior>
    - Keep user/name+email, status, global roles, member profile, group count, open claims, last activity, conflicts/actions.
    - Remove primary columns for leader context, contribution count, release workspace count and media upload count.
    - Open claims greater than zero remain visually actionable.
    - Row navigation and filter query preservation continue to work.
  </behavior>
  <action>Refactor the table and responsive CSS without changing the backend list contract in this plan. Existing unused response fields may remain in the DTO for compatibility with Phase 139; simply stop presenting them as primary administration columns.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/AdminUsersClient.test.tsx --reporter=dot</automated></verify>
  <done>The user list exposes only administration-relevant columns and remains filterable/paginated.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Replace the user-detail accordion with stable section navigation</name>
  <read_first>frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx; all frontend/src/app/admin/users/tabs/*; 138-CONTEXT.md</read_first>
  <files>frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx, frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx, frontend/src/app/admin/users/tabs/UserOverviewTab.tsx, frontend/src/app/admin/users/tabs/UserStreamingGrantsTab.tsx</files>
  <behavior>
    - Sections are Übersicht, Rollen &amp; Rechte, Beiträge, Claims, Streaming, Änderungen.
    - Übersicht remains compact and does not duplicate the full rights editor.
    - Existing backHref/from-query behavior is unchanged.
    - Streaming renders a clear future-feature informational state only.
    - Legacy Global Roles + Group Memberships + Group Rights presentation is consolidated into the future Rollen &amp; Rechte section; do not expose three separate top-level sections.
  </behavior>
  <action>Use existing tab/segmented-navigation primitives if available; otherwise implement accessible buttons/links in this page only. Keep lazy loading per section where it materially avoids unnecessary requests, but do not recreate the old accordion UX.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx src/app/admin/users/[id]/page.test.tsx --reporter=dot</automated></verify>
  <done>User detail follows the agreed information architecture and remains link/back-navigation stable.</done>
</task>

</tasks>

<verification>Focused user-admin tests plus `git diff --check`.</verification>
<success_criteria>The combined admin shell and user information architecture are ready for the rights editor without introducing new authorization behavior.</success_criteria>
<output>After completion, create `138-01-SUMMARY.md`.</output>
