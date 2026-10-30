import { AnimeStatus, ContentType } from '@/types/anime'

/** Baut die Ziel-URL für eine Seitenzahl der Anime-Liste, unter Beibehaltung der aktiven
 *  A-Z-/Typ-/Status-Filter und der Seitengröße. */
export function buildAnimeListPageHref(
  page: number,
  filters: { letter: string; perPage: number; contentType?: ContentType; status?: AnimeStatus },
): string {
  const query = new URLSearchParams()
  query.set('page', String(page))
  if (filters.letter) query.set('letter', filters.letter)
  if (filters.perPage) query.set('per_page', String(filters.perPage))
  if (filters.contentType) query.set('content_type', filters.contentType)
  if (filters.status) query.set('status', filters.status)
  return `/anime?${query.toString()}`
}
