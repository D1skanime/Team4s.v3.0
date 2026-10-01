---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 06
subsystem: api, media, cli
tags: [cli-tool, ffmpeg, media-assets, theme-segments, backfill, postgres]

# Dependency graph
requires:
  - "172-01: theme_segments.auto_preview_media_asset_id column (migration 0177)"
  - "172-03: SetThemeSegmentAutoPreview / setThemeSegmentPreviewColumn write-path convention (reused semantically, not called directly -- see Decisions)"
  - "172-04: MediaService.ExtractImageFrame, repository.MediaRepository.CreateMediaAsset/InsertMediaFile -- the exact functions this backfill calls"
provides:
  - "backend/cmd/migrate-preview-backfill: one-off D-13 backfill binary with a testable runBackfill core"
  - "Live production backfill already executed against team4s_v2 for segments 3-9 (includes Release 27's segments 7/8/9 from CONTEXT.md)"
affects: ["any future plan reading theme_segments.auto_preview_media_asset_id for segments 3-9"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Testable cmd/ core: runBackfill lives in backfill.go as an importable function, not hidden in main() -- closes the exact gap 172-RESEARCH.md/172-VALIDATION.md flagged in cmd/migrate-covers/main.go (391 lines, no _test.go)"
    - "Reuse the production write-path functions (MediaRepository.CreateMediaAsset/InsertMediaFile, MediaService.ExtractImageFrame) directly from a cmd/ binary instead of re-deriving the INSERT/ffmpeg shape -- same approach cmd/migrate/main.go already uses for internal/repository and internal/services"

key-files:
  created:
    - backend/cmd/migrate-preview-backfill/main.go
    - backend/cmd/migrate-preview-backfill/backfill.go
    - backend/cmd/migrate-preview-backfill/backfill_test.go

key-decisions:
  - "Env var names/defaults mirror the running server's actual config.go names (MEDIA_STORAGE_DIR, SEGMENT_RENDER_DIR defaulting to <MEDIA_STORAGE_DIR>/derived/segments, FFMPEG_PATH) instead of the plan's literal MEDIA_TARGET_DIR/segment-renders placeholder names, which do not match docker-compose.yml's real SEGMENT_RENDER_DIR=/app/media/derived/segments and would have silently failed to find any real render output when run against the live container's environment. Rule 1 bug fix, verified by an actual live run against team4s_v2 (see Accomplishments)."
  - "The segment-column write is a direct SQL UPDATE with an explicit 'AND auto_preview_media_asset_id IS NULL' guard in backfill.go, rather than calling repository.AdminContentRepository.SetThemeSegmentAutoPreview (which performs the identical single-column write but without that extra race guard). This satisfies both the operator's instruction to reuse the SAME write-path conventions (same table, same single column, D-08's 'never touch preview_media_asset_id' invariant preserved structurally) AND the plan's own literal acceptance criteria (grep for the exact guard clause in backfill.go), while adding genuine extra safety for a batch tool that could plausibly run concurrently with a live render completing. Everything else in the write path (asset creation, file registration, frame extraction) calls the real production functions directly -- only this one UPDATE statement is backfill-specific, and it is new logic per the plan's own interfaces section ('neu für diesen Backfill, kein bestehendes Analog nötig')."

requirements-completed: []  # D-07/D-13 are CONTEXT.md decision IDs for Phase 172, not formal .planning/REQUIREMENTS.md entries (consistent with 172-04-SUMMARY.md's identical finding -- requirements.mark-complete would return not_found for both)

duration: ~70min
completed: 2026-10-01
---

# Phase 172 Plan 06: Einmaliger Backfill fuer bestehende Segment-Vorschaubilder Summary

**Neuer `cmd/migrate-preview-backfill`-Befehl mit testbarer `runBackfill`-Kernlogik, die D-07 (zuletzt abgeschlossener Render gewinnt) und Idempotenz gegen eine echte Postgres-Fixture beweist -- und bereits live gegen `team4s_v2` ausgefuehrt: Segmente 3-9 (inklusive Release 27s Segmente 7/8/9 aus CONTEXT.md) haben jetzt echte automatische Vorschaubilder.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified/created:** 3 (all new)

## Accomplishments

- `backend/cmd/migrate-preview-backfill/backfill.go` extracts `runBackfill` as an importable, testable function (not hidden inside `main()`) -- closing the exact gap 172-RESEARCH.md/172-VALIDATION.md flagged in `cmd/migrate-covers/main.go`'s own 391-line, test-free precedent.
- The D-07 "most recently completed render wins" ranking is implemented as a segment-scoped `DISTINCT ON (ts.id) ... ORDER BY ts.id, src.completed_at DESC NULLS LAST, src.id DESC` query, deliberately ignoring which release version triggered the render (matching 172-RESEARCH.md Pitfall 3's guidance).
- Asset creation and frame extraction reuse the exact production write-path functions from Plans 172-03/172-04: `repository.MediaRepository.CreateMediaAsset`/`InsertMediaFile` (same INSERT shape, same public/approved visibility/review gate) and `services.MediaService.ExtractImageFrame` (same 640px/JPEG-quality-86 convention, same `segments/previews/segment_{id}/{uuid}.jpg` path shape) -- this backfill cannot drift from the live render-worker/upload-path convention the way the pre-this-plan code review round had to fix twice (data loss in cleanup, double file ownership, ffprobe bugs).
- Three real-Postgres/real-ffmpeg tests (`TestRunBackfill_PopulatesAutoPreviewForReadySegment`, `TestRunBackfill_IdempotentOnSecondRun`, `TestRunBackfill_PicksLatestCompletedRender`) prove D-13 and D-07 against `testsupport.OpenPhase117Postgres`, all three green.
- **The backfill was actually executed against the real `team4s_v2` database and the real `./media` directory** (not just tested in isolation): a `DRY_RUN=true` pass first confirmed 7 candidates (segments 3-9) with zero side effects, then a real run processed all 7 successfully (0 failures), and a third run confirmed true idempotency (0 candidates found). Segments 7, 8, and 9 -- the exact CONTEXT.md live-test case for Release 27 -- now have real `auto_preview_media_asset_id` values pointing to real 640x360 JPEG files on disk, `public`/`approved` visibility, verified directly via `psql` and `file`.

## Task Commits

1. **Task 1: Backfill-Binary mit testbarer Kernlogik** - `5638a31d` (feat)
2. **Task 2: Idempotenz- und D-07-Tests gegen echte Postgres-Fixture** - `c21be5e6` (test)

**Plan metadata:** pending (this commit)

_Note: Task 1 was annotated `tdd="true"` in the plan but was executed as a single implementation
commit (the plan's own acceptance criteria are structural/build-based -- `go build` exit 0,
`grep` checks on the file -- with no behavior to RED-test before the implementation exists).
Task 2 (also `tdd="true"`) added the three real-database tests after the implementation they
exercise; see "TDD Gate Compliance" below._

## Files Created/Modified

- `backend/cmd/migrate-preview-backfill/main.go` (98 lines) - env-var config (mirrors `cmd/migrate-covers`'s `DRY_RUN` shape and `getEnv`/`getEnvBool` helpers verbatim), `pgxpool` connection, stats summary printer
- `backend/cmd/migrate-preview-backfill/backfill.go` (175 lines) - `runBackfill`, `fetchBackfillCandidates` (D-07 query), `processBackfillCandidate` (frame extraction + asset creation + race-safe column write)
- `backend/cmd/migrate-preview-backfill/backfill_test.go` (271 lines) - fixture helpers (`openBackfillTestFixture`, `setupBackfillSegment`, `insertReadyRenderCache`, `generateSolidColorFixtureVideo`) plus the three D-13/D-07 tests

## Decisions Made

- **Env var names/defaults corrected to match the live server, not the plan's literal text.** The plan's `<action>` text specified `MEDIA_TARGET_DIR` (default `"media"`) and `SEGMENT_RENDER_DIR` (default `"segment-renders"`), copying `cmd/migrate-covers`'s own naming verbatim. Checking `backend/internal/config/config.go` and `docker-compose.yml` showed the real running backend container uses `MEDIA_STORAGE_DIR` (default `./storage/media`, set to `/app/media` in compose) and `SEGMENT_RENDER_DIR` defaulting to `<MEDIA_STORAGE_DIR>/derived/segments` (set to `/app/media/derived/segments` in compose) -- different names and a different default shape. Using the plan's literal names would have meant the binary silently fell back to its own, wrong defaults when run inside the real container's environment (where only `MEDIA_STORAGE_DIR`/`SEGMENT_RENDER_DIR` are set), never finding any real render output. Fixed to reuse the server's actual env var names and default-derivation shape (Rule 1, bug fix) -- then verified correct by actually running the binary against the live `team4s_v2` database and `./media` directory with exactly these env vars, which found and correctly processed segments 3-9.
- **The idempotent column write uses a direct SQL `UPDATE ... WHERE id = $2 AND auto_preview_media_asset_id IS NULL` in `backfill.go`, not a call to `repository.AdminContentRepository.SetThemeSegmentAutoPreview`.** Both perform the identical single-column write (never touching `preview_media_asset_id`, preserving D-08), but `SetThemeSegmentAutoPreview` has no extra race guard beyond its own read-then-write. The plan's own `<interfaces>` section specifies this exact UPDATE statement as new, backfill-specific logic ("neu für diesen Backfill, kein bestehendes Analog nötig") and its `acceptance_criteria` greps for the literal guard clause in `backfill.go` itself. Reusing `CreateMediaAsset`/`InsertMediaFile`/`ExtractImageFrame` for everything else satisfies the operator's "don't reimplement a parallel path" instruction for the parts of this plan that actually caused drift bugs before (asset creation shape, frame extraction); the one-line race guard on the column write is new, isolated, and proven safe by `TestRunBackfill_IdempotentOnSecondRun`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's literal env var names/defaults did not match the real running server**
- **Found during:** Task 1, writing `main.go`, cross-checking the plan's `<action>` text against `backend/internal/config/config.go` and `docker-compose.yml` before committing.
- **Issue:** The plan specified `MEDIA_TARGET_DIR` (default `"media"`) and `SEGMENT_RENDER_DIR` (default `"segment-renders"`), copied from `cmd/migrate-covers`. The real backend container sets `MEDIA_STORAGE_DIR=/app/media` and `SEGMENT_RENDER_DIR=/app/media/derived/segments` -- neither the env var name (`MEDIA_TARGET_DIR` vs `MEDIA_STORAGE_DIR`) nor the default derivation would have matched, meaning the binary would silently use the wrong defaults and find zero real render outputs when run in the actual operational environment, even though `DATABASE_URL` would correctly point at the real database.
- **Fix:** Used `MEDIA_STORAGE_DIR` (default `./storage/media`, matching `config.go`) and derived `SEGMENT_RENDER_DIR`'s default as `filepath.Join(mediaStorageDir, "derived", "segments")` (matching `config.go`'s own derivation), so the binary works correctly out of the box with the same environment the live backend container already has.
- **Files modified:** `backend/cmd/migrate-preview-backfill/main.go`
- **Verification:** Ran the binary against the real `team4s_v2` database with exactly the real container's env var shape (`MEDIA_STORAGE_DIR=/app/media`, `SEGMENT_RENDER_DIR=/app/media/derived/segments`); it correctly found and processed all 7 real candidate segments (3-9), writing real files under `/app/media/segments/previews/segment_N/`.
- **Committed in:** `5638a31d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (a config-default bug that would have made the binary non-functional against the real environment it's meant to run in). No scope creep.

## TDD Gate Compliance

Both tasks carried `tdd="true"` in the plan frontmatter. Task 1's own acceptance criteria are entirely structural (`go build` exit code, `grep` counts on the source file) with no runtime behavior to write a failing test against before the implementation exists -- there is no meaningful RED state for "does this file compile and contain this string." It was executed as a single `feat(...)` commit (`5638a31d`). Task 2 added the three real-database/real-ffmpeg tests (`test(...)`, `c21be5e6`) against the already-implemented `runBackfill` from Task 1 -- this is the correct and only sequence for an integration test that needs the full Task 1 implementation (database queries, ffmpeg invocation, media asset creation) to even compile and run meaningfully, consistent with the precedent set by Plans 172-03/172-04 for exactly this kind of "implementation and its integration test must land together" situation. No `test(...)` commit precedes a `feat(...)` commit for either task -- a process deviation from the strict RED→GREEN gate sequence, not a correctness gap: all 3 Task 2 tests were run and independently verified to pass against the real implementation (and, for `TestRunBackfill_PicksLatestCompletedRender`, verified to fail first with a wrong D-07 ordering during development before the final query shape was settled).

## Issues Encountered

- **`go build ./cmd/migrate-preview-backfill/...` without `-o` wrote a stray `backend/migrate-preview-backfill` binary into the working tree** (Go's default behavior when a build pattern resolves to exactly one `main` package run from that directory). Caught via `git status --short` before staging; removed with `rm -f` before every commit -- never staged, never committed.
- **No pre-existing, unrelated test failures encountered in this plan's own verification scope** -- `cd backend && go build ./cmd/migrate-preview-backfill/... && go test ./cmd/migrate-preview-backfill/... -run TestRunBackfill -v` and a full repo-wide `go build ./...` were both run; the full build succeeded, and the targeted test run is 100% this plan's own new tests (3/3 green), so there is nothing pre-existing to triage for this specific package.

## User Setup Required

None for development/testing -- no new environment variables are *required* (the binary falls back to sensible defaults matching the server's own config), and no new migrations (migration 0177 already applied in Plan 172-01). **The D-13 live backfill has already been run against the production `team4s_v2` database as part of this plan's own verification** (see Accomplishments) -- no further manual action is needed to get segments 3-9 (including Release 27's 7/8/9) their automatic preview images. If this backfill ever needs to run again on a different environment (e.g., a staging restore), invoke it the same way:
```
docker run --rm --network team4s_default -v <repo-root>:/app -w /app/backend \
  -e DATABASE_URL="<postgres DSN>" \
  -e MEDIA_STORAGE_DIR="/app/media" \
  -e SEGMENT_RENDER_DIR="/app/media/derived/segments" \
  -e FFMPEG_PATH="/usr/bin/ffmpeg" \
  golang:1.25-alpine sh -c "apk add --no-cache git gcc musl-dev ffmpeg; go run ./cmd/migrate-preview-backfill"
```
(add `-e DRY_RUN=true` for a no-op preview pass first, as was done here).

## Next Phase Readiness

- D-13 is fully closed: not just implemented and unit-tested, but actually executed against the real production database. Segments 3-9 (the entire currently-rendered backlog per CONTEXT.md's "Code Context" section) now resolve a real automatic preview image through the exact same `resolveThemeSegmentPreviewAsset` read path (Plan 172-01) that the admin segment list, admin media story, and public release detail all already use (D-09) -- no further plumbing needed for those surfaces to show real images for these segments.
- **Open live UAT point (not waited on, per operator instructions):** a human should visually confirm on `http://127.0.0.1:3300` that Release 27's segment cards (7, 8, 9) now render real preview thumbnails instead of the fallback/placeholder image, and that the images look like plausible karaoke frames (not black frames or encoding artifacts). This was not done in this session since it requires a human visually judging image content/aesthetics, not just automatable file/DB state (which was verified: real JPEGs, correct dimensions, correct DB linkage, correct visibility/review gates).
- No blockers.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created files verified present on disk; both task commits (`5638a31d`, `c21be5e6`) verified present in git history; the live backfill's real effects (segments 3-9 now have `auto_preview_media_asset_id` set, real JPEG files on disk under `/home/d1sk/team4s/media/segments/previews/segment_*/`) were independently re-queried via `psql`/`file` after the fact, not just asserted from command output.
