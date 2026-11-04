import { getAnimeList } from '@/lib/api'
import { AnimeListItem, AnimeListParams, AnimeStatus, ContentType } from '@/types/anime'

/** Ein aufgelöster Nachbar in der Grid-Reihenfolge, zusammen mit der Seite, auf der er liegt. */
export interface AnimeNeighborTarget {
  anime: AnimeListItem
  page: number
}

/** Ergebnis der Nachbarn-Ermittlung: Vorheriger/nächster Anime in der aktuellen Grid-Sortierung. */
export interface AnimeNeighbors {
  prev: AnimeNeighborTarget | null
  next: AnimeNeighborTarget | null
}

/** Menge der erlaubten Content-Typen für die Grid-Filterung. */
const allowedContentTypes = new Set<ContentType>(['anime', 'hentai'])

/** Menge der erlaubten Anime-Status-Werte für die Grid-Filterung. */
const allowedStatuses = new Set<AnimeStatus>(['disabled', 'ongoing', 'done', 'aborted', 'licensed'])

/**
 * Wandelt einen rohen String-Wert in eine positive ganze Zahl um.
 * Gibt undefined zurück, wenn der Wert leer, keine Zahl oder nicht positiv ist.
 *
 * @param raw - Roher Eingabewert aus einem Query-Parameter
 * @returns Positive ganze Zahl oder undefined
 */
function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

/**
 * Bereinigt einen rohen String-Wert durch Trimmen von Leerzeichen.
 * Gibt undefined zurück, wenn der Wert leer oder nur Whitespace ist.
 *
 * @param raw - Roher Eingabewert aus einem Query-Parameter
 * @returns Getrimmter String oder undefined
 */
function normalizeText(raw: string | null): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  return value ? value : undefined
}

/**
 * Baut einen URL-Query-String aus den übergebenen Anime-Listenparametern.
 * Lässt nicht gesetzte oder ungültige Parameter weg.
 *
 * @param params - Filterparameter für die Anime-Übersicht
 * @returns URL-encodierter Query-String (ohne führendes `?`)
 */
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

/**
 * Parsed einen Grid-Query-String zurück in ein `AnimeListParams`-Objekt.
 * Validiert Content-Type und Status gegen die erlaubten Werte.
 * Gibt null zurück, wenn der Query-String leer oder ungültig ist.
 *
 * @param gridQuery - URL-encodierter Query-String des Anime-Grids
 * @returns Geparste Listenparameter oder null
 */
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

/**
 * Normalisiert einen Grid-Query-String: Parsed und rebuilt ihn kanonisch.
 * Entfernt ungültige oder unbekannte Parameter und gibt einen leeren String
 * zurück, wenn keine gültigen Parameter vorhanden sind.
 *
 * @param raw - Roher Query-String
 * @returns Normalisierter Query-String oder leerer String
 */
export function normalizeGridQuery(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const params = parseAnimeListParamsFromGridQueryInternal(trimmed)
  if (!params) {
    return ''
  }

  return buildAnimeGridQuery(params)
}

/**
 * Interne Hilfsfunktion: Parsed einen Grid-Query-String in `AnimeListParams`.
 * Gibt null zurück, wenn keiner der unterstützten Parameter gesetzt ist.
 *
 * @param gridQuery - URL-encodierter Query-String
 * @returns Geparste Parameter oder null, wenn alle leer sind
 */
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

/**
 * Baut den href-Link zur Detailseite eines Anime auf.
 * Fügt beim Zurücknavigieren den ursprünglichen Grid-Context als Query-Parameter an,
 * damit der Scroll-Zustand wiederhergestellt werden kann.
 *
 * @param animeID - Numerische ID des Anime
 * @param gridQuery - Aktueller Grid-Query-String für die Rücknavigation
 * @returns Relativer Pfad zur Anime-Detailseite
 */
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

/**
 * Baut den href-Link zur Anime-Listenansicht mit den aktuellen Grid-Filtern auf.
 * Gibt `/anime` ohne Parameter zurück, wenn kein Query vorhanden ist.
 *
 * @param gridQuery - Aktueller Grid-Query-String
 * @returns Relativer Pfad zur Anime-Liste mit optionalen Filterparametern
 */
export function buildAnimeListHrefFromGridQuery(gridQuery: string): string {
  const normalized = normalizeGridQuery(gridQuery)
  if (!normalized) {
    return '/anime'
  }
  return `/anime?${normalized}`
}

/**
 * Erzeugt den localStorage-Schlüssel für den gespeicherten Scroll-Zustand des Grids.
 * Verwendet den normalisierten Query-String als Suffix, um verschiedene Filteransichten
 * voneinander zu trennen.
 *
 * @param gridQuery - Aktueller Grid-Query-String
 * @returns Eindeutiger Speicherschlüssel für den Scroll-Offset
 */
export function getGridScrollStorageKey(gridQuery: string): string {
  const normalized = normalizeGridQuery(gridQuery)
  return `anime-grid-scroll:${normalized || 'default'}`
}

/**
 * Ermittelt den vorherigen/nächsten Anime in derselben Grid-Sortierung wie die Anime-Übersicht.
 * Lädt zunächst die aktuelle Seite und sucht `currentAnimeID` darin; liegt der Treffer am Rand
 * dieser Seite, wird zusätzlich die vorherige/nächste Seite geladen, um deren letztes/erstes
 * Element als Nachbar zu übernehmen (Seitenwechsel-Fall). Diese Funktion ist die EINZIGE Quelle
 * dieser Logik -- sowohl die serverseitige Randnavigations-Auflösung (`page.tsx`) als auch die
 * weiterhin client-seitige Hover-Vorschaukarte (`AnimeEdgeNavigation.tsx`) rufen sie auf, statt
 * den Index-/Seitenrand-Algorithmus ein zweites Mal zu implementieren.
 *
 * @param gridParams - Aktuelle Grid-Filterparameter (Seite, Suche, Status, ...)
 * @param currentAnimeID - ID des Anime, dessen Nachbarn ermittelt werden sollen
 * @param options - Optionales AbortSignal, um einen laufenden Client-Fetch abzubrechen
 * @returns Vorherigen/nächsten Anime samt Seite, oder `null` je Richtung, wenn keiner existiert
 */
export async function resolveAnimeNeighbors(
  gridParams: AnimeListParams,
  currentAnimeID: number,
  options: { signal?: AbortSignal } = {},
): Promise<AnimeNeighbors> {
  const currentPage = gridParams.page ?? 1
  const current = await getAnimeList(gridParams, options)
  const index = current.data.findIndex((anime) => anime.id === currentAnimeID)
  const result: AnimeNeighbors = { prev: null, next: null }
  if (index < 0) {
    return result
  }

  if (index > 0) {
    result.prev = { anime: current.data[index - 1], page: currentPage }
  } else if (currentPage > 1) {
    const previous = await getAnimeList({ ...gridParams, page: currentPage - 1 }, options)
    const anime = previous.data[previous.data.length - 1]
    if (anime) result.prev = { anime, page: currentPage - 1 }
  }

  if (index < current.data.length - 1) {
    result.next = { anime: current.data[index + 1], page: currentPage }
  } else if (currentPage < current.meta.total_pages) {
    const next = await getAnimeList({ ...gridParams, page: currentPage + 1 }, options)
    if (next.data[0]) result.next = { anime: next.data[0], page: currentPage + 1 }
  }

  return result
}
