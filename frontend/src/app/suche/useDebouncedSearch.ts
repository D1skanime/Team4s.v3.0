'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { getSearch, getSearchSuggestions } from '@/lib/api'
import type { PaginationMeta } from '@/types/anime'
import type {
  SearchParams,
  SearchResult,
  SearchType,
} from '@/types/search'

/** Debounce-Fenster vor jedem Request (UI-SPEC Interaction Contract). */
export const SEARCH_DEBOUNCE_MS = 250
/** Mindestlänge für Vorschläge/Suche (clientseitig; Server erzwingt es zusätzlich). */
export const MIN_QUERY_LENGTH = 2

const SEARCH_TYPES: SearchType[] = ['alle', 'anime', 'fansub']

/**
 * Optionale Filterwerte der Suche (ohne q/type/page — diese liegen separat).
 * Werden ebenfalls in `useSearchParams` gespiegelt (URL = Source of Truth, D-08).
 */
export interface SearchFilters {
  year_from?: number
  year_to?: number
  genre?: string
  tag?: string
  format?: string
  status?: string
  fansub_group?: number
}

/** Vollständiger, aus der URL rekonstruierbarer Suchzustand. */
export interface SearchState {
  q: string
  type: SearchType
  filters: SearchFilters
  page: number
}

/** Rückgabe des Hooks: Zustand + Ergebnisse/Status + Setter. */
export interface UseDebouncedSearchResult extends SearchState {
  results: SearchResult | null
  meta: PaginationMeta | null
  suggestions: SearchResult | null
  isLoading: boolean
  error: unknown
  setQuery: (q: string) => void
  setType: (type: SearchType) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  setPage: (page: number) => void
  reset: () => void
}

function toPositiveInt(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeType(value: string | null): SearchType {
  return SEARCH_TYPES.includes(value as SearchType) ? (value as SearchType) : 'alle'
}

/** Rekonstruiert den Suchzustand aus den aktuellen URL-Suchparametern (Reload-fest). */
export function readSearchState(params: ReadonlyURLSearchParams): SearchState {
  return {
    q: params.get('q') ?? '',
    type: normalizeType(params.get('type')),
    page: toPositiveInt(params.get('page')) ?? 1,
    filters: {
      year_from: toPositiveInt(params.get('year_from')),
      year_to: toPositiveInt(params.get('year_to')),
      genre: params.get('genre') ?? undefined,
      tag: params.get('tag') ?? undefined,
      format: params.get('format') ?? undefined,
      status: params.get('status') ?? undefined,
      fansub_group: toPositiveInt(params.get('fansub_group')),
    },
  }
}

/** Baut die `SearchParams` für den API-Aufruf aus dem Zustand. */
export function stateToSearchParams(state: SearchState): SearchParams {
  return {
    q: state.q.trim(),
    type: state.type,
    page: state.page,
    year_from: state.filters.year_from,
    year_to: state.filters.year_to,
    genre: state.filters.genre,
    tag: state.filters.tag,
    format: state.filters.format,
    status: state.filters.status,
    fansub_group: state.filters.fansub_group,
  }
}

/** Baut den URL-Query-String, der den Zustand teilbar/reload-fest abbildet. */
export function buildStateQuery(state: SearchState): string {
  const query = new URLSearchParams()
  const q = state.q.trim()
  if (q) query.set('q', q)
  if (state.type && state.type !== 'alle') query.set('type', state.type)
  if (state.page > 1) query.set('page', String(state.page))
  const f = state.filters
  if (typeof f.year_from === 'number') query.set('year_from', String(f.year_from))
  if (typeof f.year_to === 'number') query.set('year_to', String(f.year_to))
  if (f.genre) query.set('genre', f.genre)
  if (f.tag) query.set('tag', f.tag)
  if (f.format) query.set('format', f.format)
  if (f.status) query.set('status', f.status)
  if (typeof f.fansub_group === 'number') query.set('fansub_group', String(f.fansub_group))
  return query.toString()
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Wiederverwendbarer Such-Hook: kapselt Debounce (250 ms), Request-Abbruch via
 * `AbortController` (kein veraltetes Ergebnis überschreibt ein neueres) und die
 * Spiegelung von q/type/Filter/page in `useSearchParams` (URL = Source of Truth).
 *
 * - Eine Folge schneller Tastendrücke löst nur EINEN Request nach 250 ms Stille aus.
 * - Jeder neue Lauf bricht den vorherigen laufenden Request ab.
 * - Bei q-Länge < 2 wird weder Suche noch Vorschlag angefragt (Server erzwingt es zusätzlich).
 */
export function useDebouncedSearch(): UseDebouncedSearchResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [state, setState] = useState<SearchState>(() => readSearchState(searchParams))
  const [results, setResults] = useState<SearchResult | null>(null)
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const searchAbortRef = useRef<AbortController | null>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)

  const setQuery = useCallback((q: string) => {
    setState((prev) => ({ ...prev, q, page: 1 }))
  }, [])
  const setType = useCallback((type: SearchType) => {
    setState((prev) => ({ ...prev, type, page: 1 }))
  }, [])
  const setFilters = useCallback((filters: Partial<SearchFilters>) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, ...filters }, page: 1 }))
  }, [])
  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: page > 0 ? page : 1 }))
  }, [])
  const reset = useCallback(() => {
    setState((prev) => ({ q: prev.q, type: 'alle', filters: {}, page: 1 }))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      // URL = Source of Truth: Zustand teilbar/reload-fest spiegeln.
      const query = buildStateQuery(state)
      router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })

      const trimmed = state.q.trim()
      if (trimmed.length < MIN_QUERY_LENGTH) {
        // Zu kurz: laufende Requests abbrechen, Ergebnisse räumen, nichts anfragen.
        searchAbortRef.current?.abort()
        suggestAbortRef.current?.abort()
        setResults(null)
        setMeta(null)
        setSuggestions(null)
        setIsLoading(false)
        setError(null)
        return
      }

      // Hauptsuche: vorherigen Request abbrechen (kein veraltetes Ergebnis).
      searchAbortRef.current?.abort()
      const searchController = new AbortController()
      searchAbortRef.current = searchController
      setIsLoading(true)
      setError(null)
      getSearch(stateToSearchParams(state), searchController.signal)
        .then((response) => {
          if (searchController.signal.aborted) return
          setResults(response.data)
          setMeta(response.meta)
          setIsLoading(false)
        })
        .catch((err) => {
          if (searchController.signal.aborted || isAbortError(err)) return
          setError(err)
          setIsLoading(false)
        })

      // Vorschläge (nur ≥ 2 Zeichen): ebenfalls abbrechbar, Fehler nicht fatal.
      suggestAbortRef.current?.abort()
      const suggestController = new AbortController()
      suggestAbortRef.current = suggestController
      getSearchSuggestions(trimmed, suggestController.signal)
        .then((response) => {
          if (suggestController.signal.aborted) return
          setSuggestions(response.data)
        })
        .catch((err) => {
          if (suggestController.signal.aborted || isAbortError(err)) return
          // Vorschlagsfehler bleibt still — die Hauptsuche trägt den Fehlerzustand.
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [state, pathname, router])

  useEffect(
    () => () => {
      searchAbortRef.current?.abort()
      suggestAbortRef.current?.abort()
    },
    [],
  )

  return {
    ...state,
    results,
    meta,
    suggestions,
    isLoading,
    error,
    setQuery,
    setType,
    setFilters,
    setPage,
    reset,
  }
}
