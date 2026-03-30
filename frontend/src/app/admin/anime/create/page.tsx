'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import { ApiError, createAdminAnime, getAdminGenreTokens, getRuntimeAuthToken } from '@/lib/api'
import { createAdminAnimeFromJellyfinDraft } from '@/lib/api/admin-anime-intake'
import { ContentType, AnimeStatus } from '@/types/anime'
import { AdminAnimeCreateRequest, AnimeType, GenreToken } from '@/types/admin'

import styles from '../../admin.module.css'
import createStyles from './page.module.css'
import { JellyfinCandidateReview } from '../components/JellyfinIntake/JellyfinCandidateReview'
import { JellyfinDraftAssets } from '../components/ManualCreate/JellyfinDraftAssets'
import { ManualCreateWorkspace } from '../components/ManualCreate/ManualCreateWorkspace'
import { useAnimeEditor } from '../hooks/useAnimeEditor'
import {
  hydrateManualDraftFromJellyfinPreview,
  removeJellyfinDraftAsset,
  resolveManualCreateState,
  type JellyfinDraftAssetTarget,
  type ManualAnimeDraftValues,
} from '../hooks/useManualAnimeDraft'
import { useJellyfinIntake } from '../hooks/useJellyfinIntake'
import { normalizeOptionalString, parsePositiveInt, splitGenreTokens } from '../utils/anime-helpers'
import {
  formatJellyfinTypeHintConfidence,
  formatJellyfinTypeHintLabel,
  formatJellyfinTypeHintReasoning,
} from '../utils/jellyfin-intake-type-hint'
import type {
  AdminAnimeJellyfinIntakePreviewResult,
  AdminJellyfinIntakeAssetSlots,
} from '@/types/admin'

export function buildManualCreateRedirectPath(id: number): string {
  return `/admin/anime?created=${id}#anime-${id}`
}

export function appendJellyfinLinkageToCreatePayload(
  payload: AdminAnimeCreateRequest,
  preview: AdminAnimeJellyfinIntakePreviewResult | null,
): AdminAnimeCreateRequest {
  if (!preview) {
    return payload
  }

  const source = `jellyfin:${preview.jellyfin_series_id.trim()}`
  const folderName = preview.jellyfin_series_path?.trim()

  return {
    ...payload,
    source,
    folder_name: folderName || undefined,
  }
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

export function resolveSourceActionState(title: string) {
  const trimmed = title.trim()
  const meaningful = trimmed.length >= 2 && /[\p{L}\p{N}]/u.test(trimmed)
  return {
    canSync: meaningful,
    helperText: meaningful
      ? 'Jellyfin nutzt den aktuellen Titel als Suchanfrage. AniSearch Sync kommt in Phase 4.'
      : 'Gib zuerst einen aussagekraeftigen Anime-Titel ein. AniSearch Sync kommt in Phase 4.',
  }
}

export function buildManualCreateDraftSnapshot(values: ManualAnimeDraftValues): ManualAnimeDraftValues {
  return {
    ...values,
    genreTokens: [...values.genreTokens],
  }
}

function countIncomingDraftAssets(assetSlots: AdminJellyfinIntakeAssetSlots | null): number {
  if (!assetSlots) return 0

  let total = 0
  if (assetSlots.cover.present) total += 1
  if (assetSlots.logo.present) total += 1
  if (assetSlots.banner.present) total += 1
  if (assetSlots.background_video.present) total += 1
  total += assetSlots.backgrounds.length

  return total
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
  const [jellyfinPreview, setJellyfinPreview] = useState<AdminAnimeJellyfinIntakePreviewResult | null>(null)
  const [jellyfinAssetSlots, setJellyfinAssetSlots] = useState<AdminJellyfinIntakeAssetSlots | null>(null)
  const [jellyfinDraftSnapshot, setJellyfinDraftSnapshot] = useState<ManualAnimeDraftValues | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAuthToken(getRuntimeAuthToken())
  }, [])

  const hasAuthToken = authToken.length > 0

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

  const jellyfinIntake = useJellyfinIntake(authToken)

  useEffect(() => {
    jellyfinIntake.setQuery(createTitle)
  }, [createTitle, jellyfinIntake.setQuery])

  const sourceActionState = useMemo(() => resolveSourceActionState(createTitle), [createTitle])

  const manualDraftValues = useMemo<ManualAnimeDraftValues>(
    () => ({
      title: createTitle,
      type: createType,
      contentType: createContentType,
      status: createStatus,
      year: createYear,
      maxEpisodes: createMaxEpisodes,
      titleDE: createTitleDE,
      titleEN: createTitleEN,
      genreTokens: createGenreTokens,
      description: createDescription,
      coverImage: createCoverImage,
    }),
    [
      createContentType,
      createCoverImage,
      createDescription,
      createGenreTokens,
      createMaxEpisodes,
      createStatus,
      createTitle,
      createTitleDE,
      createTitleEN,
      createType,
      createYear,
    ],
  )

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

  const selectedDraftAssetCount = useMemo(() => countIncomingDraftAssets(jellyfinAssetSlots), [jellyfinAssetSlots])
  const hasSelectedJellyfinPreview = Boolean(jellyfinPreview)
  const readinessLabel = missingFields.length > 0 ? `Fehlt: ${missingFields.join(', ')}` : 'Bereit zum Anlegen'
  const showJellyfinResults = jellyfinIntake.candidates.length > 0
  const showDebugPanel = process.env.NODE_ENV !== 'production' && (lastRequest || lastResponse)
  const editor = useAnimeEditor('create', {
    isDirty: manualDraftState.key !== 'empty',
    canSubmit: manualDraftState.canSubmit,
    isSubmitting: isSubmittingCreate,
    formID: 'anime-create-form',
    submitButtonType: 'submit',
    submitLabel: isSubmittingCreate ? 'Anime wird erstellt...' : 'Anime erstellen',
    savedStateTitle: 'Noch nicht bereit',
    savedStateMessage: 'Titel und Cover fehlen noch.',
    dirtyStateTitle: manualDraftState.key === 'ready' ? 'Bereit zum Anlegen' : 'Fehlt noch',
    dirtyStateMessage: manualDraftState.key === 'ready' ? 'Titel und Cover sind gesetzt.' : 'Titel und Cover fehlen noch.',
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

  function applyManualDraftValues(values: ManualAnimeDraftValues) {
    setCreateTitle(values.title)
    setCreateType(values.type)
    setCreateContentType(values.contentType)
    setCreateStatus(values.status)
    setCreateYear(values.year)
    setCreateMaxEpisodes(values.maxEpisodes)
    setCreateTitleDE(values.titleDE)
    setCreateTitleEN(values.titleEN)
    setCreateGenreTokens(values.genreTokens)
    setCreateDescription(values.description)
    setCreateCoverImage(values.coverImage)
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
      const createPayload = appendJellyfinLinkageToCreatePayload(payload, jellyfinPreview)
      const response = await createManualAnimeAndRedirect(createPayload, {
        createAdminAnime: jellyfinPreview ? createAdminAnimeFromJellyfinDraft : createAdminAnime,
        authToken,
        setLocationHref: (value) => {
          window.location.href = value
        },
      })
      setSuccessMessage(`Anime #${response.data.id} wurde erstellt. (Weiterleitung zur Uebersicht...)`)
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

  async function handleJellyfinSearch() {
    clearMessages()
    try {
      await jellyfinIntake.search()
      if (jellyfinIntake.candidates.length === 0) {
        setSuccessMessage('Jellyfin-Suche abgeschlossen. Falls keine Karten erscheinen, pruefe Titel oder Ordnernamen.')
      }
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin-Daten konnten nicht geladen werden.'))
    }
  }

  async function handleJellyfinCandidateReview(candidateID: string) {
    clearMessages()
    jellyfinIntake.reviewCandidate(candidateID)

    try {
      const preview = await jellyfinIntake.loadPreview(candidateID)
      if (!preview) {
        setErrorMessage('Jellyfin-Vorschau konnte nicht geladen werden.')
        return
      }

      setJellyfinDraftSnapshot(buildManualCreateDraftSnapshot(manualDraftValues))
      const hydrated = hydrateManualDraftFromJellyfinPreview(manualDraftValues, preview)
      applyManualDraftValues(hydrated.draft)
      setJellyfinPreview(preview)
      setJellyfinAssetSlots(hydrated.assetSlots)
      setShowValidationSummary(false)
      setSuccessMessage(`Jellyfin-Vorschau fuer ${preview.jellyfin_series_name} geladen.`)
    } catch (error) {
      setErrorMessage(formatError(error, 'Jellyfin-Vorschau konnte nicht geladen werden.'))
    }
  }

  function handleAniSearchPlaceholder() {
    clearMessages()
    setSuccessMessage('AniSearch Sync kommt in Phase 4.')
  }

  function handleJellyfinCandidateSelect(candidateID: string) {
    clearMessages()
    jellyfinIntake.reviewCandidate(candidateID)
    setSuccessMessage('Treffer ausgewaehlt. Lade jetzt die Jellyfin-Vorschau, wenn dieser Ordner wirklich passt.')
  }

  function handleRemoveJellyfinAsset(target: JellyfinDraftAssetTarget) {
    if (!jellyfinAssetSlots) return

    const next = removeJellyfinDraftAsset(manualDraftValues, jellyfinAssetSlots, target)
    applyManualDraftValues(next.draft)
    setJellyfinAssetSlots(next.assetSlots)
    setShowValidationSummary(false)
  }

  function handleDiscardJellyfinPreview() {
    if (jellyfinDraftSnapshot) {
      applyManualDraftValues(jellyfinDraftSnapshot)
    }
    setJellyfinPreview(null)
    setJellyfinAssetSlots(null)
    setJellyfinDraftSnapshot(null)
    jellyfinIntake.resetReview()
    clearMessages()
    setSuccessMessage('Jellyfin-Vorschau verworfen. Der Entwurf bleibt ungespeichert.')
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> | <Link href="/admin/anime">Studio</Link> | <Link href="/auth">Auth</Link>
      </p>

      <div className={createStyles.pageShell}>
        <header className={createStyles.pageHeader}>
          <div className={createStyles.pageTitleBlock}>
            <h1 className={createStyles.pageTitle}>Anime erstellen</h1>
            <p className={createStyles.pageIntro}>Pflicht sind nur Titel und Cover. Jellyfin bleibt eine optionale Hilfe.</p>
          </div>
          <div className={createStyles.statusBar}>
            <span
              className={`${createStyles.statusPill} ${
                missingFields.length === 0 ? createStyles.statusPillReady : createStyles.statusPillWarning
              }`}
            >
              {readinessLabel}
            </span>
            <span className={createStyles.statusPill}>
              {hasSelectedJellyfinPreview ? 'Jellyfin verknuepft' : showJellyfinResults ? `${jellyfinIntake.candidates.length} Treffer` : 'Manuell'}
            </span>
            <span className={`${createStyles.statusPill} ${hasAuthToken ? createStyles.statusPillMuted : createStyles.statusPillWarning}`}>
              {hasAuthToken ? 'Auth bereit' : 'Auth fehlt'}
            </span>
            {selectedDraftAssetCount > 0 ? <span className={createStyles.statusPill}>{selectedDraftAssetCount} Assets</span> : null}
          </div>
        </header>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        <section className={createStyles.workspaceSection}>
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
            titleActions={
              <>
                <button
                  className={createStyles.primaryAction}
                  type="button"
                  disabled={!sourceActionState.canSync || jellyfinIntake.isSearching || isSubmittingCreate}
                  onClick={() => {
                    void handleJellyfinSearch()
                  }}
                >
                  {jellyfinIntake.isSearching ? 'Jellyfin sucht...' : 'Jellyfin suchen'}
                </button>
                <button
                  className={createStyles.secondaryAction}
                  type="button"
                  disabled={!sourceActionState.canSync || isSubmittingCreate}
                  onClick={handleAniSearchPlaceholder}
                >
                  AniSearch spaeter
                </button>
              </>
            }
            titleHint={<p className={styles.hint}>{sourceActionState.helperText}</p>}
            typeHint={
              jellyfinPreview ? (
                <div className={styles.details}>
                  <strong>{formatJellyfinTypeHintLabel(jellyfinPreview.type_hint)}</strong>
                  <p className={styles.hint}>
                    Vertrauen: {formatJellyfinTypeHintConfidence(jellyfinPreview.type_hint.confidence)}
                  </p>
                  <p className={styles.hint}>{formatJellyfinTypeHintReasoning(jellyfinPreview.type_hint)}</p>
                </div>
              ) : null
            }
            draftAssets={
              jellyfinPreview && jellyfinAssetSlots ? (
                <>
                  <JellyfinDraftAssets
                    animeTitle={createTitle.trim() || jellyfinPreview.jellyfin_series_name}
                    assetSlots={jellyfinAssetSlots}
                    onRemoveAsset={handleRemoveJellyfinAsset}
                  />
                  <div className={styles.actions}>
                    <button
                      className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                      type="button"
                      onClick={handleDiscardJellyfinPreview}
                    >
                      Auswahl verwerfen
                    </button>
                  </div>
                </>
              ) : null
            }
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
        </section>

        {showJellyfinResults ? (
          <section className={createStyles.resultsPanel}>
            <div className={createStyles.resultsHeader}>
              <div className={createStyles.resultsTitleBlock}>
                <p className={createStyles.resultsEyebrow}>Jellyfin</p>
                <h2 className={createStyles.resultsTitle}>Treffer pruefen</h2>
                <p className={createStyles.resultsText}>Nur uebernehmen, wenn Name, Pfad und Vorschau wirklich passen.</p>
              </div>
              {hasSelectedJellyfinPreview ? <span className={createStyles.statusPill}>Vorschau aktiv</span> : null}
            </div>
            <JellyfinCandidateReview
              query={createTitle.trim()}
              candidates={jellyfinIntake.candidates}
              selectedCandidateID={jellyfinIntake.reviewState.selectedCandidate?.jellyfin_series_id}
              isLoadingPreview={jellyfinIntake.isLoadingPreview}
              onSelectCandidate={handleJellyfinCandidateSelect}
              onLoadCandidatePreview={(candidateID) => {
                void handleJellyfinCandidateReview(candidateID)
              }}
            />
          </section>
        ) : null}

        {showDebugPanel ? (
          <details className={createStyles.developerDetails}>
            <summary className={createStyles.developerSummary}>Debug Request/Response</summary>
            <div className={createStyles.developerBody}>
              {lastRequest ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Request</strong>
                  {'\n'}
                  {lastRequest}
                </pre>
              ) : null}
              {lastResponse ? (
                <pre className={createStyles.developerBlock}>
                  <strong>Response</strong>
                  {'\n'}
                  {lastResponse}
                </pre>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  )
}
