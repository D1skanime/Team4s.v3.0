import { useEffect, useMemo, useState } from 'react'

import { getAdminGenreTokens, getAdminTagTokens } from '@/lib/api'
import { matchesSearch } from '@/lib/textFilter'
import { GenreToken, TagToken } from '@/types/admin'

export interface UseGenreTagAutocompleteParams {
  genreDraft: string
  selectedGenreTokens: string[]
  tagDraft: string
  selectedTagTokens: string[]
  genreSuggestionLimit: number
  tagSuggestionLimit: number
  /** Default true. Set false to defer the catalog fetch (e.g. until an auth token exists). */
  enabled?: boolean
}

export interface UseGenreTagAutocompleteResult {
  genreTokens: GenreToken[]
  tagTokens: TagToken[]
  isLoadingGenreTokens: boolean
  isLoadingTagTokens: boolean
  genreTokensError: string | null
  tagTokensError: string | null
  genreSuggestions: GenreToken[]
  tagSuggestions: TagToken[]
  genreSuggestionsTotal: number
  tagSuggestionsTotal: number
}

interface NamedToken {
  name: string
}

// D-10: pure, independently-testable filtering helpers so the suggestion
// logic itself (not just the hook that wires it to React state) has direct
// Vitest coverage without mounting/rendering anything.
export function filterAutocompleteSuggestions<T extends NamedToken>(
  tokens: T[],
  draft: string,
  selectedTokens: string[],
): T[] {
  const selected = new Set(selectedTokens.map((token) => token.toLowerCase()))
  return tokens.filter((token) => {
    if (selected.has(token.name.toLowerCase())) return false
    return matchesSearch([token.name], draft)
  })
}

// Once the admin starts typing, show more matches than the idle/empty-draft
// limit allows so a narrowed-down search isn't truncated too aggressively.
// Deliberately decoupled from `genreSuggestionLimit`/`tagSuggestionLimit`
// (currently 40 in both calling hooks) — raising those defaults does not
// require raising this floor, and vice versa.
const SEARCH_RESULT_EXPANSION_FLOOR = 80

export function limitAutocompleteSuggestions<T>(filtered: T[], draft: string, limit: number): T[] {
  const effectiveLimit = draft.trim().length > 0 ? Math.max(SEARCH_RESULT_EXPANSION_FLOOR, limit) : limit
  return filtered.slice(0, effectiveLimit)
}

// Shared fetch-guard predicate: skip the catalog fetch when explicitly
// disabled (Create flow, pre-auth), or when a catalog is already loaded
// (fetch-once-ever semantics, both flows).
export function shouldLoadCatalog(enabled: boolean | undefined, currentLength: number): boolean {
  if (enabled === false) return false
  return currentLength === 0
}

/**
 * useGenreTagAutocomplete: catalog fetch + umlaut-tolerant filter/suggest
 * logic shared by the Edit flow (useAnimePatchImpl.ts) and the Create flow
 * (useAdminAnimeCreateControllerImpl.ts). D-19: extracted from the Edit
 * flow's implementation, which is the canonical basis.
 */
export function useGenreTagAutocomplete(
  params: UseGenreTagAutocompleteParams,
): UseGenreTagAutocompleteResult {
  const { enabled } = params
  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([])
  const [tagTokens, setTagTokens] = useState<TagToken[]>([])
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false)
  const [isLoadingTagTokens, setIsLoadingTagTokens] = useState(false)
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null)
  const [tagTokensError, setTagTokensError] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldLoadCatalog(enabled, genreTokens.length)) return

    let cancelled = false

    const loadGenreTokens = async () => {
      setIsLoadingGenreTokens(true)
      setGenreTokensError(null)

      try {
        const response = await getAdminGenreTokens({ limit: 1000 })
        if (!cancelled) {
          setGenreTokens(response.data)
        }
      } catch (error) {
        if (cancelled) return

        if (error instanceof Error) setGenreTokensError(error.message)
        else setGenreTokensError('Genre-Vorschläge konnten nicht geladen werden.')
      } finally {
        if (!cancelled) {
          setIsLoadingGenreTokens(false)
        }
      }
    }

    void loadGenreTokens()

    return () => {
      cancelled = true
    }
  }, [enabled, genreTokens.length])

  useEffect(() => {
    if (!shouldLoadCatalog(enabled, tagTokens.length)) return

    let cancelled = false

    const loadTagTokens = async () => {
      setIsLoadingTagTokens(true)
      setTagTokensError(null)

      try {
        const response = await getAdminTagTokens({ limit: 1000 })
        if (!cancelled) {
          setTagTokens(response.data)
        }
      } catch (error) {
        if (cancelled) return

        if (error instanceof Error) setTagTokensError(error.message)
        else setTagTokensError('Tag-Vorschläge konnten nicht geladen werden.')
      } finally {
        if (!cancelled) {
          setIsLoadingTagTokens(false)
        }
      }
    }

    void loadTagTokens()

    return () => {
      cancelled = true
    }
  }, [enabled, tagTokens.length])

  const genreFiltered = useMemo(
    () => filterAutocompleteSuggestions(genreTokens, params.genreDraft, params.selectedGenreTokens),
    [genreTokens, params.genreDraft, params.selectedGenreTokens],
  )

  const genreSuggestions = useMemo(
    () => limitAutocompleteSuggestions(genreFiltered, params.genreDraft, params.genreSuggestionLimit),
    [genreFiltered, params.genreDraft, params.genreSuggestionLimit],
  )

  const tagFiltered = useMemo(
    () => filterAutocompleteSuggestions(tagTokens, params.tagDraft, params.selectedTagTokens),
    [tagTokens, params.tagDraft, params.selectedTagTokens],
  )

  const tagSuggestions = useMemo(
    () => limitAutocompleteSuggestions(tagFiltered, params.tagDraft, params.tagSuggestionLimit),
    [tagFiltered, params.tagDraft, params.tagSuggestionLimit],
  )

  return {
    genreTokens,
    tagTokens,
    isLoadingGenreTokens,
    isLoadingTagTokens,
    genreTokensError,
    tagTokensError,
    genreSuggestions,
    tagSuggestions,
    genreSuggestionsTotal: genreFiltered.length,
    tagSuggestionsTotal: tagFiltered.length,
  }
}
