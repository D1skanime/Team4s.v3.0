# TODO

## Completed (2026-03-03)
- [x] Add explicit UI copy for sync workflows
  - Bulk season-wide sync vs corrective single-episode sync is now explicitly labeled in admin UI
  - Help text and clearer action labels added
- [x] Replace remaining `img` tags with Next.js Image component
  - Admin and public/frontend source files migrated to `next/image`
  - Frontend build validated after migration
- [x] Extract `SyncEpisodeFromJellyfin` from `jellyfin_sync.go` to `jellyfin_episode_sync.go`
  - Single-episode sync handler moved to dedicated file
  - Backend tests and local deploy validation passed
- [x] Add deterministic cropper parity test coverage
  - Extracted crop math utility (`mediaUploadCropMath.ts`)
  - Added focused Vitest suite (`mediaUploadCropMath.test.ts`)
- [x] Add and apply anime search `pg_trgm` migration (`0017_anime_search_trgm`)
  - Benchmarked query behavior at larger data scale
  - Migration applied in local dev DB
- [x] Remove unreferenced broken cover artifacts
  - Deleted 10 invalid binaries from `frontend/public/covers`
  - Verified no DB references before cleanup

## Immediate (Next Session)
- [x] Continue handler modularization in `jellyfin_sync.go` and `jellyfin_episode_sync.go`
  - Target: move closer to 150-line handler file limit
  - Preserve behavior and test coverage
  - `jellyfin_sync.go` reduced to 144 lines, `jellyfin_episode_sync.go` reduced to 114 lines
  - New helper files added for sync flow/import blocks
  - `go test ./...` passed after refactor
- [x] Run CI-equivalent regression pass after today's refactors/migration
  - `go test ./...`
  - `npm test`
  - `npm run build`

## Short Term (This Week)
- [x] Full code + architecture + UX review across the sync/admin surfaces
  - Review recorded in `docs/reviews/2026-03-03-sync-admin-hardening-review.md`
- [x] Stabilize Jellyfin timeout diagnostics and operator troubleshooting notes
  - Added transport-level diagnostics in `fetchJellyfinJSON`
  - Added operator runbook `docs/operations/jellyfin-timeout-diagnostics.md`
- [x] Resume handler modularization sweep for files >150 lines
  - Sync entrypoints now below target (`jellyfin_sync.go` 144, `jellyfin_episode_sync.go` 114)

## Medium Term (This Sprint)
- [x] Complete P2 hardening closeout
  - Modularization, diagnostics, review, CI-equivalent checks, and admin smoke suite all completed
- [x] Track anime search performance with growing dataset and tune index strategy if query plans drift
  - Added durable runbook + baseline in `docs/performance/anime-search-query-plan-tracking.md`
- [x] Prepare deployment hardening checklist (rollout, rollback, smoke tests)
  - Added rollout/rollback/smoke checklist in `docs/operations/deployment-hardening-checklist.md`

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements

## On Hold / Parking Lot
- Legacy parity cosmetics (deprioritized in favor of maintainability)
- Advanced search features (waiting for scale requirements)
