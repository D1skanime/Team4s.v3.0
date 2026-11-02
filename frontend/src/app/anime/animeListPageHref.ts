import { AnimeStatus, ContentType } from '@/types/anime'

/** Baut die Ziel-URL für eine Seitenzahl der Anime-Liste, unter Beibehaltung der aktiven
 *  A-Z-/Typ-/Status-Filter und der Seitengröße. `page` akzeptiert neben einer echten Seitenzahl
 *  auch den literalen Platzhalter-String `'{page}'`, damit die Server-Komponente einmalig ein
 *  `hrefPattern` für `Pagination` bauen kann, statt eine nicht serialisierbare Funktion zu
 *  übergeben. */
export function buildAnimeListPageHref(
  page: number | string,
  filters: { letter: string; perPage: number; contentType?: ContentType; status?: AnimeStatus },
): string {
  const query = new URLSearchParams()
  query.set('page', String(page))
  if (filters.letter) query.set('letter', filters.letter)
  if (filters.perPage) query.set('per_page', String(filters.perPage))
  if (filters.contentType) query.set('content_type', filters.contentType)
  if (filters.status) query.set('status', filters.status)
  const href = `/anime?${query.toString()}`
  // URLSearchParams kodiert geschweifte Klammern (%7B/%7D) -- beim Platzhalter-Aufruf muss der
  // literale `{page}`-Text erhalten bleiben, damit `Pagination` ihn pro Seitenzahl ersetzen kann.
  return page === '{page}' ? href.replace('%7Bpage%7D', '{page}') : href
}
