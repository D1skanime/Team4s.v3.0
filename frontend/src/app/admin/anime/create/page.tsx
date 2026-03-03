'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { ContentType, AnimeStatus } from '@/types/anime'
import { AdminAnimeCreateRequest, AnimeType, GenreToken } from '@/types/admin'
import { ApiError, createAdminAnime, getAdminGenreTokens, getRuntimeAuthToken } from '@/lib/api'

import styles from '../../admin.module.css'

const ANIME_TYPES: AnimeType[] = ['tv', 'film', 'ova', 'ona', 'special', 'bonus']
const CONTENT_TYPES: ContentType[] = ['anime', 'hentai']
const ANIME_STATUSES: AnimeStatus[] = ['disabled', 'ongoing', 'done', 'aborted', 'licensed']

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeGenreToken(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function splitGenreTokens(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (!trimmed.includes(',')) return [normalizeGenreToken(trimmed)].filter(Boolean)
  return trimmed
    .split(',')
    .map((part) => normalizeGenreToken(part))
    .filter(Boolean)
}

function resolveCoverUrl(rawCoverImage?: string): string {
  const value = (rawCoverImage || '').trim()
  if (!value) return '/covers/placeholder.jpg'
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/')) return value
  return `/covers/${value}`
}

function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === 'true') return
  img.dataset.fallbackApplied = 'true'
  img.alt = ''
  img.src = '/covers/placeholder.jpg'
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
  const [genreSuggestionLimit, setGenreSuggestionLimit] = useState(40)

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
        console.error('admin/anime/create: failed to load genre tokens', error)
        if (error instanceof ApiError) setGenreTokensError(`(${error.status}) ${error.message}`)
        else setGenreTokensError('Genre-Vorschlaege konnten nicht geladen werden.')
      })
      .finally(() => setIsLoadingGenreTokens(false))
  }, [hasAuthToken, authToken])

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
  }, [createGenreDraft, createGenreTokens, genreTokens, genreSuggestionLimit])

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

  function removeCreateGenreToken(name: string) {
    setCreateGenreTokens((current) => current.filter((token) => token.toLowerCase() !== name.toLowerCase()))
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const title = createTitle.trim()
    if (!title) {
      setErrorMessage('title ist erforderlich')
      return
    }

    const payload: AdminAnimeCreateRequest = {
      title,
      type: createType,
      content_type: createContentType,
      status: createStatus,
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
    payload.cover_image = normalizeOptionalString(createCoverImage)

    try {
      setIsSubmittingCreate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await createAdminAnime(payload)
      setSuccessMessage(`Anime #${response.data.id} wurde erstellt. (Weiterleitung ins Studio...)`)
      setLastResponse(JSON.stringify(response, null, 2))

      // Send user back to Studio with the new anime preloaded.
      window.location.href = `/admin/anime?context=${response.data.id}`
    } catch (error) {
      console.error('admin/anime/create: create failed', error)
      setErrorMessage(formatError(error, 'Anime konnte nicht erstellt werden.'))
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  async function handleCoverUpload(file: File) {
    clearMessages()
    setIsUploadingCover(true)
    try {
      const fileName = await uploadCoverFile(file)
      setCreateCoverImage(fileName)
      setSuccessMessage(`Cover hochgeladen: ${fileName}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cover Upload fehlgeschlagen.'
      setErrorMessage(message)
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
        <p className={styles.subtitle}>Neuen Anime Datensatz anlegen und dann im Studio weiter bearbeiten.</p>
        <p className={styles.tokenPreview}>Token: {tokenPreview}</p>
      </header>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={handleCreateSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-title">Title *</label>
              <input
                id="create-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-type">Type *</label>
              <select
                id="create-type"
                value={createType}
                onChange={(event) => setCreateType(event.target.value as AnimeType)}
                disabled={isSubmittingCreate}
              >
                {ANIME_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-content-type">Content Type *</label>
              <select
                id="create-content-type"
                value={createContentType}
                onChange={(event) => setCreateContentType(event.target.value as ContentType)}
                disabled={isSubmittingCreate}
              >
                {CONTENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-status">Status *</label>
              <select
                id="create-status"
                value={createStatus}
                onChange={(event) => setCreateStatus(event.target.value as AnimeStatus)}
                disabled={isSubmittingCreate}
              >
                {ANIME_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-year">Year</label>
              <input
                id="create-year"
                value={createYear}
                onChange={(event) => setCreateYear(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 2026"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-max-episodes">Max Episodes</label>
              <input
                id="create-max-episodes"
                value={createMaxEpisodes}
                onChange={(event) => setCreateMaxEpisodes(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 12"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title-de">Title DE</label>
              <input
                id="create-title-de"
                value={createTitleDE}
                onChange={(event) => setCreateTitleDE(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title-en">Title EN</label>
              <input
                id="create-title-en"
                value={createTitleEN}
                onChange={(event) => setCreateTitleEN(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="create-genre">Genre</label>
              {createGenreTokens.length > 0 ? (
                <div className={styles.chipRow} aria-label="Ausgewaehlte Genres">
                  {createGenreTokens.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className={`${styles.chip} ${styles.chipActive}`}
                      onClick={() => removeCreateGenreToken(token)}
                      disabled={isSubmittingCreate}
                      title="Klicken zum Entfernen"
                    >
                      {token} x
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>Noch keine Genres gesetzt.</p>
              )}

              <div className={styles.inputRow}>
                <input
                  id="create-genre"
                  value={createGenreDraft}
                  onChange={(event) => setCreateGenreDraft(event.target.value)}
                  disabled={isSubmittingCreate}
                  placeholder="z. B. Action, Drama"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCreateGenreTokens(createGenreDraft)
                      setCreateGenreDraft('')
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  disabled={isSubmittingCreate || createGenreDraft.trim().length === 0}
                  onClick={() => {
                    addCreateGenreTokens(createGenreDraft)
                    setCreateGenreDraft('')
                  }}
                >
                  Hinzufuegen
                </button>
              </div>

              {isLoadingGenreTokens ? <p className={styles.hint}>Genre-Vorschlaege werden geladen...</p> : null}
              {genreTokensError ? <p className={styles.hint}>Hinweis: {genreTokensError}</p> : null}
              {!isLoadingGenreTokens && genreSuggestions.length > 0 ? (
                <>
                  <p className={styles.hint}>
                    Vorschlaege: {genreSuggestions.length}/{genreSuggestionsTotal} (geladen: {genreTokens.length})
                  </p>
                  <div className={styles.chipBox} aria-label="Genre Vorschlaege">
                    <div className={styles.chipRow}>
                      {genreSuggestions.map((token) => (
                        <button
                          key={token.name}
                          type="button"
                          className={styles.chip}
                          onClick={() => addCreateGenreTokens(token.name)}
                          disabled={isSubmittingCreate}
                          title={`+ ${token.name} (x${token.count})`}
                        >
                          {token.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={isSubmittingCreate || genreSuggestionLimit >= 1000}
                      onClick={() => setGenreSuggestionLimit((current) => Math.min(1000, current + 40))}
                    >
                      Mehr
                    </button>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      disabled={isSubmittingCreate || genreSuggestionLimit <= 40}
                      onClick={() => setGenreSuggestionLimit(40)}
                    >
                      Weniger
                    </button>
                  </div>
                </>
              ) : null}
              <p className={styles.hint}>Tip: Komma getrennt eingeben; Klick auf Vorschlag fuegt es hinzu.</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-cover-image">Cover Image</label>
              <input
                id="create-cover-image"
                value={createCoverImage}
                onChange={(event) => setCreateCoverImage(event.target.value)}
                disabled={isSubmittingCreate || isUploadingCover}
                placeholder="dateiname.jpg"
              />
              <div className={styles.coverInline}>
                <Image
                  className={styles.coverPreviewSmall}
                  src={resolveCoverUrl(createCoverImage)}
                  alt=""
                  width={88}
                  height={132}
                  unoptimized
                  onError={handleCoverImgError}
                />
                <div className={styles.actions}>
                  <a
                    className={styles.buttonSecondary}
                    href={resolveCoverUrl(createCoverImage)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cover oeffnen
                  </a>
                </div>
                <div className={styles.actions}>
                  <input
                    ref={coverFileInputRef}
                    className={styles.fileInput}
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      try {
                        await handleCoverUpload(file)
                      } finally {
                        event.target.value = ''
                      }
                    }}
                    disabled={isUploadingCover || isSubmittingCreate}
                  />
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isUploadingCover || isSubmittingCreate}
                    onClick={() => coverFileInputRef.current?.click()}
                  >
                    {isUploadingCover ? 'Upload...' : 'Cover hochladen (lokal)'}
                  </button>
                </div>
                <p className={styles.hint}>
                  Hinweis: Upload ist fuer lokale Entwicklung gedacht und speichert nach <code>frontend/public/covers</code>.
                </p>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-description">Description</label>
              <textarea
                id="create-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={isSubmittingCreate}>
              {isSubmittingCreate ? 'Speichern...' : 'Anime erstellen'}
            </button>
            <Link className={styles.buttonSecondary} href="/admin/anime">
              Abbrechen (zurueck ins Studio)
            </Link>
          </div>
        </form>
      </section>

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
