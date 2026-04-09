---
phase: 10-create-tags-and-metadata-card-refactor
plan: "01"
subsystem: planning-contracts
tags: [tags, contracts, openapi, requirements, traceability]
dependency_graph:
  requires: []
  provides:
    - TAG-01 through TAG-05 requirement definitions in REQUIREMENTS.md
    - Phase 10 requirement IDs in ROADMAP.md
    - GET /api/v1/admin/tags endpoint documented in openapi.yaml
    - TagToken and AdminTagTokensResponse types in frontend/src/types/admin.ts
    - AdminTagToken model in backend/internal/models/admin_content.go
    - ListTagTokens handler stub in backend/internal/handlers/admin_content_tags.go
    - ListTagTokens repository method in backend/internal/repository/admin_content.go
    - getAdminTagTokens helper in frontend/src/lib/api.ts
    - getAdminTagTokens helper in frontend/src/lib/api/admin-anime-intake.ts
  affects:
    - Phase 10 plans 02 and 03 (implementation uses this contract as stable base)
tech_stack:
  added: []
  patterns:
    - Tag token endpoint mirrors genre token endpoint shape for parallel frontend state management
    - Repository ListTagTokens mirrors ListGenreTokens for structural consistency
key_files:
  created:
    - backend/internal/handlers/admin_content_tags.go
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - shared/contracts/openapi.yaml
    - backend/internal/models/admin_content.go
    - backend/internal/repository/admin_content.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/admin-anime-intake.ts
decisions:
  - Tag token endpoint path is /api/v1/admin/tags (mirrors /api/v1/admin/genres pattern)
  - AdminTagToken model lives in admin_content.go alongside other admin DTOs rather than anime.go where GenreToken lives
  - getAdminTagTokens is present in both api.ts and admin-anime-intake.ts so create-page components can import from either location depending on co-location preference
  - tags field added to AdminAnimePatchRequest frontend type to align with existing backend OptionalStringSlice patch model
metrics:
  duration_minutes: 15
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 9
  files_created: 1
---

# Phase 10 Plan 01: Requirement Mapping And Shared Tag Contract Summary

**One-liner:** Requirement IDs TAG-01 through TAG-05 formalized in planning artifacts and a dedicated tag-token endpoint documented and typed across OpenAPI, Go backend, and TypeScript frontend.

## What Was Done

### Task 1: Formalize Phase 10 requirement IDs and roadmap traceability

Added a `### Create Tags And Metadata Refactor` section to `.planning/REQUIREMENTS.md` with five explicit requirement IDs:

- **TAG-01**: Normalized tags and anime_tags persistence analogous to genres
- **TAG-02**: Dedicated visible tags card on the create page with manual entry and suggestion filling
- **TAG-03**: Provider tag hydration into shared create-page token state
- **TAG-04**: Create-page refactor keeping all page files under 700 lines
- **TAG-05**: Purpose comments on new or substantially touched sections and helpers

Five traceability rows (TAG-01 through TAG-05 mapped to Phase 10) were added to the traceability table. Coverage count updated from 18 to 23.

Updated `.planning/ROADMAP.md` Phase 10 `Requirements` line from the placeholder text to `TAG-01, TAG-02, TAG-03, TAG-04, TAG-05`.

### Task 2: Define the shared API and type contract for tags and tag tokens

**OpenAPI (`shared/contracts/openapi.yaml`):**
- Added `GET /api/v1/admin/tags` path entry with query/limit parameters and full response documentation
- Added `TagToken` and `TagTokenListResponse` component schemas mirroring `GenreToken` and `GenreTokenListResponse`
- Added `tags` field to `AdminAnimeCreateRequest` schema (array of strings)
- Added `tags` field to `AdminAnimePatchRequest` schema (nullable array of strings)

**Backend models (`backend/internal/models/admin_content.go`):**
- Added `AdminTagToken` struct with `Name` and `Count` fields, mirroring `GenreToken` in anime.go

**Backend repository (`backend/internal/repository/admin_content.go`):**
- Added `buildAuthoritativeTagTokensQuery()` — SQL joining `anime_tags` and `tags` tables
- Added `filterTagTokens()` — substring filter, sort, and limit reusing the same ranking logic as genre tokens
- Added `ListTagTokens()` method mirroring `ListGenreTokens`

**Backend handler (`backend/internal/handlers/admin_content_tags.go`):**
- Created new file with `ListTagTokens` handler implementing `GET /api/v1/admin/tags`
- Accepts `query`/`q` and `limit` parameters, requires admin role

**Backend routes (`backend/cmd/server/admin_routes.go`):**
- Registered `GET /admin/tags` route pointing to `ListTagTokens` handler

**Frontend types (`frontend/src/types/admin.ts`):**
- Added `TagToken` interface mirroring `GenreToken`
- Added `AdminTagTokensResponse` interface
- Added `tags?: string[] | null` to `AdminAnimePatchRequest`

**Frontend API helpers:**
- `frontend/src/lib/api.ts`: imported `AdminTagTokensResponse`, added `getAdminTagTokens()` helper calling `/api/v1/admin/tags`
- `frontend/src/lib/api/admin-anime-intake.ts`: imported `AdminTagTokensResponse`, added `getAdminTagTokens()` helper with the same auth-header pattern as other intake helpers

## Decisions Made

1. **Tag token endpoint path**: `/api/v1/admin/tags` mirrors `/api/v1/admin/genres` so both endpoints are findable under the same admin prefix.

2. **AdminTagToken placement**: Lives in `admin_content.go` alongside other admin DTOs. `GenreToken` lives in `anime.go` because it is also consumed by public endpoints; `AdminTagToken` is admin-only so it belongs with the admin models.

3. **Dual helper location**: `getAdminTagTokens` is present in both `api.ts` and `admin-anime-intake.ts`. This matches the pattern for other intake helpers and allows create-page components to import from the intake-specific module while the broader admin surfaces import from `api.ts`.

4. **tags in patch model**: `AdminAnimePatchRequest` frontend type now carries `tags?: string[] | null` to align with the backend's existing `OptionalStringSlice` patch field, which was already present in `AdminAnimePatchInput`.

## Deviations from Plan

None — plan executed exactly as written. The repository `ListTagTokens` method was added as a Rule 2 prerequisite to make the handler compilable (handler calls `h.repo.ListTagTokens`), but this was within the stated scope of the task which explicitly required adding the repository shape.

## Known Stubs

- `backend/internal/handlers/admin_content_tags.go` calls `h.repo.ListTagTokens` which queries `anime_tags` and `tags` tables. Those tables do not exist yet — they will be created in Plan 02 (schema migration). The handler will fail at runtime until the migration runs but compiles correctly against the method signature added to the repository.

## Self-Check

- [x] `.planning/REQUIREMENTS.md` contains `### Create Tags And Metadata Refactor` with TAG-01 through TAG-05
- [x] `.planning/ROADMAP.md` Phase 10 Requirements line contains `TAG-01, TAG-02, TAG-03, TAG-04, TAG-05`
- [x] `shared/contracts/openapi.yaml` documents `GET /api/v1/admin/tags`
- [x] `frontend/src/types/admin.ts` exports `TagToken` and `AdminTagTokensResponse`
- [x] `backend/internal/models/admin_content.go` contains `AdminTagToken`
- [x] `backend/internal/repository/admin_content.go` contains `ListTagTokens`
- [x] `backend/cmd/server/admin_routes.go` registers `/admin/tags` route
- [x] `frontend/src/lib/api/admin-anime-intake.ts` exposes `getAdminTagTokens`
- [x] `frontend/src/lib/api.ts` exposes `getAdminTagTokens`

## Self-Check: PASSED
