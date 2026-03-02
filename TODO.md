# TODO

## Immediate (Next Session)
- [ ] Extract `SyncEpisodeFromJellyfin` from `jellyfin_sync.go` to `jellyfin_episode_sync.go`
  - Target: meet 150-line handler file limit
  - Preserve test coverage
  - Verify build after extraction
- [ ] Add explicit UI copy for sync workflows
  - Distinguish bulk season-wide sync from corrective single-episode sync
  - Add help text to both sync buttons in admin episodes UI
  - Consider tooltip or inline explanation

## Short Term (This Week)
- [ ] Replace remaining `img` tags with Next.js Image component
- [ ] Full code + architecture + UX review across the sync/admin surfaces
- [ ] Resume handler modularization sweep for files >150 lines
- [ ] Verify the regression suite in CI
- [ ] Add deterministic test for cropper output parity

## Medium Term (This Sprint)
- [ ] Complete P2 hardening closeout
- [ ] Add deterministic test for cropper output parity
- [ ] Consider pg_trgm index for anime search at scale
- [ ] Clean residual placeholder artifacts

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements

## On Hold / Parking Lot
- Legacy parity cosmetics (deprioritized in favor of maintainability)
- Advanced search features (waiting for scale requirements)
