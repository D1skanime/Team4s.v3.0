'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { ApiError, createAdminAnime, getAdminGenreTokens, getRuntimeAuthToken } from '@/lib/api'
import { ContentType, AnimeStatus } from '@/types/anime'
import { AdminAnimeCreateRequest, AnimeType, GenreToken } from '@/types/admin'

import styles from '../../admin.module.css'
import { ManualCreateWorkspace } from '../components/ManualCreate/ManualCreateWorkspace'
import { useAnimeEditor } from '../hooks/useAnimeEditor'
import { resolveManualCreateState } from '../hooks/useManualAnimeDraft'
import { normalizeOptionalString, parsePositiveInt, splitGenreTokens } from '../utils/anime-helpers'

export function buildManualCreateRedirectPath(id: number): string {
  return `/admin/anime/${id}/edit`
}

export async function uploadManualCreateCover(file: File): Promise<string> {
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
      if (body.error?.message) message = body.error.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const body = (await response.json()) as { data?: { file_name?: string } }
  const fileName = (body.data?.file_name || '').trim()
  if (!fileName) throw new Error('Upload fehlgeschlagen: keine Datei erhalten.')
  return fileName
}

export async function createManualAnimeAndRedirect(
  payload: AdminAnimeCreateRequest,
  deps: {
    createAdminAnime: (payload: AdminAnimeCreateRequest, authToken?: string) => Promise<{ data: { id: number } }>
    setLocationHref: (value: string) => void
    authToken?: string
  },
) {
  const response = deps.authToken
    ? await deps.createAdminAnime(payload, deps.authToken)
    : await deps.createAdminAnime(payload)
  deps.setLocationHref(buildManualCreateRedirectPath(response.data.id))
  return response
}

const DEFAULT_GENRE_LIMIT = 40

export default function AdminAnimeCreatePage() {
  const [authToken, setAuthToken] = useState('')
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [genreTokens, setGenreTokens] = useState<GenreToken[]>([])
  const [isLoadingGenreTokens, setIsLoadingGenreTokens] = useState(false)
  const [genreTokensError, setGenreTokensError] = useState<string | null>(null)
  const [genreSuggestionLimit, setGenreSuggestionLimit] = useState(DEFAULT_GENRE_LIMIT)
  const [showValidationSummary, setShowValidationSummary] = useState(false)

  const [createTitle, setCreateTitle] = useState('')
  const [createType, setCreateType] = useState<AnimeType>('tv')
  const [createContentType, setCreateContentType] = useState<ContentType>('anime')
  const [createStatus, setCreateStatus] = useState<AnimeStatus>('ongoing')
  const [createYear, setCreateYear] = useState('')
  const [createMaxEpisodes, setCreateMaxEpisodes] = useState('')
  const [createTitleDE, setCreateTitleDE] = useState('')
  const [createTitleEN, setCreateTitleEN] = useState('')
  const [createGenreDraft, setCreateGenreDraft] = useState('')
  const [createGenreTokens, setCreateGenreTokens] = useState<string[]>([])
  const [createDescription, setCreateDescription] = useState('')
  const [createCoverImage, setCreateCoverImage] = useState('')
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAuthToken(getRuntimeAuthToken())
  }, [])

  const hasAuthToken = authToken.length > 0
  const tokenPreview = useMemo(() => {
    if (!authToken) return 'n/a'
    return authToken.length > 24 ? `${authToken.slice(0, 24)}...` : authToken
  }, [authToken])

  useEffect(() => {
    if (!hasAuthToken) return

    setIsLoadingGenreTokens(true)
    setGenreTokensError(null)
    getAdminGenreTokens({ limit: 1000 }, authToken)
      .then((response) => setGenreTokens(response.data))
      .catch((error) => {
        if (error instanceof ApiError) setGenreTokensError(`(${error.status}) ${error.message}`)
        else setGenreTokensError('Genre-Vorschlaege konnten nicht geladen werden.')
      })
      .finally(() => setIsLoadingGenreTokens(false))
  }, [authToken, hasAuthToken])

  const manualDraftState = useMemo(
    () =>
      resolveManualCreateState({
        title: createTitle,
        cover_image: createCoverImage,
        year: createYear,
        max_episodes: createMaxEpisodes,
        title_de: createTitleDE,
        title_en: createTitleEN,
        genre: createGenreTokens,
        description: createDescription,
      }),
    [
      createCoverImage,
      createDescription,
      createGenreTokens,
      createMaxEpisodes,
      createTitle,
      createTitleDE,
      createTitleEN,
      createYear,
    ],
  )

  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (!createTitle.trim()) fields.push('Titel')
    if (!createCoverImage.trim()) fields.push('Cover')
    return fields
  }, [createCoverImage, createTitle])

  const editor = useAnimeEditor('create', {
    isDirty: manualDraftState.key !== 'empty',
    canSubmit: manualDraftState.canSubmit,
    isSubmitting: isSubmittingCreate,
    formID: 'anime-create-form',
    submitButtonType: 'submit',
    submitLabel: isSubmittingCreate ? 'Anime wird erstellt...' : 'Anime erstellen',
    savedStateTitle: 'Noch kein manueller Entwurf',
    savedStateMessage: 'Starte mit Titel und Cover. Erst beim Speichern wird ein Anime angelegt.',
    dirtyStateTitle:
      manualDraftState.key === 'ready' ? 'Entwurf bereit zum Anlegen' : 'Entwurf unvollstaendig',
    dirtyStateMessage:
      manualDraftState.key === 'ready'
        ? 'Titel und Cover sind gesetzt. Du kannst den Anime jetzt anlegen.'
        : 'Titel und Cover fehlen noch, bevor der Anime angelegt werden kann.',
  })

  const createGenreValue = useMemo(() => createGenreTokens.join(', '), [createGenreTokens])

  const genreSuggestions = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase()
    const selected = new Set(createGenreTokens.map((token) => token.toLowerCase()))
    const filtered = genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    })
    const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit
    return filtered.slice(0, limit)
  }, [createGenreDraft, createGenreTokens, genreSuggestionLimit, genreTokens])

  const genreSuggestionsTotal = useMemo(() => {
    const q = createGenreDraft.trim().toLowerCase()
    const selected = new Set(createGenreTokens.map((token) => token.toLowerCase()))
    return genreTokens.filter((token) => {
      if (selected.has(token.name.toLowerCase())) return false
      if (!q) return true
      return token.name.toLowerCase().includes(q)
    }).length
  }, [createGenreDraft, createGenreTokens, genreTokens])

  function clearMessages() {
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function formatError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return `(${error.status}) ${error.message}`
    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
  }

  function addCreateGenreTokens(raw: string) {
    const tokens = splitGenreTokens(raw)
    if (tokens.length === 0) return

    setCreateGenreTokens((current) => {
      const index = new Set(current.map((token) => token.toLowerCase()))
      const next = [...current]
      for (const token of tokens) {
        const key = token.toLowerCase()
        if (index.has(key)) continue
        index.add(key)
        next.push(token)
      }
      return next
    })
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)
    setShowValidationSummary(true)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (!manualDraftState.canSubmit) {
      setErrorMessage('Titel und Cover sind erforderlich')
      return
    }

    const title = createTitle.trim()
    const payload: AdminAnimeCreateRequest = {
      title,
      type: createType,
      content_type: createContentType,
      status: createStatus,
      cover_image: createCoverImage.trim(),
    }

    if (createYear.trim()) {
      const year = parsePositiveInt(createYear)
      if (!year) {
        setErrorMessage('year muss groesser als 0 sein')
        return
      }
      payload.year = year
    }

    if (createMaxEpisodes.trim()) {
      const maxEpisodes = parsePositiveInt(createMaxEpisodes)
      if (!maxEpisodes) {
        setErrorMessage('max_episodes muss groesser als 0 sein')
        return
      }
      payload.max_episodes = maxEpisodes
    }

    payload.title_de = normalizeOptionalString(createTitleDE)
    payload.title_en = normalizeOptionalString(createTitleEN)
    payload.genre = normalizeOptionalString(createGenreValue)
    payload.description = normalizeOptionalString(createDescription)

    try {
      setIsSubmittingCreate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await createManualAnimeAndRedirect(payload, {
        createAdminAnime,
        authToken,
        setLocationHref: (value) => {
          window.location.href = value
        },
      })
      setSuccessMessage(`Anime #${response.data.id} wurde erstellt. (Weiterleitung ins Studio...)`)
      setLastResponse(JSON.stringify(response, null, 2))
    } catch (error) {
      setErrorMessage(formatError(error, 'Anime konnte nicht erstellt werden.'))
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  async function handleCoverUpload(file: File) {
    clearMessages()
    setIsUploadingCover(true)
    try {
      const fileName = await uploadManualCreateCover(file)
      setCreateCoverImage(fileName)
      setShowValidationSummary(false)
      setSuccessMessage(`Cover hochgeladen: ${fileName}`)
    } catch (error) {
      setErrorMessage(formatError(error, 'Cover Upload fehlgeschlagen.'))
    } finally {
      setIsUploadingCover(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> | <Link href="/admin/anime">Studio</Link> | <Link href="/auth">Auth</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Anime erstellen</h1>
        <p className={styles.subtitle}>Neuen Anime erst als manuellen Entwurf pruefen und dann ins Studio uebernehmen.</p>
        <p className={styles.tokenPreview}>Token: {tokenPreview}</p>
      </header>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      <ManualCreateWorkspace
        editor={editor}
        title={createTitle}
        type={createType}
        contentType={createContentType}
        status={createStatus}
        year={createYear}
        maxEpisodes={createMaxEpisodes}
        titleDE={createTitleDE}
        titleEN={createTitleEN}
        genreDraft={createGenreDraft}
        genreTokens={createGenreTokens}
        description={createDescription}
        coverImage={createCoverImage}
        inputRef={coverFileInputRef}
        genreSuggestions={genreSuggestions}
        genreSuggestionsTotal={genreSuggestionsTotal}
        loadedTokenCount={genreTokens.length}
        isLoadingGenres={isLoadingGenreTokens}
        genreError={genreTokensError}
        isSubmitting={isSubmittingCreate}
        isUploadingCover={isUploadingCover}
        canLoadMore={genreSuggestionLimit < 1000}
        canResetLimit={genreSuggestionLimit > DEFAULT_GENRE_LIMIT}
        missingFields={showValidationSummary ? missingFields : []}
        onSubmit={handleCreateSubmit}
        onTitleChange={(value) => {
          setCreateTitle(value)
          if (showValidationSummary) setShowValidationSummary(false)
        }}
        onTypeChange={setCreateType}
        onContentTypeChange={setCreateContentType}
        onStatusChange={setCreateStatus}
        onYearChange={setCreateYear}
        onMaxEpisodesChange={setCreateMaxEpisodes}
        onTitleDEChange={setCreateTitleDE}
        onTitleENChange={setCreateTitleEN}
        onDescriptionChange={setCreateDescription}
        onCoverImageChange={(value) => {
          setCreateCoverImage(value)
          if (showValidationSummary) setShowValidationSummary(false)
        }}
        onDraftGenreChange={setCreateGenreDraft}
        onAddDraftGenre={() => {
          addCreateGenreTokens(createGenreDraft)
          setCreateGenreDraft('')
        }}
        onRemoveGenreToken={(name) =>
          setCreateGenreTokens((current) => current.filter((token) => token.toLowerCase() !== name.toLowerCase()))
        }
        onAddGenreSuggestion={addCreateGenreTokens}
        onIncreaseGenreLimit={() => setGenreSuggestionLimit((current) => Math.min(1000, current + 40))}
        onResetGenreLimit={() => setGenreSuggestionLimit(DEFAULT_GENRE_LIMIT)}
        onFileChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          try {
            await handleCoverUpload(file)
          } finally {
            event.target.value = ''
          }
        }}
        onOpenFileDialog={() => coverFileInputRef.current?.click()}
      />

      {lastRequest ? (
        <pre className={styles.resultBox}>
          <strong>Request</strong>
          {'\n'}
          {lastRequest}
        </pre>
      ) : null}
      {lastResponse ? (
        <pre className={styles.resultBox}>
          <strong>Response</strong>
          {'\n'}
          {lastResponse}
        </pre>
      ) : null}
    </main>
  )
}
