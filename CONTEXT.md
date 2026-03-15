# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Phase 5 - Reference and Metadata Groundwork
- **Current Package:** Package 2 - Phase A metadata execution (optimization phase)
- **Completion:** ~85%

## Current State

### What Was Done Today (2026-03-15)
- **Morning:** Implemented anime relations feature (full stack)
  - Migration 0023: Imported 2,278 legacy relations from `verwandt` table
  - Created bidirectional relations (4,556 total records)
  - New endpoint: GET /api/v1/anime/:id/relations
  - New component: AnimeRelations.tsx with grid layout
  - Deployed to Docker (backend + frontend)
  - Critical Review: APPROVED (3 Low findings, none blocking)
  - Resolved relation data source mystery (found legacy `verwandt` table)
- **Afternoon:** Redesigned AnimeDetail page (full stack)
  - Complete visual redesign: glassmorphism, blurred background, 2-column grid
  - 592 lines of CSS rewritten (dark theme, responsive, accessibility)
  - Enhanced AnimeRelations component with variant prop (default | compact)
  - Enhanced WatchlistAddButton with custom styling props
  - Deployed to Docker (frontend)
  - Critical Review: CONDITIONAL APPROVAL (1 High, 1 Medium, 3 Low findings)
  - High finding: Genre chips ready but backend needs `genres: string[]` field

### What Was Done Previously (2026-03-14)
- Executed Phase A migrations (0019-0022) in local environment
  - Created 7 tables: `genres`, `title_types`, `languages`, `relation_types`, `anime_titles`, `anime_relations`, `anime_genres`
  - Seeded reference data: 6 title types, 9 languages, 8 relation types
- Executed anime metadata backfill on 19,578 anime (99.5% complete)
  - Created 19,578+ title entries (ja/main, de/main, en/official variants)
  - Created 501 genres from legacy CSV data
  - Created 60,932 anime-genre associations
- Passed 2 Critical Reviews with conditional approvals
  - Local dev: APPROVED
  - Production: BLOCKED until HIGH-1 timeout resolved

### What Still Works
- Existing frontend/backend stack still runs on the legacy flat anime columns
- Public anime/group assets flow remains intact
- Backend tests pass after Phase A implementation
- Shadow mode maintained: no API breaking changes

### What Is Pending
- Fix HIGH-1 timeout issue (5 -> 10 minutes + batch processing)
- Re-run backfill and verify 100% completion (currently 99.5%)
- Create verification script: `scripts/verify-phase-a-backfill.sql`
- Design adapter layer for read-path switch to normalized metadata
- Backend: Add `genres: string[]` field to AnimeDetail contract
- Frontend: Add CSS variable fallback for `--color-primary`
- Document anime relations feature in README and API contracts

## Key Decisions

### Canonical Phase A Scope
- Phase A is limited to:
  - `title_types`
  - `languages`
  - `relation_types`
  - `genres`
  - `anime_titles`
  - `anime_genres`
  - `anime_relations`
- `studios`, `persons`, contributor roles, `anime_studios`, `anime_persons`, and `release_roles` are out of scope for this phase

### Legacy Title Mapping
- `anime.title` -> `ja/main`
- `anime.title_de` -> `de/main`
- `anime.title_en` -> `en/official`

### Relation Backfill Posture (Updated 2026-03-15)
- `anime_relations` populated with 4,556 records (2,278 bidirectional pairs)
- Source: Legacy `verwandt` table (discovered 2026-03-15)
- Migration 0023: Backfilled and normalized to Phase A schema
- External API integration optional for enrichment (baseline data complete)

## Quality Bar
- `go test ./...` must pass
- Migrations must create only the canonical Phase A tables
- Backfill must be runnable locally and inspectable in the DB
- Existing app behavior must stay intact while normalized tables are introduced
