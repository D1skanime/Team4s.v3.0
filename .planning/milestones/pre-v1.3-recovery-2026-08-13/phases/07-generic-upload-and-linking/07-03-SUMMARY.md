---
phase: 07-generic-upload-and-linking
plan: 03
subsystem: ui
tags: [react, nextjs, typescript, vitest, admin-upload, anime-assets, jellyfin]
requires:
  - phase: 07-generic-upload-and-linking
    provides: generic asset-kind upload-and-link mutation seam plus verified anime asset routes
provides:
  - extracted edit-route upload controls for banner, logo, background, and background_video
  - delegated Jellyfin metadata shell that no longer hardcodes non-cover upload state
  - shared patch-form access to the generic upload-and-link seam for non-cover assets
affects: [admin-anime-edit, admin-anime-create, phase-08-lifecycle-cleanup]
tech-stack:
  added: []
  patterns:
    - delegated edit upload controls with shared upload-target config
    - metadata helper extraction to enforce the production file-size ceiling
key-files:
  created:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/animeJellyfinAssetUpload.ts
  modified:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx
    - frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx
    - frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx
    - frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts
    - frontend/src/app/admin/anime/[id]/edit/page.test.tsx
key-decisions:
  - "Keep cover, banner, logo, and background_video as singular replacement slots while preserving additive background uploads."
  - "Split metadata copy/helpers out of AnimeJellyfinMetadataSection.tsx to stay under the CLAUDE.md 450-line limit instead of letting the edit shell remain oversized."
patterns-established:
  - "Edit-route non-cover asset controls live in a dedicated component backed by shared upload-target metadata."
  - "Route-level helper tests can assert delegated source wiring by reading both the shell and extracted helper/config files."
requirements-completed: [UPLD-01, UPLD-02, UPLD-03]
duration: 10 min
completed: 2026-04-05
---

# Phase 07 Plan 03: Generic Upload And Linking Summary

**Edit-route Jellyfin provenance now exposes manual logo and background-video uploads through extracted non-cover asset controls and the shared V2 upload seam**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-04T22:07:00Z
- **Completed:** 2026-04-04T22:17:05Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added failing regression coverage that pinned the edit-route reachability gap for `logo` and `background_video` before implementation.
- Extracted non-cover upload state, config, and UI into dedicated edit-page files so the visible admin edit route now exposes `Logo hochladen` and `Background-Video hochladen`.
- Exposed `uploadAndLinkAsset` through the shared patch form for non-cover assets and refreshed operator copy to reference the same verified V2 seam.

## Task Commits

1. **Task 1: Add failing edit-route regression coverage for non-cover manual asset reachability** - `5f59277` (test)
2. **Task 2: Wire the generic asset-kind mutation seam into the reachable edit UI** - `d3e1eca` (feat)

## Files Created/Modified

- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` - Owns the reachable banner/logo/background/background-video upload and removal controls.
- `frontend/src/app/admin/anime/components/AnimeEditPage/animeJellyfinAssetUpload.ts` - Centralizes the edit upload-target labels, status copy, and slot semantics.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx` - Reduced to a Jellyfin metadata shell that delegates non-cover asset actions.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.ts` - Holds helper copy and provider asset-card shaping so the shell stays within the line cap.
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx` - Adds non-cover buttons that invoke `uploadAndLinkAsset`.
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx` - Broadens operator copy to reflect the shared V2 asset seam.
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` - Re-exports `uploadAndLinkAsset` from the mutation hook to the shared patch surface.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts` - Verifies logo/background-video copy is manually actionable and backgrounds stay additive.
- `frontend/src/app/admin/anime/[id]/edit/page.test.tsx` - Verifies the edit shell delegates to extracted controls and keeps non-cover copy free of `provider-only`.

## Decisions Made

- Kept the provider preview/apply logic in `AnimeJellyfinMetadataSection.tsx` and moved only non-cover asset operations into a dedicated control component so the edit shell stays focused.
- Reused the existing asset-kind seam in the shared patch layer instead of introducing new slot-specific patch actions for logo or background video.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a helper module to satisfy the project file-size ceiling**
- **Found during:** Task 2 (Wire the generic asset-kind mutation seam into the reachable edit UI)
- **Issue:** After extracting controls, `AnimeJellyfinMetadataSection.tsx` still exceeded the CLAUDE.md 450-line limit at 514 lines.
- **Fix:** Moved pure helper logic into `AnimeJellyfinMetadataSection.helpers.ts` and re-exported the tested helpers from the metadata shell.
- **Files modified:** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`, `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.ts`
- **Verification:** Line counts show `AnimeJellyfinMetadataSection.tsx` at 392 lines and targeted Vitest coverage still passes.
- **Committed in:** `d3e1eca` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The adjustment was required to satisfy repo constraints without changing the intended UI behavior.

## Issues Encountered

- The first implementation left the manual upload labels only in the shared config file and still used a negated `provider-only` phrase in fallback copy. The source assertions were updated to follow the extracted config, and the fallback copy was rewritten to remove the forbidden wording.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The active admin edit route now exposes manual controls for banner, logo, background, and background video on top of the verified Phase 07 seam.
- Create-route parity work can build on the same shared upload-target semantics without reopening slot-specific behavior.

## Self-Check: PASSED

- Found `.planning/phases/07-generic-upload-and-linking/07-03-SUMMARY.md`
- Found commit `5f59277`
- Found commit `d3e1eca`

---
*Phase: 07-generic-upload-and-linking*
*Completed: 2026-04-05*
