import { useCallback, useEffect, useState } from 'react'

import { getAnimeList } from '@/lib/api'
import { AnimeListItem } from '@/types/anime'

import { CoverFilter } from '../types/admin-anime'

const ANIME_BROWSER_PER_PAGE = 20

interface AnimeBrowserState {
  items: AnimeListItem[]
  page: number
  totalPages: number
  total: number
  query: string
  letter: string
  hasCover: CoverFilter
  isLoading: boolean
  coverFailures: Record<number, true>
}

interface AnimeBrowserActions {
  setPage: (page: number) => void
  setQuery: (query: string) => void
  setLetter: (letter: string) => void
  setHasCover: (value: CoverFilter) => void
  markCoverFailure: (animeID: number) => void
  refresh: () => Promise<void>
}

interface UseAnimeBrowserOptions {
  onError?: (message: string) => void
}

export function useAnimeBrowser(options: UseAnimeBrowserOptions = {}): AnimeBrowserState & AnimeBrowserActions {
  const { onError } = options
  const [items, setItems] = useState<AnimeListItem[]>([])
  const [page, setPageState] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQueryState] = useState('')
  const [letter, setLetterState] = useState('')
  const [hasCover, setHasCoverState] = useState<CoverFilter>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [coverFailures, setCoverFailures] = useState<Record<number, true>>({})

  const refresh = useCallback(async () => {
    const hasCoverParam = hasCover === 'all' ? undefined : hasCover === 'present'
    try {
      setIsLoading(true)
      const response = await getAnimeList({
        page,
        per_page: ANIME_BROWSER_PER_PAGE,
        letter: letter || undefined,
        q: query || undefined,
        has_cover: hasCoverParam,
        include_disabled: true,
      })
      setItems(response.data)
      setTotal(response.meta.total)
      setPageState(response.meta.page)
      setTotalPages(response.meta.total_pages)
    } catch (error) {
      if (onError) {
        if (error instanceof Error && error.message.trim()) onError(error.message)
        else onError('Anime-Liste konnte nicht geladen werden.')
      }
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [hasCover, letter, onError, page, query])

  useEffect(() => {
    refresh().catch(() => {
      // handled via onError
    })
  }, [refresh])

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, nextPage))
  }, [])

  const setQuery = useCallback((nextQuery: string) => {
    setPageState(1)
    setQueryState(nextQuery.trim())
  }, [])

  const setLetter = useCallback((nextLetter: string) => {
    setPageState(1)
    setLetterState(nextLetter)
  }, [])

  const setHasCover = useCallback((value: CoverFilter) => {
    setPageState(1)
    setHasCoverState(value)
  }, [])

  const markCoverFailure = useCallback((animeID: number) => {
    setCoverFailures((current) => {
      if (current[animeID]) return current
      return { ...current, [animeID]: true }
    })
  }, [])

  return {
    items,
    page,
    totalPages,
    total,
    query,
    letter,
    hasCover,
    isLoading,
    coverFailures,
    setPage,
    setQuery,
    setLetter,
    setHasCover,
    markCoverFailure,
    refresh,
  }
}
