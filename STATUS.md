# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin anime flows and Jellyfin sync flows
- Public group-assets route and group detail page
- Local stack:
  - Frontend: `http://localhost:3002`
  - Backend: `http://localhost:8092`
  - Postgres: `localhost:5433`
- Phase 5 backend code compiles and passes `go test ./...`

## Phase 5 State
- Package 2 was corrected back to canonical Phase A metadata scope
- Corrected migrations now target:
  - `genres`
  - `title_types`
  - `languages`
  - `relation_types`
  - `anime_titles`
  - `anime_genres`
  - `anime_relations`
- Added:
  - `backend/internal/repository/anime_metadata.go`
  - `backend/internal/services/anime_metadata_backfill.go`
  - `go run ./cmd/migrate backfill-phase-a-metadata`

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d --build
curl http://localhost:8092/health
cd backend && go test ./...
cd backend && go run ./cmd/migrate up
cd backend && go run ./cmd/migrate backfill-phase-a-metadata
```

## Next (Top 3)
1. Execute corrected Phase A migrations locally and inspect the created tables
2. Run the metadata backfill and verify normalized title/genre rows
3. Recover the old anime-relation source before any relation backfill

## Known Risks
- Old anime-relation source is still missing
- Legacy `genre` values may normalize noisily
- Local migration/backfill execution evidence is still pending
