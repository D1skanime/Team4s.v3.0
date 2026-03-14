# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Phase 5 - Reference and Metadata Groundwork
- **Current Package:** Package 2 - Phase A metadata execution (optimization phase)
- **Completion:** ~78%

## Current State

### What Was Done Today (2026-03-14)
- Executed Phase A migrations (0019-0022) in local environment
  - Created 7 tables: `genres`, `title_types`, `languages`, `relation_types`, `anime_titles`, `anime_relations`, `anime_genres`
  - Seeded reference data: 6 title types, 9 languages, 8 relation types
- Executed anime metadata backfill on 19,578 anime (99.5% complete)
  - Created 19,578+ title entries (ja/main, de/main, en/official variants)
  - Created 501 genres from legacy CSV data
  - Created 60,932 anime-genre associations
- Completed relation source investigation
  - No legacy relation data found in schema or import files
  - Recommended external API integration (AniSearch, pending evaluation)
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
- Complete API evaluation for relation backfill (3+ alternatives)
- Create verification script: `scripts/verify-phase-a-backfill.sql`
- Design adapter layer for read-path switch to normalized metadata

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

### Relation Backfill Posture
- `anime_relations` is schema-only (table created, empty)
- No legacy relation source exists (confirmed via investigation)
- External API integration required (AniSearch recommended, evaluation pending)
- Conditions before implementation:
  - Document 3+ API alternatives (AniDB, MAL, AniList)
  - Verify selected API availability and constraints
  - Define fallback strategy for manual entry

## Quality Bar
- `go test ./...` must pass
- Migrations must create only the canonical Phase A tables
- Backfill must be runnable locally and inspectable in the DB
- Existing app behavior must stay intact while normalized tables are introduced
