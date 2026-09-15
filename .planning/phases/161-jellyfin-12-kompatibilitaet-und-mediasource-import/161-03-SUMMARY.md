---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "03"
subsystem: api
tags: [jellyfin, proxy, ffmpeg, subtitles, authentication]
requires:
  - phase: 161-01
    provides: Shared origin-bound request construction and sanitized transport
provides:
  - Provider-aware image, media video, release and protected asset authentication
  - Header-authenticated subtitle downloads
  - Server-only FFmpeg headers with disabled input redirects and executable proof
affects: [161-04, 161-07, 161-09]
tech-stack:
  added: []
  patterns: [Shared provider dispatch, Separate renderer HTTP headers, Fail-closed credential-bearing fallback]
key-files:
  modified:
    - backend/internal/handlers/fansub_admin.go
    - backend/internal/handlers/episode_version_media_image.go
    - backend/internal/handlers/episode_version_media_video.go
    - backend/internal/handlers/media_proxy_test.go
    - backend/internal/handlers/episode_version_stream.go
    - backend/internal/handlers/asset_stream_handler.go
    - backend/internal/handlers/episode_version_stream_identity_test.go
    - backend/internal/handlers/segment_render_subtitles.go
    - backend/internal/handlers/segment_render_subtitles_test.go
    - backend/internal/handlers/segment_render_worker.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/services/segment_render_service.go
    - backend/internal/services/segment_render_service_test.go
    - backend/internal/jellyfin/request.go
    - backend/internal/jellyfin/request_test.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/admin_content_test.go
  created: []
key-decisions:
  - Reuse the existing Jellyfin origin comparison for provider dispatch and stored fallback URLs.
  - Give FFmpeg server-only HTTP headers separately from the stream URL and disable redirects before input.
  - Reject foreign Jellyfin fallback URLs containing the configured key; credential-free foreign fallbacks remain available.
patterns-established:
  - Generic legacy stream URL construction is now used by Emby; Jellyfin uses its key-free shared builder.
requirements-completed: [P161-AUTH, P161-REGRESSION]
duration: 16min
completed: 2026-09-15
---

# Phase 161 Plan 03: Binary and renderer authentication summary

**Jellyfin media proxies, subtitles and FFmpeg use header authentication with key-free URLs; the installed FFmpeg cannot forward its credentials through redirects.**

## Accomplishments

- Completed all three tasks across 17 backend source/test files, using the canonical Linux checkout.
- Image/video proxies retain sizing, static-video queries, binary response behavior and video Range/User-Agent forwarding. Explicit Emby request captures prove its query authentication remains intact.
- Release and protected asset streaming reuse the shared boundary without changing grants, entitlement checks or variant ownership. Trusted legacy fallback URLs lose query credentials during request construction. Foreign fallbacks receive no added Jellyfin header.
- Subtitle downloads use the same request constructor and safe execution policy; existing controlled temporary-file lifecycle remains intact.
- Added server-only `SegmentRenderCommandInput.HTTPHeaders`. The worker obtains its header through `jellyfin.NewRequest`, keeps the URL key-free and passes `-headers` and `-max_redirects 0` before `-i`.
- Worker failure sanitization now includes the actual Jellyfin key, while the existing sanitizer recognizes modern MediaBrowser authorization values, including quoted/escaped tokens. Legacy redaction remains.
- Fanart, the Emby-only playback handler, source selection, language policy and public API contracts remain unchanged. Source selector wiring belongs to Plan 07.

## Task Commits

1. Proxy owners:
   - `dee7e0fa` — test(161-03): cover provider-specific proxy authentication and redirects (RED).
   - `20ed14fe` — feat(161-03): authenticate Jellyfin image and video proxies by origin (GREEN).
2. Release/asset owners:
   - `000c9b8c` — test(161-03): prove streaming auth without weakening grants or ownership (RED).
   - `e83461ab` — feat(161-03): authenticate release and protected asset streaming (GREEN).
3. Subtitle/renderer:
   - `60e7dfab` — test(161-03): prove subtitle and executable FFmpeg auth boundaries (RED).
   - `bf382ebd` — feat(161-03): authenticate subtitle and FFmpeg inputs without redirects (GREEN).
4. Self-review correction:
   - `2ab2713b` — fix(161-03): reject credential-bearing foreign Jellyfin fallbacks (focused test failed before the fix and passed afterwards).

## Verification

- All three planned task gates passed in the backend Docker container.
- Release identity and fallback integration fixtures actually executed against the guarded `team4s_phase117_test_161` database and temporary test schemas.
- Combined final handler/service regression gate: **279 test/subtest passes, zero failures, zero skips**. This includes Jellyfin, proxy, Range, grant, variant ownership, subtitle, renderer, editor outage and import regression coverage.
- `go build ./...` — PASS.
- `go vet ./internal/jellyfin ./internal/handlers ./internal/services` — PASS.
- After the final bounded fallback correction, the complete MediaProxy/MediaImage/MediaVideo gate passed again.
- `go test ./internal/jellyfin -count=1` — PASS, including configured base prefixes, normalized hosts and effective-port origin checks.
- `git diff --check` — PASS.
- Canonical/container SHA-256 comparison — all 17 changed backend files match the tested files in `/app`.
- Stub and threat-surface review — no unfinished stub or unmodeled endpoint/schema surface introduced.

The expanded combined gate used:
`go test ./internal/handlers ./internal/services -run 'Test.*(Jellyfin|MediaProxy|MediaImage|MediaVideo|BuildProvider|StreamAsset|ReleaseStream|StreamRelease|SegmentSubtitle|FFmpeg|SanitizeSegmentRenderLog|RenderSegment|SegmentRender|EpisodeImport|GroupAssets|NormalizeJellyfin|EpisodeVersionEditorContext)' -count=1 -json`
with the dedicated test DSN passed in memory through Docker environment forwarding.

## Executable FFmpeg and Request Evidence

- Installed protocol help confirms `-headers` and `-max_redirects` (default 8) exist.
- The test generates a tiny video/audio MP4 under its container temporary directory and executes the installed FFmpeg with the actual generated argument list.
- Authenticated direct HTTP input renders successfully.
- Redirect input receives exactly one request at the source and fails closed; the second origin receives **zero requests and zero credentials**.
- Worker wiring is tested independently with a controlled executable that accepts the separate auth header, rejects URL query credentials and emits a synthetic modern authorization diagnostic; the persisted failure text is redacted.
- Ordinary proxy/status calls retain one upstream request per successful authorized operation.
- Missing/denied grants and cross-version selectors issue zero additional upstream requests.
- Foreign credential-free fallback calls retain one uncredentialed request; foreign URLs containing the configured key are rejected before dispatch.
- Subtitle downloads retain one GET; this plan adds no per-source or per-stream request fan-out.

## Deviations from Plan

**[Rule 2 - Missing critical boundary reuse] Exposed the shared origin predicate.**
- `internal/jellyfin/request.go` and its tests were added to Plan 03's edited-file scope so mixed-provider callers reuse the exact normalized origin/effective-port policy instead of copying it.
- Provider ownership and the header-formatting implementation remain in their original/shared owners.
- Commit: `20ed14fe`.

**[Rule 3 - Blocking coverage/wiring] Updated the existing editor URL seam and worker tests.**
- The editor's stream URL helper still called the generic query-auth builder. Repointed it to the same key-free Jellyfin builder and updated its existing assertion in `admin_content_test.go`.
- Added the worker wiring regression to the existing `segment_render_worker_test.go`; service-only argv tests would not prove the worker supplied its credentials.
- Commits: `60e7dfab`, `bf382ebd`.

**[Rule 1 - Bug] Closed credential-bearing foreign fallback handling.**
- Self-review found that a stored foreign URL containing the configured Jellyfin key could bypass authenticated-origin construction, and malformed URLs could echo their input in request errors.
- Added fail-closed rejection for that key in raw/escaped foreign URLs and generic error text for malformed Jellyfin fallback construction.
- Credential-free foreign fallbacks and Emby remain unchanged.
- Commit: `2ab2713b`.

## Runtime and Evidence Limits

- Source in `/app` is image-copied and must be explicitly synchronized before tests.
- **Air watches production Go files inside the running backend. Copying source can rebuild/restart the application automatically.** No manual restart/recreate command was issued, but unchanged runtime must not be inferred from that.
- Root owns live runtime comparison, application-table fingerprints and phase bookkeeping; this summary claims fixture/executable proof only.
- No application rows, live media, environment files, migrations or browser auth logic were changed by this execution.
- Existing global frontend/broad Go failures remain in the discovery baseline. No global-green claim is made here.
- Race instrumentation remains unavailable in the backend image because gcc/CGO support is absent; concurrent shared-client tests pass normally.
- No authentication gate occurred. No push was performed.

## Next Plan Readiness

The nine direct Jellyfin-capable HTTP owners and indirect renderer now share modern authentication behavior. Persisted MediaSource propagation remains assigned to later plans. STATE, ROADMAP and REQUIREMENTS remain coordinator-owned.

## Self-Check: PASSED

All seven implementation/test/fix commits and the summary exist. All 17 changed backend files matched container source hashes; no tracked file deletion occurred.
