import { AnimeListParams, AnimeStatus, ContentType } from '@/types/anime'

const allowedContentTypes = new Set<ContentType>(['anime', 'hentai'])
const allowedStatuses = new Set<AnimeStatus>(['disabled', 'ongoing', 'done', 'aborted', 'licensed'])

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

function normalizeText(raw: string | null): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  return value ? value : undefined
}

export function buildAnimeGridQuery(params: AnimeListParams): string {
  const query = new URLSearchParams()
  if (params.page && params.page > 0) query.set('page', String(params.page))
  if (params.per_page && params.per_page > 0) query.set('per_page', String(params.per_page))
  if (params.q) query.set('q', params.q)
  if (params.letter) query.set('letter', params.letter)
  if (params.content_type) query.set('content_type', params.content_type)
  if (params.status) query.set('status', params.status)
  return query.toString()
}

export function parseAnimeListParamsFromGridQuery(gridQuery: string): AnimeListParams | null {
  const normalized = normalizeGridQuery(gridQuery)
  if (!normalized) {
    return null
  }

  const query = new URLSearchParams(normalized)
  const page = parsePositiveInt(query.get('page'))
  const perPage = parsePositiveInt(query.get('per_page'))
  const q = normalizeText(query.get('q'))
  const letter = normalizeText(query.get('letter'))
  const contentTypeRaw = normalizeText(query.get('content_type'))
  const statusRaw = normalizeText(query.get('status'))

  const contentType =
    contentTypeRaw && allowedContentTypes.has(contentTypeRaw as ContentType)
      ? (contentTypeRaw as ContentType)
      : undefined
  const status = statusRaw && allowedStatuses.has(statusRaw as AnimeStatus) ? (statusRaw as AnimeStatus) : undefined

  return {
    page,
    per_page: perPage,
    q,
    letter,
    content_type: contentType,
    status,
  }
}

export function normalizeGridQuery(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const params = parseAnimeListParamsFromGridQueryInternal(trimmed)
  if (!params) {
    return ''
  }

  return buildAnimeGridQuery(params)
}

function parseAnimeListParamsFromGridQueryInternal(gridQuery: string): AnimeListParams | null {
  const query = new URLSearchParams(gridQuery)

  const page = parsePositiveInt(query.get('page'))
  const perPage = parsePositiveInt(query.get('per_page'))
  const q = normalizeText(query.get('q'))
  const letter = normalizeText(query.get('letter'))
  const contentTypeRaw = normalizeText(query.get('content_type'))
  const statusRaw = normalizeText(query.get('status'))

  const contentType =
    contentTypeRaw && allowedContentTypes.has(contentTypeRaw as ContentType)
      ? (contentTypeRaw as ContentType)
      : undefined
  const status = statusRaw && allowedStatuses.has(statusRaw as AnimeStatus) ? (statusRaw as AnimeStatus) : undefined

  if (!page && !perPage && !q && !letter && !contentType && !status) {
    return null
  }

  return {
    page,
    per_page: perPage,
    q,
    letter,
    content_type: contentType,
    status,
  }
}

export function buildAnimeDetailHref(animeID: number, gridQuery: string): string {
  const normalized = normalizeGridQuery(gridQuery)
  if (!normalized) {
    return `/anime/${animeID}`
  }

  const query = new URLSearchParams()
  query.set('from', 'anime-grid')
  query.set('grid_query', normalized)
  return `/anime/${animeID}?${query.toString()}`
}

export function buildAnimeListHrefFromGridQuery(gridQuery: string): string {
  const normalized = normalizeGridQuery(gridQuery)
  if (!normalized) {
    return '/anime'
  }
  return `/anime?${normalized}`
}

export function getGridScrollStorageKey(gridQuery: string): string {
  const normalized = normalizeGridQuery(gridQuery)
  return `anime-grid-scroll:${normalized || 'default'}`
}
