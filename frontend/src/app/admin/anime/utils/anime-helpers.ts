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

  return `/covers/${value}`
}

export function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === 'true') {
    return
  }
  img.dataset.fallbackApplied = 'true'
  img.alt = ''
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
