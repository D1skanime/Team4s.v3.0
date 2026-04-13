# Phase 15: Asset-Specific Online Search And Selection For Create-Page Anime Assets - Research

**Date:** 2026-04-13
**Status:** Initial research captured for planning

## Research Question

What source strategy and product shape support slot-specific asset search for anime create, especially for OVA/OAD/bonus/web/special entries that do not map cleanly to TVDB/Jellyfin season groupings?

## Findings

### 1. One source will not cover every asset type well

- `TMDB` is a strong structured source for posters/covers and backdrops/backgrounds.
- `fanart.tv` is the strongest structured candidate found so far for clear logos and often banners.
- Anime-specific image pools such as `Zerochan` can help with cover/background fallback when niche entries have poor structured coverage elsewhere.
- Logo and banner are materially harder than cover and background, especially for niche OVA/bonus entries.

### 2. Media-server taxonomies are too coarse for AniSearch-specific side entries

Classic media-server sources often collapse side material into broad series/season/special buckets. That conflicts with the product goal of preserving AniSearch-specific entries such as `OVA`, `OAD`, `Bonus`, `Web`, and `Special` as their own asset-bearing entities.

Implication: AniSearch identity should drive the search target. External sources provide images, but they should not redefine the local entry structure.

### 3. Source attribution matters in the chooser

If results from several websites are mixed into one list, operators still need to see the source on each result. Without that, the chooser becomes a blind image wall and later provenance becomes unclear.

### 4. Busy state is a product requirement, not polish

External asset search can take longer than local draft updates. The create page needs an explicit busy/loading state so operators know the search is running and do not spam-click the same action.

## Recommended Initial Source Matrix

| Asset Type | Primary | Fallback | Notes |
|------------|---------|----------|-------|
| Cover | TMDB | Zerochan | Cover/poster is the easiest automated case |
| Background | TMDB | fanart.tv, Zerochan | Backdrops are structured on TMDB; anime-specific pools help on edge cases |
| Logo | fanart.tv | TMDB | Expect gaps for niche OVA/bonus entries |
| Banner | fanart.tv | TMDB or later provider | Banner quality/availability is weaker than cover/background |

## Product Recommendation

Ship the first version with:
1. slot-specific `Online suchen` actions
2. a source-aware chooser dialog
3. single-select adoption for cover/banner/logo
4. multi-select adoption for backgrounds
5. a curated small provider set instead of premature support for every site discussed

## Request Discipline

- Query only a small curated provider set per asset type instead of fanning out to every possible website.
- Cap result counts per request so the chooser receives a manageable candidate list instead of an unbounded image wall.
- Treat `Zerochan` as fallback for `cover/background`, not as a first-line logo/banner provider.
- Keep provider orchestration explicit and bounded so the frontend busy state reflects real work rather than silent open-ended crawling.

## Risks

- Imageboard-style sources may have weaker structured metadata and weaker long-term automation safety than formal media APIs.
- Logo and banner for niche entries may have no acceptable automated result.
- Poor source normalization can make mixed-source results feel random unless the chooser exposes source and other comparison metadata clearly.
