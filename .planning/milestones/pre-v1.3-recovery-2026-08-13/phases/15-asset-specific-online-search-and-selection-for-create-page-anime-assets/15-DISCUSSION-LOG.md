# Phase 15 Discussion Log

**Date:** 2026-04-13
**Mode:** Conversational scope capture

## Key User Decisions

1. Jellyfin is fine for movies and simple one-season anime cases, but not for the asset structure of AniSearch-specific OVA/bonus/web/special entries.
2. Asset search should happen per slot on the create page, not through one global field.
3. The create page should continue to support upload, but also allow online search directly beside each asset slot.
4. Cover, banner, and logo should be single-select; backgrounds should support multiple chosen results.
5. Search results from several websites can be shown together, but the operator should still see which source each asset came from.
6. A visible loading indicator is important while search/crawl work is running.

## Working Source Direction

- `TMDB`: strong candidate for cover and background
- `fanart.tv`: strongest current candidate for logo and often banner
- `Zerochan`: promising fallback image pool for cover/background on niche anime entries
- Other anime-specific image pools may still be evaluated during implementation planning

## Open Questions Carried Into Planning

1. Which initial provider set is worth shipping first?
2. Which sources are automation-safe enough for the first backend adapter pass?
3. How much per-result metadata is needed for fast operator choice without clutter?
