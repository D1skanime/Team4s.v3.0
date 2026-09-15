---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "07"
subsystem: playback
tags: [jellyfin, media-source, postgres, segment-cache, ffmpeg, regression]
requires:
  - phase: 161-06
    provides: Owned source bindings and source-aware release editor
provides:
  - Shared canonical variant and selected source reads for playback and public projection
  - Coherent video, subtitle and editor-duration source selection
  - Selected-source cache lookup and worker fingerprint drift rejection
affects: [161-08, 161-09]
tech-stack:
  added: []
  patterns:
    - One selected variant/source SQL snapshot
    - Exact-item source resolution before cache identity
    - Existing persisted source_fingerprint guards worker execution
key-files:
  created:
    - backend/internal/repository/release_variant_source_repository.go
  modified:
    - backend/internal/models/episode_version.go
    - backend/internal/models/theme_segment_render_cache.go
    - backend/internal/repository/episode_version_repository.go
    - backend/internal/repository/theme_segment_playback_resolution.go
    - backend/internal/repository/theme_segment_render_cache.go
    - backend/internal/repository/episode_version_stream_identity_test.go
    - backend/internal/repository/theme_segment_playback_resolution_integration_test.go
    - backend/internal/handlers/episode_version_stream.go
    - backend/internal/handlers/episode_version_stream_identity_test.go
    - backend/internal/handlers/segment_render_subtitles.go
    - backend/internal/handlers/segment_render_subtitles_test.go
    - backend/internal/handlers/segment_render_worker.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/admin_content_test.go
    - backend/internal/handlers/segment_render_refresh.go
    - backend/internal/handlers/segment_stream.go
    - backend/internal/handlers/segment_stream_test.go
    - shared/contracts/openapi.yaml
key-decisions:
  - Default selection uses canonical version ownership and lowest variant ID before preferred stream order.
  - Bound playback uses stored source identity; unbound reads resolve the exact provider item without persisting.
  - Worker identity drift fails before output handling or FFmpeg instead of rendering another source into an existing key.
requirements-completed: [P161-SOURCE, P161-METADATA, P161-REGRESSION]
duration: 18min
completed: 2026-09-15
---

# Phase 161 Plan 07: Selected-source playback and cache isolation Summary

**Release video, subtitles, duration enrichment and segment rendering follow one owned source, with distinct A/B cache keys and a persisted fingerprint guard before FFmpeg.**

## Performance

- Tasks: 3/3.
- Application, contract and test files: 20; this summary is additional.
- Recorded task commit span: 15:08:37–15:24:23 UTC (approximately 16 minutes); context loading preceded the first RED commit and summary verification followed GREEN.
- Execution: canonical /home/d1sk/team4s over SSH; existing Compose containers only.
- Root owns STATE.md, ROADMAP.md, REQUIREMENTS.md and DECISIONS.md updates.

## Accomplishments

- Extracted selectedReleaseVariantSourceSQL and selectReleaseVariantSource in the repository. Canonical release-version ownership applies to default and explicit variant lookup. Default order is variant ID, then Jellyfin precedence and stream ID within that variant. A foreign variant whose ID collides with the requested version cannot win. Empty variants remain readable through the shared selector; release streaming requires a source.
- Release and theme reads decode the selected stream_sources.metadata jellyfin_source namespace in the same SQL statement. Theme release assignment uses the same selector. Source IDs and binding evidence remain server-only. Existing no-snapshot records remain readable; no metadata or cache mutation happens during those reads.
- Jellyfin video URLs are built for the exact canonical item and selected MediaSourceId, avoiding stale stored URLs naming another item. Other providers retain their existing fallback transport. A bound release video adds no metadata request; an unbound release resolves the exact item once.
- Subtitle selection reads only the selected source's MediaStreams and downloads its own index. Removed the first-item, item-level-stream and first-source fallbacks. Runtime resolution reuses the existing batch fetch and deterministic resolver, including unique stored-path recovery.
- Added server-only EpisodeVersion.JellyfinSource and populated it alongside the existing GetByID binding projection. The actual resolveEpisodeVersionDuration wrapper now passes that binding; an existing duration avoids enrichment.
- RenderSegment and refresh share the existing queued-cache preparation path. Authenticated/public grants and StreamSegment compute the current selected cache key before querying. A ready A cache cannot satisfy B, and queued status is read from the same selected cache only. Upload fallback, grant ownership, range transport, cancellation/auth protections and refresh fan-out remain covered.
- The worker resolves metadata once, uses that result for video and subtitle selection, and compares its identity with persisted cache.SourceFingerprint before touching output files or invoking FFmpeg. Changed source identity fails with segment_source_stale.
- OpenAPI descriptions document selected-source/default ownership behavior and existing failure handling. Corrected the touched render response documentation from 200 to its existing actual enqueue status 202; no runtime status transition was introduced by that correction.

## Task Commits

| Task | RED | GREEN |
| --- | --- | --- |
| 1: Owned variant and internal binding | 60e5c87a | 2e103444 |
| 2: Video, subtitles and duration | 54158ae9 | b46270f0 |
| 3: Cache lookup and worker drift | fb0ae1ef | 5f247e0b |

All three RED gates failed for the intended behavior before implementation: foreign default/missing snapshot; bound B subtitle/duration mismatch; shared A/B cache key and missing worker drift check. The final worker request success case already exercised the Task2 preparation seam; the Task3 RED failures concern actual cache wiring and drift.

## Verification

Required PostgreSQL cases actually executed in unique guarded schemas in team4s_phase117_test_161. No required test skipped in the final gates. Credentials were read from existing container inspection into memory, URL-escaped, and passed only as a host subprocess environment to docker exec -e TEAM4S_PHASE117_TEST_DSN. No secret or DSN was printed or persisted.

- Task1: go test ./internal/repository -run 'Test.*(ReleaseStreamIdentity|EpisodeVersionStream|ThemeSegmentPlaybackResolution)' -count=1 -v — passed.
- Task2: go test ./internal/handlers -run 'Test.*(SegmentSubtitle|SegmentSourceIdentity|SegmentPlayback|ReleaseStream|EpisodeVersionSourceDuration)' -count=1 -v — passed with the dedicated DB environment and no skips.
- Task3 combined final gate: go test ./internal/repository ./internal/handlers ./internal/services -run 'Test.*(SourceIdentity|StreamIdentity|SegmentSubtitle|SegmentRenderWorker|ThemeSegmentPlaybackResolution|EpisodeVersionSourceDuration|ReleaseStream|RenderSegment|SegmentStreamGrant|StreamSegment|FFmpegWorker|AttachSegmentLibraryAsset|SegmentRenderInputsChanged)' -count=1 -v — all three packages passed, no skips.
- After preserving selected-cache queued-status reporting, go test ./internal/handlers -run 'Test.*(StreamSegment|SegmentSourceIdentity)' -count=1 — passed, including the added TestStreamSegmentReportsOnlySelectedCacheStatus.
- go vet ./internal/handlers ./internal/repository ./internal/services ./internal/models — passed, including after the final status adjustment.
- go build ./internal/handlers ./internal/repository ./internal/services ./internal/models — passed before the final small status-reporting adjustment; the later tests/vet compiled that final change.
- Changed Go files formatted with container gofmt. git diff --check passed.
- OpenAPI YAML parsed successfully through the existing frontend js-yaml dependency. The separately attempted yaml package was absent; no dependency was installed.
- Frontend source was unchanged. Frontend typecheck/lint/build and broad baseline comparison remain root's Plan09 gates; earlier unrelated baselines were not repaired here.

### Exact request/query evidence

- TestReleaseStreamIdentitySnapshotSingleRead: one SQL query for no-snapshot and selected-snapshot reads, including two subtitle tracks; no per-track SQL and no read-side write.
- GetThemeSegmentRenderSource: one selected-source SQL query by inspection and exercised in the guarded theme resolution test. The existing assignment selector uses one fixed query. Final additional guarded playback query tracing is owned by Plan08 Task3.
- TestReleaseStreamJellyfinAuthenticationPreservesGrantsAndFallbacks: bound source B produces one video request and zero metadata calls; exact item path, MediaSourceId=B, Range, User-Agent, header auth and 206/401/503 propagation checked. Other-provider fallback preserves its URL/query and receives no Jellyfin Authorization.
- TestReleaseStreamIdentityUnboundExactSource: unbound exact-item lookup uses one metadata request plus one video request; a wrong-item response makes one metadata request and zero video requests.
- TestSegmentSubtitleUsesBoundSourceTracks: one metadata request, one /Videos/item/B/Subtitles/8/Stream.ass download, no A/index-1/index-2 fallback.
- TestSegmentSourceIdentitySelectionAndVideo: no snapshot, bound B, reorder, unique path recovery, disappeared binding, ambiguity, missing source and wrong item. Successful cases make one exact metadata call; the bound release URL constructed from the same result adds zero calls.
- TestEpisodeVersionSourceDurationHonorsBoundSource: own A=10 seconds versus bound B=20 seconds returns 20 via the actual editor wrapper; a stored 99-second duration returns 99 with zero additional calls.
- TestSegmentSourceIdentityActualQueueAndCachedIsolation: refresh and actual RenderSegment produce different A/B keys/fingerprints; public and authenticated B grant requests each query only B's cache key and cannot reuse cached A.
- TestSegmentSourceIdentityUnboundBeforeCacheLookup: one metadata request before one keyed cache lookup for a resolvable unbound record; ambiguous input makes one metadata request and zero cache lookups. The fake persistent source remains unbound.
- TestSegmentRenderWorkerSelectedVideoAndSubtitleSingleRead: one metadata request plus one B/index-8 subtitle download; the invoked FFmpeg fixture requires MediaSourceId=B and the prepared subtitles argument. Exactly one ready update records index 8.
- TestSegmentRenderWorkerRejectsSourceDriftBeforeFFmpeg: cache fingerprint A versus current binding B yields one metadata request, zero subtitle downloads, no ready update, and segment_source_stale before FFmpeg.
- Existing explicit variant membership, canonical grant identity, tampered/missing grants, entitlement denial, uploaded sources, enqueue-only behavior, cross-release/cache grants, subtitle cancellation, FFmpeg auth redaction and all-assignment refresh fan-out remain green.

## Deviations from Plan

1. **[Rule 3 - Fixture blockers] Real metadata and prepared-cache fixture fields.** Existing guarded theme and handler fixtures lacked stream_sources.metadata. Updated those affected fixtures only, without schema migrations or compatibility SQL. Older handler cache fixtures now provide an actual source window, canonical release ID and calculated cache key; fallback fixtures represent other providers explicitly. Commits 2e103444, b46270f0 and 5f247e0b.

2. **[Rule 2 - Binding evidence reuse] Editor projection.** Added the server-only EpisodeVersion.JellyfinSource field and assigned it inside the existing GetByID binding read, so duration can honor both source ID and stored path without another query. Additional model/reader edits are in b46270f0.

3. **[Rule 2 - Request-level regression and contract consistency] Adjacent test/contract files.** Updated handler episode_version_stream_identity_test.go and segment_stream_test.go to exercise the actual request and cache lookup boundaries. OpenAPI documents canonical default selection and existing enqueue semantics in 5f247e0b. Runtime endpoint shapes, auth and public DTO fields were not expanded.

The missing remote rg executable was handled with grep/find. The installed Linux GSD wrapper exposes the older init execute-phase/state load argv rather than SDK query verbs; context was read with those supported commands. No tooling installation or environment change was needed.

## Known Stubs

No new implementation stub prevents this plan's goal. The existing TODO(117-04/117-05) in segment_stream.go about making the render release_version_id query mandatory predates this plan; the current optional parser and canonical repository filtering remain unchanged. No mock data flows into production UI.

## Issues and Evidence Limits

- The worker guard covers item/source identity. It does not compare a queued cache key/window/profile against newly loaded offsets; that adjacent pre-existing behavior is outside Plan07 and must not be described as solved.
- Bound queue/grant reads use stored identity without a provider metadata call. The worker makes the fresh metadata read. If unique path recovery changes the source ID after preparation, the fingerprint guard deliberately fails that old job as stale; reads do not persist a replacement binding or rewrite the old key.
- An unbound queue/grant request needs one metadata read to resolve its key. A later asynchronous worker execution has its own one metadata read; no per-track or per-consumer request fan-out occurs within either boundary.
- Existing cache files/rows were not reset, deleted or migrated as phase operations. The pre-existing explicit change-refresh lifecycle remains available to normal application actions.
- Runtime /app is image-copied; coherent source/test sets were copied before gates. Air may rebuild/restart after production Go copies. No Compose recreation, live import/relink/rescan, application row mutation, migration, provider-library change or cache purge was performed.
- No new endpoint, auth path, persistence schema or provider-driven filesystem access was introduced. Existing header/redirect protections stay in place.
- Plan08 owns the final guarded theme-playback integration acceptance and public technical projection. It must extend the shared selectedReleaseVariantSourceSQL record with technical scalars in the same SQL snapshot; do not perform a second unlocked variant read after selecting a binding.
- Broad/live final evidence remains Plan09 work. Root owns phase-wide metadata bookkeeping.

## Self-Check: PASSED

All 20 application/test/contract files listed above and this summary exist. All six task commits resolve in canonical Git. Required focused gates passed without skipped DB tests; scoped checks and final diff verification passed.
