// Pure sizing/fit helpers for Team4sCropper's wide- and portrait-format correction (Live-UAT
// Phase 180, 2026-10-12 + the Anime-Cover crop follow-up the same day). Kept as plain functions
// so the regression/extension can be covered by direct unit tests instead of render/click
// simulation.

/** Above this crop aspect ratio, the viewport gets extra vertical room and the image fills
 * the viewport's width instead of being letterboxed down to the crop ratio's own tiny height. */
export const WIDE_CROP_ASPECT_THRESHOLD = 2

/** Below this crop aspect ratio, the crop is "portrait" (clearly taller than wide, e.g. the
 * Anime-Cover 2:3 ≈ 0.667) -- symmetric to WIDE_CROP_ASPECT_THRESHOLD but for the other extreme. */
export const PORTRAIT_CROP_ASPECT_THRESHOLD = 0.8

/** How many times taller than the bare crop-frame height the wide viewport becomes, so the
 * user can see (and vertically pan through) image content above/below the frame. */
const WIDE_VIEWPORT_HEIGHT_FACTOR = 2.2

/** How many times wider than the bare crop-frame width the portrait viewport becomes, so the
 * user can see (and horizontally pan through) image content left/right of the frame, instead of
 * a narrow, cramped column. */
const PORTRAIT_VIEWPORT_WIDTH_FACTOR = 1.8

export function isWideCropAspect(aspectRatio: number): boolean {
  return aspectRatio > WIDE_CROP_ASPECT_THRESHOLD
}

export function isPortraitCropAspect(aspectRatio: number): boolean {
  return aspectRatio < PORTRAIT_CROP_ASPECT_THRESHOLD
}

/**
 * CSS `aspect-ratio` value for the crop viewport container itself.
 * - Square/near-square crops (between the two thresholds): unchanged -- the container's own
 *   ratio equals the crop ratio, exactly like today (avatar crop stays as-is).
 * - Wide crops: the container is made relatively taller than the crop ratio
 *   (aspectRatio / WIDE_VIEWPORT_HEIGHT_FACTOR) so react-easy-crop's own frame-fitting
 *   (getCropSize) centers a full-width crop frame with visible vertical margin, instead of
 *   squeezing the whole viewport down to the crop ratio's own tiny height.
 * - Portrait crops: symmetric correction -- the container is made relatively wider than the
 *   crop ratio (aspectRatio * PORTRAIT_VIEWPORT_WIDTH_FACTOR) so a landscape-oriented source
 *   image has visible horizontal pan room instead of a tiny, cramped portrait sliver.
 */
export function computeCropViewportAspectRatio(aspectRatio: number): number {
  if (isWideCropAspect(aspectRatio)) return aspectRatio / WIDE_VIEWPORT_HEIGHT_FACTOR
  if (isPortraitCropAspect(aspectRatio)) return aspectRatio * PORTRAIT_VIEWPORT_WIDTH_FACTOR
  return aspectRatio
}

/**
 * react-easy-crop `objectFit` value: wide crops fill the viewport's width (image covers
 * horizontally, vertical panning selects the visible slice); portrait crops fill the viewport's
 * height (image covers vertically, horizontal panning selects the visible slice); everything
 * between the two thresholds keeps the existing `contain` fit unchanged.
 */
export function cropperObjectFitFor(aspectRatio: number): 'contain' | 'horizontal-cover' | 'vertical-cover' {
  if (isWideCropAspect(aspectRatio)) return 'horizontal-cover'
  if (isPortraitCropAspect(aspectRatio)) return 'vertical-cover'
  return 'contain'
}
