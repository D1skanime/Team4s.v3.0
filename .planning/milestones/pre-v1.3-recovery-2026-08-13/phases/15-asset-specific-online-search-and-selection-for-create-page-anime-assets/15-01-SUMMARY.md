---
phase: 15-asset-specific-online-search-and-selection-for-create-page-anime-assets
plan: 01
subsystem: contracts
tags: [go, typescript, api, asset-search, admin]
provides:
  - "Typed admin asset-search DTOs for create-route asset discovery"
  - "Dedicated `/api/v1/admin/anime/assets/search` seam with slot and source validation"
  - "Frontend asset-search helper for slot-aware candidate loading"
affects: [admin-api, admin-create-flow, asset-search]
key-files:
  created:
    - backend/internal/handlers/admin_content_anime_asset_search.go
  modified:
    - backend/internal/models/admin_content.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_test.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/admin.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/lib/api.admin-anime.test.ts
requirements-completed: [phase-15-scaffold]
completed: 2026-04-13
---

# Phase 15 Plan 01 Summary

Built the slot-aware asset-search contract first, so later source adapters and UI work could reuse one explicit seam instead of inventing per-provider wiring.

## Accomplishments
- Added typed backend and frontend DTOs for asset-search candidates, requests, sources, and responses.
- Introduced `GET /api/v1/admin/anime/assets/search` with validation for slot, limit, and optional source filters.
- Covered the seam with handler and frontend API regression tests before provider-specific crawling logic was attached.

## Verification
- `cd backend && go test ./internal/handlers`
- `cd frontend && npm test -- src/lib/api.admin-anime.test.ts`
