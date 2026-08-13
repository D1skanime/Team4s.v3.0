## Summary
- Added migration `0056_fansub_legacy_cleanup_boundary` to make the remaining fansub legacy fields explicit and to drop alias-side duplicate `group_id`.
- Added repository coverage for legacy-link projection behavior.
- Refreshed handoff docs so the canonical-vs-transitional fansub split is visible on restart.

## Verification
- `cd backend && go test ./internal/repository -count=1`
- `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- `cd frontend && npm.cmd run build`

## Notes
- `closed_year` and `history_description` remain transitional and were not hard-dropped in this phase.
