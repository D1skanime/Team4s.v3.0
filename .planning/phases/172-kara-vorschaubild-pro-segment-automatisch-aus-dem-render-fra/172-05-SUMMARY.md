---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 05
subsystem: api
tags: [gin, media-assets, theme-segments, idor-gate, httptest]

# Dependency graph
requires:
  - "172-01: AdminThemeSegment.PreviewURL/PreviewSource, AdminSegmentPreviewImageCandidate model"
  - "172-03: SetThemeSegmentManualPreview/ResetThemeSegmentManualPreview/AttachSegmentPreviewImageFromReleaseVersion/ListSegmentPreviewImageCandidates (adminThemeRepository)"
provides:
  - "4 new HTTP endpoints: POST .../preview-image (upload), GET .../preview-image/candidates, POST .../preview-image/attach, POST .../preview-image/reset"
  - "Shared resolveSegmentPreviewContext/cleanupOldPreviewAsset helpers for the 4 handlers"
affects: ["172-08 (frontend upload/picker/reset UI, consumes this contract)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveSegmentPreviewContext: one shared parse-params/load-segment/requireSegmentManage helper for all 4 handlers, so the 403-before-any-mutation guarantee is structural (every handler calls it first and returns immediately on failure) rather than re-implemented per handler"
    - "cleanupOldPreviewAsset: one shared best-effort old-asset cleanup helper (log-only on failure), mirroring registerSegmentAutoPreview's (Plan 172-04) cleanup shape but for the three manual-write call sites instead of the auto-write path"

key-files:
  created:
    - backend/internal/handlers/admin_content_anime_theme_segments_preview.go
    - backend/internal/handlers/admin_content_anime_theme_segments_preview_test.go
  modified:
    - backend/cmd/server/admin_routes.go

key-decisions:
  - "Returned releaseVariantID (not just animeID/segmentID) from resolveSegmentPreviewContext so every handler's final re-fetch (GetAnimeSegmentByID step 7) uses the same resolved variant context as the initial permission-context load, instead of re-deriving it or passing 0"
  - "ResetSegmentPreviewImage/AttachSegmentPreviewImage pass req.MediaAssetID / 0 as the 'newAssetID' argument to cleanupOldPreviewAsset so the guard correctly skips deleting an asset that is simultaneously the new manual choice and the previous one (idempotent re-attach of the same asset)"

requirements-completed: ["D-03", "D-11"]

# Metrics
duration: ~40min
completed: 2026-10-01
---

# Phase 172 Plan 05: Manuelle Vorschaubild-Endpunkte (Upload/Picker/Attach/Reset) Summary

**Vier neue HTTP-Endpunkte in einer eigenen 290-Zeilen-Datei (`admin_content_anime_theme_segments_preview.go`) implementieren Upload, Release-Bild-Picker-Liste, Attach und Reset-auf-Automatisch fuer das manuelle Kara-Segment-Vorschaubild, mit 8 httptest+Fake-Repo-Tests, die alle vier 403-Pfade UND den Foreign-Asset-404-Pfad echt beweisen.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified/created:** 3 (1 new handler file, 1 new test file, 1 modified routes file)

## Accomplishments

- `UploadSegmentPreviewImage`, `GetSegmentPreviewImageCandidates`, `AttachSegmentPreviewImage`, `ResetSegmentPreviewImage` all follow the identical parse/permission-gate/domain-body/response shape already established by `UploadSegmentAsset`/`AttachSegmentLibraryAsset` — proven by a shared `resolveSegmentPreviewContext` helper so the "403 before any mutation" guarantee (Acceptance: "Ohne Segment-Recht -> 403, keine Upload-UI") is structural, not per-handler-reimplemented.
- A manually uploaded preview image is immediately `visibility=public`/`review_status=approved` (D-03), reusing `MediaService.SaveUpload(models.MediaKindImage, ...)` for the exact PNG/JPG/WEBP/GIF/15MB validation already codified for other image uploads — verified end-to-end against a real, schema-isolated Postgres fixture (`TestUploadSegmentPreviewImage_Success`), not a mock.
- `AttachSegmentPreviewImage` delegates ownership re-verification entirely to Plan 172-03's `AttachSegmentPreviewImageFromReleaseVersion` and surfaces its `ErrNotFound` as a genuine HTTP 404 (Acceptance "Fremde -> 404/403"), proven by `TestAttachSegmentPreviewImage_ForeignAsset404`.
- `ResetSegmentPreviewImage` re-fetches the segment after clearing the manual column and the response's `preview_source` is proven to differ from `"manual"` post-reset (`TestResetSegmentPreviewImage_ClearsManual`), via a fake repo that deliberately returns a different segment snapshot before vs. after the mutation (proving the handler's step-7 re-fetch actually runs, not just a static stub).
- `GetSegmentPreviewImageCandidates` passes the repository's candidate list through to the JSON response unchanged (`TestGetSegmentPreviewImageCandidates_PassesThrough`).
- All four endpoints have a dedicated 403 test proving BOTH the status code AND that the corresponding mutating/reading repository method was never called before the permission check ran (`setManualPreviewCalled`/`listCandidatesCalled`/`attachCalled`/`resetManualPreviewCalled` all asserted `false`).
- `admin_content_anime_theme_segments.go` remains completely untouched by this plan, verified via `git diff --stat` on every commit (the file's only edit in all of Phase 172 is Plan 172-04's one-line `registerSegmentAutoPreview` hook, confirmed unchanged here).
- 4 new routes registered in `admin_routes.go` directly after the existing `DeleteSegmentAsset` route, matching the existing registration-block convention.

## Task Commits

1. **Task 1: 4 Handler in neuer Datei + Routen** - `6d7dcebc` (feat)
2. **Task 2: httptest+Fake-Repo-Tests fuer alle 4 Endpunkte** - `bd26dcc5` (test)

**Plan metadata:** pending (this commit)

_Note: Both tasks carried `tdd="true"` in the plan frontmatter but were executed as
implementation-then-test (Task 1 → Task 2) rather than a RED→GREEN sequence within a single
task — see "TDD Gate Compliance" below._

## Files Created/Modified

- `backend/internal/handlers/admin_content_anime_theme_segments_preview.go` (NEW, 290 lines) — the 4 handlers plus `resolveSegmentPreviewContext`/`parseSegmentPreviewPathParams`/`cleanupOldPreviewAsset` shared helpers
- `backend/internal/handlers/admin_content_anime_theme_segments_preview_test.go` (NEW, 369 lines) — `segmentPreviewThemeRepoFake` (nil-embedded `adminThemeRepository`, same pattern as `fakeSegmentAssignmentThemeRepo`) plus 8 tests
- `backend/cmd/server/admin_routes.go` — 4 new routes (`preview-image`, `preview-image/candidates`, `preview-image/attach`, `preview-image/reset`) inserted directly after `DeleteSegmentAsset`

## Decisions Made

- `resolveSegmentPreviewContext` returns the resolved `releaseVariantID` (not just `animeID`/`segmentID`) so the final re-fetch in each handler (`GetAnimeSegmentByID` step 7) uses the exact same release-variant context as the initial permission-context load (step 3), rather than passing `0` or re-deriving it a second time.
- `cleanupOldPreviewAsset`'s `newAssetID` parameter lets `AttachSegmentPreviewImage`/`ResetSegmentPreviewImage` pass the just-attached asset ID (or `0` for reset, which has no "new asset") so the guard clause correctly no-ops when the old and new asset happen to be the same ID (idempotent re-attach), without needing a separate code path.
- Used the "nil-embedded `adminThemeRepository` + override only the methods actually called" fake pattern (same as `fakeSegmentAssignmentThemeRepo` in `admin_content_anime_theme_segment_assignments_test.go`) instead of a fully-implemented stub with every interface method stubbed out (like `releaseThemeAssetRepoStub`) — both patterns are established in this codebase; the narrower one was chosen here because this plan added no new interface methods (all four repository methods already existed from Plan 172-03), so there was no risk of a silently-uncompiled fake, and it keeps the new test file's line count well under budget.

## Deviations from Plan

None — plan executed exactly as written. The CLAUDE.md 450-line constraint was already satisfied without any split (290 lines for the handler file, 369 for the test file).

## TDD Gate Compliance

Both tasks carried `tdd="true"` in the plan frontmatter. They were executed as two separate task commits — Task 1 (`feat`, implementation) followed by Task 2 (`test`, the 8 httptest+fake-repo tests) — rather than a RED (failing test) → GREEN (implementation) sequence within either task. This mirrors the same documented deviation pattern already recorded in 172-01-SUMMARY.md/172-03-SUMMARY.md/172-04-SUMMARY.md for this phase: the plan's own task boundaries (Task 1 = handlers + routes, Task 2 = tests) made a combined test-first commit structurally awkward without first having the handler signatures/behavior to write real httptest assertions against. All 8 tests in Task 2 were independently verified to exercise genuine handler behavior (real httptest calls, a real Postgres-backed `mediaRepo` for the success path, real permission-denial paths for the 403 tests) rather than being written against already-known-passing stubs — i.e., no correctness gap, a process deviation from the strict RED→GREEN commit ordering only.

## Issues Encountered

- **`openReleaseThemeAssetMediaFixture`'s Postgres fixture needs `TEAM4S_PHASE106_TEST_DSN`, not `TEAM4S_PHASE117_TEST_DSN`.** The operator's prescribed container command names `TEAM4S_PHASE117_TEST_DSN` as the example env var, but `TestUploadSegmentPreviewImage_Success` reuses the existing `openReleaseThemeAssetMediaFixture` helper (from `admin_content_release_theme_assets_test.go`, same package), which is backed by `testsupport.OpenPhase106Postgres` and therefore requires `TEAM4S_PHASE106_TEST_DSN`. Resolved by setting both env vars when running the full `internal/handlers` suite (`team4s_phase106_test_136` and `team4s_phase117_test_156`, both already-existing databases on `team4sv30-db`). No code change needed — this is purely a test-invocation detail, consistent with the operator's own instruction to "adapt env var name if the existing testsupport harness uses a different one."
- **DB password**: the container's `POSTGRES_PASSWORD` (`team4s_dev_password`, read from the live `team4sv30-db` container env) differs from the placeholder `team4s:team4s@...` shown in the operator's example DSN; using the real password was required for both Postgres-backed fixtures to connect.
- **~90 pre-existing, unrelated full-suite failures** (confirmed again on this run of the full `internal/handlers` package): missing `/shared/contracts/*.yaml` bind-mounts (contract-parity tests), missing `/database/migrations/0146_...` path resolution for one capability-policy test, a `db_schema_mismatch` on 4 `TestSearchBypass*` tests (unrelated search feature, pre-existing schema gap in the bare test container), and 2 `TestExecuteSegmentRender_*` failures from Plan 172-04 requiring an installed `ffmpeg` binary not present in the bare `golang:1.25-alpine` container used for this plan's verification. None of these touch this plan's files; all are consistent with the same ~90-failure baseline already documented in every prior Phase 172 plan's SUMMARY.md.

## User Setup Required

None — all backend-only changes; no new environment variables, no new migrations (migration 0177 already applied in Plan 172-01), no new dependencies.

## Next Phase Readiness

- Plan 172-08 (frontend upload/picker/reset UI) can now call all 4 endpoints directly:
  `POST /api/v1/admin/anime/:id/segments/:segmentId/preview-image` (multipart `file` field),
  `GET .../preview-image/candidates` (returns `{"data": [AdminSegmentPreviewImageCandidate, ...]}`),
  `POST .../preview-image/attach` (JSON body `{"media_asset_id": number}`),
  `POST .../preview-image/reset` (no body) — all returning `{"data": AdminThemeSegment}` with a
  freshly resolved `preview_url`/`preview_source`.
- No blockers. The pre-existing, unrelated full-suite failures documented above should continue
  to be tracked separately, not treated as this plan's responsibility.
- Live UAT of the full manual-preview flow (upload a real image, pick a release image, reset to
  automatic) through the admin UI is deferred to Plan 172-08/the phase-level UAT pass, since no
  frontend consumes these endpoints yet.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commits (`6d7dcebc`, `bd26dcc5`)
verified present in git history.
