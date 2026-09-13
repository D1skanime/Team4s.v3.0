import { getImageProps } from 'next/image'

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

/** Only the existing local anime/cover and configured API-file namespaces use Next. */
function staticImageSource(source: string): string | null {
  // API files use the existing configured origin; local anime files must stay local.
  const candidate = source.startsWith('/api/v1/media/files/') ? resolvePublicApiUrl(source) : source
  const url = new URL(candidate, LOCAL_ORIGIN)
  if (url.username || url.password) return null
  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    if (url.origin === LOCAL_ORIGIN && !url.search && (url.pathname.startsWith('/media/anime/') || url.pathname.startsWith('/covers/'))) {
      return url.pathname
    }
  } else if (isConfiguredApiURL(url) && url.pathname.startsWith('/api/v1/media/files/')) {
    return url.toString()
  }
  return null
}

function generatedCandidates(source: string, maxWidth: number) {
  const { props } = getImageProps({
    src: source, alt: '', width: maxWidth, height: Math.round(maxWidth * 1.5),
    quality: IMAGE_QUALITY, sizes: maxWidth + 'px',
  })
  // sizes produces real width descriptors. props.src itself selects the largest candidate.
  return (props.srcSet || '').split(', ').flatMap((candidate) => {
    const match = candidate.match(/^(.*) (\d+)w$/)
    return match && Number(match[2]) <= maxWidth ? [{ src: match[1], width: Number(match[2]) }] : []
  })
}

/** Resolve a ready-to-display bounded URL; optional unsupported media is omitted. */
export function resolveAnimeImageURL(source: string | null | undefined, maxWidth: number): string | null {
  const value = source?.trim()
  if (!value || !Number.isSafeInteger(maxWidth) || maxWidth <= 0) return null
  try {
    const url = new URL(value, LOCAL_ORIGIN)
    if (!['http:', 'https:'].includes(url.protocol) || value.startsWith('//')) return null
    const relative = value.startsWith('/')
    if (url.username || url.password || (relative && url.origin !== LOCAL_ORIGIN)) return null
    if (url.pathname === '/api/v1/media/image' && (relative || isConfiguredApiURL(url))) {
      return resolvePublicApiUrl(value, { width: maxWidth, quality: IMAGE_QUALITY })
    }

    // Accept an existing generated candidate only if its original remains in the allowed seam.
    if (relative && url.pathname === '/_next/image') {
      const original = staticImageSource(url.searchParams.get('url') || '')
      if (!original) return null
      return generatedCandidates(original, maxWidth).find((candidate) => candidate.src === value)?.src ?? null
    }

    const original = staticImageSource(value)
    if (!original) return null
    return generatedCandidates(original, maxWidth).sort((left, right) => right.width - left.width)[0]?.src ?? null
  } catch {
    return null
  }
}

/** Preserve the existing bare-filename convention and use the same bounded placeholder on invalid input. */
export function resolveAnimeCoverURL(source: string | null | undefined): string {
  const value = source?.trim() || ''
  const normalized = /^[^:/\\?#]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(value) ? getCoverUrl(value) : value
  const display = resolveAnimeImageURL(normalized, COVER_WIDTH) ??
    resolveAnimeImageURL(getCoverUrl(), COVER_WIDTH)
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
