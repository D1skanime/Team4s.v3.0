---
status: diagnosed
trigger: "Phase 103 HUMAN-UAT test 2: Release gallery layout, lightbox and zero-count expansion"
created: 2026-07-16
updated: 2026-07-16
scope: root-cause-only
---

# Phase 103 — Release image gallery

## Symptom

The release detail renders separate category chapters, can show `Weitere 0 Bilder anzeigen`, and its image cards are not clickable. The accepted UAT truth now requires one responsive grid, the existing public Fansub lightbox with the original and complete description, plus visible category and uploader metadata.

## Root cause

This is a frontend composition/state bug combined with a superseded presentation decision; it is not a release-media ownership or backend visibility defect.

1. `ReleaseGallery` explicitly iterates `RELEASE_VERSION_MEDIA_CATEGORIES` and creates one `<section>` per category (`ReleaseGallery.tsx:50-58`). Therefore a single grid is structurally impossible even though all items already share one `items` state array.
2. The reveal button condition is logically too broad: `!expanded[category] || categoryItems.length < categoryTotal` (`ReleaseGallery.tsx:57`) renders the button for every initially collapsed category, including categories whose complete set is already loaded. Its label subtracts `Math.min(6, categoryItems.length)` from the total, so a complete six-image category displays `Weitere 0 Bilder anzeigen`. Clicking it only flips `expanded`; `expand()` immediately returns when `existing.length >= categoryTotals[category]` (`ReleaseGallery.tsx:28-31`), which correctly performs no fetch but makes the visible control appear broken.
3. The reveal count is split between CSS and hard-coded desktop arithmetic. CSS hides after 6/4/2 cards at desktop/tablet/mobile (`ReleaseGallery.module.css:4,7-8`), while the button always calculates against `6` (`ReleaseGallery.tsx:57`). Thus the label cannot be correct per breakpoint.
4. `GalleryImage` renders a plain `<figure>` and `<img>` without a button, selection index, or lightbox state (`ReleaseGallery.tsx:12-17`). No click path can open an original.
5. Phase 103 created a parallel gallery presentation instead of reusing the established public Fansub seam. `FansubGroupMediaBlock` already owns clickable thumbnail triggers, active global index, inline reveal, category tag, and `FansubMediaLightbox` integration (`FansubGroupMediaBlock.tsx:49-56,68-79,83-156`). `FansubMediaLightbox` already uses the global `Modal`, resolves `original_url`, shows the full description, supports previous/next and keyboard navigation, and restores focus through `Modal` (`FansubMediaLightbox.tsx:23-29,56-100`).
6. The release DTO is close but not directly assignable: `PublicReleaseImage` has `caption`, `category`, `author_name`, thumbnail/original URLs (`releaseDetail.ts:13-22`), while `FansubMediaLightbox` accepts `PublicFansubMediaItem` and reads `title`, `caption`, `description`, `media_type`, and `mime_type` (`fansub.ts:173-183`; `FansubMediaLightbox.tsx:56-59`). A small adapter or a generalized image-lightbox item contract is required; a second release-only lightbox is not.

## Evidence against backend/data root cause

- The aggregate already returns one flat `images: PublicReleaseImage[]` plus category totals (`releaseDetail.ts:84-94`). The category split happens only during rendering with `items.filter(...)`.
- `getGroupReleaseImages` is already a release-version-scoped, category-paginated fetch used by the component (`ReleaseGallery.tsx:37`). No episode-level or legacy `release_media` substitution is involved.
- Original URLs are already present in `PublicReleaseImage` and the card even falls back to them for display (`ReleaseGallery.tsx:13`); the missing original view is purely lack of lightbox wiring.
- The existing test asserts category separation (`ReleaseGallery.test.tsx`, test name `keeps category chapters separate...`), so automated coverage encoded the old decision and could not catch the newly accepted UAT truth.

## Suggested fix direction (do not implement in this debug session)

1. Keep the canonical release-version image DTO/API and category-scoped pagination. Flatten loaded images into one stable, deduplicated ordered list for rendering.
2. Replace category chapter rendering with one responsive grid. Show category and `author_name` on every card; clamp the card caption with CSS while retaining the full caption for the lightbox adapter.
3. Reuse/generalize `FansubMediaLightbox` rather than copying it. Prefer extracting a narrow shared public-image lightbox item contract (original URL, title, description) that both `PublicFansubMediaItem` and adapted `PublicReleaseImage` can satisfy. Preserve global `Modal`, original-image loading, keyboard navigation, Escape/focus return, and counter behavior.
4. Make every thumbnail a semantic button carrying its global index. Lightbox navigation must use the complete currently loaded flat list.
5. Replace per-category `expanded` state with one explicit visible-count/reveal seam like `FansubGroupMediaBlock`. Render a reveal control only when `loaded/total > visibleCount`; never derive the label from a fixed desktop value. If not all server items are loaded, fetch remaining category pages behind the unified reveal action, merge/dedupe, then reveal.
6. Rewrite the focused gallery test: assert one grid, clickable images, original/full caption in the reused lightbox, category/uploader metadata, responsive/reveal state, deduplication, and absence of any zero-count button. Remove the old assertion that category chapters remain separate.

## Files implicated

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx`
- `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` (reuse reference)
- `frontend/src/components/fansubs/FansubMediaLightbox.tsx` (reuse/generalization target)
- `frontend/src/components/fansubs/FansubMediaLightbox.module.css` (existing visual behavior)
- `frontend/src/types/releaseDetail.ts`
- `frontend/src/types/fansub.ts`

## Current focus

- hypothesis: confirmed
- next_action: create a narrow UAT gap-closure plan using the existing public Fansub lightbox seam; no backend ownership or schema change required
