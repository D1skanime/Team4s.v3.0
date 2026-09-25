# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `backend/internal/repository/episode_import_repository_apply.go`
- `backend/internal/repository/episode_import_source_integration_test.go`
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql`

## Actions

1. Change the missing filler classification fallback in the canonical episode import path from `unknown` to `canon`.
2. Extend the repository fixture and integration assertion to protect the expected default.
3. Run focused backend tests, document the quick, commit and push.

## Acceptance criteria

- A normal imported episode without explicit filler metadata is saved as `canon` / „Haupthandlung“.
- Explicit `filler`, `mixed`, `recap`, or `unknown` classifications are not changed.
- Existing rows with non-manual missing classification are corrected on re-import.
