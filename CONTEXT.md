# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Phase 5 - Reference and Metadata Groundwork
- **Current Package:** Package 2 corrected back to canonical Phase A metadata execution
- **Completion:** ~74%

## Current State

### What Was Done Today (2026-03-14)
- Corrected Package 2 scope drift against `docs/architecture/db-schema-v2.md`
- Reduced Phase A migrations to the canonical anime metadata entities:
  - `0019` -> `genres`
  - `0020` -> `title_types`, `languages`, `relation_types`
  - `0021` -> `anime_titles`, `anime_relations`
  - `0022` -> `anime_genres`
- Added anime metadata backfill support in backend code
- Added CLI entrypoint: `go run ./cmd/migrate backfill-phase-a-metadata`
- Verified backend with `go test ./...`

### What Still Works
- Existing frontend/backend stack still runs on the legacy flat anime columns
- Public anime/group assets flow remains intact
- Backend tests pass after the Phase 5 corrections

### What Is Pending
- Run corrected migrations locally
- Run metadata backfill locally
- Inspect normalized rows in the local DB
- Recover the old schema source for anime-to-anime relations before relation backfill

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
- `anime_relations` is schema-only for now
- No relation backfill until the old relation source is available again

## Quality Bar
- `go test ./...` must pass
- Migrations must create only the canonical Phase A tables
- Backfill must be runnable locally and inspectable in the DB
- Existing app behavior must stay intact while normalized tables are introduced
