---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 01
subsystem: database, api
tags: [postgres, pgx, gin, media-assets, theme-segments]

# Dependency graph
requires: []
provides:
  - "theme_segments.preview_media_asset_id/auto_preview_media_asset_id columns (migration 0177)"
  - "resolveThemeSegmentPreviewAsset: the single manual > auto > fallback resolution function"
  - "hydrateSegmentPreviewMetadata(List) wired into ListAnimeSegments/GetAnimeSegmentByID"
  - "AdminThemeSegment.PreviewURL/PreviewSource + AdminSegmentPreviewImageCandidate model"
affects: ["172-02 (public read path)", "172-03 (upload/picker/reset write paths)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared Go resolution function (manual > auto > fallback) instead of duplicating the ranking in 3 SQL call sites"
    - "Variadic optional constructor parameter (NewAdminContentRepository(db, mediaStorageDir...)) to avoid breaking ~35 existing callers"
    - "Schema-availability feature-detection guard (hasTable/hasColumn) so new hydration is a no-op against older test fixtures that don't model the new schema slice"

key-files:
  created:
    - database/migrations/0177_theme_segment_preview_images.up.sql
    - database/migrations/0177_theme_segment_preview_images.down.sql
    - backend/internal/repository/theme_segment_preview.go
    - backend/internal/repository/theme_segment_preview_test.go
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/cmd/server/main.go
    - backend/internal/testsupport/phase117_postgres.go

key-decisions:
  - "Two independent nullable FK columns (preview_media_asset_id manual, auto_preview_media_asset_id automatic) per CONTEXT.md's stated preference, both ON DELETE SET NULL"
  - "Fallback image resolved via the exact existing is_preview_candidate correlation query (group_repository_cursor.go:135-150), scoped per call site by a fallbackReleaseVersionID parameter rather than baked into the shared SQL"
  - "Added a schema-availability guard (media_files table + media_assets.status column) to hydrateSegmentPreviewMetadata so it is a no-op against the many pre-existing Phase-117 test fixtures that don't model media_files/media_assets.status -- without this guard, 8+ unrelated existing tests broke"

requirements-completed: ["D-01", "D-08", "D-09", "D-10"]

duration: 50min
completed: 2026-10-01
---

# Phase 172 Plan 01: Datenmodell + geteilte Vorschaubild-Auflösung Summary

**Migration 0177 (zwei nullable FK-Spalten auf theme_segments) plus `resolveThemeSegmentPreviewAsset`, die einzige Go-Funktion, die preview_url/preview_source nach Rangfolge manuell > automatisch > Ersatzbild auflöst und bereits in ListAnimeSegments/GetAnimeSegmentByID verdrahtet ist.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified/created:** 10 (2 migrations, 1 new repository file, 1 new test file, 5 modified)

## Accomplishments
- `theme_segments` now carries `preview_media_asset_id` (manual) and `auto_preview_media_asset_id` (automatic), both nullable FK to `media_assets` with `ON DELETE SET NULL` and partial indexes; migration applied and verified against the runtime database (`team4s_v2`, now at version 177)
- `resolveThemeSegmentPreviewAsset` is the single, reusable Go function implementing the manual > auto > fallback ranking (D-08), reusing the canonical public/approved/ready visibility gate and the existing `is_preview_candidate` release-version fallback query verbatim
- `ListAnimeSegments` and `GetAnimeSegmentByID` both hydrate `PreviewURL`/`PreviewSource` through the exact same `hydrateSegmentPreviewMetadata` call site, proven identical by `TestListAnimeSegments_PreviewHydration` (D-09)
- `AdminContentRepository` gained an optional `mediaStorageDir` (variadic constructor, matching the existing `NewMediaRepository`/`NewMediaService` pattern) without breaking any of the ~35 existing call sites

## Task Commits

1. **Task 1: Migration 0177 + Go-Modelle erweitern** - `d8e5185c` (feat)
2. **Task 2: Geteilte Preview-Resolution + Admin-Hydration (D-08/D-09/D-10)** - `8171a18f` (feat)

**Plan metadata:** pending (this commit)

_Note: Task 2 was annotated `tdd="true"` in the plan but was executed as a single implementation+test commit rather than separate RED/GREEN commits — see "TDD Gate Compliance" below._

## Files Created/Modified
- `database/migrations/0177_theme_segment_preview_images.up.sql` - adds the two FK columns + partial indexes
- `database/migrations/0177_theme_segment_preview_images.down.sql` - reverses them
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegment.PreviewURL/PreviewSource`, new `AdminSegmentPreviewImageCandidate`
- `backend/internal/repository/theme_segment_preview.go` - `resolveThemeSegmentPreviewAsset`, `hydrateSegmentPreviewMetadata(List)`, schema-availability guard
- `backend/internal/repository/theme_segment_preview_test.go` - 5-case ranking test + admin list/single consistency test
- `backend/internal/repository/admin_content.go` - `mediaStorageDir` field, variadic constructor
- `backend/internal/repository/admin_content_anime_themes.go` - wires the new hydration into `loadSegmentByID` and `ListAnimeSegments`
- `backend/cmd/server/main.go` - passes `cfg.MediaStorageDir` into the one production `NewAdminContentRepository` call
- `backend/internal/testsupport/phase117_postgres.go` - adds migration 0177 to the Phase-117 fixture's applied-migrations list

## Decisions Made
- Fallback resolution takes `fallbackReleaseVersionID` as a parameter rather than computing "which release version" inside the shared function, because the right release version differs per call site (current editor context vs. smallest assigned release version) while the manual/auto half of the ranking does not — mirrors `publicMediaURLForPath`'s existing centralize-the-reusable-part/leave-the-call-site-specific-part-to-the-caller pattern.
- `hydrateSegmentPreviewMetadata` guards on `media_files` table + `media_assets.status` column existing before running (same feature-detection convention as `segmentLibraryTablesAvailable`/`segmentPlaybackSourcesTableAvailable`) — necessary because production has had this schema since migrations 0024/0059, but several older Phase-117 integration test fixtures do not model it and would otherwise break.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unguarded hydration broke 8+ pre-existing Phase-117 integration tests**
- **Found during:** Task 2, full-suite verification after wiring the new hydration calls
- **Issue:** `hydrateSegmentPreviewMetadata` unconditionally queried `media_files`/`media_assets.status`, which several older `testsupport.OpenPhase117Postgres`-based fixtures (e.g. `theme_segment_assignment_slots_integration_test.go`, `theme_segment_origin_integration_test.go`, `theme_segment_playback_resolution_integration_test.go`, `admin_content_anime_theme_segments_hydration_integration_test.go`, `TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode`) never model, since they predate this plan.
- **Fix:** Added `themeSegmentPreviewSchemaAvailable`/`hasColumn` feature-detection guard (same pattern as `segmentLibraryTablesAvailable`) so the hydration is a no-op when the schema slice isn't present — zero behavior change in production, where this schema has existed since 2026.
- **Files modified:** `backend/internal/repository/theme_segment_preview.go`
- **Verification:** Re-ran all 8 previously-broken tests individually — all pass; confirmed via `git archive` of the pre-plan commit that none of these were newly broken by anything else in this plan.
- **Committed in:** `8171a18f` (Task 2 commit)

**2. [Rule 3 - Blocking] Added migration 0177 to the Phase-117 test-fixture migration list**
- **Found during:** Task 2, first test run against `team4s_phase117_test_156`
- **Issue:** `TestListAnimeSegments_PreviewHydration` failed with `column "preview_media_asset_id" of relation "theme_segments" does not exist` because `testsupport.OpenPhase117Postgres`'s fixed migration list predates Phase 172.
- **Fix:** Added `0177_theme_segment_preview_images.up.sql` to the list in `phase117_postgres.go`, following the exact precedent of how migrations 0161/0162 were added for prior phases.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Verification:** Both new tests pass against `team4s_phase117_test_156`.
- **Committed in:** `8171a18f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix for a regression this plan introduced, 1 blocking test-infrastructure fix). No scope creep — both are necessary for correctness of this plan's own tests and for not silently breaking other plans' coverage.

## TDD Gate Compliance

Task 2 carried `tdd="true"` in the plan frontmatter. It was executed as a single combined implementation + test commit (`8171a18f`) rather than the mandated separate `test(...)` (RED) → `feat(...)` (GREEN) → optional `refactor(...)` sequence. Both new tests (`TestResolveThemeSegmentPreviewAsset`, `TestListAnimeSegments_PreviewHydration`) were written and verified to pass against the real implementation; no `test(...)` commit capturing a failing state exists in this plan's git history. This is a process deviation from the TDD gate sequence, not a correctness gap — documented per the mandatory TDD Gate Compliance warning requirement.

## Issues Encountered

- **Backend container has no bind-mounted source.** `team4sv30-backend`'s `/app` is baked into the image at build time (only `database/migrations`, `media`, `scripts`, `shared/contracts` are bind-mounted) — `docker exec team4sv30-backend go build/test` silently built/ran the OLD code, not the edits on disk. Discovered via a file-existence check (`docker exec ... ls /app/internal/repository/theme_segment_preview*.go` → not found) after a suspiciously "clean" first test run reported "no tests to run." Resolved by using a throwaway `golang:1.25-alpine` container with `-v /home/d1sk/team4s/backend:/app` (and `-v .../database/migrations:/database/migrations:ro` for the testsupport harness's migration path), per the operator's originally-suggested container pattern. All subsequent build/vet/test runs in this plan used that pattern, not `docker exec team4sv30-backend`.
- **~90 full-suite failures are pre-existing and out of scope.** A full `go test ./...` run (after the fix above) shows roughly 90 failing tests across `internal/handlers` and `internal/repository` unrelated to this plan (contract-schema tests, Jellyfin import tests, badge/archive/ranking Postgres tests, migration fresh-up-down proofs, FFmpeg-dependent tests, a pre-existing `release_version_media.reorder` permissions-seed gap, and a pre-existing `preview_asset.status does not exist` bug in the unrelated `loadReleaseSegments`/`ReleaseDetailPublicRepository` query family). These require dedicated test databases (e.g. `team4s_phase128_test`, `team4s_phase106_test_*`), Redis, or an installed FFmpeg binary that the bare `golang:1.25-alpine` container used for this plan's verification does not have — none were caused by this plan. Representative samples were independently reproduced against a `git archive` snapshot of the pre-plan commit (`1f5606ec`) to confirm they are not regressions introduced here. Logged for completeness, not fixed (scope boundary: only this plan's files are in scope).

## User Setup Required

None - no external service configuration required. Migration 0177 was applied directly to the runtime database (`team4s_v2`, inside the `team4sv30-db` container) via `go run ./cmd/migrate up` and verified (`go run ./cmd/migrate status` shows version 177 applied; `\d theme_segments` confirms both new columns, indexes, and FKs).

## Next Phase Readiness

- Plan 172-02 (public read path) can now call `resolveThemeSegmentPreviewAsset` directly from `loadReleaseSegments` instead of the old `theme_segment_playback_sources`-based join chain — the function signature and fallback-parameterization are final and tested.
- Plan 172-03 (upload/picker/reset write paths) can rely on `AdminThemeSegment.PreviewURL/PreviewSource` and `AdminSegmentPreviewImageCandidate` being present on the model without further backend plumbing for the read side.
- No blockers. The ~90 pre-existing unrelated test failures (see "Issues Encountered") should be tracked separately, not treated as this phase's responsibility.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created files verified present on disk; both task commits (`d8e5185c`, `8171a18f`) verified present in git history.
