---
phase: 23-op-ed-theme-verwaltung
plan: "02"
subsystem: admin/anime-themes
tags: [backend, frontend, themes, segments, admin]
dependency_graph:
  requires: [23-01]
  provides: [AnimeThemesSection, useAdminAnimeThemes, segment-endpoints]
  affects: [admin-anime-edit-page]
tech_stack:
  added: []
  patterns: [collapsible-section-card, parallel-load-hook, inline-edit-pattern]
key_files:
  created:
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.module.css
  modified:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx
decisions:
  - Episode picker uses getAnimeByID (flat EpisodeListItem[] with id+episode_number) rather than grouped-episodes endpoint — avoids extra API call
  - Segments loaded lazily per theme row (on expand) to avoid N+1 on page load
  - AnimeThemesSection includes disabled episodes in picker via include_disabled:true so admins see full episode list
metrics:
  duration: ~25min
  completed: 2026-04-25
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 23 Plan 02: Segment Backend, Frontend Hook, Section Component, and Edit Page Wiring Summary

Segment CRUD backend (3 endpoints), useAdminAnimeThemes hook with full CRUD + segment state, AnimeThemesSection card component, and mounting on admin anime edit page — full OP/ED theme management is now live end-to-end.

## What Was Built

### Task 1: Segment Backend

`admin_content_anime_theme_segments.go` implements three handler methods on `*AdminContentHandler`:

- `ListAnimeThemeSegments` — GET `.../themes/:themeId/segments` → 200 `{"data":[...]}`
- `CreateAnimeThemeSegment` — POST → 201 `{"data":...}`; maps ErrConflict → 409 `invalid_episode`
- `DeleteAnimeThemeSegment` — DELETE → 204

All routes were already registered in `admin_routes.go`. Repo methods were already implemented in Plan 01's forward-looking work.

### Task 2: Frontend

- **`useAdminAnimeThemes.ts`**: Hook loading themes + types in parallel via `Promise.all`. Full CRUD state for themes (create/edit/delete) and segments (lazy load per row, create, delete).
- **`AnimeThemesSection.tsx`**: Collapsible `<details>/<summary>` card — create form, theme list with inline edit, per-theme segment sub-section. Internal `AnimeThemeRow` component. Episode picker submits `episode.id`, displays `episode_number`.
- **`AnimeThemesSection.module.css`**: Grid layout, collapsible rows, segment cards, responsive breakpoints.
- **`AdminAnimeEditPageClient.tsx`**: Imports and mounts `AnimeThemesSection` after JellyfinSyncPanel section.

Types (`admin.ts`) and API helpers (`api.ts`) were already present from earlier preparation work in Plan 03.

## Deviations from Plan

None — plan executed as written.

## Known Stubs

None — all data wired to live endpoints.

## Self-Check: PASSED

- `backend/internal/handlers/admin_content_anime_theme_segments.go` — FOUND
- `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts` — FOUND
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx` — FOUND
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.module.css` — FOUND
- `AnimeThemesSection` mounted in `AdminAnimeEditPageClient.tsx` — FOUND (line 156)
- Commit `9475273` feat(23-02): add segment CRUD handler file — FOUND
- Commit `4116549` feat(23-02): add AnimeThemesSection and wire into edit page — FOUND
- `go build ./...` exits 0
- `npm run build` exits 0, no TypeScript errors
