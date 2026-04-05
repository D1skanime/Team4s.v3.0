# Phase 07 Research - Generic Upload And Linking

**Date:** 2026-04-04
**Status:** Complete

## Research Question

What do we need to know to plan Phase 7 well so the verified Phase 06 cover seam can expand to `banner`, `logo`, `background`, and `background_video` without reviving slot-specific legacy behavior?

## Current Verified Baseline

- `backend/internal/handlers/media_upload.go` already exposes the shared admin upload seam at `/api/v1/admin/upload`.
- The upload seam normalizes asset aliases into the canonical lifecycle names:
  - `poster -> cover`
  - `gallery -> background`
  - `video -> background_video`
- Phase 06 already validated the server-side provisioning and V2-first folder contract for the anime cover path.
- The edit flow uses the same upload seam for cover re-upload, and cover removal now cleans up V2 ownership correctly.

## Current Implementation Shape

### Backend

- `backend/internal/handlers/media_upload.go` is already the correct intake seam for Phase 7 because it limits uploads to `anime`, normalizes asset aliases, provisions the canonical layout before file writes, and persists through the current V2-oriented upload path.
- `backend/internal/repository/anime_assets.go` already contains V2 helpers for singular asset linking on cover/poster and banner, plus additive background linking.
- The repository already has a reusable singular linking helper: `assignManualSingularAssetV2(ctx, animeID, mediaRef, mediaType)`.
- The admin asset handlers are still inconsistent:
  - cover has dedicated assign/remove endpoints
  - banner has dedicated assign/remove endpoints
  - background has add/remove endpoints
  - there is no equivalent admin handler path yet for `logo`
  - there is no equivalent admin handler path yet for `background_video`

### Frontend

- `frontend/src/lib/api.ts` already uploads through `/api/v1/admin/upload`, but `uploadAdminAnimeMedia` still types `assetType` as only `poster | banner | gallery`.
- The create route and edit route remain cover-first in their UI and hook structure.
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts` hardcodes the cover upload+assign flow.
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx` still contains outdated legacy text that says local upload writes to `frontend/public/covers`, which conflicts with the verified Phase 06 seam.
- The draft/create side already understands Jellyfin asset slots for `cover`, `logo`, `banner`, `background`, and `background_video`, so the product vocabulary is in place even though the manual upload/linking workflow is not yet generalized.

## Main Gaps To Close In Phase 7

### 1. Upload is generic, linking is not yet generic

The shared upload endpoint is already close to Phase 7 shape, but the admin linking API remains slot-by-slot. The repo has reusable V2 helpers, yet the HTTP contract and client usage still expose separate code paths.

### 2. Client typing blocks the full slot set

The browser upload helper does not allow `logo` or `background_video`, and it uses the legacy alias `gallery` instead of the canonical `background` naming the rest of the system is moving toward.

### 3. UI state and mutations are still cover-centric

The edit hook and manual create flow model cover as a one-off feature instead of a generic pattern. That structure will not scale cleanly to the four remaining asset types without introducing more slot-specific duplication.

### 4. Background versus singular-slot semantics need to stay explicit

The system already distinguishes:
- singular slots: `cover`, `banner`
- plural slot: `background`

Phase 7 adds:
- singular slot: `logo`
- singular slot: `background_video`

Plans should preserve this distinction so the API shape stays predictable.

## Recommended Technical Direction

### Recommendation A: Keep `/api/v1/admin/upload` as the only upload seam

Do not add new slot-specific upload endpoints. Phase 7 should route all supported anime asset types through the same existing upload contract and only expand the typed inputs plus linking helpers.

### Recommendation B: Add one generic admin anime asset-linking contract

Introduce a thin admin handler/repository contract that can:
- assign a singular asset to `cover`, `banner`, `logo`, or `background_video`
- add a background asset to the ordered background collection
- remove links through the existing slot-aware semantics

### Recommendation C: Generalize the frontend around asset slot config, not cover-specific hooks

The frontend should move toward a small config table keyed by asset kind: upload label, accepted file type, upload asset type, link mutation, remove mutation, and preview resolver.

### Recommendation D: Keep cleanup behavior out of Phase 7 except where already verified

Phase 7 should not absorb the full replace/delete cleanup problem reserved for Phase 8. It should preserve already verified cover behavior, ensure newly linked assets use the same ownership path, and leave broader cleanup semantics to the next phase.

## Files And Seams Most Relevant To Planning

### Backend sources of truth

- `backend/internal/handlers/media_upload.go`
- `backend/internal/handlers/admin_content_anime_assets.go`
- `backend/internal/repository/anime_assets.go`
- `backend/internal/models/anime_assets.go`
- `backend/internal/models/media_upload.go`

### Frontend sources of truth

- `frontend/src/lib/api.ts`
- `frontend/src/types/admin.ts`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx`
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx`
- `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts`

## Risks

- Alias drift between upload and link layers if the frontend keeps speaking in `poster/banner/gallery` while the link layer expects canonical slot names.
- New slots copying the old cover-specific structure and increasing duplication instead of reducing it.
- Phase 8 cleanup work leaking backward and reopening the already verified cover lifecycle instead of extending it.

## Validation Architecture

Phase 7 should validate at three layers:

1. Backend repository and handler tests
- prove singular-slot linking works for `banner`, `logo`, and `background_video`
- prove background linking stays additive
- prove invalid media references or wrong media types fail cleanly

2. Frontend API/helper tests
- prove the upload helper supports the full Phase 7 asset set
- prove structured API errors remain intact for new asset-linking calls

3. Targeted UI tests
- prove create/edit can start upload+link flows for the supported asset types
- prove slot-specific UI copy no longer points to legacy `frontend/public/covers`

## Planning Implications

Phase 7 should split cleanly into:

1. Backend generic linking and contract hardening
2. Frontend create/edit asset workflow generalization

## Research Conclusion

The repo is already closest to success when it treats Phase 7 as a linking-and-client generalization phase, not a new upload phase. The upload seam exists; the work now is to make every supported anime asset slot consume that seam consistently through one V2-first contract.
