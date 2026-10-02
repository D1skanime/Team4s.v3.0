---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 06
subsystem: media
tags: [go, imaging, jpeg, gin, profile, story-image, postgres]

# Dependency graph
requires:
  - phase: 173-01
    provides: "the original display-variant generation building block (static JPEG long-edge cap) this plan's story-image flow mirrors conceptually, though it reuses 173-05's capLongEdgeAndSaveJPEG directly rather than processImage"
  - phase: 173-05
    provides: "capLongEdgeAndSaveJPEG (app_profile_display.go, package handlers) -- the exact long-edge-cap/JPEG-re-encode helper this plan calls for the story-image display file, and the AttachUploadedAvatar/Background transactional media_files-insert pattern this plan's InsertStoryImageAsset mirrors"
provides:
  - "UploadOwnProfileStoryImage now writes a true 1:1 original (EXIF-stripped only, never resized) alongside a long-edge-capped (<=1920px, never upscaled) display.jpg; media_assets.file_path keeps pointing at the display file (D-15 fix)"
  - "StoryImageUploadInput.OriginalFilePath/OriginalWidth/OriginalHeight/OriginalSizeBytes fields"
  - "InsertStoryImageAsset inserts the true original as a media_files variant='original' row atomically (single transaction with the media_assets insert), omitted gracefully when OriginalFilePath is empty"
affects: [173-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "story-image upload reuses 173-05's capLongEdgeAndSaveJPEG directly (same package handlers) instead of duplicating long-edge-cap/JPEG-encode logic -- display-variant generation constants kept in a dedicated sibling file (app_profile_story_image_display.go) purely to avoid confusing story-image-specific constant names with the already-defined avatar/background ones"
    - "InsertStoryImageAsset wraps the media_assets INSERT + conditional media_files variant='original' INSERT in one pgx transaction, mirroring AttachUploadedAvatar/AttachUploadedBackground's existing tx.BeginTx/defer Rollback/Commit shape"

key-files:
  created:
    - backend/internal/handlers/app_profile_story_image_display.go
    - backend/internal/repository/member_profile_story_image_original_test.go
  modified:
    - backend/internal/handlers/app_profile_story_image.go
    - backend/internal/handlers/app_profile_story_image_test.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_story_image_repository.go

key-decisions:
  - "media_assets.mime_type for story images is now hardcoded to 'image/jpeg' (it is paired with FilePath, which is always the re-encoded display.jpg -- never the original's source format) instead of the originally-detected upload mimeType, since the field tracks 'the file actually at file_path', not the upload's source format"
  - "No OriginalMimeType field was added to StoryImageUploadInput -- media_files has no mime_type column (matching the existing avatar/background variant='original'/'display' insert shape), so only the display-file's media_assets.mime_type needed updating"
  - "Display-variant constants (storyImageDisplayLongEdge=1920, storyImageDisplayJPEGQuality=88) live in a new sibling file rather than inline in app_profile_story_image.go, both to stay well under the CLAUDE.md 450-line budget and to avoid name confusion with 173-05's identically-shaped avatar/background constants in app_profile_display.go"

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-06, REQ-173-08, REQ-173-20]

# Metrics
duration: 50min
completed: 2026-10-02
---

# Phase 173 Plan 06: Story-Image True-Original + Display-Variant Split (D-15 fix) Summary

**Resolved the D-15/D-06 contradiction: new story-image uploads now store a true unresized 1:1 original (`media_files` `variant='original'` row) plus a separate 1920px-capped `display.jpg` that keeps occupying `media_assets.file_path` — the old code resized to 1600px and called that single file "original," so a true original never existed.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-10-02T19:40:00Z (approx.)
- **Completed:** 2026-10-02T19:57:00Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `UploadOwnProfileStoryImage` now decodes the upload once and writes TWO files: `original.<ext>` (the untouched decoded image, EXIF-stripped only via `imaging.Save`'s re-encode, never resized) and `display.jpg` (long edge capped at 1920px via 173-05's `capLongEdgeAndSaveJPEG`, never upscaled)
- `media_assets.file_path` keeps pointing at `display.jpg` — the exact slot the old 1600px file occupied — so the embedded `<img src>` in rendered story HTML (TipTap editor round-trip, D-21) is completely unaffected
- `StoryImageUploadInput` gained `OriginalFilePath`/`OriginalWidth`/`OriginalHeight`/`OriginalSizeBytes`, populated from the pre-resize `image.DecodeConfig` dimensions and the saved original file's real size — never from the capped display dimensions
- `InsertStoryImageAsset` now runs inside a single pgx transaction: the existing `media_assets` INSERT plus (when `OriginalFilePath` is non-empty) a new `media_files` `variant='original'` INSERT, so a failed original-row insert can never leave an orphaned display-only asset
- Existing (pre-phase) story-image rows are completely untouched by this plan — confirmed with a dedicated Postgres-backed test that simulates a pre-phase row (no `media_files` child at all) and proves `GetStoryImageAssetByID`/`GetStoryImageAssetsByMember` still resolve it unchanged
- No new HTTP route registered — `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98

## Task Commits

Each task was committed atomically:

1. **Task 1: Store a true 1:1 original + a capped display file for new story-image uploads** - `7ef8ed23` (feat)
2. **Task 2: Persist the true original as a media_files row; verify old rows stay untouched** - `d057dd8d` (feat)

**Plan metadata:** (pending — see below)

## Files Created/Modified

- `backend/internal/handlers/app_profile_story_image_display.go` (new) - `storyImageDisplayLongEdge`/`storyImageDisplayJPEGQuality` constants; thin doc comment explaining the reuse of 173-05's `capLongEdgeAndSaveJPEG`.
- `backend/internal/handlers/app_profile_story_image.go` - `UploadOwnProfileStoryImage` writes `original.<ext>` (unresized) + `display.jpg` (capped), passes both paths/dims to the extended `StoryImageUploadInput`, and returns `public_url` pointing at the display file. Doc comment updated to describe the new two-file behavior. 441 lines (budget: 450).
- `backend/internal/handlers/app_profile_story_image_test.go` - 2 new tests: `TestUploadOwnProfileStoryImage_StoresTrueOriginalAndCappedDisplay` (3000x2000 upload: original stays 3000x2000, display is capped <=1920px, `FilePath` points at display not original) and `TestUploadOwnProfileStoryImage_SmallImageOriginalAndDisplayBothUnresized` (1200x800 upload: both files stay 1200x800, proving the true original is never resized and the display file is never upscaled).
- `backend/internal/handlers/app_auth_test.go` - `profileRepoStub.InsertStoryImageAsset` now captures `insertStoryImageCalls`/`lastInsertStoryImageArg` (previously a no-op stub returning `(0, nil)`), needed to assert on the `StoryImageUploadInput` the handler builds.
- `backend/internal/models/member_profile.go` - `StoryImageUploadInput` gained the 4 new `Original*` fields; doc comment clarifies FilePath/Width/Height/SizeBytes still mean "the rendered display file."
- `backend/internal/repository/member_profile_story_image_repository.go` - `InsertStoryImageAsset` wrapped in a `pgx.TxOptions{}` transaction; conditional second INSERT into `media_files` for the true original.
- `backend/internal/repository/member_profile_story_image_original_test.go` (new) - 3 Postgres-backed tests (`testsupport.OpenPhase106Postgres`, skip without `TEAM4S_PHASE106_TEST_DSN`): insert-creates-original-row, insert-omits-row-when-empty, and the pre-existing-row-untouched regression.

## Decisions Made

See `key-decisions` in the frontmatter for the `mime_type`-now-tracks-display-format, no-`OriginalMimeType`-field, and sibling-file-for-constants rationale.

## Deviations from Plan

None — plan executed exactly as written. The one notable pre-existing gap discovered while implementing (WebP story-image uploads already fail outright via `imaging.Save`, since `imaging` cannot encode WebP) was explicitly out of scope per the plan's own instruction to preserve "the same mechanism as today" for the original write, and is logged below rather than auto-fixed.

## Issues Encountered

- **Pre-existing WebP story-image original-encode gap (not caused by, or fixed in, this plan):** `storyImageAllowedMimeTypes` allows `image/webp`, but `imaging.Save` (the library used for the true-original write) cannot encode WebP at all — confirmed by inspecting the vendored module's `io.go` (no WebP case in its encoder dispatch), matching 173-01's identical finding for the global uploader's WebP-thumb path. This bug already existed in the pre-plan code (the single 1600px "original" file also used `imaging.Save` with a `.webp` destination) and this plan's Task 1 action text explicitly instructs preserving that exact mechanism for the original write. Fixing it would require decoupling the original's extension from the detected mime type and raw-copying WebP bytes (mirroring 173-01's/173-05's established pattern) — a materially larger change than this plan's narrow D-15 scope. Logged as a new entry in `deferred-items.md` (section "173-06: pre-existing WebP story-image original-encode gap") with a concrete suggested follow-up.
- **`TEAM4S_PHASE106_TEST_DSN` not set by default in this session's shell** (expected, documented project pattern): created a disposable `team4s_phase106_test_<suffix>` database via `docker compose exec -T team4sv30-db createdb`, ran all 3 new Postgres-backed repository tests live against it (all PASS), then dropped the database (`dropdb --force`). Confirmed the test-DSN database-name validator requires `^team4s_phase106_test_[a-z0-9]+$` (no underscores after the prefix) — adjusted the generated name accordingly.
- **Docker Compose Watch was running this session** (unlike the gap flagged in several prior 173-* plans) — host-filesystem edits synced into `team4sv30-backend` automatically; verified via `md5sum` parity before every build/test run, no `docker cp` workaround needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `StoryImageUploadInput`'s extended shape and `InsertStoryImageAsset`'s new transactional `media_files` insert are ready for 173-07's backfill CLI, which per 173-05's summary must instead add a `variant='display'` row for pre-existing rows (reusing their existing file, never inventing a true original for them — D-15 explicitly rules that out).
- The pre-existing WebP story-image upload gap (documented in `deferred-items.md`) and the open items already accumulated from 173-04/173-05 are the only known gaps; no blockers identified for 173-07.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*
