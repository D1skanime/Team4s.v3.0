# TODO

## Completed (2026-03-07)
- [x] Prefer Jellyfin `Groups` over `Subgroups` for group-detail asset resolution
- [x] Expose `banner_url` and `thumb_url` in the group-assets hero payload
- [x] Treat episode-folder backdrops as gallery images in `episodes[].images[]`
- [x] Cache the resolved Jellyfin group-library ID to reduce repeated timeout failures
- [x] Iterate group page visual contrast for root backdrop/banner visibility

## Completed (2026-03-06)
- [x] Implement public group assets API `GET /api/v1/anime/:animeId/group/:groupId/assets`
- [x] Map Jellyfin root artwork to group-detail hero/background data
- [x] Map `Episode N` folders to episode-level gallery images and media assets
- [x] Render group-backed assets on `/anime/:animeId/group/:groupId`
- [x] Separate page background vs episode-gallery image semantics

## Immediate (Next Session)
- [ ] Align `shared/contracts/openapi.yaml` with the live group-assets payload including `thumb_url` and `banner_url`
- [ ] Add group library discovery pagination beyond the first 500 root folders
- [ ] Improve handler error mapping for missing/invalid `JELLYFIN_*` configuration
- [ ] Add or insert the first concrete migration execution phase after the completed brief
- [ ] Decide whether group-detail episode links should resolve outside the currently loaded release list

## Short Term (This Week)
- [ ] Add focused tests for group discovery pagination and config-failure states
- [ ] Document group folder naming assumptions and matching rules
- [ ] Re-run live validation against at least one additional anime/group folder pair

## Medium Term (This Sprint)
- [ ] Persist real release assets behind `GET /api/v1/releases/:releaseId/assets`
- [ ] Add real asset counters/filter semantics to the group releases feed
- [ ] Implement EPIC 7 public release notes and contributions flow
- [ ] Validate whether GSD can guide the first real migration execution slice cleanly

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements
