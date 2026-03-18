# TODO

## Completed (2026-03-18)
- [x] Add `genres: string[]` to backend anime detail contract
- [x] Parse genre CSV into array in backend repository layer
- [x] Update OpenAPI contract with genres array schema
- [x] Add `genres?: string[]` to frontend interface
- [x] Remove frontend type workaround for genres
- [x] Correct Related section placement (inside infoCard, not standalone)
- [x] Fix AnimeEdgeNavigation positioning (top-left/top-right on heroContainer)
- [x] Add overflow handling to prevent Related cards from overflowing
- [x] Implement scroll buttons for Related section horizontal navigation
- [x] Verify Go build, Next.js build, Docker deployment
- [x] Runtime verification: health checks and page smoke tests

## Completed (2026-03-15)
- [x] Implement glassmorphism design for `/anime/[id]`
- [x] Capture UX handoff (NOTE: Later found to be incorrect)
- [x] Re-run critical review and reach `approve`
- [x] Rebuild and redeploy `team4sv30-frontend`

## Next Up
- [ ] Archive or correct outdated UX handoff documents (incorrect Related placement description)
- [ ] Inventory repo-wide frontend lint failures for separate cleanup pass
- [ ] Consider accessibility audit for anime detail page

## Parking Lot
- [ ] Optional: Enhanced genre navigation/filtering features
- [ ] Optional: Related section data quality improvements
- [ ] Optional: Performance optimization for large related lists
