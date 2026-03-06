# TODO

## Completed (2026-03-06)
- [x] Implement public subgroup assets API `GET /api/v1/anime/:animeId/group/:groupId/assets`
- [x] Map Jellyfin `Subgroups` root artwork to group-detail hero/background data
- [x] Map `Episode N` folders to episode-level gallery images and media assets
- [x] Render subgroup-backed assets on `/anime/:animeId/group/:groupId`
- [x] Separate page background vs episode-gallery image semantics

## Immediate (Next Session)
- [ ] Align `shared/contracts/openapi.yaml` with the live subgroup assets payload
- [ ] Add subgroup library discovery pagination beyond the first 500 root folders
- [ ] Improve handler error mapping for missing/invalid `JELLYFIN_*` configuration
- [ ] Decide whether group-detail episode links should resolve outside the currently loaded release list

## Short Term (This Week)
- [ ] Add focused tests for subgroup discovery pagination and config-failure states
- [ ] Document subgroup folder naming assumptions and matching rules
- [ ] Re-run live validation against at least one additional anime/group folder pair

## Medium Term (This Sprint)
- [ ] Persist real release assets behind `GET /api/v1/releases/:releaseId/assets`
- [ ] Add real asset counters/filter semantics to the group releases feed
- [ ] Implement EPIC 7 public release notes and contributions flow

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements
