/**
 * Resolves anime cover image URLs to their canonical format.
 *
 * Supports multiple formats:
 * - New media system: `/media/anime/{id}/poster/{uuid}/original.{ext}` (returned as-is)
 * - Legacy absolute: `/covers/filename.jpg` (returned as-is)
 * - Legacy relative: `filename.jpg` (prefixed with `/covers/`)
 * - Empty/null: returns placeholder
 *
 * Note: This function does NOT handle external URLs (http/https).
 * For admin contexts with external URL support, use resolveCoverUrl() instead.
 *
 * @param coverImage - Raw cover image value from API
 * @returns Resolved cover URL or placeholder
 */
export function getCoverUrl(coverImage?: string): string {
  const value = (coverImage || '').trim()
  if (!value) {
    return '/covers/placeholder.jpg'
  }

  // New format: full paths starting with / (e.g., /media/anime/123/poster/uuid/original.webp)
  if (value.startsWith('/')) {
    return value
  }

  // Legacy format: bare filename -> /covers/filename
  return `/covers/${value}`
}

export function toNumber(input: string | string[] | undefined, fallback: number): number {
  if (!input || Array.isArray(input)) {
    return fallback
  }

  const parsed = Number.parseInt(input, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}
