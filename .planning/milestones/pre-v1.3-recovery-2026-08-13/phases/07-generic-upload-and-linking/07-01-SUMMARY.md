---
phase: 07-generic-upload-and-linking
plan: 01
subsystem: api
tags: [go, gin, postgres, openapi, media, upload, anime]
requires:
  - phase: 06-provisioning-and-lifecycle-foundations
    provides: verified anime-first V2 upload seam, provisioning lifecycle rules, and cover cleanup baseline
provides:
  - generic V2 anime asset slot mapping for cover, banner, logo, background, and background_video
  - admin upload and linking contract documentation for the shared /api/v1/admin/upload seam
  - explicit media-type mismatch handling for slot-aware asset linking
affects: [phase-07-frontend-generalization, admin-media-contract, anime-backdrops]
tech-stack:
  added: []
  patterns: [slot-spec driven V2 asset linking, shared media_id request body for singular anime asset assignment, persisted asset resolution before Jellyfin fallback]
key-files:
  created: []
  modified:
    - backend/internal/repository/anime_assets.go
    - backend/internal/handlers/admin_content_anime_assets.go
    - backend/internal/handlers/anime_backdrops_handler.go
    - shared/contracts/openapi.yaml
key-decisions:
  - "Keep external slot names cover/banner/logo/background/background_video while translating background_video to media_type video inside the V2 repository seam."
  - "Surface persisted logo and background video URLs through the existing anime backdrop manifest so manual uploads resolve from stored V2 links before Jellyfin fallback."
  - "Use one JSON request body shape { media_id } for every singular admin anime asset assignment route."
patterns-established:
  - "Anime asset slot specs centralize singular-vs-collection behavior and media-type validation."
  - "Handler error mapping translates repository media-type mismatches into explicit German operator messages per slot."
requirements-completed: [UPLD-01, UPLD-02, UPLD-03]
duration: 13min
completed: 2026-04-04
---

# Phase 07 Plan 01: Generic Upload Backend Contract Summary

**Shared anime upload now links cover, banner, logo, background, and background_video through one V2 slot contract with documented admin endpoints and persisted URL resolution**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-04T23:02:00+02:00
- **Completed:** 2026-04-04T23:14:57+02:00
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added red-green backend coverage for Phase 7 slot semantics, including logo/background_video and media-type mismatch handling.
- Generalized the repository and admin handlers so singular slots share one V2 link path while backgrounds stay additive and ordered.
- Synced OpenAPI with the active `/api/v1/admin/upload` seam and the admin anime asset-linking endpoints that accept `media_id`.

## Task Commits

1. **Task 1: Add failing backend coverage for generic anime asset linking across singular and collection slots** - `87aeced` (test)
2. **Task 2: Implement the reusable backend linking contract for all supported anime asset types** - `f0dac6c` (feat)
3. **Task 3: Sync the active admin upload and linking contract into OpenAPI** - `556b30b` (docs)

## Files Created/Modified
- `backend/internal/repository/anime_assets.go` - Central slot spec, media-type validation, and V2 link helpers for logo/background_video plus existing slots.
- `backend/internal/handlers/admin_content_anime_assets.go` - Added logo and background_video assign/clear handlers with explicit operator-safe mismatch messages.
- `backend/internal/handlers/anime_backdrops_handler.go` - Prefer persisted logo and background video URLs over Jellyfin fallback for resolved asset playback/display.
- `backend/internal/handlers/jellyfin_metadata_resync.go` - Expose persisted logo and background_video state in admin Jellyfin context payloads.
- `backend/internal/models/anime_assets.go` - Expanded resolved asset model with logo and background_video fields.
- `backend/internal/models/admin_content.go` - Expanded persisted admin asset payloads for logo and background_video.
- `backend/internal/repository/anime.go` - Added shared `ErrAnimeAssetMediaTypeMismatch` sentinel for slot-aware handler mapping.
- `backend/internal/repository/anime_test.go` - Added Phase 7 slot-spec and mismatch regression coverage.
- `backend/internal/handlers/admin_content_test.go` - Added invalid-id, mismatch-message, and upload alias normalization coverage.
- `backend/cmd/server/admin_routes.go` - Registered logo and background_video admin routes.
- `shared/contracts/openapi.yaml` - Documented upload and admin anime asset-linking endpoints with `media_id` request bodies.

## Decisions Made

- Kept one upload seam at `/api/v1/admin/upload`; no slot-specific upload endpoints were introduced.
- Mapped `background_video` to stored media type `video` in the repository layer so upload and linking stay aligned with existing media type seeds.
- Used the anime backdrop manifest as the existing runtime read path for persisted logo and theme-video URL resolution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended runtime read paths so new slots are actually reachable and resolvable**
- **Found during:** Task 2 (Implement the reusable backend linking contract for all supported anime asset types)
- **Issue:** Adding logo/background_video link handlers alone would leave the new slots unreachable from registered routes and unresolved in the anime backdrop manifest, causing fallback behavior instead of the intended V2 path.
- **Fix:** Added admin route registration for logo/background_video and updated persisted asset read models plus backdrop resolution to prefer stored V2 links.
- **Files modified:** `backend/cmd/server/admin_routes.go`, `backend/internal/handlers/anime_backdrops_handler.go`, `backend/internal/handlers/jellyfin_metadata_resync.go`, `backend/internal/models/admin_content.go`, `backend/internal/models/anime_assets.go`
- **Verification:** `go test ./internal/repository ./internal/handlers -count=1`
- **Committed in:** `f0dac6c`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for correctness. It kept the Phase 7 contract on the V2 path instead of leaving the new slots as dead or fallback-only surfaces.

## Issues Encountered

- PowerShell rejected `&&` during the first commit attempt; switched to PowerShell-native sequencing.
- No YAML parser was available locally, so OpenAPI verification used targeted contract-string checks instead of a structural parse.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend slot support and contract docs are ready for frontend wiring to `logo` and `background_video`.
- Manual browser verification from the plan output remains pending; no local upload/link UAT was run in this execution pass.

## Self-Check

PASSED

- Found summary file at `.planning/phases/07-generic-upload-and-linking/07-01-SUMMARY.md`.
- Verified task commits `87aeced`, `f0dac6c`, and `556b30b` exist in git history.
- Stub scan across touched implementation files found no placeholder patterns that block the plan goal.

---
*Phase: 07-generic-upload-and-linking*
*Completed: 2026-04-04*
