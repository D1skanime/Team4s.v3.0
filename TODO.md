# TODO

## Immediate (Next Session)
- [ ] Validate one real Jellyfin preview flow end-to-end on a representative anime
  - Search the anime title in the admin Jellyfin search endpoint
  - Compare duplicate candidates by path before any write action
  - Confirm which candidate produces the correct preview payload
- [ ] Integrate the new `EpisodesOverview` component into `/admin/anime/{id}/episodes`
  - Use `includeVersions=true&includeFansubs=true`
  - Render version counts, expandable rows, and fansub badges inline
  - Keep deeper edit links intact
- [ ] Add focused frontend regression tests for the new Jellyfin sync states
  - Search error state
  - Preview empty/error state
  - Confirm dialog behavior during sync failures

## Short Term (This Week)
- [ ] Run and document one safe first real sync after preview verification
- [ ] Full code + architecture + UX review across the sync/admin surfaces
- [ ] Resume handler modularization sweep for files >150 lines
- [ ] Replace remaining `img` tags with `next/image`
- [ ] Verify the regression suite in CI

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
