// Pure sizing/fit helpers for Team4sCropper's wide-format correction (Live-UAT Phase 180,
// 2026-10-12). Kept as plain functions so the regression can be covered by direct unit tests
// instead of render/click simulation.

/** Above this crop aspect ratio, the viewport gets extra vertical room and the image fills
 * the viewport's width instead of being letterboxed down to the crop ratio's own tiny height. */
export const WIDE_CROP_ASPECT_THRESHOLD = 2

/** How many times taller than the bare crop-frame height the wide viewport becomes, so the
 * user can see (and vertically pan through) image content above/below the frame. */
const WIDE_VIEWPORT_HEIGHT_FACTOR = 2.2

export function isWideCropAspect(aspectRatio: number): boolean {
  return aspectRatio > WIDE_CROP_ASPECT_THRESHOLD
}

/**
 * CSS `aspect-ratio` value for the crop viewport container itself.
 * - Square/near-square crops (aspectRatio <= WIDE_CROP_ASPECT_THRESHOLD): unchanged -- the
 *   container's own ratio equals the crop ratio, exactly like today (avatar crop stays as-is).
 * - Wide crops: the container is made relatively taller than the crop ratio
 *   (aspectRatio / WIDE_VIEWPORT_HEIGHT_FACTOR) so react-easy-crop's own frame-fitting
 *   (getCropSize) centers a full-width crop frame with visible vertical margin, instead of
 *   squeezing the whole viewport down to the crop ratio's own tiny height.
 */
export function computeCropViewportAspectRatio(aspectRatio: number): number {
  if (!isWideCropAspect(aspectRatio)) return aspectRatio
  return aspectRatio / WIDE_VIEWPORT_HEIGHT_FACTOR
}

/**
 * react-easy-crop `objectFit` value: wide crops fill the viewport's width (image covers
 * horizontally, vertical panning selects the visible slice); non-wide crops keep the
 * existing `contain` fit unchanged.
 */
export function cropperObjectFitFor(aspectRatio: number): 'contain' | 'horizontal-cover' {
  return isWideCropAspect(aspectRatio) ? 'horizontal-cover' : 'contain'
}
