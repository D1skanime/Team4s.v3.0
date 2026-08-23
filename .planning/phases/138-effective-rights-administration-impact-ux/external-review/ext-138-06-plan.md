---
phase: 138-effective-rights-administration-impact-ux
plan: 06
type: execute
wave: 2
depends_on: [138-01, 138-03]
files_modified:
  - backend/internal/repository/admin_role_assignments_repository.go
  - backend/internal/repository/admin_role_assignments_repository_test.go
  - backend/internal/handlers/admin_role_assignments_handler.go
  - backend/internal/handlers/admin_role_assignments_handler_test.go
  - backend/cmd/server/admin_routes.go
  - frontend/src/types/admin-users.ts
  - frontend/src/lib/api.ts
  - frontend/src/app/admin/roles/page.tsx
  - frontend/src/app/admin/roles/AdminRolesClient.tsx
  - frontend/src/app/admin/roles/AdminRolesClient.test.tsx
  - frontend/src/app/admin/roles/adminRoles.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
autonomous: true
requirements: [UADM-01]
must_haves:
  truths:
    - "Rollen is a real analysis/assignment perspective: selecting Co-Leitung shows which users hold it and in which groups."
    - "Role-holder rows include user, group, active status, direct-right deviation count and last activity where those values are available from bounded set queries."
    - "A role-holder row opens the same canonical user-in-group rights editor used from the user perspective."
    - "The existing group member surface links each app user into that same canonical editor."
    - "Neither the Rollen page nor group member page becomes a second rights mutation implementation."
---

<objective>
Complete the bidirectional user/group/role navigation agreed for the combined admin module.

Purpose: administrators must be able to start from a role or a group and arrive at the exact same user-in-group rights editor, instead of learning separate administration flows.
Output: role-holder analysis route, group-member cross-links and URL-addressable user/group rights context.
</objective>

<context>
@138-CONTEXT.md
@138-03-SUMMARY.md
@backend/internal/repository/fansub_group_app_members_repository.go
@backend/internal/repository/admin_users_tab_repository.go
@frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
@frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add a bounded role-holder projection</name>
  <read_first>fansub_group_member_roles schema/repositories; admin users list projection; user_group_capability_overrides schema</read_first>
  <files>backend/internal/repository/admin_role_assignments_repository.go, backend/internal/repository/admin_role_assignments_repository_test.go, backend/internal/handlers/admin_role_assignments_handler.go, backend/internal/handlers/admin_role_assignments_handler_test.go, backend/cmd/server/admin_routes.go</files>
  <behavior>
    - `GET /api/v1/admin/roles/:roleCode/assignments?limit=&offset=&q=` requires platform-admin access.
    - Response rows contain app_user_id, display_name, email, group_id, group_name, account status, direct_override_count for exactly that user/group, and last_activity_at if the existing admin projection can provide it without per-row queries.
    - Only active current group-role assignments from `fansub_group_member_roles` are returned; historical tenure rows are not mixed in.
    - Query is set-based, paginated and deterministic.
    - Unknown role returns an empty bounded list or the project's standard neutral not-found behavior without exposing unrelated data.
  </behavior>
  <action>Create a read-only projection; do not add mutation methods. Reuse the existing role-definition catalog to validate/display role metadata.</action>
  <verify><automated>cd backend &amp;&amp; go test ./internal/repository ./internal/handlers -run 'RoleAssignments|AdminRole' -count=1</automated></verify>
  <done>A role can be inspected as a bounded set of real current user/group assignments.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build the Rollen analysis surface</name>
  <read_first>RoleMasterList.tsx; listRoleCapabilities(); new role assignments endpoint; AdminIdentityAccessNav</read_first>
  <files>frontend/src/types/admin-users.ts, frontend/src/lib/api.ts, frontend/src/app/admin/roles/page.tsx, frontend/src/app/admin/roles/AdminRolesClient.tsx, frontend/src/app/admin/roles/AdminRolesClient.test.tsx, frontend/src/app/admin/roles/adminRoles.module.css</files>
  <behavior>
    - Left/upper role selector uses canonical role catalog labels/contexts.
    - Selecting `Co-Leitung` loads role holders, not capability switches.
    - Columns/cards: Benutzer, Gruppe, Status, Rechte-Abweichungen, Letzte Aktivität.
    - User/group row opens `/admin/users/{userId}?section=rights&group={groupId}`.
    - `Standardrechte dieser Rolle` links to `/admin/role-capabilities?role={roleCode}`.
    - Mobile uses role list → assignment detail/list without horizontal overflow.
  </behavior>
  <action>Keep this surface read-only with respect to capability mappings. It is an analysis/navigation view only.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/roles/AdminRolesClient.test.tsx --reporter=dot</automated></verify>
  <done>The admin can answer “who has Co-Leitung and where?” and navigate directly to that user's group rights.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Make group/user entry points address the same rights context</name>
  <read_first>FansubAppMembersOverview.tsx; FansubAppMembersSection.tsx; UserDetailPageClient.tsx; UserGroupRightsTab.tsx</read_first>
  <files>frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx, frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx, frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx</files>
  <behavior>
    - App-member rows with a linked app_user_id expose `Rollen & Rechte` navigation to `/admin/users/{id}?section=rights&group={currentGroupId}`.
    - User detail parses `section=rights` and `group={id}` and opens the rights section with that group selected.
    - Invalid/stale group query values fall back safely to the first valid membership instead of showing foreign data.
    - No separate group-side rights editor is created.
  </behavior>
  <action>Use URL state only to select the canonical editor; authorization remains entirely server/API controlled.</action>
  <verify><automated>cd frontend &amp;&amp; npx vitest run src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx src/app/admin/users/[id]/UserDetailPageClient.test.tsx src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>User, group and role perspectives converge on one rights editor.</done>
</task>

</tasks>

<verification>Focused role assignments, group members and user-rights navigation tests.</verification>
<success_criteria>The agreed bidirectional navigation is real without creating duplicate authorization editors.</success_criteria>
<output>After completion, create `138-06-SUMMARY.md`.</output>
