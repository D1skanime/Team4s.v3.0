import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAdminGenreTokens, getAnimeByID, updateAdminAnime } from '@/lib/api'
import { AdminAnimePatchRequest, AnimeType, GenreToken } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { AnimePatchClearFlags, AnimePatchState, AnimePatchValues } from '../../types/admin-anime'
import { normalizeOptionalString, parsePositiveInt, splitGenreTokens } from '../../utils/anime-helpers'

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

async function uploadCoverFile(file: File): Promise<string> {
  const form = new FormData()
  form.set('file', file)

  const response = await fetch('/api/admin/upload-cover', {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    let message = `Upload fehlgeschlagen (${response.status}).`
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      if (body.error?.message) {
        message = body.error.message
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const body = (await response.json()) as { data?: { file_name?: string } }
  const fileName = (body.data?.file_name || '').trim()
  if (!fileName) {
    throw new Error('Upload fehlgeschlagen: keine Datei erhalten.')
  }
  return fileName
}

export function useAnimePatch(
  authToken: string,
  onSuccess: (anime: AnimeDetail) => void,
  onError: (msg: string) => void,
  options: UseAnimePatchOptions = {},
): AnimePatchState & AnimePatchActions {
  const [values, setValues] = useState<AnimePatchValues>(EMPTY_VALUES)
  const [clearFlags, setClearFlags] = useState<AnimePatchClearFlags>(EMPTY_CLEAR_FLAGS)
  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([])
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false)
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null)
  const [genreSuggestionLimit, setGenreSuggestionLimitState] = useState(40)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const hasAuthToken = authToken.trim().length > 0

  useEffect(() => {
    if (!hasAuthToken) return
    if (genreTokens.length > 0) return

    setIsLoadingGenreTokens(true)
    setGenreTokensError(null)
    getAdminGenreTokens({ limit: 1000 }, authToken)
      .then((response) => setGenreTokens(response.data))
      .catch((error) => {
        if (error instanceof Error) setGenreTokensError(error.message)
        else setGenreTokensError('Genre-Vorschlaege konnten nicht geladen werden.')
      })
      .finally(() => setIsLoadingGenreTokens(false))
  }, [authToken, genreTokens.length, hasAuthToken])

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
      Boolean(values.title.trim()) ||
      Boolean(values.type.trim()) ||
      Boolean(values.contentType.trim()) ||
      Boolean(values.status.trim()) ||
      Boolean(values.year.trim()) ||
      Boolean(values.maxEpisodes.trim()) ||
      Boolean(values.titleDE.trim()) ||
      Boolean(values.titleEN.trim()) ||
      values.genreTokens.length > 0 ||
      Boolean(values.description.trim()) ||
      Boolean(values.coverImage.trim())
    const hasClearFlags = Object.values(clearFlags).some(Boolean)
    return hasValueChanges || hasClearFlags
  }, [clearFlags, values])

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
    setValues({
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
    })
    setClearFlags(EMPTY_CLEAR_FLAGS)
  }, [])

  const submit = useCallback(async (animeID: number) => {
    if (!hasAuthToken) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const payload: AdminAnimePatchRequest = {}
    const title = normalizeOptionalString(values.title)
    if (title) payload.title = title
    if (values.type) payload.type = values.type as AnimeType
    if (values.contentType) payload.content_type = values.contentType as ContentType
    if (values.status) payload.status = values.status as AnimeStatus

    if (clearFlags.year) payload.year = null
    else if (values.year.trim()) {
      const year = parsePositiveInt(values.year)
      if (!year) {
        onError('year muss groesser als 0 sein')
        return
      }
      payload.year = year
    }

    if (clearFlags.maxEpisodes) payload.max_episodes = null
    else if (values.maxEpisodes.trim()) {
      const maxEpisodes = parsePositiveInt(values.maxEpisodes)
      if (!maxEpisodes) {
        onError('max_episodes muss groesser als 0 sein')
        return
      }
      payload.max_episodes = maxEpisodes
    }

    const titleDE = normalizeOptionalString(values.titleDE)
    const titleEN = normalizeOptionalString(values.titleEN)
    const genre = normalizeOptionalString(values.genreTokens.join(', '))
    const description = normalizeOptionalString(values.description)
    const coverImage = normalizeOptionalString(values.coverImage)

    if (clearFlags.titleDE) payload.title_de = null
    else if (titleDE) payload.title_de = titleDE

    if (clearFlags.titleEN) payload.title_en = null
    else if (titleEN) payload.title_en = titleEN

    if (clearFlags.genre) payload.genre = null
    else if (genre) payload.genre = genre

    if (clearFlags.description) payload.description = null
    else if (description) payload.description = description

    if (clearFlags.coverImage) payload.cover_image = null
    else if (coverImage) payload.cover_image = coverImage

    if (Object.keys(payload).length === 0) {
      onError('Mindestens ein Feld fuer das Update ausfuellen.')
      return
    }

    try {
      setIsSubmitting(true)
      options.onRequest?.(JSON.stringify(payload, null, 2))
      const response = await updateAdminAnime(animeID, payload, authToken)
      options.onResponse?.(JSON.stringify(response, null, 2))
      const refreshed = await getAnimeByID(animeID, { include_disabled: true })
      onSuccess(refreshed.data)
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Anime konnte nicht aktualisiert werden.')
    } finally {
      setIsSubmitting(false)
    }
  }, [authToken, clearFlags, hasAuthToken, onError, onSuccess, options, values])

  const uploadAndSetCover = useCallback(async (file: File, animeID?: number | null) => {
    try {
      setIsUploadingCover(true)
      const fileName = await uploadCoverFile(file)
      setValues((current) => ({ ...current, coverImage: fileName }))
      setClearFlags((current) => ({ ...current, coverImage: false }))

      if (!hasAuthToken) return
      if (!animeID) return

      await updateAdminAnime(animeID, { cover_image: fileName }, authToken)
      const refreshed = await getAnimeByID(animeID, { include_disabled: true })
      onSuccess(refreshed.data)
    } catch (error) {
      if (error instanceof Error) onError(error.message)
      else onError('Cover Upload fehlgeschlagen.')
    } finally {
      setIsUploadingCover(false)
    }
  }, [authToken, hasAuthToken, onError, onSuccess])

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
