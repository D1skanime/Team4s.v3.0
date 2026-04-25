---
phase: 23-op-ed-theme-verwaltung
plan: "01"
subsystem: backend
tags: [migration, go, crud, themes, admin]
dependency_graph:
  requires: []
  provides:
    - migration-0048-theme-types-seed
    - backend-theme-crud-endpoints
    - admin-theme-repository
    - admin-theme-handler
  affects:
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
tech_stack:
  added: []
  patterns:
    - adminThemeRepository interface on AdminContentHandler (same as relationRepo pattern)
    - partial PATCH via fmt.Sprintf SET clause building
    - pgconn.PgError Code "23503" mapped to ErrConflict for FK violations
key_files:
  created:
    - database/migrations/0048_seed_theme_types.up.sql
    - database/migrations/0048_seed_theme_types.down.sql
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_themes.go
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
decisions:
  - "themeRepo interface declared with segment method stubs (Plan 02) to prevent split contract"
  - "Segment repository methods implemented in Plan 01 repository file so Plan 02 only needs handler code"
  - "Rely on FK violation (pgErr code 23503) rather than pre-SELECT for theme_type_id validation"
metrics:
  duration_minutes: 25
  completed_at: "2026-04-25T21:03:00Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 23 Plan 01: theme_types Seed und Theme CRUD Backend Summary

**One-liner:** Migration 0048 replaces 3 generic theme_types seeds with 6 operational labels (OP1/OP2/ED1/ED2/Insert/Outro), and 5 admin theme CRUD endpoints are wired via new repository, handler, and routes files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 0048 — replace theme_types seed | 3ae4fef | database/migrations/0048_seed_theme_types.{up,down}.sql |
| 2 | Backend models, repository, handler, routes | e6a5122 | 5 new files, 2 modified |

## What Was Built

### Migration 0048

Deletes the 3 legacy seed rows (`opening`, `ending`, `insert_song`) from `theme_types` and inserts the 6 operational labels required by Phase 23: `OP1`, `OP2`, `ED1`, `ED2`, `Insert`, `Outro`. Migration was applied successfully (`migrations applied: 2`).

### Models (`backend/internal/models/admin_anime_themes.go`)

Exports: `AdminThemeType`, `AdminAnimeTheme`, `AdminAnimeThemeCreateInput`, `AdminAnimeThemePatchInput`, `AdminAnimeThemeSegment`, `AdminAnimeThemeSegmentCreateInput`.

Segment types are declared here in Plan 01 so Plan 02 can use them without modifying the models file.

### Repository (`backend/internal/repository/admin_content_anime_themes.go`)

5 core theme methods on `*AdminContentRepository`:
- `ListThemeTypes` — SELECT id, name FROM theme_types ORDER BY id
- `ListAdminAnimeThemes` — JOIN theme_types for name, anime existence guard
- `CreateAdminAnimeTheme` — INSERT RETURNING, FK violation maps to ErrConflict
- `UpdateAdminAnimeTheme` — partial PATCH via dynamic SET clause, RowsAffected check
- `DeleteAdminAnimeTheme` — DELETE by ID, RowsAffected check

Plus 3 segment stub implementations (`ListAdminAnimeThemeSegments`, `CreateAdminAnimeThemeSegment`, `DeleteAdminAnimeThemeSegment`) that Plan 02 will wire into handlers.

### Handler (`backend/internal/handlers/admin_content_anime_themes.go`)

5 handler methods: `ListThemeTypes`, `ListAnimeThemes`, `CreateAnimeTheme`, `UpdateAnimeTheme`, `DeleteAnimeTheme`. All follow the exact pattern from `admin_content_anime_relations.go`: `requireAdmin` guard, nil-repo guard, parse params, call repo, map ErrNotFound/ErrConflict.

### Handler struct extension (`backend/internal/handlers/admin_content_handler.go`)

`adminThemeRepository` interface declared (8 methods including 3 segment stubs for Plan 02). `themeRepo adminThemeRepository` field added to `AdminContentHandler`. Wired to `repo` in `NewAdminContentHandler`.

### Routes (`backend/cmd/server/admin_routes.go`)

5 routes appended:
```
GET  /admin/theme-types
GET  /admin/anime/:id/themes
POST /admin/anime/:id/themes
PATCH /admin/anime/:id/themes/:themeId
DELETE /admin/anime/:id/themes/:themeId
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

The `adminThemeRepository` interface includes 3 segment methods (`ListAdminAnimeThemeSegments`, `CreateAdminAnimeThemeSegment`, `DeleteAdminAnimeThemeSegment`). These are fully implemented at repository level but have no HTTP handlers yet. Plan 02 will add the segment handler file and routes. This is intentional per the plan's design.

## Self-Check: PASSED

- `database/migrations/0048_seed_theme_types.up.sql` — FOUND
- `database/migrations/0048_seed_theme_types.down.sql` — FOUND
- `backend/internal/models/admin_anime_themes.go` — FOUND
- `backend/internal/repository/admin_content_anime_themes.go` — FOUND
- `backend/internal/handlers/admin_content_anime_themes.go` — FOUND
- Commits 3ae4fef and e6a5122 — FOUND in git log
- `go build ./...` — PASSED (exit 0)
- Migration applied — PASSED (2026-04-25 21:02:35, "migrations applied: 2")
- All production files under 450 lines — PASSED (max 313 lines)
