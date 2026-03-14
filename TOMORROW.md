# TOMORROW

## Top 3 Priorities
1. **Run Corrected Phase A Migrations** - Execute `0019-0022` locally and inspect the created metadata tables
2. **Run Anime Metadata Backfill** - Populate `anime_titles`, `genres`, and `anime_genres` from the legacy anime columns
3. **Inspect Relation Source** - Find the old schema/table source for anime-to-anime relations before any relation backfill

## First 15-Minute Task
Run `go run ./cmd/migrate up` in `backend`, then verify in the DB that `genres`, `title_types`, `languages`, `relation_types`, `anime_titles`, `anime_genres`, and `anime_relations` exist.

## Phase 5 Execution Checklist
- [x] Phase 5 planning complete
- [x] Contract impact analysis complete
- [x] Contract freeze set
- [x] Package 2 scope corrected to canonical Phase A
- [x] Backend migrations corrected to canonical Phase A scope
- [x] Anime metadata backfill repository/service code added
- [x] Focused migration/service tests added
- [ ] Migrations executed in local environment
- [ ] Backfill executed and verified
- [ ] Verification gates executed
- [ ] Package 1 ready for execution

## Dependencies
- Local DB must be reachable on `localhost:5433`
- Legacy anime columns remain the current backfill source:
  - `title`
  - `title_de`
  - `title_en`
  - `genre`
- Relation backfill depends on recovering the old relation source

## Nice To Have
- Capture reusable SQL snippets for checking 10 legacy anime rows against normalized title/genre rows
- Verify a DB GUI path that supports SCRAM auth cleanly
