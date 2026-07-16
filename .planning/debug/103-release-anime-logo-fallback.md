---
status: root_cause_found
phase: 103
uat_test: 10
created: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 10 — Anime logo fallback diagnosis

## Reported behavior

When a release has no selected public preview, the release hero shows the Anime poster. It should instead display the Anime logo as a presentation-only fallback; if no logo exists, the hero should remain text-only. Anime media must never be attached to the release version.

## Root cause

The release page explicitly loads and passes the Anime **cover/poster** as its only fallback, while it never reads the existing Anime logo projection.

The data path is currently:

```text
getAnimeByID(animeID)
  -> AnimeDetail.cover_image
  -> page.tsx animePoster
  -> ReleaseDetailHero fallbackPosterUrl
  -> preview_image ?? fallbackPosterUrl
```

Consequently, every release without a public preview selects `cover_image`. There is no branch that asks for `logo_url`, and there is no distinction in the hero between a release-owned preview and an Anime-owned presentation fallback beyond the prop name.

The repository already has a correct Anime-owned logo seam: `GET /api/v1/anime/{id}/backdrops` returns `AnimeBackdropManifest.logo_url`, mirrored by `getAnimeBackdrops()` and `AnimeBackdropResponse`. The release page does not call it. `getAnimeByID()` cannot supply the logo because the current public `AnimeDetail` DTO exposes `cover_image` and `banner_url`, but not `logo_url`.

## Evidence

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx:45` declares only `animePoster`.
- `page.tsx:48-52` calls `getAnimeByID()` and assigns `animeResponse.data.cover_image` to that fallback.
- `page.tsx:88-91` passes it as `fallbackPosterUrl` to `ReleaseDetailHero`.
- `ReleaseDetailHero.tsx:11` models the only fallback prop as `fallbackPosterUrl`.
- `ReleaseDetailHero.tsx:27-28` computes `preview thumbnail -> preview original -> fallback poster`, guaranteeing poster display whenever the release preview is absent and the Anime has a cover.
- `frontend/src/types/anime.ts` shows `AnimeDetail` has `cover_image`/`banner_url` but no Anime `logo_url`.
- The same file defines `AnimeBackdropManifest.logo_url`, and `frontend/src/lib/api.ts:1462-1487` exposes `getAnimeBackdrops(animeID)` for the existing `/api/v1/anime/{id}/backdrops` contract.
- `frontend/src/app/anime/[id]/page.tsx` already consumes `getAnimeBackdrops`, demonstrating that the manifest is an established Anime-media read seam rather than a new release-media path.
- `ReleaseDetailHero.test.tsx` covers selected preview and a null fallback, but has no case asserting Anime-logo fallback or rejecting poster fallback. Its base prop also encodes the old name `fallbackPosterUrl`.

## Ownership assessment

No database ownership defect was found. The public release aggregate correctly keeps release imagery on `release_version_media`, and the Anime logo remains owned by Anime media. The defect is entirely in presentation composition: the page chooses the wrong external fallback field.

The correction must not insert/update `release_version_media`, `media_assets`, or any release relation. It should resolve an Anime logo URL for rendering only.

## Suggested fix direction

1. Reuse the existing Anime backdrop/asset manifest and read `logo_url` while composing the release page, preferably through the existing `getAnimeBackdrops(animeID)` helper.
2. Rename the hero prop to an ownership-neutral but explicit presentation name such as `animeLogoFallbackUrl`; do not pass `cover_image` as a substitute.
3. Preserve fallback order as: selected public release preview -> Anime logo presentation fallback -> no image/text-only hero.
4. Resolve the logo URL through the established public API URL resolver where required, without copying or persisting it onto the release.
5. Keep Anime-logo lookup failure non-fatal so release detail still renders text-only.
6. Add focused tests for selected preview winning over logo, logo used only when preview is absent, and no preview/no logo producing no `<img>`. Add a guard that a poster value is not implicitly treated as the logo.

## Files involved

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx`
- `frontend/src/lib/api.ts` (`getAnimeBackdrops`, reuse only)
- `frontend/src/types/anime.ts` (`AnimeBackdropManifest.logo_url`)
- existing backend/OpenAPI `/api/v1/anime/{id}/backdrops` projection

No production files were modified during diagnosis.
