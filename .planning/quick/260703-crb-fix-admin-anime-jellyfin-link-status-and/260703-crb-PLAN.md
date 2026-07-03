---
phase: quick
plan: 260703-crb
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx
  - frontend/src/app/admin/anime/[id]/episodes/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Anime edit shows Jellyfin-Link as Verknüpft whenever the same source-of-truth already proves a Jellyfin source or item ID exists."
    - "Admin anime episode stat counts the release-native grouped episodes rendered on the page."
  artifacts:
    - path: "frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx"
      provides: "Jellyfin link status derived from existing hasJellyfinSource/effectiveJellyfinSeriesID source-of-truth."
    - path: "frontend/src/app/admin/anime/[id]/episodes/page.tsx"
      provides: "Episode count derived from groupedEpisodes returned by getGroupedEpisodes."
  key_links:
    - from: "AnimeEditWorkspace.tsx"
      to: "readonly input#edit-link-status"
      via: "isLinkedToJellyfin / hasJellyfinSource derivation"
      pattern: "value=.*isLinkedToJellyfin.*Verknüpft"
    - from: "page.tsx"
      to: "summaryValue for Episoden"
      via: "episodeCount from groupedEpisodes.length"
      pattern: "groupedEpisodes.*length"
---

# Quick Plan: Fix Admin Anime Jellyfin Link Status And Episode Stat Source-Of-Truth

## Objective

Fix two admin anime display bugs by aligning readonly UI status/stat derivations with the existing source-of-truth data already loaded by each page.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx`

## Scope Guardrails

- Do not add or change API endpoints, DTOs, schemas, migrations, contracts, auth handling, upload flows, media ownership, or fansub/release ownership behavior.
- Do not redesign UI or replace controls; only correct the local derivations feeding existing readonly/status values.
- Keep German UI strings unchanged except where an existing touched string must preserve correct umlauts.

## Tasks

1. **Fix Jellyfin link status derivation**
   - File: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
   - Change `isLinkedToJellyfin` so the readonly `Jellyfin-Link` input uses the same truth as the already-computed Jellyfin source/item status.
   - Expected direction: derive from `hasJellyfinSource` or an equivalent expression that includes `effectiveJellyfinSeriesID`, `adoptedJellyfinPreview?.jellyfin_series_id`, `jellyfinContext?.linked`, and `hasProviderSource('jellyfin:', effectiveSource, anime.source_links)` as applicable.
   - Do not remove `hasJellyfinSource`; it is already used by `CreateReviewSection`.

2. **Fix episode count stat source-of-truth**
   - File: `frontend/src/app/admin/anime/[id]/episodes/page.tsx`
   - Change `episodeCount` to count `groupedEpisodes` from `getGroupedEpisodes`, because that is the release-native list rendered by `EpisodesOverview`.
   - Keep `anime` loading intact for title, navigation, create flow, and metadata. Do not remove `getAnimeByID`.

## Checks

- Targeted frontend tests if an applicable test file exists or is added for these derivations: `cd frontend && npm test -- --runInBand` or the nearest Vitest file command supported by the repo.
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `git diff --check`

If no focused test seam exists and adding one would require broad component mocking, document that in the summary and rely on typecheck/lint plus a manual admin UI check.

## Acceptance Criteria

- An anime with `source`, `source_links`, or item ID indicating Jellyfin no longer displays `Nicht verknüpft` in the Jellyfin-Link readonly input.
- The admin episodes summary count matches the number of `groupedEpisodes` displayed by `EpisodesOverview`, including release-native imported episodes when legacy `anime.episodes` is empty.
- No API, schema, contract, upload, media ownership, or route behavior changes are present in the diff.
- Checks above have been run or a concrete reason is documented for any skipped check.

## Risks

- If `groupedEpisodes` is still loading after anime metadata appears, the stat may transiently show `0`; keep existing loading behavior scoped and do not invent a second loading model unless necessary.
- If existing tests are absent, regression coverage may remain manual unless a small focused test can be added without broad mocking.

## Output

After implementation, create `.planning/quick/260703-crb-fix-admin-anime-jellyfin-link-status-and/260703-crb-SUMMARY.md`.
