# WORKING_NOTES

## Current Workflow Phase
- Phase: Phase 5 - Reference and Metadata Groundwork
- Focus: Canonical Phase A correction, metadata backfill implementation, local DB verification prep

## Project State
- Done:
  - Corrected Package 2 back to canonical Phase A metadata scope
  - Reduced `0019` to `genres`
  - Reduced `0022` to `anime_genres`
  - Added `anime_metadata` repository support
  - Added `AnimeMetadataBackfillService`
  - Added CLI command `go run ./cmd/migrate backfill-phase-a-metadata`
  - Verified `go test ./...` in `backend`
- In Progress:
  - Local migration execution
  - Local metadata backfill execution
  - DB inspection of normalized rows
- Blocked:
  - Old source for anime-to-anime relations is not available

## Key Decisions and Context
- Intent & Constraints:
  - Keep Phase 5 aligned to `docs/architecture/db-schema-v2.md`
  - Keep API behavior stable while normalized tables are introduced
  - Do not invent relation backfills without a real source
- Design / Approach:
  - `anime.title` -> `ja/main`
  - `anime.title_de` -> `de/main`
  - `anime.title_en` -> `en/official`
  - `anime.genre` -> comma-split into `genres` and `anime_genres`
  - `anime_relations` remains schema-only for now
- Assumptions:
  - Legacy `anime.title` is the crawled Japanese AniSearch title
  - German titles are important for real user search behavior
- Quality Bar:
  - Backend tests green
  - Migrations create only the canonical Phase A tables
  - Backfill is directly runnable and inspectable locally

## Active Threads
- Package 2 is now anime metadata only, not studio/person/contributor work
- The next proof point is local migration/backfill evidence, not more planning
- GUI DB access may need DBeaver/psql because the installed Navicat version does not support SCRAM auth

## Parking Lot
- Recover the old relation source schema
- Add SQL snippets for verifying migrated titles/genres
- Revisit title-type richness later when AniSearch/AniDB enrichment returns

### Day 2026-03-14
- Phase: Canonical Phase A metadata correction and implementation
- Accomplishments:
  - Corrected Package 2 scope drift
  - Implemented metadata backfill code path
  - Fixed legacy title mapping rules
  - Verified backend tests
- Key Decisions:
  - `title` -> `ja/main`
  - `title_de` -> `de/main`
  - `title_en` -> `en/official`
  - `anime_relations` stays schema-only for now
- Risks/Unknowns:
  - relation source missing
  - genre token quality unknown
  - local DB verification still pending
- Next Steps:
  - run migrations
  - run backfill
  - inspect 10 sample anime rows
- First task tomorrow: run `go run ./cmd/migrate up` in `backend` and inspect the new Phase A tables
