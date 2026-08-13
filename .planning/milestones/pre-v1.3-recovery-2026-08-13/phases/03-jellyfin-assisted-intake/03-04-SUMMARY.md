---
phase: 03-jellyfin-assisted-intake
plan: 04
subsystem: create-persistence
tags: [react, nextjs, go, gin, validation, jellyfin]
requires:
  - phase: 03-03
    provides: hydrated shared draft and optional preview state
provides:
  - explicit-save Jellyfin linkage fields
  - backend validation for optional source metadata
  - future-safe create persistence without preview autosave
affects: [phase-04, admin-anime-create, jellyfin-provenance]
tech-stack:
  added: []
  patterns: [explicit linkage on save only, preview remains transient, source normalization]
key-files:
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_validation.go
    - backend/internal/handlers/admin_content_test.go
    - backend/internal/models/admin_content.go
    - backend/internal/repository/admin_content_anime_metadata.go
    - backend/internal/repository/admin_content_anime_audit.go
key-decisions:
  - "Jellyfin linkage is serialized only inside the final create payload, never during search, review, or draft hydration."
  - "The persisted linkage reuses the existing anime.source and anime.folder_name seam instead of inventing a second model."
  - "api.ts stays untouched; the Phase 3 explicit-save helper lives in frontend/src/lib/api/admin-anime-intake.ts."
requirements-completed: [INTK-03, JFIN-04]
duration: 18 min
completed: 2026-03-25
---

# Phase 03 Plan 04: Explicit Save Linkage Summary

**Jellyfin-assisted create now carries source linkage only when the admin actually saves, while the preview and candidate flow stay completely transient.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-25T14:45:00+01:00
- **Completed:** 2026-03-25T15:03:00+01:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Extended the admin anime create payload with optional `source` and `folder_name` fields for Jellyfin-assisted saves.
- Added a dedicated explicit-save helper in `frontend/src/lib/api/admin-anime-intake.ts` so the large `api.ts` file stays untouched.
- Wired the create page to append Jellyfin linkage only when a preview-backed draft is explicitly submitted.
- Added backend validation and normalization for `jellyfin:{series_id}` linkage plus folder-name context, while preserving the existing title-and-cover contract.
- Persisted the linkage through the existing `anime.source` / `anime.folder_name` seam and included it in the create audit payload.

## Verification

- `npm test -- src/app/admin/anime/create/page.test.tsx`
- `go test ./internal/handlers -run "Test.*AdminAnimeCreate.*|Test.*ValidateAdminAnimeCreateRequest.*" -count=1`
- `npm run build`

## Next Phase Readiness

- Phase `03` is ready for end-to-end verification in Docker: the draft stays preview-only until save, but a saved Jellyfin-assisted anime now carries forward its source linkage for later provenance and resync work.

