---
phase: 139-scalable-user-admin-projections
plan: 01
type: execute
wave: 1
depends_on: []
requirements: [UADM-02, UADM-03, UADM-04, UADM-06, QUAL-06]
autonomous: true
files_modified:
  - backend/internal/models/admin_users.go
  - backend/internal/repository/admin_user_contribution_projection.go
  - backend/internal/repository/admin_user_contribution_projection_test.go
  - backend/internal/handlers/admin_users_handler.go
  - backend/internal/handlers/admin_users_handler_test.go
  - shared/contracts/admin-users.yaml
  - frontend/src/types/admin-users.ts
---

<objective>
Replace the raw contribution-row admin contract with a bounded server-side project projection.

Output: typed Anime+Project projection, real override detection, standard-range collapse, filters, coherent count/pagination.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/139-scalable-user-admin-projections/139-CONTEXT.md
@.planning/phases/139-scalable-user-admin-projections/139-DISCUSS.md
@backend/internal/repository/admin_users_tab_repository.go
@database/migrations/0137_phase108_contribution_sources.up.sql
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Define projection/filter/page contract</name>
  <files>backend/internal/models/admin_users.go, shared/contracts/admin-users.yaml, frontend/src/types/admin-users.ts</files>
  <action>
Define a contribution projection response whose page item is one `(anime_id,fansub_group_id)` project:
- anime id/title
- group id/name
- project standard role codes for the target member
- release contexts containing episode number/label, release version id/label, sort index, semantic state `standard|deviation`, role codes, dispute/legacy flags where applicable
- server-built `standard_ranges` for consecutive standard-equivalent contexts
- individual `deviations`
- response `meta { total, limit, offset }`.

Define filter input:
`anime_id`, `fansub_group_id`, `role_code`, `only_deviations`, `from`, `to`, `limit`, `offset`.
Use bounded defaults and a hard maximum limit.
  </action>
  <verify>
    <automated>cd backend && go test ./internal/models ./internal/handlers -run AdminUserContrib -count=1</automated>
  </verify>
  <done>One contract describes exactly the server-side page unit and filters agreed in D02-D10.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement set-based project projection</name>
  <files>backend/internal/repository/admin_user_contribution_projection.go, backend/internal/repository/admin_user_contribution_projection_test.go</files>
  <action>
Implement a repository method that:
1. resolves canonical member id as existing code does;
2. applies all filters server-side;
3. determines the filtered distinct project keys `(anime_id,fansub_group_id)`;
4. counts those same keys;
5. pages those project keys with deterministic ordering;
6. batch-loads project standard and release contexts for only the page keys;
7. joins `release_crew_snapshots`, release/version/episode and roles;
8. uses `episodes.sort_index` as ordering;
9. marks `inherited` as standard;
10. for `independent`, compares the target member's effective role set with the project's target-member role set before calling it a deviation;
11. constructs consecutive standard ranges server-side;
12. keeps real deviations individual.

Do not issue a query per project, episode or release. Use bounded set queries.
  </action>
  <verify>
    <automated>cd backend && go test ./internal/repository -run 'UserContributionProjection|ContributionRange|ContributionPagination' -count=1 -v</automated>
  </verify>
  <done>Projection is domain-correct, server-grouped and bounded independent of raw history size.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire endpoint parsing and stable pagination</name>
  <files>backend/internal/handlers/admin_users_handler.go, backend/internal/handlers/admin_users_handler_test.go</files>
  <action>
Keep `GET /api/v1/admin/users/:userId/contributions` as the canonical URL but parse the new query filters and return the projection response.
Reject malformed ids/dates/limits consistently.
Preserve platform-admin authorization.
Do not expose raw unbounded legacy arrays from the endpoint after this migration.
  </action>
  <verify>
    <automated>cd backend && go test ./internal/handlers -run 'UserContributions|ContributionProjection' -count=1</automated>
  </verify>
  <done>Endpoint is bounded, filterable and count/page coherent.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: High-volume and query-count gate</name>
  <files>backend/internal/repository/admin_user_contribution_projection_test.go</files>
  <action>
Seed representative high-volume data including:
- multiple anime/projects,
- 200+ ordered release contexts,
- inherited snapshots,
- independent-but-equal snapshots,
- real deviations,
- filter combinations.

Assert:
- project page never splits,
- total equals filtered project-key count,
- offset/page transitions have no duplicate/missing project key,
- independent-but-equal is not labelled deviation,
- standard ranges collapse correctly,
- real deviations stay individual,
- query count remains bounded as data volume rises.
  </action>
  <verify>
    <automated>cd backend && go test ./internal/repository -run 'UserContributionProjectionHighVolume|UserContributionProjectionQueryCount' -count=1 -v</automated>
  </verify>
  <done>QUAL-06 and pagination-drift coverage exist for contributions.</done>
</task>

</tasks>
<output>Create `139-01-SUMMARY.md`.</output>
