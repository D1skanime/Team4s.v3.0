import type { AnimeBackdropManifest } from '@/types/anime'

/** Öffentliche Basis-URL der API, wird aus der Umgebungsvariable gelesen. */
const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

/**
 * Baut eine absolute Medien-URL aus einem relativen Pfad auf.
 * Hängt optionale Query-Parameter für Bildbreite und Qualität an.
 *
 * @param path - Relativer Medienpfad (z. B. `/media/anime/1/backdrop.jpg`)
 * @param options - Optionale Bildoptimierungsparameter (Breite, Qualität)
 * @returns Vollständige absolute URL als String
 */
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

/**
 * Wandelt die Backdrop-Pfade aus einem Anime-Backdrop-Manifest in absolute URLs um.
 * Filtert leere Einträge heraus und optimiert Bilder auf 1920px Breite bei 86 % Qualität.
 *
 * @param manifest - Das Backdrop-Manifest des Anime oder null/undefined
 * @returns Liste absoluter Backdrop-URLs
 */
export function normalizeBackdropImageURLs(manifest: AnimeBackdropManifest | null | undefined): string[] {
  return (manifest?.backdrops || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => buildAbsoluteMediaURL(item, { width: 1920, quality: 86 }))
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

/**
 * Ermittelt die URL für das Info-Banner eines Anime.
 * Bevorzugt das explizite `banner_url`-Feld; fällt auf das erste Backdrop zurück.
 * Gibt null zurück, wenn kein geeignetes Bild vorhanden ist.
 *
 * @param manifest - Das Backdrop-Manifest des Anime oder null/undefined
 * @returns Absolute Banner-URL oder null
 */
export function resolveInfoBannerURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  const bannerCandidate = (manifest?.banner_url || '').trim() || (manifest?.backdrops?.[0] || '').trim()
  if (!bannerCandidate) return null

  return buildAbsoluteMediaURL(bannerCandidate, { width: 1280, quality: 86 })
}

/**
 * Ermittelt die URL für das Logo eines Anime.
 * Gibt null zurück, wenn kein `logo_url` im Manifest vorhanden ist.
 *
 * @param manifest - Das Backdrop-Manifest des Anime oder null/undefined
 * @returns Absolute Logo-URL oder null
 */
export function resolveInfoLogoURL(manifest: AnimeBackdropManifest | null | undefined): string | null {
  const logoPath = (manifest?.logo_url || '').trim()
  if (!logoPath) return null

  return buildAbsoluteMediaURL(logoPath, { width: 760, quality: 90 })
}
