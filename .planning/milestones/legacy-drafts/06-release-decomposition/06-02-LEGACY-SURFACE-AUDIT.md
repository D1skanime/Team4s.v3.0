# Phase 6: Legacy Surface Audit

**Date:** 2026-03-23
**Phase:** 6 - Release Decomposition
**Package:** 1 - Legacy Surface Audit
**Status:** COMPLETE

---

## Executive Summary

`episode_versions` is currently the overloaded release core for Team4s.

It mixes:
- release identity
- fansub ownership/context
- variant traits
- provider stream source
- public release read semantics
- admin write semantics

This means Phase 6 should not start from handlers or contracts. The correct cutover seam is the repository layer, primarily:
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/group_repository.go`

**Recommendation:** keep public API semantics stable in the first rollout and move decomposition behind repository adapters.

---

## Canonical Legacy Table

Source migration: `database/migrations/0012_episode_versions.up.sql`

Current table shape:
- `id`
- `anime_id`
- `episode_number`
- `title`
- `fansub_group_id`
- `media_provider`
- `media_item_id`
- `video_quality`
- `subtitle_type`
- `release_date`
- `stream_url`
- `created_at`
- `updated_at`

Current uniqueness model:
- `UNIQUE (anime_id, episode_number, fansub_group_id, video_quality, subtitle_type)`

Interpretation:
- `id` is treated as the current public release identifier
- one row currently stands in for identity + variant + source

---

## Responsibility Map

### 1. Release identity
Currently represented by:
- `episode_versions.id`
- `anime_id`
- `episode_number`
- `fansub_group_id`

### 2. Release version / descriptive layer
Currently represented by:
- `title`
- `release_date`
- `created_at`
- `updated_at`

### 3. Variant layer
Currently represented by:
- `video_quality`
- `subtitle_type`

### 4. Stream/provider source layer
Currently represented by:
- `media_provider`
- `media_item_id`
- `stream_url`

### 5. Public release grouping behavior
Currently derived by:
- sorting/grouping in `EpisodeVersionRepository.ListGroupedByAnimeID`
- group-scoped release listing in `GroupRepository.GetGroupReleases`

---

## Stable Public Surfaces

These should remain contract-stable during the first Phase 6 rollout.

### Stable route: grouped episode releases
- Route: `/api/v1/anime/:animeId/episodes`
- Contract: `shared/contracts/episode-versions.yaml`
- Repository seam: `EpisodeVersionRepository.ListGroupedByAnimeID`

Current semantics:
- groups releases by `episode_number`
- returns `default_version_id`
- returns a flat `EpisodeVersion` shape inside grouped episodes

Phase 6 implication:
- adapters must still return the same grouped response shape

### Stable route: release detail
- Route: `/api/v1/episode-versions/:versionId`
- Repository seam: `EpisodeVersionRepository.GetByID`

Current semantics:
- `versionId` is effectively the public release identifier
- response exposes current flat release row semantics

Phase 6 implication:
- normalized model must continue to resolve a stable public ID for this route

### Stable route: release stream grant
- Route: `POST /api/v1/releases/:id/grant`
- Handler seam: `backend/internal/handlers/episode_version_grants.go`
- Repository seam: `EpisodeVersionRepository.GetReleaseStreamSource`

Current semantics:
- `:id` is treated as a release ID
- grant signing depends on provider/source data currently stored in `episode_versions`

Phase 6 implication:
- normalized stream/source lookup must preserve current grant behavior

### Stable route: release stream
- Route: `GET /api/v1/releases/:id/stream`
- Handler seam: `backend/internal/handlers/episode_version_stream.go`
- Repository seam: `EpisodeVersionRepository.GetReleaseStreamSource`

Current semantics:
- source lookup is keyed by legacy `episode_versions.id`

Phase 6 implication:
- stream routing must not break while source data moves to normalized storage

### Stable route: release assets
- Route: `GET /api/v1/releases/:id/images`
- Handler seam: `backend/internal/handlers/release_assets_handler.go`
- Current repository dependency: `EpisodeVersionRepository.GetReleaseStreamSource`

Current semantics:
- route only checks release existence and returns a stable empty contract

Phase 6 implication:
- existence lookup can adapt internally, but route contract should remain unchanged

### Stable route: group releases listing
- Route: `/api/v1/anime/:id/group/:groupId/releases`
- Repository seam: `GroupRepository.GetGroupReleases`

Current semantics:
- reads `episode_versions` directly
- filters on title and episode number
- derives release rows, screenshot counts, and ordering from the legacy model

Phase 6 implication:
- this is one of the most important parity seams for adapter-backed rollout

---

## Adapted Internal Surfaces

These can change behind the contract boundary during Phase 6.

### Repository seam: `EpisodeVersionRepository.ListGroupedByAnimeID`
Why adapted:
- ideal candidate to reconstruct grouped release data from normalized release/version/variant tables

### Repository seam: `EpisodeVersionRepository.GetByID`
Why adapted:
- current flat row can be rebuilt from a normalized join projection

### Repository seam: `EpisodeVersionRepository.GetReleaseStreamSource`
Why adapted:
- current source is stored inline; normalized source tables can back the same return shape

### Repository seam: `GroupRepository.GetGroupReleases`
Why adapted:
- current release list is a legacy-table projection
- future implementation should likely join normalized release identity plus release-version/variant metadata

### Repository seam: `GroupRepository.getGroupStats`
Why adapted:
- episode counts currently use `COUNT(DISTINCT episode_number)` from `episode_versions`
- should later derive from normalized release identity

### Admin/repository cleanup seams
- `EpisodeVersionRepository.DeleteByAnimeAndProvider`
- `EpisodeVersionRepository.DeleteByAnimeEpisodeNumberAndProvider`
- `EpisodeVersionRepository.CountByAnimeAndProvider`
- `EpisodeVersionRepository.UpsertByMediaSource`

Why adapted:
- these are operational seams tied to legacy provider-source semantics
- they may need a transitional compatibility layer while normalized stream tables are introduced

---

## Write Surfaces

These are not safe to redesign blindly. They need an explicit strategy after schema and backfill work.

### Admin write/create
- Handler: `backend/internal/handlers/episode_version_create.go`
- Repository seam: `EpisodeVersionRepository.Create`

Current write payload:
- title
- fansub_group_id
- media_provider
- media_item_id
- video_quality
- subtitle_type
- release_date
- stream_url

### Admin write/update
- Handler: `backend/internal/handlers/episode_version_update.go`
- Repository seam: `EpisodeVersionRepository.Update`

### Admin write/delete
- Handler: `backend/internal/handlers/episode_version_delete.go`
- Repository seam: `EpisodeVersionRepository.Delete`

### Media-source upsert path
- Repository seam: `EpisodeVersionRepository.UpsertByMediaSource`

Audit conclusion:
- these writes currently assume one-row ownership of all release semantics
- Phase 6 must decide whether to:
  - write directly to normalized tables with legacy projection adapters, or
  - dual-write temporarily

**Preferred default:** direct normalized writes plus compatibility reads, not broad dual-write.

---

## Future Breakpoint Surfaces

These should be treated as later slices, not part of the first parity rollout.

### Future breakpoint: richer release semantics in public API
Examples:
- explicit release identity object
- separate release variant object
- multiple streams per release
- richer provider/source metadata

Why future:
- current contracts in `shared/contracts/episode-versions.yaml` flatten everything into `EpisodeVersion`

### Future breakpoint: release assets becoming a real media-backed surface
- `release_assets_handler.go` currently returns a stable empty contract
- once real release asset ownership lands, that should be a named follow-up slice

### Future breakpoint: editor context semantics
- `EpisodeVersionEditorContext` currently assumes the legacy row model
- richer normalized editing semantics should only surface after parity rollout is stable

---

## Compatibility Burden Map

### Primary compatibility carriers
- `EpisodeVersionRepository`
- `GroupRepository`

### Secondary compatibility carriers
- `FansubHandler` episode version handlers
- `ReleaseAssetsHandler`

### Low-risk surfaces for now
- contracts in `shared/contracts/episode-versions.yaml`
- public route names and response envelopes

---

## Risks

### 1. Public release ID ambiguity
Current route parameters use release/version IDs interchangeably.

Impact:
- if normalized tables introduce separate IDs for release, version, and variant, careless mapping will break routes and grants

Mitigation:
- define one stable public ID strategy before schema rollout

### 2. Group release parity drift
`GroupRepository.GetGroupReleases` has custom filter/order logic and image joins.

Impact:
- easiest place to regress ordering, counts, or filter behavior

Mitigation:
- treat this as a first-class parity gate, not a side effect

### 3. Write-path overreach
Trying to redesign create/update/delete too early will multiply migration risk.

Mitigation:
- do schema + backfill + read adapters first, then decide write strategy

---

## Recommended Next Step

Proceed with **Package 2: Schema Design and Migrations** using the following rule:

- preserve current public release ID semantics
- introduce additive normalized tables behind repository seams
- design first for read-parity on:
  - `ListGroupedByAnimeID`
  - `GetByID`
  - `GetReleaseStreamSource`
  - `GetGroupReleases`

---

## Outcome

Legacy surface audit is complete.

The repository layer is confirmed as the correct compatibility boundary for Phase 6.
