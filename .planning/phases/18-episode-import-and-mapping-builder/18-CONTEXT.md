# Phase 18: Episode Import And Mapping Builder - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Source:** User discussion after Anime Create closeout

<domain>

## Phase Boundary

Build the next step after Anime Create: a guided episode import and mapping builder.

The phase must not be a simple "new episode" form. It must bridge two different truths:

- AniSearch is the canonical anime episode source.
- Jellyfin is the local media/file source.
- The admin must be able to manually correct the mapping before persistence.

The first implementation should focus on anime episode import and file-to-episode mapping. It should avoid broad public playback redesign, fansub administration redesign, or full Anime Edit polish unless those are strictly necessary for the mapping flow.

</domain>

<decisions>

## Locked Product Decisions

### Canonical Episode Source
- AniSearch defines the canonical episode list for anime: episode number, title, and future metadata where available.
- Jellyfin/TVDB season grouping must not redefine canonical Team4s episode numbers.
- Example: Jellyfin may expose `Bleach S03E11`, while Team4s/AniSearch should map that file to the continuous canonical Bleach episode number.

### Jellyfin Media Source
- Jellyfin provides files and media identity, not canonical anime episode structure.
- Jellyfin scan candidates should expose season number, episode number, file name/path, media item ID, stream URL, and detected quality where available.
- Existing Jellyfin folder linkage from Anime Create (`folder_name` / Jellyfin series path) should seed the scan context.

### Manual Mapping Is Required
- The mapping builder must let admins override automatic guesses before save.
- It must support one Jellyfin file mapped to multiple canonical episodes, e.g. Naruto episodes 9 and 10 in a single file.
- It must support unmapped files and unmapped canonical episodes without forcing a bad match.
- It should clearly mark suggested, confirmed, conflict, and skipped rows.

### Persistence Semantics
- Applying the mapping creates missing `episodes` from AniSearch data without overwriting existing manual titles/status unless explicitly intended.
- Applying media mappings creates or updates `episode_versions` for Jellyfin media.
- The current model has `episode_versions.anime_id + episode_number + media_provider + media_item_id`. If multi-episode files cannot be represented cleanly, plans must either:
  - introduce a join table such as `episode_version_episodes`, or
  - explicitly document a safe compatibility approach that creates multiple version rows with the same media item ID.
- The preferred long-term model is a join table where one media/version can cover multiple canonical episodes.

### UX Shape
- The UI should feel like the new Anime Create flow: guided, source-aware, and preview-before-apply.
- The page should show:
  - Anime context and folder path.
  - AniSearch episode import preview.
  - Jellyfin file scan preview.
  - Mapping rows where admins can edit the canonical episode target(s).
  - Apply action with clear counts: episodes created, versions linked, skipped, conflicts.
- The first pass should optimize for correctness and operator control over automation.

## the agent's Discretion

- Exact database migration shape, as long as it supports the locked multi-episode mapping requirement or documents a safe staged compatibility path.
- Whether the first UI lives under `/admin/anime/[id]/episodes` or a dedicated subroute/modal, provided the operator can reach it naturally after Anime Create.
- Exact AniSearch episode crawler implementation details, provided it reuses existing AniSearch request discipline and does not introduce aggressive fan-out.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Episode Domain
- `backend/internal/models/episode.go` - public/admin episode detail shape.
- `backend/internal/models/episode_version.go` - episode version, grouped episode, and folder scan DTOs.
- `backend/internal/handlers/admin_content_episode.go` - current admin episode create/update/delete handlers.
- `backend/internal/handlers/admin_content_episode_validation.go` - current admin episode validation rules.
- `backend/internal/repository/admin_content_episode.go` - current episode persistence and upsert/delete semantics.
- `backend/internal/repository/episode_version_repository.go` - current grouped episode/version persistence and default-version ordering.

### Jellyfin Episode/File Source
- `backend/internal/handlers/jellyfin_episode_sync.go` - current single-episode Jellyfin sync flow.
- `backend/internal/handlers/jellyfin_episode_sync_helpers.go` - current Jellyfin episode/version upsert helpers.
- `backend/internal/handlers/admin_content_episode_version_editor_scan.go` - existing folder scan behavior for episode version editing.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` - current version editor scan/adoption behavior.

### Existing Admin Episode UI
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx` - current standalone episode overview/create page.
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeCreateForm.tsx` - current mini create form.
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx` - current edit-route episode manager and grouped versions integration.
- `frontend/src/types/anime.ts` - episode list/status frontend types.
- `frontend/src/types/episodeVersion.ts` - grouped episode/version and folder scan frontend types.
- `frontend/src/lib/api.ts` - current episode, episode version, grouped episode, and Jellyfin sync API helpers.

### Create Flow Baseline
- `frontend/src/app/admin/anime/create/page.tsx` - the just-completed create flow style and section structure.
- `frontend/src/app/admin/anime/create/page.module.css` - visual density and card/grid language to reuse where appropriate.
- `.planning/STATE.md` - current project decisions and phase history.
- `.planning/ROADMAP.md` - phase goal and success criteria.

</canonical_refs>

<specifics>

## Specific Ideas

### Example: Bleach

Jellyfin may expose `Bleach S03E11`. AniSearch/Team4s should map it to the continuous canonical Bleach episode number using imported AniSearch episode order or an admin-visible season offset.

### Example: Naruto

One Jellyfin file may cover canonical episodes 9 and 10. The UI must let the admin map that file to both episodes before apply.

### Suggested Data Concepts

- `canonical_episode_number`
- `anisearch_episode_id` or equivalent source key if available
- `jellyfin_season_number`
- `jellyfin_episode_number`
- `media_item_id`
- `mapping_status`: suggested, confirmed, conflict, skipped
- optional join table: `episode_version_episodes`

</specifics>

<deferred>

## Deferred Ideas

- Full Anime Edit redesign is out of scope.
- Public playback UX redesign is out of scope.
- Non-anime entity episode mapping is out of scope.
- Full automatic season offset learning can be deferred if the first pass exposes manual correction safely.

</deferred>

---

*Phase: 18-episode-import-and-mapping-builder*
*Context gathered: 2026-04-18 via user discussion*
