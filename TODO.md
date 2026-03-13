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

## Completed (2026-03-13 - Phase 5 Planning)
- [x] Complete Phase 5 planning artifacts (05-CONTEXT.md, 05-RESEARCH.md, 05-01-PLAN.md, 05-ORCHESTRATOR-HANDOFF.md)
- [x] Execute contract impact analysis for Phase 5
- [x] Set contract freeze and document rationale
- [x] Establish package execution order (Package 2 before Package 1)
- [x] Update `.planning/ROADMAP.md` and `.planning/STATE.md` with Phase 5 status

## Immediate (Next Session)
- [ ] Create Package 2 execution artifacts (05-02-CONTEXT.md, 05-02-PLAN.md, 05-02-orchestrator-handoff.md)
- [ ] Begin team4s-go lane implementation: migration files for reference/metadata tables
- [ ] Implement repository layer with shadow mode support
- [ ] Implement service layer with validation
- [ ] Refine verification gates: shadow mode criteria, metrics/duration thresholds, backfill strategy

## Short Term (This Week)
- [ ] Complete Package 2 backend implementation (tables, repositories, services)
- [ ] Execute verification gates for Package 2 (shadow mode validation, test coverage)
- [ ] Document reference data backfill progress
- [ ] Prepare Package 1 (TypeScript SDK) execution artifacts

## Medium Term (This Sprint)
- [ ] Complete Package 1 (TypeScript SDK) implementation
- [ ] Execute Package 1 verification gates
- [ ] Plan Phase 6 (Handler Consumption) with explicit scope and verification
- [ ] Validate GSD pilot value through Package 2 execution success

## Long Term (Future Sprints)
- [ ] Complete Phase 5 (Reference and Metadata Groundwork)
- [ ] Execute Phase 6 (Handler Consumption) with contract verification
- [ ] Migration verification and cleanup gates
- [ ] Production deployment of normalized schema
- [ ] Monitoring and observability for new reference/metadata tables
