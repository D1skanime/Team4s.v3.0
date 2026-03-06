# TOMORROW

## Top 3 Priorities
1. **EPIC 8 Assets Persistence** - Back the live `GET /api/v1/releases/:releaseId/assets` endpoint with real release-asset storage/data
2. **EPIC 3 Feed Data** - Add real asset counters/filter semantics to group releases
3. **EPIC 7** - Kommentare & Member-Beitraege (Release-Notiz, Contributions, Rollen-Filter)

## First 15-Minute Task
Decide the first persisted release-asset slice:
- storage shape/table for OP/ED/Kara/Insert
- mapping to `release_id`
- minimal admin write path or seed script for one real release

## Test Checklist for EPIC 0-6
- [ ] Group Story page renders with collapsible story
- [ ] Group Releases page shows filter chips and episode cards
- [x] GroupEdgeNavigation (Prev/Next) works across groups
- [x] MediaAssetsSection is backed by real release assets API
- [ ] VideoPlayerModal plays a real release asset
- [ ] ScreenshotGallery with lightbox and infinite scroll (requires seeded images)

## Dependencies
- Database migration 0018 must be applied before testing screenshots
- Release asset data source must exist before public media assets/player can show non-empty content
- Jellyfin instance needed for stream proxy testing
