import type { AnimeBackdropManifest } from '@/types/anime'

const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

function buildAbsoluteMediaURL(path: string, options?: { width?: number; quality?: number }): string {
  const base = API_PUBLIC_BASE_URL.endsWith('/') ? API_PUBLIC_BASE_URL : `${API_PUBLIC_BASE_URL}/`
  const url = new URL(path, base)

  if (options?.width) {
    url.searchParams.set('width', String(options.width))
  }
  if (options?.quality) {
    url.searchParams.set('quality', String(options.quality))
  }

  return url.toString()
}

export function normalizeBackdropImageURLs(manifest: AnimeBackdropManifest | null | undefined): string[] {
  return (manifest?.backdrops || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => buildAbsoluteMediaURL(item, { width: 1920, quality: 86 }))
}

export function normalizeThemeVideoURLs(manifest: AnimeBackdropManifest | null | undefined): string[] {
  return (manifest?.theme_videos || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => buildAbsoluteMediaURL(item))
}

export function resolveInfoBannerURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  const bannerCandidate = (manifest?.banner_url || '').trim() || (manifest?.backdrops?.[0] || '').trim()
  if (!bannerCandidate) return null

  return buildAbsoluteMediaURL(bannerCandidate, { width: 1280, quality: 86 })
}

export function resolveInfoLogoURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  const logoPath = (manifest?.logo_url || '').trim()
  if (!logoPath) return null

  return buildAbsoluteMediaURL(logoPath, { width: 760, quality: 90 })
}
