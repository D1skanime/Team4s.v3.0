# WORKING_NOTES

## Current Workflow Phase
- Phase: Phase 5 - Reference and Metadata Groundwork
- Focus: Production-ready backfill optimization, API evaluation for relation backfill

## Project State
- Done:
  - Corrected Package 2 back to canonical Phase A metadata scope
  - Reduced `0019` to `genres`
  - Reduced `0022` to `anime_genres`
  - Added `anime_metadata` repository support
  - Added `AnimeMetadataBackfillService`
  - Added CLI command `go run ./cmd/migrate backfill-phase-a-metadata`
  - Verified `go test ./...` in `backend`
  - Executed Phase A migrations locally (7 tables created)
  - Backfilled 19,578 anime with normalized metadata (99.5% complete)
  - Created 501 genres and 60,932 genre associations
  - Completed relation source investigation (no legacy data found)
  - Passed 2 Critical Reviews with conditional approvals
- In Progress:
  - Fixing HIGH-1 timeout issue (5 -> 10 minutes + batch processing)
  - API evaluation for relation backfill (AniSearch vs. alternatives)
- Blocked:
  - Production deployment blocked until HIGH-1 resolved
  - Relation backfill blocked until API evaluation complete

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
- HIGH-1 timeout fix is the critical path for production deployment
- API evaluation must compare at least 3 alternatives (AniSearch, AniDB, MAL, AniList)
- Backfill is 99.5% complete (timeout on ~100 anime IDs 13340-13404)
- Normalized metadata is ready for adapter layer work after 100% completion verified

## Parking Lot
- Create `scripts/verify-phase-a-backfill.sql` with row count checks
- Add exit code on backfill errors (MEDIUM-2)
- Revisit title-type richness later when AniSearch/AniDB enrichment returns
- Plan read-path switch from legacy to normalized titles
- Design adapter layer for dual-read during transition

### Day 2026-03-14
- Phase: Phase A migrations and metadata backfill execution
- Accomplishments:
  - Executed Phase A migrations (0019-0022) - 7 tables created
  - Backfilled 19,578 anime with normalized metadata (99.5% complete)
  - Created 501 genres and 60,932 genre associations
  - Completed relation source investigation (no legacy data)
  - Passed 2 Critical Reviews (conditional approvals)
- Key Decisions:
  - `title` -> `ja/main`, `title_de` -> `de/main`, `title_en` -> `en/official`
  - Defer relation backfill until external API selected
  - Approve local dev, block production until HIGH-1 resolved
- Risks/Unknowns:
  - HIGH-1: Backfill timeout affects ~100 anime (0.5%)
  - API evaluation pending for relation backfill
  - Best API choice unclear (AniSearch vs. AniDB vs. MAL vs. AniList)
- Next Steps:
  - Fix HIGH-1 timeout (5 -> 10 minutes + batch processing)
  - Re-run backfill and verify 100% completion
  - Complete API evaluation with 3+ alternatives
- First task tomorrow: Increase backfill timeout to 10 minutes in `backend/cmd/migrate/main.go:121`
