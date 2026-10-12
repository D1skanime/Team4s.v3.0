// Shared sizing contract for the Profil-Hintergrundbild ("Banner"): the Cropper always produces
// a PROFILE_BANNER_WIDTH x PROFILE_BANNER_HEIGHT (5:1) crop, and every place that DISPLAYS that
// crop (me/profile header card, public profile hero, memorial hero) must agree on the same
// aspect ratio so the stored crop is shown byte-for-byte (WYSIWYG) wherever the viewport is wide
// enough. Live-UAT fix (2026-10-12): display containers previously used a fixed min-height with
// background-size/object-fit: cover, which silently cropped the vertical ~20% of the image that
// the user chose to keep -- this module is the single source of truth both JS call sites
// (Team4sCropper's aspectRatio/output props) and the parallel CSS custom property
// (--profile-banner-aspect-ratio in globals.css) must stay in sync with.

export const PROFILE_BANNER_WIDTH = 1920
export const PROFILE_BANNER_HEIGHT = 384
export const PROFILE_BANNER_ASPECT_RATIO = PROFILE_BANNER_WIDTH / PROFILE_BANNER_HEIGHT

// Reference viewport used to draw the Cropper's "stays visible on narrow screens" guide lines.
// 375px is a common narrow-phone width; 230px is the LARGEST min-height floor among the current
// banner display containers (profileHeaderCard: 224px, heroPanel: 230px/220px) -- using the
// largest floor is deliberately the most conservative choice, since a larger floor forces more
// upscale-and-crop and therefore shows the NARROWEST guaranteed-safe band. Any display context
// with a smaller floor will actually show at least as much as the guide promises, never less.
export const PROFILE_BANNER_MOBILE_REFERENCE_WIDTH_PX = 375
export const PROFILE_BANNER_MOBILE_REFERENCE_MIN_HEIGHT_PX = 230

/**
 * Fraction (0..1) of the banner's full width that stays visible when a display container is
 * `aspectRatio` wide-by-tall but clamped to `minHeightPx` as a floor. 1 means the container is
 * wide enough that its natural aspect-ratio height already clears the floor -- the full crop is
 * shown with no cropping (cover has nothing to do). Below that breakpoint, the container is
 * relatively taller than the image, so object-fit/background-size: cover scales the image up to
 * fill the floor height and crops the overflowing width symmetrically (object-position: center).
 */
export function computeVisibleBannerFraction(
  containerWidthPx: number,
  minHeightPx: number,
  aspectRatio: number,
): number {
  if (containerWidthPx <= 0 || minHeightPx <= 0 || aspectRatio <= 0) return 1

  const unclampedHeightPx = containerWidthPx / aspectRatio
  if (unclampedHeightPx >= minHeightPx) return 1

  const fraction = containerWidthPx / (minHeightPx * aspectRatio)
  return Math.min(1, Math.max(0, fraction))
}

/**
 * Left/right guide-line positions, as percentages (0..100) of the full crop width, marking the
 * band that remains visible at the reference narrow viewport. Returns null when nothing is
 * cropped at that reference width (nothing to mark).
 */
export function computeVisibleBannerGuideLines(
  containerWidthPx: number,
  minHeightPx: number,
  aspectRatio: number,
): { leftPercent: number; rightPercent: number } | null {
  const fraction = computeVisibleBannerFraction(containerWidthPx, minHeightPx, aspectRatio)
  if (fraction >= 1) return null

  const marginPercent = ((1 - fraction) / 2) * 100
  return { leftPercent: marginPercent, rightPercent: 100 - marginPercent }
}
