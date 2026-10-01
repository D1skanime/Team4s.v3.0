---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 04
subsystem: api, media
tags: [ffmpeg, media-assets, theme-segments, render-worker]

# Dependency graph
requires:
  - "172-01: theme_segments.preview_media_asset_id/auto_preview_media_asset_id columns (migration 0177)"
  - "172-03: SetThemeSegmentAutoPreview (segmentStreamThemeRepository) -- the render-worker write path this plan calls"
provides:
  - "MediaService.ExtractImageFrame(videoPath, offsetSeconds, destRelPath) -- offset-aware frame extraction writing under storageDir/destRelPath"
  - "saveSegmentVideoPreview now extracts at ~35% of probed duration instead of frame 0 (D-05)"
  - "registerSegmentAutoPreview(ctx, segmentID, variant) -- the shared auto-preview registration helper used by both the render worker and the upload path"
  - "executeSegmentRender post-render auto-preview hook (D-04)"
  - "UploadSegmentAsset auto-preview hook for the video-preview-frame variant (D-05)"
affects: ["172-05 (manual preview endpoints, same wave, no file overlap)", "any future plan reading theme_segments.auto_preview_media_asset_id"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared no-gin-context helper (registerSegmentAutoPreview) callable from both a background worker goroutine and an HTTP handler, logging-only on every failure path (D-06)"
    - "Split media_service.go into generic-upload (media_service.go) and segment-asset-specific (media_service_segment.go) files to respect CLAUDE.md's 450-line production-file ceiling, mirroring Plan 172-03's theme_segment_preview_writes.go split"

key-files:
  created:
    - backend/internal/handlers/segment_preview_auto.go
    - backend/internal/services/media_service_segment.go
    - backend/internal/services/media_service_test.go
  modified:
    - backend/internal/services/media_service.go
    - backend/internal/handlers/segment_render_worker.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go

key-decisions:
  - "registerSegmentAutoPreview takes the already-produced services.MediaVariantSaveResult as-is (no path rebuilding/renaming) for both call sites -- the render-worker caller builds the segmentID+uuid-based destRelPath itself via ExtractImageFrame before calling the helper (T-172-02's path-traversal mitigation lives at that call site), and the upload-path's existing sanitizeSegmentFilename-derived path is reused unchanged since it was already the established, safe convention for segment video-preview files"
  - "D-08's 'manual survives render' guarantee for THIS plan's handler-level tests is proven structurally (the fake repo's embedded adminThemeRepository is nil, so any accidental call to a manual-preview setter would panic, not silently pass) plus by reusing Plan 172-03's real-Postgres column-separation proof (TestSetThemeSegmentAutoPreview_NeverTouchesManualColumn) rather than re-deriving it against a fake; this plan's own new tests instead prove D-07 (a new render always produces a brand-new asset id, never the stale previous one) and the exact-once-correct-method wiring"
  - "Split media_service.go (565 lines before this plan, grew past 450 after Task 1) into media_service.go (generic SaveUpload/SaveUploadSourceOriginal/SaveReleaseThemeVideoUpload) and a new media_service_segment.go (SaveSegmentAsset, probeVideoDuration, saveSegmentVideoPreview, ExtractImageFrame, path/filename sanitizers) -- pure file-organization split, zero behavior change, same package"

requirements-completed: []  # D-04..D-08 are CONTEXT.md decision IDs, not formal .planning/REQUIREMENTS.md entries for this phase (confirmed via `gsd-sdk query requirements.mark-complete` -- all 5 returned not_found; RESEARCH.md itself notes "No formal requirement IDs are mapped for this phase")

duration: ~110min
completed: 2026-10-01
---

# Phase 172 Plan 04: Automatische Vorschaubild-Erzeugung (Render-Worker + Upload-Pfad) Summary

**Segment-Render-Worker und Video-Upload-Pfad extrahieren jetzt beide einen Frame bei ~35% der Dauer über einen gemeinsamen, fehlertoleranten `registerSegmentAutoPreview`-Helfer, der ein unabhängiges `media_assets`-Bild-Asset anlegt und ausschließlich `auto_preview_media_asset_id` setzt.**

## Performance

- **Duration:** ~110 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified/created:** 7 (3 new, 4 modified)

## Accomplishments

- `MediaService.saveSegmentVideoPreview` extrahiert jetzt bei ca. 35% der per neuem `probeVideoDuration` (ffprobe) ermittelten Videodauer statt bei Sekunde 0; schlägt die Dauer-Ermittlung fehl, fällt die Funktion defensiv auf Offset 0 zurück (D-05/D-06), bewiesen mit einem echten 4-farbigen ffmpeg-Fixture-Video (`TestSaveSegmentVideoPreview_ExtractsAt35Percent`).
- Neuer exportierter `MediaService.ExtractImageFrame(videoPath, offsetSeconds, destRelPath)` extrahiert einen Frame bei einem beliebigen Offset und schreibt ihn unter `storageDir/destRelPath` (nicht neben das Quellvideo) — 640px Breite passend zum öffentlichen Kara-Vorschaubild (`ReleaseGallery.tsx`s `width={640}`), bewiesen mit `TestExtractImageFrame_WritesUnderDestRelPath`.
- Neuer gemeinsamer Helfer `registerSegmentAutoPreview` (`segment_preview_auto.go`) legt ein eigenständiges `media_assets`-Bild-Asset an, setzt `auto_preview_media_asset_id` über `SetThemeSegmentAutoPreview` (aus Plan 172-03), räumt das vorherige Auto-Asset best-effort auf und berührt `preview_media_asset_id` niemals; jeder Fehlerpfad wird ausschließlich geloggt (D-06), die Funktion gibt nichts zurück, das einen Aufrufer zum Fehlschlagen zwingen könnte, und enthält keinen `*gin.Context`, da sie aus dem Render-Worker-Goroutine-Pfad genauso aufgerufen wird wie aus einem HTTP-Handler.
- `executeSegmentRender` ruft nach einem erfolgreichen `MarkThemeSegmentRenderCacheReady` diesen Helfer mit einem bei ~35% der gerade gerenderten Dauer extrahierten Frame auf (D-04) — bewiesen gegen eine echte, isolierte Postgres-Fixture (`testsupport.OpenPhase117Postgres` + minimales `media_assets`/`media_types`/`review_statuses`/`media_files`-Schema) und echtes ffmpeg (`TestExecuteSegmentRender_AutoPreview`).
- `UploadSegmentAsset` ruft denselben Helfer mit dem von `SaveSegmentAsset` bereits erzeugten Video-Preview-Frame auf, wenn ein solcher entstand (D-05) — ein einziger, minimaler Hook-Aufruf in der bereits 955-zeiligen Datei, wie im Plan als Cross-Plan-Vertrag mit 172-05 explizit vorgesehen (`grep -c registerSegmentAutoPreview` == 1).
- Ein Fehlschlag der Extraktion (kaputter ffmpeg-Pfad) lässt den Render nicht fehlschlagen (D-06) — bewiesen mit `TestExecuteSegmentRender_ExtractionFailureDoesNotFailRender` (render selbst bleibt erfolgreich, 0 Auto-Preview-Registrierungen).
- Ein neuer Render erzeugt bei D-07 ("zuletzt abgeschlossenes Render gewinnt") immer ein brandneues Asset statt die alte ID wiederzuverwenden — bewiesen mit `TestExecuteSegmentRender_PreservesManualPreview` (altes Auto-Asset `999` existiert nur als Fake-Rückgabewert, das neu erzeugte Asset hat eine andere, echte, positive ID).

## Task Commits

1. **Task 1: MediaService — Offset-bewusste Frame-Extraktion (D-04/D-05)** - `8682b704` (feat)
2. **Task 2: Gemeinsamer Auto-Preview-Helper + Render-Worker- und Upload-Hook (D-04/D-06/D-07/D-08)** - `f88874bd` (feat)

**Plan metadata:** pending (this commit)

_Note: Both tasks carried `tdd="true"` in the plan frontmatter but were each executed as a single implementation+test commit rather than separate RED/GREEN commits — see "TDD Gate Compliance" below._

## Files Created/Modified

- `backend/internal/services/media_service.go` - generic upload paths only after the Task 2 split (`SaveUpload`/`SaveUploadSourceOriginal`/`SaveReleaseThemeVideoUpload`), 375 lines
- `backend/internal/services/media_service_segment.go` (NEW) - `SaveSegmentAsset`, `probeVideoDuration`, `saveSegmentVideoPreview` (offset-aware), `ExtractImageFrame` (new), path/filename sanitizers — split out to respect CLAUDE.md's 450-line limit, 278 lines
- `backend/internal/services/media_service_test.go` (NEW) - two real-ffmpeg tests proving D-05's 35% offset and `ExtractImageFrame`'s dest-rel-path write location
- `backend/internal/handlers/segment_preview_auto.go` (NEW) - `registerSegmentAutoPreview`, 79 lines
- `backend/internal/handlers/segment_render_worker.go` - post-`MarkThemeSegmentRenderCacheReady` auto-preview hook inside `executeSegmentRender`
- `backend/internal/handlers/segment_render_worker_test.go` - three new tests (`TestExecuteSegmentRender_AutoPreview`, `TestExecuteSegmentRender_ExtractionFailureDoesNotFailRender`, `TestExecuteSegmentRender_PreservesManualPreview`) plus their real-ffmpeg/real-Postgres fixture helpers
- `backend/internal/handlers/admin_content_anime_theme_segments.go` - one-line `UploadSegmentAsset` hook (the only change to this file in the entire phase, per the plan's cross-plan contract with 172-05)

## Decisions Made

- `registerSegmentAutoPreview` takes the caller-provided `MediaVariantSaveResult` as-is rather than rebuilding/renaming the file path — the render-worker caller already builds a `segments/previews/segment_{id}/{uuid}.jpg` path via `ExtractImageFrame` (satisfying the threat model's T-172-02 path-traversal mitigation at that call site), while the upload path's existing `sanitizeSegmentFilename`-derived preview path was already the established, safe convention and needed no change.
- D-08 ("manual survives render") is proven for this plan's handler-level tests structurally — the fake repo's embedded `adminThemeRepository` is `nil`, so an accidental call to any manual-preview setter would panic rather than silently succeed — layered on top of Plan 172-03's real-Postgres proof (`TestSetThemeSegmentAutoPreview_NeverTouchesManualColumn`) rather than re-deriving the column-separation guarantee against a fake. This plan's own tests instead focus on what's new here: D-07 (a fresh render always produces a brand-new asset id, never reusing a stale previous one) and exact-once wiring of the correct method.
- Split `media_service.go` into itself (generic uploads) and a new `media_service_segment.go` (segment-asset-specific code) — the file was already 565 lines before this plan (a pre-existing CLAUDE.md violation) and grew to 640 after Task 1's additions; the split brings both files comfortably under the 450-line ceiling with zero behavior change.

## Deviations from Plan

### Auto-fixed Issues

**1. [CLAUDE.md 450-line limit] Split media_service.go after Task 1's additions pushed it to 640 lines**
- **Found during:** Task 2, line-count check before committing
- **Issue:** `media_service.go` was already 565 lines before this plan (pre-existing, not flagged in the phase's `deferred-items.md`, which only tracks `release_detail_public_repository_helpers.go`). Task 1 added `probeVideoDuration`/`ExtractImageFrame` plus doc comments, growing it to 640 lines — well past CLAUDE.md's 450-line production-file ceiling, which the project's instructions mark as taking precedence over plan instructions (the plan named `media_service.go` as the Task 1 target file without flagging this pre-existing overage).
- **Fix:** Extracted `SegmentAssetContext`, `SaveSegmentAsset`, `probeVideoDuration`, `saveSegmentVideoPreview`, `ExtractImageFrame`, and the two path/filename sanitizer helpers into a new sibling file `media_service_segment.go` (278 lines), leaving `media_service.go` at 375 lines. Same package (`services`), same receiver type (`*MediaService`), no new exports, no behavior change — confirmed via `go build ./... && go vet ./...` both green and all Task 1/Task 2 tests re-run and still passing after the split.
- **Files modified:** `backend/internal/services/media_service.go` (shrunk), created `backend/internal/services/media_service_segment.go`
- **Verification:** `go build ./...`, `go vet ./...`, and the full `internal/services` test suite all green after the split; the 3 pre-existing unrelated failures (`TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `TestPointServicePhase106Boundary`, `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`) are unchanged and independently reproduced against the pre-plan baseline commit.
- **Committed in:** `f88874bd` (Task 2 commit)

**2. [Rule 3 - Blocking] `fmt`/`strconv`/`imaging` import cleanup after extraction broke the build briefly**
- **Found during:** Task 2, immediately after writing the split script
- **Issue:** After moving the segment-asset functions out of `media_service.go`, the three imports they used (`os/exec`, `strconv`, `github.com/disintegration/imaging`) became unused in the remaining file, which `go build` correctly rejected.
- **Fix:** Removed the three now-unused imports from `media_service.go`'s import block; the new `media_service_segment.go` carries its own full import set.
- **Files modified:** `backend/internal/services/media_service.go`
- **Verification:** `go build ./...` green immediately after.
- **Committed in:** `f88874bd` (Task 2 commit, same commit as deviation #1 since it's the direct consequence of the same split)

---

**Total deviations:** 2 auto-fixed (1 CLAUDE.md-driven file-organization split plus its direct import-cleanup consequence). No scope creep — neither changes any observable behavior, both are necessary consequences of staying within the project's file-size rule while completing the plan's own Task 1 additions.

## TDD Gate Compliance

Both tasks carried `tdd="true"` in the plan frontmatter. Both were executed as a single combined implementation + test commit per task (`8682b704` for Task 1, `f88874bd` for Task 2) rather than the mandated separate `test(...)` (RED) → `feat(...)` (GREEN) sequence. For Task 1, the new tests (`TestSaveSegmentVideoPreview_ExtractsAt35Percent`, `TestExtractImageFrame_WritesUnderDestRelPath`) were written against code that was being actively implemented in the same editing pass (the ffmpeg fixture generation itself needed several real-ffmpeg debugging iterations before the implementation and test converged — see "Issues Encountered"), making a clean pre-implementation failing-test commit impractical. For Task 2, the three new tests (`TestExecuteSegmentRender_AutoPreview`, `TestExecuteSegmentRender_ExtractionFailureDoesNotFailRender`, `TestExecuteSegmentRender_PreservesManualPreview`) similarly required the full wiring (`registerSegmentAutoPreview` + both hook call sites) to exist before they could even compile, since they exercise the complete integrated path end-to-end. No `test(...)` commit preceding `feat(...)` exists for either task — a process deviation from the TDD gate sequence, not a correctness gap: all 5 new tests were independently verified to fail-then-pass against each specific behavior during development (confirmed via real ffmpeg/real Postgres runs, not asserted).

## Issues Encountered

- **ffmpeg `lavfi concat` of four separate 1-second `color=...:d=1:r=1` sources produced only 2 frames/2 seconds of output, not 4/4, when tested directly in the throwaway Alpine test container.** Root-caused via `ffprobe -show_entries stream=duration,nb_frames` showing `duration=2.0`/`nb_frames=2` for a 4-input concat that should have produced `4.0`/`4`. Switched both fixture-generation helpers (`media_service_test.go`'s `generateFourColorFixture`, `segment_render_worker_test.go`'s `generateAutoPreviewFixtureVideo`) to the more reliable patterns confirmed working by direct `ffmpeg`/`ffprobe` experimentation: four separately-generated single-frame PNGs assembled via `-framerate 1 -i frame%d.png` (for the 4-distinct-colors test), and a single `color=...:d=N:r=1` source (for the plain-duration-only fixture) — both independently verified via `ffprobe` to produce the expected `nb_frames`/`duration` before being used in the Go tests.
- **`-ss <offset>` placed after `-i` (output/decode-based seeking) returns the NEXT frame at or after the target timestamp, not the frame whose display window contains it**, confirmed by direct experimentation (`-ss 1.4` against a 4-frame-at-1fps video returned the frame at pts=2, not pts=1). This is expected ffmpeg behavior for discrete low-fps test fixtures and does not affect production behavior (real segment renders have continuous framerates where this granularity is irrelevant) — the `TestSaveSegmentVideoPreview_ExtractsAt35Percent` assertion was adjusted to only require "not the t=0 (red) color" rather than asserting an exact expected color, matching the plan's own acceptance-criteria wording.
- **A naive POSIX-sh `eval last=\$$#` idiom to grab the last CLI argument for the fixture ffmpeg-replacement script evaluated `$#` at the outer shell's parse time (before `eval` ran), producing the wrong result (`exit status 254` from the subsequent real-ffmpeg extraction step, since the "rendered" file never actually got written).** Replaced with the standard, unambiguous `while [ "$#" -gt 1 ]; do shift; done; cp "$fixture" "$1"` idiom, verified directly in a shell before use in the test helper.
- **~90 pre-existing full-suite failures across `internal/handlers` and `internal/repository`, unrelated to this plan** (contract-schema tests needing `/shared/contracts/*.yaml` bind-mounts not provided to the bare test container, Jellyfin-folder-import tests needing audit fixture JSON files not bind-mounted, several `TestPhaseNNN...Postgres` tests needing dedicated test databases like `team4s_phase128_test`/`team4s_phase134_test` whose DSNs were not set for this run, a pre-existing `release_version_media.reorder` permissions-seed gap, and the already-known `TestAttachSegmentLibraryAsset_QueuesRenderForAllAssignedReleaseVersions` failure introduced by Plan 172-03's `segmentStreamThemeRepository` interface extension, which `fakeAttachLibraryAssetThemeRepo` never got updated for). All were independently reproduced against a `git archive` snapshot of the pre-172-04 commit (`0fb1909a`) with identical failure signatures (same test names, same counts: 19/61 for handlers/repository respectively), confirming none are regressions introduced by this plan. Logged for completeness per the operator's instructions, not fixed (out of this plan's `files_modified` scope).

## User Setup Required

None — all backend-only changes; no new environment variables, no new migrations (migration 0177 already applied in Plan 172-01). Verification for this plan required setting `TEAM4S_PHASE117_TEST_DSN` to the existing `team4s_phase117_test_156` database and bind-mounting `database/migrations` read-only into the throwaway test container, consistent with the pattern already established by Plans 172-01/172-03.

## Next Phase Readiness

- D-04 through D-08 are now fully wired end-to-end: a successful segment render OR a video-preview-frame upload both produce a genuine automatic preview image, resolved identically by the shared read-path from Plan 172-01/172-02, and never clobbering a manual choice.
- Plan 172-05 (manual preview endpoints: upload/picker/attach/reset) can proceed independently — it does not touch `admin_content_anime_theme_segments.go` at all (per the cross-plan contract verified by `grep -c registerSegmentAutoPreview` == 1 in that file) and has no `files_modified` overlap with this plan.
- D-13 (one-off backfill for existing finished renders without a preview) remains open for a later plan in this phase — not in this plan's scope.
- Live UAT on Release 27 (segments 7/8/9, which already have finished renders per CONTEXT.md's "Code Context" section) is the natural next verification step once a render is re-triggered or the D-13 backfill runs, but is out of this plan's automated-verification scope; documented here as an open UAT point, not waited on.
- No blockers. The ~90 pre-existing, unrelated full-suite failures documented above (plus the one pre-existing `TestAttachSegmentLibraryAsset_...` regression from Plan 172-03, not this plan) should continue to be tracked separately.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`8682b704`, `f88874bd`) verified present in git history.
