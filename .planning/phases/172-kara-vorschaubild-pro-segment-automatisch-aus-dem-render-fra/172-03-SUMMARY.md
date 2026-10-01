---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 03
subsystem: api, database
tags: [postgres, pgx, gin, media-assets, theme-segments, idor-gate]

# Dependency graph
requires:
  - "172-01: theme_segments.preview_media_asset_id/auto_preview_media_asset_id columns (migration 0177)"
  - "172-01: AdminThemeSegment.PreviewURL/PreviewSource, AdminSegmentPreviewImageCandidate model"
provides:
  - "SetThemeSegmentManualPreview/ResetThemeSegmentManualPreview/AttachSegmentPreviewImageFromReleaseVersion/ListSegmentPreviewImageCandidates (adminThemeRepository)"
  - "SetThemeSegmentAutoPreview (segmentStreamThemeRepository) -- the render-worker write path"
  - "Ownership-gated 'attach release image' write (D-11, T-172-01) proven against a real Postgres fixture"
affects: ["172-04 (admin HTTP handlers + render-worker/upload-path wiring that will call these 5 repository methods)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "setThemeSegmentPreviewColumn: one shared read-old-value-then-UPDATE-one-column helper for all 3 single-column writes (manual set, manual reset, auto set), parameterized by column name from 3 hardcoded call sites only -- keeps D-08's 'never touch the other column' invariant impossible to violate by construction"
    - "New file theme_segment_preview_writes.go instead of growing theme_segment_preview.go past the CLAUDE.md 450-line limit -- read-path (resolution/hydration, Plan 172-01/172-02) and write-path (this plan) now live in sibling files sharing the same package"

key-files:
  created:
    - backend/internal/repository/theme_segment_preview_writes.go
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/segment_stream.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/repository/theme_segment_preview_test.go

key-decisions:
  - "Split the new write methods into a new sibling file (theme_segment_preview_writes.go) rather than appending to theme_segment_preview.go as RESEARCH.md/PATTERNS.md implied, because appending would have pushed theme_segment_preview.go from 397 to 581 lines, well past CLAUDE.md's 450-line production-file ceiling -- a pure code-organization decision, no behavior difference, both files stay in package repository so all unexported helpers (ErrNotFound, ListThemeSegmentAssignments, publicMediaURLForPath) remain directly callable."
  - "fakeSegmentStreamThemeRepo gets a real (not panic-on-call) SetThemeSegmentAutoPreview implementation with a configurable autoPreviewCalls slice, per the plan's explicit instruction, so Plan 172-04's render-worker wiring tests can assert the call without further fake changes."

requirements-completed: ["D-08", "D-11"]

duration: 65min
completed: 2026-10-01
---

# Phase 172 Plan 03: Schreibmethoden fuer Vorschaubilder + Interface-Erweiterung Summary

**Fuenf neue Repository-Schreibmethoden (manuelles Setzen/Reset/Picker-Attach mit serverseitigem Ownership-Gate, plus der separate Render-Worker-Auto-Write) in einer neuen Datei `theme_segment_preview_writes.go`, beide betroffenen Handler-Interfaces erweitert, alle vier vollstaendig-expliziten Test-Fakes aktualisiert, D-08/D-11 durch echte Postgres-Tests bewiesen.**

## Performance

- **Duration:** ~65 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified/created:** 7 (1 new repository file, 6 modified handler/test files)

## Accomplishments

- `SetThemeSegmentManualPreview`/`ResetThemeSegmentManualPreview`/`SetThemeSegmentAutoPreview` all delegate to one shared `setThemeSegmentPreviewColumn` helper (read-old-value-then-`UPDATE`-exactly-one-column, `column` sourced only from 3 hardcoded call sites) -- D-08's "the other column is never touched" guarantee is structural, not just tested.
- `AttachSegmentPreviewImageFromReleaseVersion` re-verifies ownership server-side on every call: `ListThemeSegmentAssignments(segmentID)` for the allowed release-version set, then an `EXISTS` query requiring the target asset to belong to one of those versions via `release_version_media` AND pass the canonical `ma.status='ready' AND v.name='public' AND rs.code='approved'` gate -- a client-supplied `media_asset_id` outside this set, or one that fails the gate, always returns `ErrNotFound`, proven by two new database-backed tests (foreign asset, unapproved asset).
- `ListSegmentPreviewImageCandidates` joins `release_version_media` through `release_versions`/`fansub_releases`/`episodes` to build `"Folge {N} ({version})"` labels (version omitted if blank after trim) and resolves thumbnails via the existing `publicMediaURLForPath`; returns an empty (never nil) slice for a segment with no assignments, proven by a dedicated test.
- Both affected interfaces (`adminThemeRepository`, 44 methods now; `segmentStreamThemeRepository`, 11 methods now) and all 4 fully-explicit test fakes identified by the plan's own `grep` instructions were updated in the same commit -- `go build ./...` proves every intermediate state still compiles, per RESEARCH.md Pitfall 1.
- D-08 (column separation) and D-11 (ownership gate) are proven against a real, isolated Postgres fixture (`testsupport.OpenPhase117Postgres`), not mocked.

## Task Commits

1. **Task 1: Schreibmethoden + Interface-Erweiterung + Fake-Updates** - `9bb6c88e` (feat)
2. **Task 2: Tests fuer Schreibpfade (D-08/D-11)** - `4c7c1186` (test)

**Plan metadata:** pending (this commit)

_Note: Task 1 was annotated `tdd="true"` in the plan but was executed as a single implementation
commit (interface + implementation + all 4 fakes had to land atomically for the package to
compile at any intermediate state -- the plan's own objective text states this explicitly as the
reason the whole task is one unit). Task 2 (plain `type="auto"`, not TDD) added the tests
afterward against the already-implemented methods. No RED→GREEN gate sequence applies to either
task; see "TDD Gate Compliance" below for the formal note on Task 1's annotation._

## Files Created/Modified

- `backend/internal/repository/theme_segment_preview_writes.go` (NEW) - the 5 write methods plus `setThemeSegmentPreviewColumn`, split out of `theme_segment_preview.go` to respect the CLAUDE.md 450-line limit (see Deviations)
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository` interface gains `SetThemeSegmentManualPreview`/`ResetThemeSegmentManualPreview`/`AttachSegmentPreviewImageFromReleaseVersion`/`ListSegmentPreviewImageCandidates`
- `backend/internal/handlers/segment_stream.go` - `segmentStreamThemeRepository` interface gains `SetThemeSegmentAutoPreview`
- `backend/internal/handlers/admin_content_release_theme_assets_test.go` - `releaseThemeAssetRepoStub` gains 4 trivial no-op methods (same style as `ListThemeTypes`)
- `backend/internal/handlers/admin_content_fansub_releases_test.go` - `fansubReleaseThemeRepoStub` gains the same 4 trivial no-op methods
- `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` - `rangeAutoAssignThemeRepo` gains a trivial `SetThemeSegmentAutoPreview`
- `backend/internal/handlers/segment_render_worker_test.go` - `fakeSegmentStreamThemeRepo` gains a real `SetThemeSegmentAutoPreview` (records calls in a new `autoPreviewCalls` field, configurable `autoPreviewOldValue`/`autoPreviewErr`) for Plan 172-04's wiring tests
- `backend/internal/repository/theme_segment_preview_test.go` - 5 new Postgres-backed tests (`TestAttachSegmentPreviewImageFromReleaseVersion_RejectsForeignAsset`, `TestAttachSegmentPreviewImageFromReleaseVersion_RejectsUnapproved`, `TestSetThemeSegmentAutoPreview_NeverTouchesManualColumn`, `TestResetThemeSegmentManualPreview_ReturnsOldValue`, `TestListSegmentPreviewImageCandidates_EmptyForUnassignedSegment`) plus shared fixture helpers (`setupPreviewSchema`, `setupPreviewWriteFixture`, `createApprovedImageAssetForReleaseVersion`)

## Decisions Made

- Moved the 5 new write methods into a new sibling file (`theme_segment_preview_writes.go`) instead of appending to `theme_segment_preview.go` as the plan's own `<files>` list and PATTERNS.md implied, because appending would have grown `theme_segment_preview.go` from 397 to 581 lines -- past the project's hard 450-line production-file ceiling (CLAUDE.md). This is a pure file-organization split: both files stay in `package repository`, so `ErrNotFound`, `ListThemeSegmentAssignments`, and `publicMediaURLForPath` remain directly callable without new exports or an import cycle.
- Gave `fakeSegmentStreamThemeRepo.SetThemeSegmentAutoPreview` a real, call-recording implementation (not a silent no-op) exactly as the plan's `<action>` text requested, anticipating that Plan 172-04's render-worker wiring tests will assert against `autoPreviewCalls`.

## Deviations from Plan

### Auto-fixed Issues

**1. [CLAUDE.md 450-line limit] Split the new write methods into a new file instead of the plan's named `theme_segment_preview.go`**
- **Found during:** Task 1, immediately after writing the 5 new methods inline into `theme_segment_preview.go` and running `wc -l`.
- **Issue:** The plan's `<files>` list for Task 1 names `backend/internal/repository/theme_segment_preview.go` as the target file for the new write methods. Appending them there (as literally instructed) would have produced a 581-line file, violating CLAUDE.md's "Production code files should stay at or below 450 lines; larger implementations must be split before they become monolithic" constraint, which this project's instructions mark as taking precedence over plan instructions when the two conflict.
- **Fix:** Reverted `theme_segment_preview.go` to its pre-existing 397-line content (byte-identical to the Plan 172-02 commit, confirmed via `git diff --stat` showing no changes) and created `theme_segment_preview_writes.go` (203 lines) in the same package to hold `setThemeSegmentPreviewColumn` plus the 5 new public methods. No behavior change -- same package, same receiver type (`*AdminContentRepository`), same unexported helper visibility.
- **Files modified:** created `backend/internal/repository/theme_segment_preview_writes.go`; `backend/internal/repository/theme_segment_preview.go` ended up with zero net diff from the pre-plan commit.
- **Verification:** `go build ./...`/`go vet ./...` both green; `wc -l` confirms both files (397 and 203 lines) are well under 450.
- **Committed in:** `9bb6c88e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (CLAUDE.md-driven file-organization split, not a behavior change). No scope creep -- the deviation only affects which file the new code lives in, not what it does.

## TDD Gate Compliance

Task 1 carried `tdd="true"` in the plan frontmatter, but the plan's own objective text explains why no RED→GREEN split applies: "Interface + Implementierung + Fake-Updates müssen atomar in einem Plan landen, sonst kompiliert kein Zwischenstand" -- i.e. the interface extension and all 4 dependent test fakes must change in the SAME commit for the package to compile at any point, which is structurally incompatible with a standalone failing-test (RED) commit preceding the implementation. Task 1 was executed as a single `feat(...)` commit; Task 2 (plain `type="auto"`, NOT tdd) added the 5 Postgres-backed tests afterward against the already-correct implementation and is not subject to the RED/GREEN gate at all. No `test(...)` commit preceding `feat(...)` exists for Task 1 -- this is a deliberate, plan-text-justified exception to the mandatory TDD gate sequence, not an oversight.

## Issues Encountered

- **~90 pre-existing full-suite failures, unrelated to this plan.** Running the plan's exact verification command (`go build ./... && go vet ./... && go test ./internal/repository/... ./internal/handlers/... -run "ThemeSegmentPreview|Preview"`) surfaces 3 failures that are NOT caused by this plan: `TestPhase134MatrixOwnerPreviewOfHiddenProfile` (a live Keycloak password-grant call failing with `invalid_grant` -- no live Keycloak test user credentials available in this environment) and `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged`/`TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` (Jellyfin folder-import preview tests matched by the broad `Preview` regex, unrelated to segment preview images). All 3 were independently reproduced against a `git archive` snapshot of the pre-172-03 commit (`05295251`) with the identical failure signatures, confirming they are pre-existing and out of this plan's scope, consistent with the ~90-failure baseline already documented in 172-01-SUMMARY.md and 172-02-SUMMARY.md.
- **All 5 new tests pass; all previously-passing segment/preview/theme tests still pass.** Targeted runs of every test matching `Theme|Preview|Segment` in `internal/repository` and the specific `ReleaseThemeAsset|SegmentRenderWorker|RenderSegment|RangeAutoAssign` suites in `internal/handlers` were all green (the only failures anywhere were the 3 pre-existing ones above).

## User Setup Required

None -- all backend-only changes; no new environment variables, no new migrations (migration 0177 already applied in Plan 172-01).

## Next Phase Readiness

- Plan 172-04 (admin HTTP handlers for upload/picker/attach/reset, plus wiring `SetThemeSegmentAutoPreview` into `executeSegmentRender` post-render and `saveSegmentVideoPreview`'s upload path) can call all 5 repository methods directly -- `SetThemeSegmentManualPreview`, `ResetThemeSegmentManualPreview`, `AttachSegmentPreviewImageFromReleaseVersion`, `ListSegmentPreviewImageCandidates` via `adminThemeRepository`, and `SetThemeSegmentAutoPreview` via `segmentStreamThemeRepository` (`h.themeRepo.(segmentStreamThemeRepository)`).
- `fakeSegmentStreamThemeRepo.autoPreviewCalls`/`autoPreviewOldValue`/`autoPreviewErr` are ready for Plan 172-04's render-worker wiring tests without further fake changes.
- No blockers. The pre-existing, unrelated full-suite failures documented above should continue to be tracked separately, not treated as this plan's responsibility.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`9bb6c88e`, `4c7c1186`) verified present in git history.
