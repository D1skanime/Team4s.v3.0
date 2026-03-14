# DAYLOG

## 2026-03-14
- Detected that Package 2 had drifted away from the canonical Phase A metadata scope in `docs/architecture/db-schema-v2.md`.
- Corrected the migration lane back to anime metadata only.
- Reduced migration `0019` to `genres` and migration `0022` to `anime_genres`.
- Added backend support for Phase A metadata backfill:
  - `backend/internal/repository/anime_metadata.go`
  - `backend/internal/services/anime_metadata_backfill.go`
  - `go run ./cmd/migrate backfill-phase-a-metadata`
- Fixed legacy title mapping rules:
  - `anime.title` -> `ja/main`
  - `anime.title_de` -> `de/main`
  - `anime.title_en` -> `en/official`
- Added focused migration/service tests and re-ran `go test ./...` successfully in `backend`.
- Confirmed that the installed Navicat version cannot connect to local Postgres because it does not support SCRAM auth.

## 2026-03-13
- Installed GSD locally for Codex under workspace `.codex/` as a planning pilot rather than a repo-wide workflow replacement.
- Ran the brownfield mapping flow and generated `.planning/codebase/STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`.
- Reviewed the proposed normalized DB schema against the current production tables and confirmed it should be treated as a phased target architecture instead of a big-bang migration.
- Stored the schema draft canonically in `Team4s.v3.0/docs/architecture/db-schema-v2.md` so future restarts can resume from files, not chat history.
- Executed GSD Phase 3 and turned the schema draft into a phased migration brief with blocker audit, impact mapping, rollout slices, and validation gates.
- Executed GSD Phase 4 and created ownership/routing rules plus a migration-lane handoff so `.planning/` can guide the next migration action without replacing Team4s repo-local day-state docs.

## 2026-03-07
- Switched public group-detail asset resolution to prefer the Jellyfin `Groups` library, with `Subgroups` retained as fallback.
- Added root hero enrichment so `banner_url` and `thumb_url` are available alongside `backdrop_url`, `primary_url`, and `poster_url`.
- Promoted episode-folder `BackdropImageTags` into `episodes[].images[]`.
