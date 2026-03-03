# TOMORROW

## Top 3 Priorities
1. **Test EPIC 0-6** - Manual smoke test of all new Group/Release/Playback features
2. **EPIC 7** - Kommentare & Member-Beiträge (Release-Notiz, Contributions, Rollen-Filter)
3. **EPIC 8** - Daten & API Contracts (remaining public endpoints)

## First 15-Minute Task
Start local dev environment and test Group Story page navigation flow:
- `/anime/1` → Click "Gruppenbereich" → `/anime/1/group/1` → "Releases ansehen"

## Test Checklist for EPIC 0-6
- [ ] Group Story page renders with collapsible story
- [ ] Group Releases page shows filter chips and episode cards
- [ ] GroupEdgeNavigation (Prev/Next) works across groups
- [ ] MediaAssetsSection shows OP/ED/Kara tiles
- [ ] VideoPlayerModal opens on Play click
- [ ] ScreenshotGallery with lightbox and infinite scroll

## Dependencies
- Database migration 0018 must be applied before testing screenshots
- Jellyfin instance needed for stream proxy testing
