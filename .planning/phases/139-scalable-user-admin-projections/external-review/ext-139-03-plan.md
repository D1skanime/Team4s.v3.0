---
phase: 139-scalable-user-admin-projections
plan: 03
type: execute
wave: 1
depends_on: []
requirements: [UADM-05, UADM-06, QUAL-06]
autonomous: true
files_modified:
  - backend/internal/models/admin_users.go
  - backend/internal/repository/admin_user_media_projection.go
  - backend/internal/repository/admin_user_media_projection_test.go
  - backend/internal/handlers/admin_users_handler.go
  - backend/internal/handlers/admin_users_handler_test.go
  - shared/contracts/admin-users.yaml
  - frontend/src/types/admin-users.ts
---

<objective>
Replace the flat user-media contract with a bounded release-context projection.

Output: Anime→Project→Release/Episode media blocks, server filters, stable page/count metadata and canonical workspace identity.
</objective>

<context>
@139-CONTEXT.md
@139-DISCUSS.md
@backend/internal/repository/admin_users_tab_repository.go
@backend/internal/repository/release_version_media_repository.go
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Define media context projection contract</name>
  <files>backend/internal/models/admin_users.go, shared/contracts/admin-users.yaml, frontend/src/types/admin-users.ts</files>
  <action>
Define a page item keyed by release context containing:
- anime id/title,
- fansub group/project id/name,
- release version id/semantic version label,
- episode id/number/title where available,
- ordered compact media summaries with asset id, media type/category, preview URL or existing thumbnail-capable URL, uploaded_at,
- canonical workspace href or enough typed ids for frontend helper,
- `meta { total, limit, offset }`.

Filters:
`anime_id`, `fansub_group_id`, `release_version_id` and/or episode query supported by existing domain lookup, `media_type`, `from`, `to`, `limit`, `offset`.

Do not expose `owner_context` as the new domain contract.
Do not add physical storage details.
  </action>
  <verify><automated>cd backend && go test ./internal/models ./internal/handlers -run AdminUserMedia -count=1</automated></verify>
  <done>Contract expresses the agreed fachliche media context without technical storage diagnostics.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement bounded media context projection</name>
  <files>backend/internal/repository/admin_user_media_projection.go, backend/internal/repository/admin_user_media_projection_test.go</files>
  <action>
Implement set-based projection:
1. apply all filters server-side,
2. derive distinct release-context keys for media uploaded by target user,
3. count those keys,
4. page keys deterministically,
5. batch-load media summaries for page keys,
6. join anime/project/group/release/episode labels,
7. provide existing thumbnail/preview representation suitable for list display,
8. exclude soft-deleted relations according to canonical media rules.

No query per release context or media asset.
  </action>
  <verify><automated>cd backend && go test ./internal/repository -run 'UserMediaProjection|MediaPagination' -count=1 -v</automated></verify>
  <done>Media endpoint can serve large histories without flat-list/N+1 behavior.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Wire filters, authorization and high-volume gates</name>
  <files>backend/internal/handlers/admin_users_handler.go, backend/internal/handlers/admin_users_handler_test.go, backend/internal/repository/admin_user_media_projection_test.go</files>
  <action>
Keep `GET /api/v1/admin/users/:userId/media`, parse bounded filters, preserve platform-admin authorization, and return projection/meta.

High-volume tests must prove:
- total equals filtered context count,
- context block never splits,
- no duplicates/missing contexts across pages,
- query count remains bounded as media volume rises.
  </action>
  <verify><automated>cd backend && go test ./internal/repository ./internal/handlers -run 'UserMediaProjection|UserMediaHighVolume' -count=1 -v</automated></verify>
  <done>UADM-05/UADM-06/QUAL-06 backend requirements are gated.</done>
</task>

</tasks>
<output>Create `139-03-SUMMARY.md`.</output>
