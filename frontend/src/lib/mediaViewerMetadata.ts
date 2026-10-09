/**
 * Pure, directly-testable fallback-resolution logic for the unified media
 * viewer's metadata panel (Phase 177, F-18).
 *
 * D-13 requires this phase's new logic to be covered by directly-callable
 * tests (no `render`/`fireEvent`). Both D-07 compatibility fallbacks
 * (category -> media_type, caption -> description) are extracted here as
 * standalone functions with zero React/DOM involvement, following the same
 * pattern established by `mediaViewerNavigation.ts` (Plan 177-01).
 */

/**
 * Resolves the category chip's display label.
 *
 * - When `category` is a non-empty string, returns the mapped label from
 *   `categoryLabels` if present, otherwise the raw `category` value verbatim.
 * - When `category` is absent/empty, falls back to `mediaType` -- this is the
 *   D-07 compatibility path for consumers (`ReleaseGallery`,
 *   `FansubGroupMediaBlock`) that only ever populate the legacy `media_type`
 *   field, which already carries a human-readable label.
 */
export function resolveCategoryLabel(
  category: string | null | undefined,
  mediaType: string,
  categoryLabels: Record<string, string>,
): string {
  const trimmedCategory = category?.trim()
  if (trimmedCategory) {
    return categoryLabels[trimmedCategory] ?? trimmedCategory
  }

  return mediaType ?? ''
}

/**
 * Resolves the caption row's display text.
 *
 * - Returns `caption.trim()` when it is non-empty after trimming.
 * - Otherwise returns `description.trim()` when non-empty -- this is the
 *   D-07 compatibility path for `ReleaseGallery.tsx`'s `toLightboxItem`,
 *   which only ever populates `description`, never `caption`.
 * - Otherwise returns an empty string, signalling the panel should omit the
 *   row entirely (graceful omission, D-22).
 */
export function resolveCaption(
  caption: string | null | undefined,
  description: string | null | undefined,
): string {
  const trimmedCaption = caption?.trim()
  if (trimmedCaption) {
    return trimmedCaption
  }

  const trimmedDescription = description?.trim()
  if (trimmedDescription) {
    return trimmedDescription
  }

  return ''
}

/**
 * Resolves the URL used for a single thumbnail-strip entry (D-28).
 *
 * Priority order: `thumbnailUrl` first (smallest/dedicated thumbnail asset),
 * then `displayUrl` (medium-size progressive-load asset), finally
 * `originalUrl` as the last resort for consumers (`ReleaseGallery.tsx`'s
 * `toLightboxItem`, D-07) that only ever populate `original_url`. Returns an
 * empty string when none of the three are present.
 */
export function resolveThumbnailUrl(
  thumbnailUrl: string | null | undefined,
  displayUrl: string | null | undefined,
  originalUrl: string | null | undefined,
): string {
  const trimmedThumbnail = thumbnailUrl?.trim()
  if (trimmedThumbnail) {
    return trimmedThumbnail
  }

  const trimmedDisplay = displayUrl?.trim()
  if (trimmedDisplay) {
    return trimmedDisplay
  }

  const trimmedOriginal = originalUrl?.trim()
  if (trimmedOriginal) {
    return trimmedOriginal
  }

  return ''
}
