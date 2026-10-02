---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 07
subsystem: media
tags: [go, cli, postgres, backfill, fansub, display-variant, migrate]

# Dependency graph
requires:
  - phase: 173-01
    provides: "GenerateAnimatedWebPDisplay / the original display-variant generation building block this plan's backfill ultimately reaches through GenerateStaticDisplayVariant"
  - phase: 173-02
    provides: "handlers.GenerateStaticDisplayVariant, the exported wrapper this backfill calls directly (signature superseded again by 173-04/173-05 -- this plan calls the CURRENT 4-arg shape)"
  - phase: 173-04
    provides: "services.EncodeStaticDisplayVariant/StripWebPMetadata/IsAnimatedGIFData and the /media/fansub/<group_id>/ namespace convention this plan's namespace-migration phase replicates for pre-existing flat files"
  - phase: 173-05
    provides: "services.GenerateAnimatedDisplayViaVips/IsAnimatedWebPData and GenerateStaticDisplayVariant's final vipsThumbnailPath-aware signature"
  - phase: 173-06
    provides: "the D-15 story-image true-original/display split this backfill's pointer-only phase complements for pre-existing (pre-173-06) story-image rows"
provides:
  - "backend/cmd/migrate-display-backfill, the ONE new package this entire phase is permitted to add (D-14): a self-contained, idempotent, resumable CLI (DATABASE_URL/MEDIA_STORAGE_DIR/FFMPEG_PATH/VIPSTHUMBNAIL_PATH/DRY_RUN env vars) that brings every pre-existing image asset up to the display-variant contract 173-01..173-06 introduced"
  - "runGenericDisplayBackfill: media_files-table display backfill for anime/avatar/background/segment-preview/RVM/fansub-logo-banner/fansub-group-media, calling the exact same handlers.GenerateStaticDisplayVariant live write paths already use"
  - "runStoryImageDisplayBackfill: D-15 pointer-only display row for pre-existing story images (no media_files children at all), reusing their existing file, inventing no original"
  - "runFansubNamespaceMigration: D-09/D-17 physical move of pre-existing flat fansub logo/banner/group-media files into /media/fansub/<group_id>/..., with media_files.path/media_assets.file_path updated to match"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "runBackfill composes three independently-idempotent phases (generic/story-image/namespace) into one flat BackfillStats, mirroring cmd/migrate-preview-backfill's (Phase 172) testable runBackfill split -- not hidden inside main()"
    - "Race-safe write: INSERT ... WHERE NOT EXISTS (generic/story-image) and UPDATE ... WHERE path = $old (namespace) as the DB-side lock, with a per-call-unique temp file/no-op-on-loss as the filesystem-side counterpart -- the loser never touches the winner's final path"
    - "Display filename derived from the original's own basename (<original-basename>_display.<ext>), not a fixed 'display.<ext>' literal -- required because the pre-existing flat storage layout this backfill specifically targets stores many different assets' files side by side in ONE shared directory, where a fixed name would silently collide between them"

key-files:
  created:
    - backend/cmd/migrate-display-backfill/main.go
    - backend/cmd/migrate-display-backfill/backfill.go
    - backend/cmd/migrate-display-backfill/backfill_generic.go
    - backend/cmd/migrate-display-backfill/backfill_story_image.go
    - backend/cmd/migrate-display-backfill/backfill_fansub_namespace.go
    - backend/cmd/migrate-display-backfill/backfill_fixture_test.go
    - backend/cmd/migrate-display-backfill/backfill_generic_test.go
    - backend/cmd/migrate-display-backfill/backfill_story_image_test.go
    - backend/cmd/migrate-display-backfill/backfill_namespace_test.go
    - backend/cmd/migrate-display-backfill/backfill_integration_test.go
  modified: []

key-decisions:
  - "Called handlers.GenerateStaticDisplayVariant with its CURRENT 4-arg signature (data, mimeType, ffmpegPath, vipsThumbnailPath), per explicit executor instruction -- the plan's own <interfaces> block quotes 173-02's now-superseded 2-arg signature; 173-04/173-05's summaries explicitly flagged this drift and told this plan to call the current one"
  - "Display filename for the generic phase is '<original-basename-without-ext>_display.<ext>', not a fixed 'display.<ext>' -- discovered while designing the full-integration test that pre-existing flat fansub/story-image files share ONE directory across many unrelated assets (unlike every live write path, which gives each upload its own dedicated directory), so a fixed name would silently overwrite one asset's display file with another's"
  - "Concurrency-safety implemented via a per-call-unique temp file that is only renamed into its final deterministic path AFTER the DB INSERT wins the WHERE NOT EXISTS race -- guarantees the losing racer's cleanup never touches the winner's already-installed file, which a naive 'write directly to the final path, then insert' implementation would not guarantee"
  - "Namespace migration's candidate query filters already-migrated rows by evaluating the fansub/ prefix against the CURRENT database path (not the filesystem), so idempotency holds even if a row's physical file was somehow already moved out-of-band"
  - "No new testsupport/phaseNNN_postgres.go file added -- reused testsupport.OpenPhase117Postgres and extended it inline in backfill_fixture_test.go with the real media_files/media_assets/fansub_group_media shape, mirroring cmd/migrate-preview-backfill/backfill_test.go's identical 'extend a shared isolated-schema fixture inline' precedent, to keep this phase's 'one new package' constraint (D-14) unambiguous"

requirements-completed: [REQ-173-16, REQ-173-17, REQ-173-08, REQ-173-20]

# Metrics
duration: 95min
completed: 2026-10-02
---

# Phase 173 Plan 07: Display-Variant + Fansub-Namespace Backfill CLI Summary

**New `backend/cmd/migrate-display-backfill` CLI: one idempotent `DATABASE_URL`/`MEDIA_STORAGE_DIR`/`FFMPEG_PATH`/`VIPSTHUMBNAIL_PATH`/`DRY_RUN`-driven run that backfills `display` media_files rows for every pre-existing image asset (via the exact same `handlers.GenerateStaticDisplayVariant` helper every live write path already uses), adds pointer-only `display` rows for pre-173-06 story images (D-15), and physically migrates pre-existing flat fansub logo/banner/group-media files into the `/media/fansub/<group_id>/...` namespace (D-09/D-17) — the ONE new package the entire phase is permitted to add (D-14).**

## Performance

- **Duration:** ~95 min
- **Completed:** 2026-10-02
- **Tasks:** 3
- **Files modified:** 10 (all created, 0 modified elsewhere)

## Accomplishments

- `runGenericDisplayBackfill` (Task 1): for every `media_asset` with a ready `original` but no `display` row, reads the original from disk and calls `handlers.GenerateStaticDisplayVariant` — the identical function 173-02/173-04/173-05's live write paths call — so a backfilled `display` row is byte-for-byte what a fresh upload of the same source would have produced, including D-18 (transparency stays PNG), D-19/D-20/D-21 (animated GIF/WebP display variants stay animated via ffmpeg/vipsthumbnail, with graceful fallback to the unchanged original on tool failure).
- `runStoryImageDisplayBackfill` (Task 2): pre-existing story-image rows (owner_member_id set, zero `media_files` children) get exactly one pointer-only `display` row at their own existing `file_path` — no new file written, no `original` invented, satisfying D-15's documented exception verbatim.
- `runFansubNamespaceMigration` (Task 2): unions `fansub_groups.logo_id`/`banner_id` and `fansub_group_media.media_id` to find every linked `media_files` row not yet under `<storageDir>/fansub/<group_id>/`, physically moves the file there, and updates `media_files.path` (and `media_assets.file_path`, when it matched) with a race-safe conditional `UPDATE ... WHERE path = $old`.
- Discovered and fixed a real design flaw before it could reach a test, let alone production: a fixed `display.<ext>` filename (the pattern every live write path safely uses, since each upload owns its own directory) would silently collide between DIFFERENT pre-existing flat-stored assets sharing one directory — the exact shape of the legacy data this backfill exists to fix. Switched to deriving the display filename from the original's own already-unique basename.
- Concurrency-proofed the generic phase's race-safe write: the generated display bytes are first written to a per-call-unique temp file, and only renamed into the final deterministic path after the DB `INSERT ... WHERE NOT EXISTS` wins — so two racers (two backfill runs, or a backfill run racing a live upload) on the exact same candidate never touch each other's file, proven with a dedicated concurrency test.
- Full three-phase integration test proves the phases compose correctly in one run, including the cascading case where the generic phase gives a legacy flat fansub asset its missing `display` row FIRST (still flat), and the namespace phase then migrates BOTH that original and the just-created display file into the namespace in the same run. A dry-run test proves zero database and zero filesystem writes while still reporting real candidate counts.
- No new HTTP route registered — `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98 (D-14).

## Task Commits

Each task was committed atomically:

1. **Task 1: Generic media_files-table display backfill** - `20baa05f` (feat)
2. **Task 2: Story-image pointer-only backfill (D-15) + fansub namespace migration (D-09/D-17)** - `425dadb5` (feat)
3. **Task 3: Full-run integration test + dry-run verification** - `2b96637f` (test)

**Plan metadata:** (pending — see below)

## Files Created/Modified

- `backend/cmd/migrate-display-backfill/main.go` - `Config` struct, env-var parsing (`getEnv`/`getEnvBool`), `main()` connecting via `pgxpool.New` and printing the structured stats summary. Mirrors `cmd/migrate-preview-backfill/main.go`'s shape.
- `backend/cmd/migrate-display-backfill/backfill.go` - `BackfillStats` (flat aggregate across all three phases), `runBackfill` orchestrating the three phases in order, `removeFileQuietly` cleanup helper.
- `backend/cmd/migrate-display-backfill/backfill_generic.go` - `fetchGenericDisplayCandidates`/`processGenericDisplayCandidate`: the Task 1 media_files-table backfill, calling `handlers.GenerateStaticDisplayVariant` and writing via the unique-temp-file-then-rename pattern described above.
- `backend/cmd/migrate-display-backfill/backfill_story_image.go` - `fetchStoryImageDisplayCandidates`/`processStoryImageDisplayCandidate`: the D-15 pointer-only phase.
- `backend/cmd/migrate-display-backfill/backfill_fansub_namespace.go` - `fetchFansubNamespaceCandidates`/`processFansubNamespaceCandidate`: the D-09/D-17 namespace migration phase.
- `backend/cmd/migrate-display-backfill/backfill_fixture_test.go` - shared real-Postgres fixture (extends `testsupport.OpenPhase117Postgres` with `media_files`, extra `media_assets` columns, `fansub_groups.logo_id`/`banner_id`, `fansub_group_media`) plus shared image-bytes generators and assertion helpers, reused by every test file in this package.
- `backend/cmd/migrate-display-backfill/backfill_generic_test.go` / `backfill_story_image_test.go` / `backfill_namespace_test.go` / `backfill_integration_test.go` - the per-task and full-integration test suites described in Accomplishments.

## Decisions Made

See `key-decisions` in the frontmatter for the current-signature-call, basename-derived-filename, temp-file-rename-concurrency, namespace-idempotency, and no-new-testsupport-file rationale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, caught before it ever ran] Fixed-filename display-variant collision for shared-directory legacy assets**
- **Found during:** Task 3 (designing the full-integration test against a realistic mix of asset shapes)
- **Issue:** The plan's own `<interfaces>` block (and this plan's own initial Task 1 implementation) wrote the backfilled display file as a fixed `display.<ext>` next to the original. That convention is safe for every LIVE write path in this phase, because each of those gives every upload its own dedicated directory. It is NOT safe for the pre-existing flat layout this backfill specifically exists to fix (legacy fansub media, legacy story images), where many different assets' files sit side by side in ONE shared directory — a fixed name would make one asset's backfilled display file silently clobber another's.
- **Fix:** Derive the display filename from the original's own already-globally-unique basename (`<original-basename-without-ext>_display.<ext>`) instead of a fixed literal.
- **Files modified:** `backend/cmd/migrate-display-backfill/backfill_generic.go`
- **Verification:** `TestRunBackfill_FullIntegrationAcrossAllAssetShapes` seeds two flat-stored assets in the same directory and asserts both get correctly-separated display files.
- **Committed in:** `20baa05f` (Task 1 commit — caught and fixed before the commit, not a follow-up patch)

**2. [Rule 1 - Bug, caught before it ever ran] Hardened the race-safe write against clobbering the winner's file**
- **Found during:** Task 1 (writing the concurrency test the plan's own `<behavior>` section mandates)
- **Issue:** An initial "write directly to the deterministic final path, then INSERT ... WHERE NOT EXISTS" design would let a losing racer's cleanup (`os.Remove(finalPath)` on `RowsAffected()==0`) delete the WINNING racer's already-installed file, since both racers compute the identical deterministic final path.
- **Fix:** Write to a per-call-unique temp path first; only rename into the final path AFTER winning the INSERT race. The loser's cleanup now only ever removes its own temp file.
- **Files modified:** `backend/cmd/migrate-display-backfill/backfill_generic.go`
- **Verification:** `TestProcessGenericDisplayCandidate_ConcurrentRaceLeavesExactlyOneWinner` directly exercises two racers against the same candidate snapshot and asserts the winner's file survives intact.
- **Committed in:** `20baa05f` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — correctness bugs found and fixed during this plan's own TDD development, before either ever reached a passing test or a commit). No scope creep: both fixes are required for the plan's own stated `must_haves` ("never modifying or deleting the original file", a simulated race leaving "exactly one winning display row") to actually hold against the realistic legacy data shapes this backfill targets.

## Issues Encountered

- **`GenerateStaticDisplayVariant`'s signature drifted twice since the plan's own `<interfaces>` block was written** (173-02's original 2-arg form → 173-04/173-05's current 4-arg `(data, mimeType, ffmpegPath, vipsThumbnailPath)` form). Per the explicit instruction accompanying this plan, called the CURRENT signature directly rather than the one quoted in the plan text — confirmed via `grep -n "^func GenerateStaticDisplayVariant"` against the live file before writing any code.
- **No `go` binary on the host PATH** (team4s-linux) — all builds/tests in this session ran via `docker exec team4sv30-backend sh -lc "PATH=/usr/local/go/bin:\$PATH go ..."` against the running dev container (Docker Compose Watch confirmed in sync via `md5sum` before building).
- **`TEAM4S_PHASE117_TEST_DSN` not set by default** in this session's shell — reused an existing `team4s_phase117_test_164` database already present on the `team4sv30-db` Postgres container from a prior session (schema-isolated per test, so reuse across sessions is safe by the testsupport harness's own design).

## User Setup Required

None — no external service configuration required. This CLI is intended to be run once, inside the existing backend container, with the server's existing `DATABASE_URL`/`MEDIA_STORAGE_DIR`/`FFMPEG_PATH`/`VIPSTHUMBNAIL_PATH` environment already in place. Recommended operational sequence (not executed against the real production database in this session, since that is an operator action, not a plan-execution task): `DRY_RUN=true` first to review the stats summary, then a real run, then re-run once more to confirm the summary reports zero candidates.

## Next Phase Readiness

- This plan was the last remaining item in Phase 173's backend scope — the phase's `must_haves` artifact (`runBackfill(ctx, db, cfg)` with `Config`/`BackfillStats` exported) is in place and proven against real Postgres.
- No blockers identified. The one operational follow-up (actually running the CLI against the live production database, with its real pre-existing data) is an operator action outside the scope of this automated execution and is noted above under "User Setup Required".

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: backend/cmd/migrate-display-backfill/main.go
- FOUND: backend/cmd/migrate-display-backfill/backfill.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_generic.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_story_image.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_fansub_namespace.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_fixture_test.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_generic_test.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_story_image_test.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_namespace_test.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_integration_test.go
- FOUND commit: 20baa05f
- FOUND commit: 425dadb5
- FOUND commit: 2b96637f
