import { resolveApiUrl } from '@/lib/api'

/**
 * Löst anime cover image URLs zu ihrer kanonischen Form auf.
 *
 * Unterstützte Formate:
 * - Externe absolute URLs: `https://...` oder `http://...` (werden unverändert zurückgegeben)
 * - Neues Mediensystem: `/media/anime/{id}/poster/{uuid}/original.{ext}` (wird unverändert zurückgegeben)
 * - Legacy-absolut: `/covers/filename.jpg` (wird unverändert zurückgegeben)
 * - Legacy-relativ: `filename.jpg` (wird mit `/covers/` vorangestellt)
 * - Leer/null: gibt Platzhalterbild zurück
 *
 * @param coverImage - Roher Cover-Image-Wert aus der API
 * @returns Aufgelöste Cover-URL oder Platzhalterpfad
 */
export function getCoverUrl(coverImage?: string): string {
  const value = (coverImage || '').trim()
  if (!value) {
    return '/covers/placeholder.jpg'
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/api/')) {
    return resolveApiUrl(value)
  }

  // Neues Format: vollständige Pfade starting mit / (z.B. /media/anime/123/poster/uuid/original.webp)
  if (value.startsWith('/')) {
    return value
  }

  // Legacy-Format: Dateiname ohne Pfad -> /covers/dateiname
  return `/covers/${value}`
}

/**
 * Gibt an, ob ein Bild mit dem Next.js-Bildoptimierer deaktiviert werden soll.
 * Bilder, die über den internen Media-Stream-Endpunkt (`/api/v1/media/`) geliefert werden,
 * sind bereits optimiert und dürfen nicht nochmals verarbeitet werden.
 *
 * @param source - URL oder Pfad des Bildes
 * @returns true, wenn das Bild ohne Next.js-Optimierung geladen werden soll
 */
export function shouldUseUnoptimizedImage(source?: string): boolean {
  const value = (source || '').trim()
  if (!value) {
    return false
  }

  return value.includes('/api/v1/media/')
}

/**
 * Konvertiert einen String-Wert (z. B. aus URL-Parametern) in eine positive ganze Zahl.
 * Gibt den Fallback-Wert zurück, wenn der Wert fehlt, ein Array ist oder keine gültige
 * positive Zahl darstellt.
 *
 * @param input - String-Wert, Array oder undefined (typischer Next.js-Query-Param-Typ)
 * @param fallback - Rückgabewert bei ungültiger Eingabe
 * @returns Geparste positive Ganzzahl oder Fallback
 */
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
