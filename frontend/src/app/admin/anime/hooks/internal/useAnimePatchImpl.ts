import { useCallback, useMemo, useState } from 'react'

import { AdminAnimeAssetKind, AnimeType } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { AnimePatchClearFlags, AnimePatchState, AnimePatchValues } from '../../types/admin-anime'
import { splitGenreTokens, splitTagTokens } from '../../utils/anime-helpers'
import { useAnimePatchMutations } from './anime-patch/useAnimePatchMutations'
import { useGenreTagAutocomplete } from '../useGenreTagAutocomplete'

interface AnimePatchActions {
  setField: (field: keyof AnimePatchValues, value: string | string[]) => void
  setClearFlag: (field: keyof AnimePatchClearFlags, value: boolean) => void
  addGenreToken: (token: string) => void
  removeGenreToken: (token: string) => void
  addTagToken: (token: string) => void
  removeTagToken: (token: string) => void
  setGenreSuggestionLimit: (next: number) => void
  setTagSuggestionLimit: (next: number) => void
  resetFromAnime: (anime: AnimeDetail) => void
  submit: (animeID: number) => Promise<boolean>
  uploadAndLinkAsset: (file: File, assetKind: AdminAnimeAssetKind, animeID?: number | null) => Promise<void>
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
  tagTokens: [],
  tagDraft: '',
  description: '',
  coverImage: '',
  source: '',
  folderName: '',
}

const EMPTY_CLEAR_FLAGS: AnimePatchClearFlags = {
  year: false,
  maxEpisodes: false,
  titleDE: false,
  titleEN: false,
  genre: false,
  tags: false,
  description: false,
  coverImage: false,
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export function useAnimePatch(
  onSuccess: (anime: AnimeDetail) => void,
  onError: (msg: string) => void,
  options: UseAnimePatchOptions = {},
): AnimePatchState & AnimePatchActions {
  const [values, setValues] = useState<AnimePatchValues>(EMPTY_VALUES)
  const [clearFlags, setClearFlags] = useState<AnimePatchClearFlags>(EMPTY_CLEAR_FLAGS)
  const [initialValues, setInitialValues] = useState<AnimePatchValues>(EMPTY_VALUES)
  const [initialClearFlags, setInitialClearFlags] = useState<AnimePatchClearFlags>(EMPTY_CLEAR_FLAGS)
  const [genreSuggestionLimit, setGenreSuggestionLimitState] = useState(40)
  const [tagSuggestionLimit, setTagSuggestionLimitState] = useState(40)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const autocomplete = useGenreTagAutocomplete({
    genreDraft: values.genreDraft,
    selectedGenreTokens: values.genreTokens,
    tagDraft: values.tagDraft,
    selectedTagTokens: values.tagTokens,
    genreSuggestionLimit,
    tagSuggestionLimit,
  })

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
      !areStringArraysEqual(values.tagTokens, initialValues.tagTokens) ||
      values.description !== initialValues.description ||
      values.coverImage !== initialValues.coverImage ||
      values.source !== initialValues.source ||
      values.folderName !== initialValues.folderName
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

    if (field === 'tags' && value) {
      setValues((current) => ({ ...current, tagTokens: [], tagDraft: '' }))
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

  const addTagToken = useCallback((token: string) => {
    const nextTokens = splitTagTokens(token)
    if (nextTokens.length === 0) return

    setValues((current) => {
      const index = new Set(current.tagTokens.map((item) => item.toLowerCase()))
      const merged = [...current.tagTokens]
      for (const nextToken of nextTokens) {
        const key = nextToken.toLowerCase()
        if (index.has(key)) continue
        index.add(key)
        merged.push(nextToken)
      }
      return { ...current, tagTokens: merged }
    })
  }, [])

  const removeTagToken = useCallback((token: string) => {
    const needle = token.toLowerCase()
    setValues((current) => ({
      ...current,
      tagTokens: current.tagTokens.filter((item) => item.toLowerCase() !== needle),
    }))
  }, [])

  const setGenreSuggestionLimit = useCallback((next: number) => {
    setGenreSuggestionLimitState(Math.max(40, Math.min(1000, next)))
  }, [])

  const setTagSuggestionLimit = useCallback((next: number) => {
    setTagSuggestionLimitState(Math.max(40, Math.min(1000, next)))
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
      tagTokens: splitTagTokens(((anime as AnimeDetail & { tags?: string[] }).tags || []).join(', ')),
      genreDraft: '',
      tagDraft: '',
      description: anime.description ?? '',
      coverImage: anime.cover_image ?? '',
      source: anime.source ?? '',
      folderName: anime.folder_name ?? '',
    }
    setValues(nextValues)
    setClearFlags(EMPTY_CLEAR_FLAGS)
    setInitialValues(nextValues)
    setInitialClearFlags(EMPTY_CLEAR_FLAGS)
  }, [])

  const { submit, uploadAndLinkAsset, uploadAndSetCover } = useAnimePatchMutations({
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
    ...autocomplete,
    genreSuggestionLimit,
    tagSuggestionLimit,
    isSubmitting,
    isUploadingCover,
    isDirty,
    setField,
    setClearFlag,
    addGenreToken,
    removeGenreToken,
    addTagToken,
    removeTagToken,
    setGenreSuggestionLimit,
    setTagSuggestionLimit,
    resetFromAnime,
    submit,
    uploadAndLinkAsset,
    uploadAndSetCover,
  }
}
