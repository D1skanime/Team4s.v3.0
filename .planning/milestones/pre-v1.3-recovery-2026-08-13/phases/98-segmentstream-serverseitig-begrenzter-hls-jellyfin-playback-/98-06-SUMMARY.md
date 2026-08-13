---
phase: 98
plan: 06
subsystem: segment-render
tags: [backend, async-worker, concurrency, race-fix, frontend-polling]
requires:
  - theme_segment_render_cache (migration 0122)
  - AdminContentHandler segment stream deps (WithSegmentStreamDeps)
provides:
  - ClaimNextQueuedThemeSegmentRender (atomic queued->rendering claim)
  - StartSegmentRenderWorker (single background worker, concurrency 1)
  - executeSegmentRender (context.Background()-derived render execution)
  - authorizeSegmentManage (shared capability guard)
  - async RenderSegment (202 Accepted + queued)
  - frontend render-status polling (useReleaseSegments)
affects:
  - backend/internal/handlers/segment_stream.go
  - backend/internal/handlers/segment_render_worker.go
  - backend/internal/repository/theme_segment_render_cache.go
  - backend/cmd/server/main.go
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts
tech-stack:
  added: []
  patterns:
    - "atomic claim via UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)"
    - "single background worker goroutine with poll + wakeup channel"
    - "context.Background()-derived timeout for work that must survive request disconnect"
key-files:
  created:
    - backend/internal/handlers/segment_render_worker.go
    - backend/internal/handlers/segment_render_worker_test.go
  modified:
    - backend/internal/handlers/segment_stream.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/repository/theme_segment_render_cache.go
    - backend/internal/repository/theme_segment_render_cache_test.go
    - backend/cmd/server/main.go
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts
decisions:
  - "MarkThemeSegmentRenderCacheRendering (unconditional UPDATE by cache_key) removed entirely -- the atomic ClaimNextQueuedThemeSegmentRender is now the only queued->rendering transition, eliminating the two-writer race by construction rather than by convention."
  - "Worker uses a poll loop (2s) plus a buffered wakeup channel (segmentRenderWakeup) fed by RenderSegment, so queued jobs are typically picked up near-instantly without busy-polling."
  - "ResetInterruptedThemeSegmentRenders renamed to RequeueInterruptedThemeSegmentRenders: interrupted 'rendering' rows go back to 'queued' (worker reprocesses) instead of 'failed' (used to require manual admin retry)."
metrics:
  duration: "~55 minutes"
  completed: 2026-07-05
---

# Phase 98 Plan 06: Async Segment Render Worker Summary

Replaces the synchronous, ffmpeg-in-request `RenderSegment` handler with a single background
worker (concurrency 1) that claims queued render jobs atomically, fixing a request-blocking
defect (V1), a two-writer render race (B1), and a client-disconnect defect (B3) in one pass;
also extracts the duplicated non-admin capability check (V4).

## What Was Built

### V1 — Async rendering (no more 10-minute blocked requests)

- `RenderSegment` (`backend/internal/handlers/segment_stream.go`) now does capability check ->
  source resolve -> window/source validation -> `UpsertThemeSegmentRenderCacheQueued` -> returns
  **202 Accepted** with `{"data": <queued cache row>}`. No ffmpeg, no `MarkRendering` call, no
  waiting inside the request.
- A new file `backend/internal/handlers/segment_render_worker.go` holds
  `StartSegmentRenderWorker(ctx)`: a single goroutine loop (concurrency 1) that polls the queue
  every 2s (`segmentRenderWorkerPollInterval`) and also wakes up immediately when `RenderSegment`
  calls `h.notifySegmentRenderQueued()` (non-blocking buffered channel, `segmentRenderWakeup`).

### B1 — Concurrency race fixed via atomic claim

- `backend/internal/repository/theme_segment_render_cache.go`: added
  `ClaimNextQueuedThemeSegmentRender(ctx)`, a single atomic
  `UPDATE ... WHERE id = (SELECT id ... WHERE status='queued' ORDER BY queued_at ASC LIMIT 1
  FOR UPDATE SKIP LOCKED) RETURNING ...`. This is now the **only** queued->rendering transition
  in the system. The old unconditional `MarkThemeSegmentRenderCacheRendering(cacheKey)` (which
  let two concurrent callers both flip the same row to 'rendering' and both write the same output
  file) was removed entirely rather than left dead, so the race cannot be reintroduced by a future
  caller reaching for the wrong method.
- Startup recovery: `ResetInterruptedThemeSegmentRenders` renamed to
  `RequeueInterruptedThemeSegmentRenders` — interrupted `'rendering'` rows go back to `'queued'`
  (picked up by the worker) instead of `'failed'` (which used to force a manual admin retry).
  `backend/cmd/server/main.go` calls this at startup and only logs "requeued", never "failed".

### B3 — Client disconnect no longer aborts an in-flight render

- `executeSegmentRender(ctx, cache, source)` (new file) holds the entire subtitle-resolution +
  `BuildFFmpegSegmentArgs` + `exec.CommandContext` + `MarkReady`/`MarkFailed` body extracted
  verbatim in behavior from the old inline `RenderSegment`. Its 10-minute ffmpeg timeout
  (`segmentRenderExecutionTimeout`) is derived from the `ctx` passed into
  `StartSegmentRenderWorker`, which `main.go` starts with `context.Background()` — **not** any
  HTTP request context. A browser tab closing mid-render can no longer flip the row to `'failed'`.

### V4 — Duplicated capability check extracted

- `authorizeSegmentManage(c, identity, actor, source, segmentID, auditAction)` in
  `segment_stream.go` centralizes the non-admin `CanForReleaseVersion` check + audit-on-deny logic
  that was previously duplicated verbatim in `CreateSegmentStreamGrant` and `RenderSegment`. Both
  handlers now call it with their own audit action string
  (`segment_stream.grant.denied` / `segment_stream.render.denied`), preserving identical
  deny/audit behavior.

### Frontend polling

- `useReleaseSegments.ts`: `render()` now awaits the 202 response, immediately refetches the
  segment list once (shows `'queued'`), then starts `pollSegmentRenderStatus` which refetches
  every 3s (`SEGMENT_RENDER_POLL_INTERVAL_MS`) until the target segment's `render_status` reaches
  a terminal value (`ready`/`failed`/`stale`) or 5 minutes elapse
  (`SEGMENT_RENDER_POLL_MAX_WAIT_MS`). An `isMountedRef` guard stops polling cleanly on unmount.
  No tokens/Bearer headers are touched in the UI; only the existing `getAnimeSegments` /
  `renderAnimeSegment` API helpers are used.

## Verification Results

```
go build ./...                                                          -> OK, no output
go vet ./internal/...                                                   -> OK, no output
go test -count=1 ./internal/repository/... ./internal/services/...
        ./internal/handlers/... ./internal/auth/... ./internal/config/... -> all ok
  team4s.v3/backend/internal/repository   ok  (1.4-1.9s)
  team4s.v3/backend/internal/services     ok  (1.1-1.4s)
  team4s.v3/backend/internal/handlers     ok  (2.5-4.1s)
  team4s.v3/backend/internal/auth         ok  (0.5-0.9s)
  team4s.v3/backend/internal/config       ok  (0.4-0.8s)
npx tsc --noEmit (frontend)                                             -> OK, no output
git diff --check                                                       -> clean (exit 0)
```

File line counts (450-line hard limit): `segment_stream.go` 368, `segment_render_worker.go` 191,
`segment_render_worker_test.go` 192, `admin_content_handler.go` 332,
`theme_segment_render_cache.go` 429, `theme_segment_render_cache_test.go` 129. All within limit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `MarkThemeSegmentRenderCacheRendering` removed instead of left unused**
- **Found during:** Task 1 (atomic claim)
- **Issue:** The plan's task list didn't explicitly say to delete the old unconditional
  rendering-mark method, but leaving it in place alongside the new atomic claim would keep the
  exact B1 race reachable by any future caller (or a merge/copy-paste) that reaches for the old
  method instead of the new claim.
- **Fix:** Removed the method and its interface declaration entirely; `RenderSegment` and the
  worker path only ever use `ClaimNextQueuedThemeSegmentRender`.
- **Files modified:** `backend/internal/repository/theme_segment_render_cache.go`,
  `backend/internal/repository/theme_segment_render_cache_test.go`,
  `backend/internal/handlers/segment_stream.go`
- **Commit:** `12f8fede`, `21af11e2`

**2. [Rule 3 - Blocking] `main.go` worker startup used the wrong context**
- **Found during:** Task 6 (worker startup wiring)
- **Issue:** A stale/partial edit already present in the working tree at task start wired
  `StartSegmentRenderWorker(ctx)` using the 10-second startup-boot context, which would have
  cancelled the worker seconds after boot.
- **Fix:** Changed to `StartSegmentRenderWorker(context.Background())`, matching task 6's
  explicit requirement and B3's fix (render execution must never inherit a short-lived context).
- **Files modified:** `backend/cmd/server/main.go`
- **Commit:** `21af11e2`

### Concurrent-writer note (not a deviation, informational)

Multiple `claude.exe` processes were confirmed running against this same working tree during
execution (per `CLAUDE.md`'s documented "Parallele GSD-Agenten auf main" risk). During this run,
edits to `backend/internal/repository/theme_segment_render_cache.go` and
`backend/internal/handlers/segment_stream.go` were observed reverting mid-session (the removed
`MarkThemeSegmentRenderCacheRendering` reappeared twice, with import/interface changes rolled
back). Each occurrence was caught immediately via re-read + re-apply before the next build/commit
step, and the final committed state was verified clean (`grep` for the removed method returns no
matches; `go build`/`go vet`/tests green after every commit). Separately, an unrelated concurrent
edit to `GetThemeSegmentRenderSource`'s `COALESCE` argument order (media-asset-path resolution
priority) was observed in the same file after this plan's commits landed; it is out of scope for
this plan and was deliberately left untouched (not reverted), per the project's "don't fight live
writers" guidance.

## Known Stubs

None. `RenderSegment` correctly enqueues and the worker correctly claims/executes/marks
ready-or-failed; no placeholder/empty-data paths were introduced.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes were introduced. The atomic claim
uses `FOR UPDATE SKIP LOCKED` purely for concurrency control on an existing table; the worker
reuses the existing `resolveControlledFilePath` guards and `SanitizeSegmentRenderLog` (with the
Jellyfin API key) exactly as the old inline path did.

## Self-Check: PASSED

- `backend/internal/handlers/segment_render_worker.go` — FOUND
- `backend/internal/handlers/segment_render_worker_test.go` — FOUND
- Commit `12f8fede` (atomic claim + requeue rename) — FOUND in `git log`
- Commit `21af11e2` (async worker + RenderSegment enqueue-only + main.go wiring) — FOUND in `git log`
- Commit `8af18ab1` (frontend polling) — FOUND in `git log`
- Commit `ae0be85f` (handler tests) — FOUND in `git log`
- `grep -rn "MarkThemeSegmentRenderCacheRendering" backend/` — no matches (confirmed removed)
- `git diff --check` — clean
