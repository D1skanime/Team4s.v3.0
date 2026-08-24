---
phase: 139-scalable-user-admin-projections
plan: 05
type: execute
wave: 2
depends_on: []
requirements: [UADM-06, UADM-08, QUAL-06]
autonomous: true
files_modified:
  - backend/internal/repository/admin_users_tab_repository.go
  - backend/internal/repository/admin_users_tab_repository_test.go
  - backend/internal/handlers/admin_users_handler.go
  - backend/internal/handlers/admin_users_handler_test.go
  - frontend/src/lib/api.ts
  - frontend/src/types/admin-users.ts
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
---

<objective>
Close only the Phase-139 scalability part of the existing Phase-138 Effective Rights tab.

Output: bounded/filterable group context selection and lazy selected-group rights loading without changing resolver semantics or mutation UX.
</objective>

<context>
@139-CONTEXT.md
@frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
@backend/internal/handlers/admin_effective_rights_handler.go
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Bound user group-membership selection</name>
  <files>backend/internal/repository/admin_users_tab_repository.go, backend/internal/repository/admin_users_tab_repository_test.go, backend/internal/handlers/admin_users_handler.go, backend/internal/handlers/admin_users_handler_test.go, frontend/src/types/admin-users.ts, frontend/src/lib/api.ts</files>
  <action>
Extend the admin user's group-membership projection with server-side search/filter and stable `limit/offset/total` metadata while keeping the existing membership facts.
Do not change membership business semantics.
Ensure count and items share the same filtered query predicate.
  </action>
  <verify><automated>cd backend && go test ./internal/repository ./internal/handlers -run 'UserGroupMemberships.*Pagination|UserGroupMemberships.*Filter' -count=1</automated></verify>
  <done>Large membership sets are bounded before rights inspection begins.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Stop eager effective-rights fan-out</name>
  <files>frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <action>
Replace `Promise.all(memberships.map(getEffectiveRights))` with:
- bounded membership selector/page,
- selected group state,
- one `getEffectiveRights(selectedGroup,userId)` request,
- URL/deep-link preservation for `group=`,
- filter/page changes that do not reload rights for unselected groups.

Keep GroupSection, GuidedGrantFlow, GuidedRevokeFlow, role-assignment impact and provenance semantics unchanged.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>Initial request count no longer scales linearly with group membership count.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Query/request-count regression</name>
  <files>backend/internal/repository/admin_users_tab_repository_test.go, frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx</files>
  <action>
Add high-volume membership tests proving bounded DB query count and frontend tests proving that 100 memberships still trigger only the selected group's effective-rights fetch rather than 100 resolver requests.
  </action>
  <verify><automated>cd frontend && npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx --reporter=dot</automated></verify>
  <done>UADM-06 rights scaling is closed without reopening Phase-138 authorization design.</done>
</task>

</tasks>
<output>Create `139-05-SUMMARY.md`.</output>
