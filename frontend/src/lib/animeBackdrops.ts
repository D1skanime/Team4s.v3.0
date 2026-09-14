import { IMAGE_DISPLAY_QUERY, IMAGE_DISPLAY_WIDTHS, parseImageDisplayWidth } from '@/lib/imageDisplayContract'

import type { AnimeBackdropManifest } from '@/types/anime'
import { resolvePublicApiUrl } from '@/lib/publicApiUrl'
import { getCoverUrl } from '@/lib/utils'

const COVER_WIDTH = 512
const IMAGE_QUALITY = 75
const LOCAL_ORIGIN = 'http://team4s.local'

function isConfiguredApiURL(url: URL): boolean {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  return !!configured && url.origin === new URL(configured).origin
}

/** Resolve only the three authoritative serving namespaces; never infer a storage path. */
function staticDisplayURL(url: URL, relative: boolean, width: number): string | null {
  const local = relative && url.origin === LOCAL_ORIGIN
  const apiFile = (local || isConfiguredApiURL(url)) && /^\/api\/v1\/media\/files\/[a-zA-Z0-9._-]+$/.test(url.pathname)
  const cover = local && /^\/covers\/[a-zA-Z0-9._-]+(?:\/display)?$/.test(url.pathname)
  const anime = local && url.pathname.startsWith('/media/anime/')
  if (!apiFile && !cover && !anime) return null
  // A completed display URL is idempotent. Other source queries have no documented semantics.
  if ([...url.searchParams.keys()].some((key) => key !== IMAGE_DISPLAY_QUERY)) return null
  if (url.search && parseImageDisplayWidth(url) === null) return null
  let pathname = url.pathname
  if (cover && !pathname.endsWith('/display')) pathname += '/display'
  return pathname + '?' + IMAGE_DISPLAY_QUERY + '=' + width
}

/** Resolve a finished bounded source; optional unsupported media is omitted. */
export function resolveAnimeImageURL(source: string | null | undefined, maxWidth: number): string | null {
  const value = source?.trim()
  if (!value || !IMAGE_DISPLAY_WIDTHS.some((width) => width === maxWidth)) return null
  try {
    const url = new URL(value, LOCAL_ORIGIN)
    if (!['http:', 'https:'].includes(url.protocol) || value.startsWith('//')) return null
    const relative = value.startsWith('/')
    if (url.username || url.password || (relative && url.origin !== LOCAL_ORIGIN)) return null
    if (url.pathname === '/api/v1/media/image' && (relative || isConfiguredApiURL(url))) {
      return resolvePublicApiUrl(value, { width: maxWidth, quality: IMAGE_QUALITY })
    }
    // Existing Next wrappers are unwrapped into the explicit delivery seam. Next may pass animations through.
    if (relative && url.pathname === '/_next/image') {
      const original = url.searchParams.get('url')
      return original && !original.startsWith('/_next/') ? resolveAnimeImageURL(original, maxWidth) : null
    }
    return staticDisplayURL(url, relative, maxWidth)
  } catch {
    return null
  }
}

/** Preserve the existing bare-filename convention and use the same bounded placeholder on invalid input. */
export function resolveAnimeCoverURL(source: string | null | undefined): string {
  const value = source?.trim() || ''
  const normalized = /^[^:/\\?#]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(value) ? getCoverUrl(value) : value
  const display = resolveAnimeImageURL(normalized, COVER_WIDTH) ??
    resolveAnimeImageURL('/covers/placeholder.png', COVER_WIDTH)
  if (!display) throw new Error('Kein begrenzter Cover-Platzhalter verfügbar.')
  return display
}

function buildAbsoluteMediaURL(path: string): string {
  return resolvePublicApiUrl(path)
}

export function normalizeBackdropImageURLs(manifest: AnimeBackdropManifest | null | undefined): string[] {
  return (manifest?.backdrops || [])
    .map((item) => resolveAnimeImageURL(item, 1920))
    .filter((item): item is string => item !== null)
}

/**
 * Wandelt die Theme-Video-Pfade aus einem Anime-Backdrop-Manifest in absolute URLs um.
 * Filtert leere Einträge heraus; Videos werden ohne Größenoptimierung aufgelöst.
 *
 * @param manifest - Das Backdrop-Manifest des Anime oder null/undefined
 * @returns Liste absoluter Theme-Video-URLs
 */
export function normalizeThemeVideoURLs(manifest: AnimeBackdropManifest | null | undefined): string[] {
  return (manifest?.theme_videos || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => buildAbsoluteMediaURL(item))
}

/** Prefer the explicit banner, then the first backdrop; omit unsupported optional media. */
export function resolveInfoBannerURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  const candidate = manifest?.banner_url?.trim() || manifest?.backdrops?.[0]?.trim()
  return resolveAnimeImageURL(candidate, 1280)
}

export function resolveInfoLogoURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  return resolveAnimeImageURL(manifest?.logo_url, 760)
}
