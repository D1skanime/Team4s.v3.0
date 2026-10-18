import { AnimeStatus, EpisodeStatus } from '@/types/anime'

export function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function normalizeGenreToken(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function splitGenreTokens(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (!trimmed.includes(',')) return [normalizeGenreToken(trimmed)].filter(Boolean)
  return trimmed
    .split(',')
    .map((part) => normalizeGenreToken(part))
    .filter(Boolean)
}

/**
 * Splits a comma-separated tag string into deduplicated normalized tokens.
 * Mirrors splitGenreTokens but is kept separate so tag and genre normalization
 * can diverge independently without shared drift.
 */
export function splitTagTokens(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const parts = trimmed.includes(',')
    ? trimmed.split(',').map((part) => normalizeGenreToken(part)).filter(Boolean)
    : [normalizeGenreToken(trimmed)].filter(Boolean)

  // Deduplicate case-insensitively, first-seen casing wins
  const seen = new Set<string>()
  const result: string[] = []
  for (const token of parts) {
    const key = token.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(token)
    }
  }
  return result
}

export function resolveAniSearchID(source?: string | null, sourceLinks?: string[] | null, explicitID?: string | null): string {
  const explicit = (explicitID || '').trim()
  if (explicit) return explicit

  const values = [source, ...(sourceLinks ?? [])]
  for (const value of values) {
    const trimmed = (value || '').trim()
    if (trimmed.toLowerCase().startsWith('anisearch:')) {
      return trimmed.slice('anisearch:'.length).trim()
    }
  }

  return ''
}

export function buildAniSearchAnimeURL(anisearchID: string): string {
  return `https://www.anisearch.de/anime/${encodeURIComponent(anisearchID.trim())}`
}

/**
 * Item 2 (quick-261018-l5r Dedupe-Nachtrag): extrahiert eine reine AniSearch-ID aus entweder
 * einer direkten Zahleneingabe oder einer vollen AniSearch-URL (z. B. `https://www.anisearch.de/
 * anime/6465,freezing`). Verschoben aus `useAnimeEditAniSearchLink.ts` (Task 3) hierher, damit
 * sowohl die Anime-Bearbeitung als auch der Create-Flow dieselbe Extraktion wiederverwenden
 * koennen. Einfacher Regex/Split statt einer vollen URL-Parser-Abhaengigkeit -- reicht fuer das
 * bekannte AniSearch-URL-Schema `/anime/<id>[,<slug>][/...]`. Gibt den getrimmten Rohwert
 * unveraendert zurueck, wenn kein bekanntes Muster greift (das Backend validiert ohnehin erneut).
 */
export function extractAniSearchIDFromLinkInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^\d+$/.test(trimmed)) return trimmed

  const urlMatch = trimmed.match(/anisearch\.[a-z.]+\/anime\/(\d+)/i)
  if (urlMatch) return urlMatch[1]

  return trimmed
}

/**
 * Resolves anime cover image URLs to their canonical format.
 *
 * Supports multiple formats:
 * - New media system: `/media/anime/{id}/poster/{uuid}/original.{ext}` (returned as-is)
 * - Legacy absolute: `/covers/filename.jpg` (returned as-is)
 * - Legacy relative: `filename.jpg` (prefixed with `/covers/`)
 * - External URLs: `http://` or `https://` (returned as-is)
 * - Empty/null: returns placeholder
 *
 * @param rawCoverImage - Raw cover image value from API
 * @returns Resolved cover URL or placeholder
 */
export function resolveCoverUrl(rawCoverImage?: string): string {
  const value = (rawCoverImage || '').trim()
  if (!value) {
    return '/covers/placeholder.jpg'
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/')) {
    return value
  }

  // Legacy format: bare filename -> /covers/filename
  return `/covers/${value}`
}

export function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === 'true') {
    return
  }
  img.dataset.fallbackApplied = 'true'
  img.alt = 'Cover nicht verfügbar'
  img.src = '/covers/placeholder.jpg'
}

export function resolveAnimeStatusClass(status: AnimeStatus): string {
  switch (status) {
    case 'ongoing':
      return 'statusOngoing'
    case 'done':
      return 'statusDone'
    case 'aborted':
      return 'statusAborted'
    case 'licensed':
      return 'statusLicensed'
    case 'disabled':
    default:
      return 'statusDisabled'
  }
}

export function resolveEpisodeStatusClass(status: EpisodeStatus): string {
  switch (status) {
    case 'public':
      return 'statusPublic'
    case 'private':
      return 'statusPrivate'
    case 'disabled':
    default:
      return 'statusDisabled'
  }
}

export function formatEpisodeStatusLabel(value: EpisodeStatus): string {
  switch (value) {
    case 'public':
      return 'oeffentlich'
    case 'private':
      return 'privat'
    case 'disabled':
    default:
      return 'deaktiviert'
  }
}
