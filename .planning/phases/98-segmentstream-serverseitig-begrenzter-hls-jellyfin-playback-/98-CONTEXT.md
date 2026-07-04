# Phase 98: Segmentstream - Context

**Gathered:** 2026-07-04
**Status:** Ready for detailed planning
**Source:** Interactive `gsd-discuss-phase` with product owner

## Phase Boundary

Build a segment-scoped playback layer for OP/ED/Kara segments that is safe enough for future public playback and useful immediately in the admin/leader segment editor.

The phase title mentions HLS because that was the initial discussion hook. The locked decision is different: Phase 98 is not HLS-first. The first implementation should prepare normal browser-playable clips and preserve fansub karaoke/subtitle behavior where possible.

### In Scope

- Segment playback addressed by `theme_segment_id`, not by arbitrary release stream parameters.
- Short-lived segment-specific playback grants.
- Server-side enforcement for stored segment source, start time, end time, and maximum derived duration.
- Background preparation of derived clips when segment source/times change.
- Render status visible in the admin/leader segment editor.
- Reuse of the existing uploaded segment fallback flow where manual upload is the better source.
- Backend/API shape that can later be reused by public pages.

### Out Of Scope

- Public-facing segment player UI.
- HLS/multi-bitrate streaming as the first transport.
- Subtitle-track selection UI.
- New upload tables or a parallel media ownership model.
- Treating generated clips as normal user-managed `media_assets`.

## Locked Decisions

### Segment Identity And Security

- D-01: Segment playback is a first-class resource per `theme_segment_id`. The server resolves source, start, and end from persisted segment data.
- D-02: The server always uses stored `start_time` and `end_time`. Clients must not be able to extend playback by passing custom end offsets.
- D-03: Access uses short-lived signed grants scoped to the exact segment, not release-wide or episode-wide grants.
- D-04: Phase 98 is not HLS-first. The MVP should prepare normal browser-playable clips unless detailed planning finds a stronger local constraint.
- D-05: Grants may be reused within a short TTL because players can make several resource requests. The grant remains valid only for the exact segment.

### Duration Limits

- D-06: Automatically derived clips from release/Jellyfin sources must never exceed 4 minutes.
- D-07: Uploaded fallback clips can be longer than 4 minutes because they are curated OP/ED/Kara assets, but this risk must be explicit in the UI/product model.

### Source Selection

- D-08: Default source is the concrete release version / release variant so fansub-specific softsubs, ASS, and Kara effects can be preserved.
- D-09: Jellyfin theme and uploaded asset sources are explicit fallbacks, not silent replacements.
- D-10: If a release-version source cannot be rendered, the segment enters an error state. The system must not auto-fallback to a different source.
- D-11: Uploaded fallbacks reuse the existing segment asset/library flow. Do not create another upload flow or table.
- D-12: Uploaded fallbacks are treated as already cut; the player may play the uploaded clip directly instead of clipping it again by start/end.

### Rendering And Cache

- D-13: Segment clips are prepared automatically on save/change in the background. Users should not wait on first playback.
- D-14: Prepared clips live in a technical derived-media/cache area, not normal `media_assets`.
- D-15: Changes to source, release version/file, start/end time, or render profile invalidate the old prepared clip and schedule a new one.
- D-16: Use deterministic cache keys based on segment id, source, start/end, source identity, and render profile. Do not blindly overwrite cache files.
- D-17: Obsolete cache files should be cleaned up by controlled cleanup logic.

### Render Output

- D-18: MVP output is a normal browser-playable clip, such as MP4/H.264/AAC. HLS is deferred.
- D-19: ASS/subtitle tracks should be burned into derived clips by default so Kara effects work in the browser.
- D-20: If no suitable subtitle track exists, render without subtitles and keep a diagnostic hint.
- D-21: If multiple subtitle tracks exist, choose default/forced/first suitable ASS/sub track automatically. No track-picker UI in Phase 98.
- D-22: Use exactly one standard browser-ready render profile in Phase 98.

### Rights And UI Placement

- D-23: Admins and capability-authorized fansub members can manage fallback upload and segment playback preparation.
- D-24: Rights must be capability-driven and ready for Rechte-Management, not hardcoded to one role name.
- D-25: First UI target is the admin/leader segment editor.
- D-26: Backend and contract should be public-capable now, even though public UI follows later.

## Existing Code To Reuse

### Segment Data

- `database/migrations/0054_theme_segment_playback_sources.up.sql`
  - Existing source model: `episode_version`, `jellyfin_theme`, `uploaded_asset`.
  - Existing fields include release variant, Jellyfin item, media asset, start/end offsets, and duration.
- `backend/internal/repository/admin_content_anime_themes.go`
  - Existing repository seam for syncing segment playback sources.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
  - Existing segment editor and preview area.
  - Currently builds preview URLs from release stream plus `startTimeTicks`, so it does not server-enforce the segment end.

### Streaming/Auth Seams

- `backend/internal/handlers/episode_version_stream.go`
  - Current release-version stream proxy; supports start offset only.
- `backend/internal/handlers/episode_playback_handler.go`
- `backend/internal/handlers/episode_playback_stream.go`
- `backend/internal/handlers/episode_playback_proxy.go`
- `backend/internal/handlers/episode_playback_grant.go`
- `backend/internal/handlers/episode_playback_access.go`
- `backend/internal/handlers/episode_playback_rate_limit.go`
- `backend/internal/auth/release_grant.go`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/server/streamRelayAuth.ts`
- `docs/frontend/streaming-auth-handoff.md`

### Contracts And Local Rules

- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/frontend/auth-api-client.md`
- `docs/api/api-contracts.md`
- `shared/contracts/openapi.yaml`
- `shared/contracts/episodes.yaml`
- `shared/contracts/episode-versions.yaml`
- `shared/contracts/asset-stream.yaml`

## Planning Constraints

- Do not attach release-version process media directly to episodes.
- Do not invent parallel upload/media logic for OP/ED/Kara fallbacks.
- Do not use `release_media` as a substitute for version-scoped process media or existing segment fallback assets.
- Do not expose an endpoint where the browser can turn an OP preview into a full episode stream by changing query parameters.
- Do not make admin-only API shapes that later need to be thrown away for public playback.

## Open Implementation Choices

The detailed plan may decide:

- Exact DB table names for render jobs/cache entries.
- Whether preparation is synchronous job runner, queue-backed worker, or initially a controlled internal job seam.
- Exact render command, FFmpeg flags, subtitle-selection heuristic, and storage path.
- Grant TTL, cache retention, retry policy, and diagnostics payload.
- Whether to add a manual "prepare again" action in the first implementation or defer it.

## Deferred Follow-Ups

- Public anime/episode segment player UI.
- HLS/multi-quality output if normal browser-playable clips are not enough.
- Subtitle-track selection UI for complex releases.
- More advanced render monitoring and queue administration.
