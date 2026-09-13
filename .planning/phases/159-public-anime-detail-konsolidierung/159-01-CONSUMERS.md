# Plan 159-01 — Consumer and contract baseline

Recorded before product changes on 2026-09-13, starting HEAD `7ced885e`, verified Phase-158 baseline `c3bfcb23781addca1ccd3931592535416f706787`.

## Existing endpoint and callers

The existing `getGroupedEpisodes(animeID)` in `frontend/src/lib/api.ts:2138` calls `authorizedFetch` with `cache: no-store`. Repository-wide search confirms five production caller files (some call more than once):

| Caller | Consumer / behavior to preserve |
|---|---|
| `app/anime/[id]/page.tsx:85` | FansubVersionBrowser; later plan explicitly opts into public projection. Default unchanged in 159-01. |
| `app/admin/anime/[id]/episodes/page.tsx:100,172,386` | EpisodesOverview, EpisodeAccordion, VersionRow and bulk reassignment require the full inventory. |
| `app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:143,198` | Finds selected episode, displays provider/item, quality/subtitle/groups/date, creates/deletes versions and links editor by existing id. |
| `app/admin/anime/components/EpisodeManager/EpisodeManager.tsx:141` | Finds neutral episode by number/title, supplies EpisodeEditForm and bulk context. |
| `app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts:54` | episodeNeighborNavigation matches id, episode_number, release_version label and fansub_groups. |

`../scripts/smoke-fansubs.ps1` is a direct endpoint smoke consumer. No other productive helper caller was found. Tests and mocks are additional typed consumers and must compile after additive fields.

## Field authority and preservation matrix

P = public FansubVersionBrowser, A = grouped admin lists/bulk, E = detail editor/workspace.

| Fields | Actual source and consumers | 159-01 contract |
|---|---|---|
| `id` | `release_variants.id`; P keys/legacy Play, A edit/delete/default/bulk, E editor | Preserve alias. Add explicit `variant_id` and `release_version_id` to both SELECT/scanner paths. |
| `anime_id`, `episode_number`, group `episode_title` | Neutral episode source; P/A labels, E context/neighbors | Preserve. New public group additionally requires stable `episode_id`; equal numbers do not merge. |
| `title` | Releaseversion title or primary episode title; P/A/E | Preserve in both projections. |
| `release_version` | Human version label, not ID; neighbor matching/editor/workspace | Preserve; never infer numeric identity. |
| `fansub_groups` | Canonical release_version_groups + fansub_groups, plural array | Preserve; public always returns array; full includeFansubs semantics unchanged. Correct OpenAPI singular drift. |
| `default_version_id` | Alias for first variant ID in full grouping | Preserve optionality, including omission in counts-only; public default from complete episode inventory. |
| `version_count` | A/P badges and grouping | Public total before cursor/LIMIT, never page array length. Full grouping semantics unchanged. |
| `versions` | P and all A consumers | Default remains full; counts-only normalized from null to []; public has explicit continuation. |
| `media_provider`, `media_item_id` | A per-episode lists, EpisodeEditForm, E form/preview | Preserve full. Omit public. |
| `video_quality`, `subtitle_type`, `release_date` | P/A/E | Preserve both. |
| `production_started_on` | E metadata form; source rev.production_started_on | Preserve full; omit public. |
| `crc32` | E create/patch/form; rv.crc32 | Preserve full; omit public. |
| `stream_url` | A VersionRow copy-link, EpisodeEditForm; E form/preview | Preserve full and default stream compatibility; omit public. |
| `segment_count`, `has_segment_asset` | A VersionRow segment/file badges; P does not read them | Preserve full, replace range/version-label inference with actual theme_segment_assignments. Asset means existing nonblank source_ref on release_asset, not playback-ready status. Omit public and its segment join. |
| `duration_seconds` | E metadata/media/workspace | Preserve full; omit public. |
| `covered_episode_numbers` | Existing Go SELECT/DTO, no current TS/UI consumer found | Preserve and document/add TS optional field; omit public. |
| `created_at`, `updated_at` | Existing Go/TS/OpenAPI contract, no display consumer found | Preserve full; omit public. |

Read seams: EpisodeVersionRepository.ListGroupedByAnimeID, GetByID and shared scanReleaseVariantAsEpisodeVersion. Create and Update return GetByID; both must still hydrate full metadata. Other coupled consumers include EpisodeVersionEditorContext, useEpisodeVersionEditor, episodeVersionEditorUtils, ReleaseVersionMetadataFields, EpisodeVersionEditorPage and app/me/releases/[versionId]/workspace/page.tsx. No permission, media ownership or mutation identifier is redefined here.

## Current query defects and deliberate boundaries

- Full grouped path has existence, titles, counts and one broad variant query; multiple streams/groups can fan out. Its historical grouping behavior is retained, except explicit planned counts-only [] and assignment authority.
- Current neutral fallback is used only if no variants exist anywhere. New public projection must preserve a neutral episode in mixed inventories, including a releaseversion with no variant.
- Public query must normalize to one row per primary-episode variant or one neutral sentinel before LIMIT, group fansubs without fanout and carry full count independently of a partial page. Reuse DefaultCursorPageLimit=24, MaxCursorPageLimit=100 and trimCursorPage.
- Public visibility reuses existing AnimeRepository.ExistsVisible; no duplicate status helper. Default full existence behavior remains unchanged for admin compatibility.
- Versioned anime-specific keyset cursor includes anime ID, numeric episode number, stable episode ID and variant ID (0 for neutral). Foreign-scope/invalid input returns 400 before database access. Pagination options are public opt-in.
- Existing GetByID/mutation and stream OR-ID compatibility are potentially ambiguous. Plan 159-01 fixtures assert explicit returned identities; no claim that those defaults solve collisions. Plan 159-02 owns the complete explicit playback selector chain, and 159-03 wires the public UI only after that chain passes.
- The limit covers this new public grouped projection only. AnimeDetail's pre-existing neutral fallback list is not silently claimed to be globally bounded. A row budget does not imply a fixed KB maximum for arbitrary text.

## Fixture and runtime boundary

Use testsupport.OpenPhase117Postgres with an explicit validated TEAM4S_PHASE117_TEST_DSN to a new disposable postgres:16 tmpfs container with no host ports. Its existing migration helper is allowed only in that isolated database/schema. Never read application DATABASE_URL. Extend prerequisite columns only inside each scoped schema. Record actual QueryTracer statement counts and returned SQL rows, plus serialized fixture bytes; not estimated timing claims.

Tests cover empty, neutral mixed, two groups, multiple streams, duplicate episode numbers, 125 variants plus neutral, equal/different/colliding IDs, unassigned in-range and assigned out-of-range segments, complete default/detail/Create/Patch payloads and counts-only []. Backend source is first exercised in /app/tmp/phase15901/backend (excluded by Air) so incomplete edits cannot interrupt the live API.
