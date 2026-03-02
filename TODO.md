# TODO

## Immediate (Next Session)
- [ ] Run the `team4s-design` agent for `/admin/anime/{id}/episodes/{episodeId}/edit`
  - Review information hierarchy
  - Review action clarity and danger states
  - Capture concrete UX adjustments before code changes
- [ ] Run the `team4s-design` agent for `/admin/anime/{id}/episodes/{episodeId}/versions`
  - Review version-management flow
  - Check edit/delete affordances
  - Check scan/sync affordances and operator clarity
- [ ] Rework the public anime detail to one active fansub group at a time
  - Render one active history/description block only
  - Add explicit switching between fansub groups
  - Preselect one group automatically when the page opens
- [ ] Filter the public episode version list to the active public fansub group only
  - Never render all groups' versions together
  - Only show versions that are public for the active group
  - Keep the history/description and visible versions in sync when the user switches groups

## Short Term (This Week)
- [ ] Add explicit UI copy that clarifies bulk Jellyfin sync vs. corrective single-episode sync
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
