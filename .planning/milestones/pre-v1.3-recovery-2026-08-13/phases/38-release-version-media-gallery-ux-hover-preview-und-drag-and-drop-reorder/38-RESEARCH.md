# Phase 38: Release-Version Media - Research

**Date:** 2026-05-08
**Phase:** 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder
**Status:** Complete
**Source:** Codebase inspection after approved discuss/context

## Goal

Answer the planning question for Phase 38: what already exists in the release-version media stack, which seams are safe to reuse, and which runtime or contract edges must be handled explicitly before adding drag-and-drop reorder plus hover preview UX.

## Findings

### 1. The backend already exposes the needed reorder and patch seams

Confirmed in `backend/internal/handlers/admin_content_release_version_media.go`:
- `PATCH /api/v1/admin/release-versions/:versionId/media/:relationId` already updates a single relation and returns the updated item DTO.
- `POST /api/v1/admin/release-versions/:versionId/media/reorder` already exists and expects:
  - JSON body `{ "items": [{ "id": number, "sort_order": number }, ...] }`
  - all relations must belong to the same release version
- Cross-category moves are not modeled as a separate operation; Phase 38 should stay category-scoped in the frontend and only send reorder payloads for the current category.

Implication:
- No backend schema or route work is required for the intended UX.
- Phase 38 must not invent a second reorder contract.

### 2. The current frontend reorder contract is mismatched and incomplete

Confirmed in `frontend/src/types/releaseVersionMedia.ts` and `frontend/src/lib/api.ts`:
- `ReleaseVersionMediaReorderRequest` is currently typed as `{ ordered_ids: number[] }`
- the backend actually expects `{ items: [{ id, sort_order }] }`
- `reorderReleaseVersionMedia(...)` exists in the API helper but serializes the current frontend type as-is

Confirmed in `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`:
- the hook exposes `patchItem(...)` and `deleteItem(...)`
- there is no reorder helper yet
- `patchItem(...)` updates one item in local state but does not re-sort the full `items` array afterward

Implication:
- Phase 38 needs both:
  - a frontend reorder payload/type correction
  - a local-state re-sort fix after sort-affecting mutations

### 3. The old sort_order UX is still directly present in the detail panel

Confirmed in `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`:
- the detail panel still renders:
  - numeric `sort_order` input
  - `Sortierung speichern` button
- this is the legacy operator flow the user explicitly rejected during discuss-phase

Implication:
- Phase 38 must remove that visible control from the detail panel.
- Reordering becomes a gallery interaction, not a detail-form field.

### 4. The current gallery is category-grouped and already close to a DnD surface

Confirmed in `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx`:
- items are already rendered in stable category sections
- each section derives `categoryItems = items.filter(...)`
- cards are already discrete button elements with thumbnail, caption, preview badge, and open link

Implication:
- category-scoped drag-and-drop can be implemented directly inside the existing per-category `cardGrid`
- the existing category split is a natural guardrail against cross-category drag

### 5. Hover preview does not exist yet; current gallery only shows compact cards

Confirmed in `ReleaseVersionMediaGallery.tsx` and `ReleaseVersionMediaGallery.module.css`:
- cards currently expose only:
  - compact thumbnail stage
  - caption
  - preview badge
  - open link
- there is no hover card, portal, overlay, or enlarged preview seam yet

Implication:
- Phase 38 will add new interaction state to the gallery component itself
- hover preview should stay read-only and scoped to gallery cards

### 6. GIF hover swap is viable with the existing DTO

Confirmed in the backend list response and current item type:
- items already contain both `thumbnail_url` and `original_url`
- thumbnails for GIF uploads are static JPEG frame-0 derivatives
- originals remain stored as the original image file, including animated GIFs

Implication:
- GIF hover animation can be implemented purely in the frontend by swapping rendered `src`
- no new upload variant, transcoding, or backend DTO field is needed

### 7. No DnD or hover-card dependency is currently installed

Confirmed in `frontend/package.json`:
- no `dnd-kit`
- no `@hello-pangea/dnd`
- no `@radix-ui/react-hover-card`
- no `floating-ui`

Implication:
- planning should prefer project-owned seams first:
  - native HTML drag-and-drop for the admin gallery
  - custom hover-card state/positioning in React/CSS
- adding dependencies is possible, but it is not required by the current codebase baseline

### 8. Existing tests already cover the media section well enough to extend safely

Confirmed in `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`:
- tests already cover:
  - upload surface behavior
  - gallery rendering
  - detail panel opening
  - patch/delete flows
  - preview badge visibility
  - non-square preview rendering
- no tests currently cover:
  - live local re-sort after patch
  - reorder payload generation
  - drag/drop interactions
  - hover preview card
  - GIF src swap

Implication:
- Phase 38 can extend the existing test file and keep the regression seam local.

## Risks And Constraints

### 1. Do not reintroduce episode-bound media behavior

Phase 38 stays entirely on the existing release-version media seam. No new domain attachment logic is needed.

### 2. Cross-category drag must remain blocked

Because the backend reorder endpoint is relation/sort-order oriented, the frontend must not treat drag-and-drop as a category-change workflow.

### 3. Local live-reorder and persisted reorder must tell the same story

The user already observed that sort changes were not reflected immediately. Phase 38 must not rely on a full reload as the only visible reorder mechanism.

### 4. Hover interaction must not become an accidental editor

Discuss/context explicitly locked hover preview as read-only for this phase.

## Recommended Planning Split

### Slice 1: Reorder Foundation And UX Replacement

Focus:
- remove legacy sort field from detail panel
- fix local re-sort behavior
- correct frontend reorder contract
- implement category-scoped drag-and-drop persistence

Primary files:
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/releaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`

### Slice 2: Hover Preview Card And GIF Swap

Focus:
- floating read-only hover preview
- large image plus caption
- animated GIF via `thumbnail_url -> original_url` swap on hover
- regression coverage and browser-visible verification

Primary files:
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`

## Planning Recommendation

Plan Phase 38 directly now. Research found no backend blocker and no schema dependency. The critical planning requirement is to encode the contract truth that reorder persists through the existing backend `items[]` payload rather than the stale frontend `ordered_ids` type.
