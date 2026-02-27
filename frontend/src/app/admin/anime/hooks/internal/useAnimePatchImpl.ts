import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAdminGenreTokens } from '@/lib/api'
import { AnimeType, GenreToken } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { AnimePatchClearFlags, AnimePatchState, AnimePatchValues } from '../../types/admin-anime'
import { splitGenreTokens } from '../../utils/anime-helpers'
import { useAnimePatchMutations } from './anime-patch/useAnimePatchMutations'

interface AnimePatchActions {
  setField: (field: keyof AnimePatchValues, value: string | string[]) => void
  setClearFlag: (field: keyof AnimePatchClearFlags, value: boolean) => void
  addGenreToken: (token: string) => void
  removeGenreToken: (token: string) => void
  setGenreSuggestionLimit: (next: number) => void
  resetFromAnime: (anime: AnimeDetail) => void
  submit: (animeID: number) => Promise<void>
  uploadAndSetCover: (file: File, animeID?: number | null) => Promise<void>
}

interface UseAnimePatchOptions {
  onRequest?: (value: string | null) => void
  onResponse?: (value: string | null) => void
}

const EMPTY_VALUES: AnimePatchValues = {
  title: '',
  type: '',
  contentType: '',
  status: '',
  year: '',
  maxEpisodes: '',
  titleDE: '',
  titleEN: '',
  genreTokens: [],
  genreDraft: '',
  description: '',
  coverImage: '',
}

const EMPTY_CLEAR_FLAGS: AnimePatchClearFlags = {
  year: false,
  maxEpisodes: false,
  titleDE: false,
  titleEN: false,
  genre: false,
  description: false,
  coverImage: false,
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export function useAnimePatch(
  authToken: string,
  onSuccess: (anime: AnimeDetail) => void,
  onError: (msg: string) => void,
  options: UseAnimePatchOptions = {},
): AnimePatchState & AnimePatchActions {
  const [values, setValues] = useState<AnimePatchValues>(EMPTY_VALUES)
  const [clearFlags, setClearFlags] = useState<AnimePatchClearFlags>(EMPTY_CLEAR_FLAGS)
  const [initialValues, setInitialValues] = useState<AnimePatchValues>(EMPTY_VALUES)
  const [initialClearFlags, setInitialClearFlags] = useState<AnimePatchClearFlags>(EMPTY_CLEAR_FLAGS)
  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([])
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false)
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null)
  const [genreSuggestionLimit, setGenreSuggestionLimitState] = useState(40)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const hasAuthToken = authToken.trim().length > 0

  useEffect(() => {
    if (genreTokens.length > 0) return

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
        else setGenreTokensError('Genre-Vorschlaege konnten nicht geladen werden.')
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
  }, [genreTokens.length])

  const genreSuggestions = useMemo(() => {
    const q = values.genreDraft.trim().toLowerCase()
    const selected = new Set(values.genreTokens.map((token) => token.toLowerCase()))
    const filtered = genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    })
    const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit
    return filtered.slice(0, limit)
  }, [genreSuggestionLimit, genreTokens, values.genreDraft, values.genreTokens])

  const genreSuggestionsTotal = useMemo(() => {
    const q = values.genreDraft.trim().toLowerCase()
    const selected = new Set(values.genreTokens.map((token) => token.toLowerCase()))
    return genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    }).length
  }, [genreTokens, values.genreDraft, values.genreTokens])

  const isDirty = useMemo(() => {
    const hasValueChanges =
      values.title !== initialValues.title ||
      values.type !== initialValues.type ||
      values.contentType !== initialValues.contentType ||
      values.status !== initialValues.status ||
      values.year !== initialValues.year ||
      values.maxEpisodes !== initialValues.maxEpisodes ||
      values.titleDE !== initialValues.titleDE ||
      values.titleEN !== initialValues.titleEN ||
      !areStringArraysEqual(values.genreTokens, initialValues.genreTokens) ||
      values.description !== initialValues.description ||
      values.coverImage !== initialValues.coverImage
    const hasClearFlags = Object.keys(clearFlags).some(
      (key) => clearFlags[key as keyof AnimePatchClearFlags] !== initialClearFlags[key as keyof AnimePatchClearFlags],
    )
    return hasValueChanges || hasClearFlags
  }, [clearFlags, initialClearFlags, initialValues, values])

  const setField = useCallback((field: keyof AnimePatchValues, value: string | string[]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const setClearFlag = useCallback((field: keyof AnimePatchClearFlags, value: boolean) => {
    setClearFlags((current) => ({ ...current, [field]: value }))

    if (field === 'genre' && value) {
      setValues((current) => ({ ...current, genreTokens: [], genreDraft: '' }))
    }
  }, [])

  const addGenreToken = useCallback((token: string) => {
    const nextTokens = splitGenreTokens(token)
    if (nextTokens.length === 0) return

    setValues((current) => {
      const index = new Set(current.genreTokens.map((item) => item.toLowerCase()))
      const merged = [...current.genreTokens]
      for (const nextToken of nextTokens) {
        const key = nextToken.toLowerCase()
        if (index.has(key)) continue
        index.add(key)
        merged.push(nextToken)
      }
      return { ...current, genreTokens: merged }
    })
  }, [])

  const removeGenreToken = useCallback((token: string) => {
    const needle = token.toLowerCase()
    setValues((current) => ({
      ...current,
      genreTokens: current.genreTokens.filter((item) => item.toLowerCase() !== needle),
    }))
  }, [])

  const setGenreSuggestionLimit = useCallback((next: number) => {
    setGenreSuggestionLimitState(Math.max(40, Math.min(1000, next)))
  }, [])

  const resetFromAnime = useCallback((anime: AnimeDetail) => {
    const nextValues: AnimePatchValues = {
      title: anime.title ?? '',
      type: (anime.type as AnimeType) ?? '',
      contentType: (anime.content_type as ContentType) ?? '',
      status: (anime.status as AnimeStatus) ?? '',
      year: anime.year ? String(anime.year) : '',
      maxEpisodes: anime.max_episodes ? String(anime.max_episodes) : '',
      titleDE: anime.title_de ?? '',
      titleEN: anime.title_en ?? '',
      genreTokens: splitGenreTokens(anime.genre ?? ''),
      genreDraft: '',
      description: anime.description ?? '',
      coverImage: anime.cover_image ?? '',
    }
    setValues(nextValues)
    setClearFlags(EMPTY_CLEAR_FLAGS)
    setInitialValues(nextValues)
    setInitialClearFlags(EMPTY_CLEAR_FLAGS)
  }, [])

  const { submit, uploadAndSetCover } = useAnimePatchMutations({
    authToken,
    hasAuthToken,
    values,
    clearFlags,
    onSuccess,
    onError,
    options,
    setIsSubmitting,
    setIsUploadingCover,
    setValues,
    setClearFlags,
  })

  return {
    values,
    clearFlags,
    genreTokens,
    genreSuggestions,
    genreSuggestionsTotal,
    isLoadingGenreTokens,
    genreTokensError,
    genreSuggestionLimit,
    isSubmitting,
    isUploadingCover,
    isDirty,
    setField,
    setClearFlag,
    addGenreToken,
    removeGenreToken,
    setGenreSuggestionLimit,
    resetFromAnime,
    submit,
    uploadAndSetCover,
  }
}
