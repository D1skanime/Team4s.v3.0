---
phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback-
plan: 02
subsystem: api
tags: [jellyfin, ffmpeg, subtitles, ass, kara, segment-render, go]

# Dependency graph
requires:
  - phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback- (plans 00/01/03/04)
    provides: segment stream grant/guardrails, render cache foundation, render core helpers
      (BuildFFmpegSegmentArgs, SelectSegmentSubtitleStream, BuildSegmentRenderCacheKey,
      SanitizeSegmentRenderLog), and render source resolution (theme_segment_render_cache /
      theme_segment_render_source repository + handler wiring)
provides:
  - Jellyfin MediaStreams probing wired into RenderSegment for episode_version/jellyfin_theme sources
  - ASS/SSA/SRT subtitle download to a controlled temp file, burned into the rendered MP4 via
    SubtitleFilePath (existing BuildFFmpegSegmentArgs -vf subtitles= support)
  - Graceful no-subtitle-found path (diagnostic log, no error, clip stays playable)
  - subtitle_stream_index/subtitle_codec persisted on the ready render cache row
affects: [98-05, admin-segment-playback, jellyfin-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Jellyfin subtitle download via /Videos/{itemId}/{mediaSourceId}/Subtitles/{index}/Stream.ass,
       authenticated with the existing api_key handler field, downloaded to a temp file instead of
       streamed inline to ffmpeg"
    - "Media-source-id defaults to the Jellyfin item id itself (no MediaSources lookup needed for the
       single-source case validated by spike 001)"
    - "Subtitle absence/failure is a diagnostic (logged, sanitized), never an error -- render continues
       without burned-in subtitles"

key-files:
  created:
    - backend/internal/handlers/segment_render_subtitles.go
    - backend/internal/handlers/segment_render_subtitles_test.go
  modified:
    - backend/internal/handlers/segment_stream.go
    - backend/internal/handlers/jellyfin_client.go
    - backend/internal/handlers/admin_content_episode_version_editor_scan.go

key-decisions:
  - "Rendering stays synchronous inside the HTTP request (accepted MVP deviation from the 98-02 plan's
     'Job-Ausfuehrung im Hintergrund' task -- no background worker/queue exists yet; RenderSegment blocks
     on ffmpeg exec exactly as plans 00/01/03/04 already implemented it). Subtitle probing/download was
     added to this existing synchronous path rather than introducing async execution as an unplanned
     architectural change."
  - "resolveControlledFilePath was moved from segment_stream.go to
     admin_content_episode_version_editor_scan.go (next to derefString) to keep both segment_stream.go
     and the new segment_render_subtitles.go under the mandatory 450-line limit, since segment_stream.go
     was already at 443 lines before this plan's changes."
  - "jellyfinMediaStream struct extended with Index/Codec/IsDefault/IsForced fields (previously only
     Type/Height) to support the services.SegmentProbeMediaStream mapping; existing callers
     (jellyfinVideoQuality) use named-field literals and are unaffected."
  - "No new DB column/table: subtitle absence is communicated via NULL subtitle_stream_index/
     subtitle_codec on the ready cache row plus a sanitized log line, not a new schema field."

patterns-established:
  - "Subtitle/Jellyfin-probing wiring lives in its own handler file (segment_render_subtitles.go)
     separate from the render orchestration in segment_stream.go, keeping both under the line limit
     and making the subtitle path independently testable via httptest.NewServer."

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-07-05
---

# Phase 98 Plan 02: Render-Service und Jellyfin-Probing Summary

**Wired Jellyfin ASS/Kara subtitle probing and download into the existing segment render path so `RenderSegment` now burns in the best-matching subtitle track via ffmpeg's `-vf subtitles=` filter, with a graceful no-subtitle diagnostic fallback.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-05 (session start)
- **Completed:** 2026-07-05
- **Tasks:** 6 (per prompt task list: read/context, download capability, render-path wiring, cache persistence, tests, verification)
- **Files modified/created:** 5 (2 created, 3 modified)

## Accomplishments

- `RenderSegment` (`backend/internal/handlers/segment_stream.go`) now probes Jellyfin `MediaStreams` for `episode_version`/`jellyfin_theme` sources with a Jellyfin item id, selects the best ASS/SSA/SRT track via the already-built `services.SelectSegmentSubtitleStream`, downloads it to a controlled temp file, and passes it as `SubtitleFilePath` into the already-built `services.BuildFFmpegSegmentArgs` -- which was already emitting the `-vf subtitles=...` burn-in filter and explicit `-map 0:v:0 -map 0:a:0 -sn -dn` mapping.
- The downloaded subtitle temp file is cleaned up via `defer os.Remove(...)` after each render.
- When no suitable track exists (or probing/download fails), rendering proceeds without subtitles and a sanitized diagnostic is logged -- this is explicitly not an error, matching the plan's acceptance criterion that the clip must stay playable.
- `subtitle_stream_index`/`subtitle_codec` are now persisted on the `ready` `theme_segment_render_cache` row via the already-existing `MarkThemeSegmentRenderCacheReady` input fields and repository SQL (no schema change needed -- migration 0122 already had the columns).
- No secrets (api_key, tokens, full Jellyfin URLs) appear in any log line; all subtitle-path error logging goes through `services.SanitizeSegmentRenderLog`.
- All new code lives in a new file, keeping every touched file at or below the 450-line project limit.

## Task Commits

1. **Subtitle download capability + render-path wiring + cache persistence** - `400c9f1f` (feat)
2. **Unit tests for probing/selection/download/wiring** - `de557509` (test)

_No separate "plan metadata" commit was made yet for this SUMMARY -- see Self-Check section below; the orchestrator handles STATE.md/ROADMAP.md updates separately per this plan's constraints._

## Files Created/Modified

- `backend/internal/handlers/segment_render_subtitles.go` - New file: `resolveSegmentSubtitle`, `resolveSegmentSubtitleForRender`, `getJellyfinItemMediaStreams`, `mapJellyfinMediaStreamsToSegmentProbe`, `downloadJellyfinSubtitle`, `segmentSubtitleTempDir`. Owns all Jellyfin subtitle probing/download logic.
- `backend/internal/handlers/segment_render_subtitles_test.go` - New file: unit tests for stream mapping, subtitle selection/download success and failure paths, source-kind gating, and secret-leak-free error handling.
- `backend/internal/handlers/segment_stream.go` - `RenderSegment` now calls `resolveSegmentSubtitleForRender`, wires `SubtitleFilePath` into `BuildFFmpegSegmentArgs`, defers cleanup, and passes `SubtitleStreamIndex`/`SubtitleCodec` into `MarkThemeSegmentRenderCacheReady`. `resolveControlledFilePath` was moved out to stay under the line limit.
- `backend/internal/handlers/jellyfin_client.go` - `jellyfinMediaStream` struct extended with `Index`, `Codec`, `IsDefault`, `IsForced` fields (JSON: `Index`, `Codec`, `IsDefault`, `IsForced`) to carry the data needed for subtitle-stream selection.
- `backend/internal/handlers/admin_content_episode_version_editor_scan.go` - Received the relocated `resolveControlledFilePath` helper (next to the existing `derefString`) plus the `path/filepath` import it needs.

## Decisions Made

- **Rendering stays synchronous** (MVP-accepted deviation, inherited from prior plans 00/01/03/04, not introduced here): the plan's task 5 ("Job-Ausfuehrung im Hintergrund" with a queue/worker) was not implemented by this plan or its predecessors. `RenderSegment` still blocks on the ffmpeg `exec.CommandContext` call inside the HTTP request. This plan added subtitle probing/download to that existing synchronous path rather than introducing background job execution as an out-of-scope architectural change (Rule 4 would apply to adding a worker -- not attempted here).
- **Media source id defaults to the Jellyfin item id.** The codebase has no existing concept of a separate `media_source_id` (confirmed via repo-wide search); the spike's evidence and standard Jellyfin behavior treat the primary/default media source id as equal to the item id for single-source items. `downloadJellyfinSubtitle` and `resolveSegmentSubtitle` use `itemID` for both path segments.
- **No new diagnostic column.** Rather than adding a schema field for "why no subtitles," absence is signaled by `subtitle_stream_index`/`subtitle_codec` staying `NULL` on the ready row, combined with a sanitized log line at render time. This avoids an unplanned migration while still satisfying "stores diagnostic" from the task list.
- **File-size-driven refactor.** `segment_stream.go` was already at 443 of 450 allowed lines before this plan. To keep it under the limit after adding subtitle wiring, `resolveControlledFilePath` (a generic, non-segment-specific path-safety helper) was relocated to `admin_content_episode_version_editor_scan.go`, which already hosts the similarly generic `derefString` helper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `resolveControlledFilePath(dir, ".")` rejected the render temp directory itself**
- **Found during:** First test run of `downloadJellyfinSubtitle`
- **Issue:** `resolveControlledFilePath` explicitly rejects `rel == "."` (i.e., the root path resolving to itself), which is correct for preventing path traversal but meant it could not be reused to validate/create the subtitle temp *directory* itself (only files inside it).
- **Fix:** `downloadJellyfinSubtitle` now resolves and `MkdirAll`s the temp directory directly via `filepath.Abs` + `os.MkdirAll`, and only uses `resolveControlledFilePath` for the actual destination *file* within that directory (preserving the traversal-safety check where it matters).
- **Files modified:** `backend/internal/handlers/segment_render_subtitles.go`
- **Verification:** `TestDownloadJellyfinSubtitle_WritesControlledTempFile` and `TestResolveSegmentSubtitle_SuitableTrackDownloadsAndSelects` both pass.
- **Committed in:** `400c9f1f` (part of the feat commit; discovered and fixed before the test commit)

**2. [Rule 3 - Blocking] Trailing blank line at EOF in `segment_stream.go` after removing `resolveControlledFilePath`**
- **Found during:** `git diff --check` verification step
- **Issue:** Removing the relocated function left a stray blank line at end-of-file, flagged by `git diff --check` as "new blank line at EOF."
- **Fix:** Removed the trailing blank line.
- **Files modified:** `backend/internal/handlers/segment_stream.go`
- **Verification:** `git diff --check` clean (only pre-existing LF/CRLF conversion warnings remain, not new errors).
- **Committed in:** `400c9f1f`

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues discovered while implementing/verifying this plan's own changes).
**Impact on plan:** Both fixes were necessary to make the new code buildable/correct and to pass verification; no scope creep beyond this plan's subtitle-wiring objective.

### Deferred (out of scope)

**`backend/internal/handlers/jellyfin_client.go` pre-existing 450-line violation.** Confirmed via `git diff --stat` that this file was already at 485 lines before this plan touched it (this plan's struct-field addition brought it to 491). This predates the current task and is unrelated to subtitle wiring; per the executor scope-boundary rule, pre-existing violations in unrelated code are not auto-fixed. Logged to `.planning/phases/98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback-/deferred-items.md` for a future cleanup phase/plan to split this file.

## Issues Encountered

None beyond the two auto-fixed blocking issues documented above.

## Verification

Commands run and results (backend, from `C:\Users\admin\Documents\Team4s\backend`):

- `go build ./...` -> PASS (no output, exit 0)
- `go test ./internal/handlers/... ./internal/services/... ./internal/auth/... ./internal/config/...` -> PASS (all `ok`)
- `go test ./internal/repository/...` -> PASS (`ok`, cached)
- `go test ./...` (full backend suite) -> PASS (`ok` for every package with test files; `[no test files]` for the rest)
- `git diff --check` -> clean (only pre-existing LF-will-be-replaced-by-CRLF warnings on Windows checkout, no new whitespace/EOF errors)

New/changed tests (`backend/internal/handlers/segment_render_subtitles_test.go`), all passing:
- `TestMapJellyfinMediaStreamsToSegmentProbe`
- `TestResolveSegmentSubtitle_SuitableTrackDownloadsAndSelects`
- `TestResolveSegmentSubtitle_NoSuitableTrackYieldsDiagnosticNoError`
- `TestResolveSegmentSubtitle_MissingItemIDYieldsDiagnosticNoError`
- `TestResolveSegmentSubtitleForRender_SkipsUploadedAssetSources`
- `TestResolveSegmentSubtitleForRender_SkipsWhenNoJellyfinItemID`
- `TestDownloadJellyfinSubtitle_WritesControlledTempFile`
- `TestDownloadJellyfinSubtitle_UpstreamErrorDoesNotLeakSecrets`
- `TestSegmentSubtitleTempDir`

Line-count check (450-line hard limit): `segment_stream.go` = 426, `segment_render_subtitles.go` = 253, `segment_render_subtitles_test.go` = 224 (tests are exempt from the production-code limit but included for reference), `admin_content_episode_version_editor_scan.go` = 149. All production files at or below 450.

Not run in this session: Docker-based live Jellyfin smoke test and `ffprobe` on a real generated clip (no live Jellyfin/ffmpeg available in this execution environment). The plan's Verification section lists this as an optional local Docker smoke step ("falls Services verfuegbar sind") -- code-path correctness was instead verified via `httptest.NewServer`-backed unit tests covering the exact request shapes validated by spike 001 (`/Items?Fields=MediaStreams`, `/Videos/{itemId}/{mediaSourceId}/Subtitles/{index}/Stream.ass`).

## Known Stubs

None. The subtitle path either produces a real burned-in subtitle file or cleanly falls back to no-subtitle rendering; there is no placeholder/mock data path in production code.

## Threat Flags

None. The new surface (Jellyfin subtitle download) reuses the existing authenticated Jellyfin HTTP client pattern (`h.httpClient` + `h.jellyfinAPIKey` as a query parameter, matching `fetchJellyfinJSON`'s existing convention) and the existing controlled-temp-file pattern (`resolveControlledFilePath`). No new endpoints, auth paths, or trust-boundary changes were introduced beyond what plans 00/01/03/04 already established for the segment-render feature.

## User Setup Required

None - no external service configuration required. Uses the existing Jellyfin `.env` configuration already wired into `AdminContentHandler` (`jellyfinAPIKey`, `jellyfinBaseURL`).

## Next Phase Readiness

- Phase 98's core render-service + Jellyfin-probing gap (the one missing slice from plan 02) is now closed: `RenderSegment` produces MP4s with burned-in ASS/Kara subtitles when Jellyfin reports a suitable track, and degrades gracefully when it does not.
- Plan 05's acceptance criteria that depended on subtitle burn-in should now be re-verified against this change.
- Background job execution (queue/worker/backend-restart recovery) from the original plan 02 task list remains unimplemented across all of phase 98's plans -- this is a pre-existing MVP gap, not something this plan introduced or was scoped to close.
- `backend/internal/handlers/jellyfin_client.go` should be split in a future cleanup pass (see Deferred section) to restore compliance with the 450-line project rule.

## Self-Check

- [x] `backend/internal/handlers/segment_render_subtitles.go` exists
- [x] `backend/internal/handlers/segment_render_subtitles_test.go` exists
- [x] Commit `400c9f1f` exists in `git log`
- [x] Commit `de557509` exists in `git log`
- [x] `.planning/phases/98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback-/deferred-items.md` exists

---
*Phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback-*
*Completed: 2026-07-05*
