'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { AnimeListItem, AnimeStatus, EpisodeStatus } from '@/types/anime'
import { AdminEpisodeCreateRequest, AdminEpisodePatchRequest } from '@/types/admin'
import { ApiError, createAdminEpisode, getAnimeList, getRuntimeAuthToken, updateAdminEpisode } from '@/lib/api'
import { getCoverUrl } from '@/lib/utils'

import styles from '../admin.module.css'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']
const ANIME_SEARCH_PER_PAGE = 20

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

function resolveAnimeStatusClass(status: AnimeStatus): string {
  switch (status) {
    case 'ongoing':
      return 'statusOngoing'
    case 'done':
      return 'statusDone'
    case 'aborted':
      return 'statusAborted'
    case 'licensed':
      return 'statusLicensed'
    case 'disabled':
    default:
      return 'statusDisabled'
  }
}

function handleCoverImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallbackApplied === 'true') return
  img.dataset.fallbackApplied = 'true'
  img.alt = ''
  img.src = '/covers/placeholder.jpg'
}

export default function AdminEpisodesPage() {
  const [authToken, setAuthToken] = useState('')
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRequest, setLastRequest] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<string | null>(null)

  const [createAnimeID, setCreateAnimeID] = useState('')
  const [createEpisodeNumber, setCreateEpisodeNumber] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createStatus, setCreateStatus] = useState<EpisodeStatus>('private')
  const [selectedAnime, setSelectedAnime] = useState<AnimeListItem | null>(null)
  const [animeSearchInput, setAnimeSearchInput] = useState('')
  const [animeSearchQuery, setAnimeSearchQuery] = useState('')
  const [animeSearchResults, setAnimeSearchResults] = useState<AnimeListItem[]>([])
  const [animeSearchTotal, setAnimeSearchTotal] = useState(0)
  const [isSearchingAnime, setIsSearchingAnime] = useState(false)
  const [animeSearchError, setAnimeSearchError] = useState<string | null>(null)

  const [updateEpisodeID, setUpdateEpisodeID] = useState('')
  const [updateEpisodeNumber, setUpdateEpisodeNumber] = useState('')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const [clearUpdateTitle, setClearUpdateTitle] = useState(false)

  useEffect(() => {
    setAuthToken(getRuntimeAuthToken())
  }, [])

  const hasAuthToken = authToken.length > 0
  const tokenPreview = useMemo(() => {
    if (!authToken) {
      return 'n/a'
    }

    return authToken.length > 24 ? `${authToken.slice(0, 24)}...` : authToken
  }, [authToken])

  useEffect(() => {
    const id = parsePositiveInt(createAnimeID)
    if (!id) {
      if (selectedAnime) setSelectedAnime(null)
      return
    }
    if (selectedAnime && selectedAnime.id !== id) {
      setSelectedAnime(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createAnimeID])

  function clearMessages() {
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function formatError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      return `(${error.status}) ${error.message}`
    }
    return fallback
  }

  async function runAnimeSearch(query: string) {
    clearMessages()
    setAnimeSearchError(null)

    const normalized = query.trim()
    setAnimeSearchQuery(normalized)
    if (normalized.length < 2) {
      setAnimeSearchResults([])
      setAnimeSearchTotal(0)
      if (normalized.length > 0) {
        setAnimeSearchError('Bitte mindestens 2 Zeichen fuer die Suche eingeben.')
      }
      return
    }

    try {
      setIsSearchingAnime(true)
      const response = await getAnimeList({
        page: 1,
        per_page: ANIME_SEARCH_PER_PAGE,
        q: normalized,
        include_disabled: true,
      })
      setAnimeSearchResults(response.data)
      setAnimeSearchTotal(response.meta.total)
    } catch (error) {
      console.error('admin/episodes: anime search failed', error)
      if (error instanceof ApiError) setAnimeSearchError(`(${error.status}) ${error.message}`)
      else setAnimeSearchError('Anime-Suche fehlgeschlagen.')
    } finally {
      setIsSearchingAnime(false)
    }
  }

  function handleSelectAnime(anime: AnimeListItem) {
    setSelectedAnime(anime)
    setCreateAnimeID(String(anime.id))
    setSuccessMessage(`Anime #${anime.id} ausgewaehlt: ${anime.title}`)
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

    const animeID = parsePositiveInt(createAnimeID)
    if (!animeID) {
      setErrorMessage('anime_id ist ungueltig')
      return
    }

    const episodeNumber = createEpisodeNumber.trim()
    if (!episodeNumber) {
      setErrorMessage('episode_number ist erforderlich')
      return
    }

    const payload: AdminEpisodeCreateRequest = {
      anime_id: animeID,
      episode_number: episodeNumber,
      status: createStatus,
    }

    const title = normalizeOptionalString(createTitle)
    if (title) {
      payload.title = title
    }

    try {
      setIsSubmittingCreate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await createAdminEpisode(payload)
      setSuccessMessage(`Episode #${response.data.id} wurde erstellt.`)
      setLastResponse(JSON.stringify(response, null, 2))
      setCreateAnimeID('')
      setSelectedAnime(null)
      setCreateEpisodeNumber('')
      setCreateTitle('')
      setCreateStatus('private')
    } catch (error) {
      console.error('admin/episodes: create failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht erstellt werden.'))
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearMessages()
    setLastRequest(null)
    setLastResponse(null)

    if (!hasAuthToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const episodeID = parsePositiveInt(updateEpisodeID)
    if (!episodeID) {
      setErrorMessage('Episode-ID ist ungueltig.')
      return
    }

    const payload: AdminEpisodePatchRequest = {}
    const episodeNumber = normalizeOptionalString(updateEpisodeNumber)
    const title = normalizeOptionalString(updateTitle)

    if (episodeNumber) {
      payload.episode_number = episodeNumber
    }
    if (clearUpdateTitle) payload.title = null
    else if (title) payload.title = title
    if (updateStatus) {
      payload.status = updateStatus as EpisodeStatus
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage('Mindestens ein Feld fuer das Update ausfuellen.')
      return
    }

    try {
      setIsSubmittingUpdate(true)
      setLastRequest(JSON.stringify(payload, null, 2))
      const response = await updateAdminEpisode(episodeID, payload)
      setSuccessMessage(`Episode #${response.data.id} wurde aktualisiert.`)
      setLastResponse(JSON.stringify(response, null, 2))
    } catch (error) {
      console.error('admin/episodes: update failed', error)
      setErrorMessage(formatError(error, 'Episode konnte nicht aktualisiert werden.'))
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/auth">Auth</Link>
        <span> | </span>
        <Link href="/admin/anime">Studio</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Episoden</h1>
        <p className={styles.subtitle}>Episoden erstellen und bearbeiten (separater Modus).</p>
        <p className={styles.hint}>
          Fuer den verbundenen Workflow mit Anime-Kontext: <Link href="/admin/anime">/admin/anime</Link>
        </p>
        <p className={styles.tokenPreview}>Token: {hasAuthToken ? tokenPreview : 'nicht vorhanden'}</p>
      </header>

      {!hasAuthToken ? (
        <div className={styles.errorBox}>Kein Access-Token gefunden. Bitte zuerst auf /auth anmelden.</div>
      ) : null}

      <section className={styles.panel}>
        <h2>Episode erstellen</h2>
        <form className={styles.form} onSubmit={handleCreateSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="anime-search">Anime suchen (Server)</label>
              <div className={styles.inputRow}>
                <input
                  id="anime-search"
                  value={animeSearchInput}
                  onChange={(event) => setAnimeSearchInput(event.target.value)}
                  disabled={isSubmittingCreate || isSearchingAnime}
                  placeholder="z. B. attack, komödie, yamato"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      runAnimeSearch(animeSearchInput)
                    }
                  }}
                />
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={isSubmittingCreate || isSearchingAnime || animeSearchInput.trim().length < 2}
                  onClick={() => runAnimeSearch(animeSearchInput)}
                >
                  Suchen
                </button>
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={isSubmittingCreate || isSearchingAnime || animeSearchInput.length === 0}
                  onClick={() => {
                    setAnimeSearchInput('')
                    setAnimeSearchQuery('')
                    setAnimeSearchResults([])
                    setAnimeSearchTotal(0)
                    setAnimeSearchError(null)
                  }}
                  aria-label="Suche leeren"
                  title="Suche leeren"
                >
                  X
                </button>
              </div>
              {animeSearchQuery ? (
                <p className={styles.hint}>
                  Suche: {animeSearchQuery} | Treffer: {animeSearchResults.length} (gesamt: {animeSearchTotal})
                </p>
              ) : (
                <p className={styles.hint}>Tip: Suche reduziert die Notwendigkeit, Anime-IDs manuell zu kennen.</p>
              )}
              {isSearchingAnime ? <p className={styles.hint}>Suche laeuft...</p> : null}
              {animeSearchError ? <div className={styles.errorBox}>{animeSearchError}</div> : null}
              {!isSearchingAnime && animeSearchQuery && animeSearchResults.length === 0 && !animeSearchError ? (
                <p className={styles.hint}>Keine Anime gefunden.</p>
              ) : null}
              {!isSearchingAnime && animeSearchResults.length > 0 ? (
                <div className={styles.episodeList} aria-label="Anime Suchergebnisse">
                  {animeSearchResults.map((anime) => (
                    <div
                      key={anime.id}
                      className={`${styles.animeRow} ${selectedAnime?.id === anime.id ? styles.animeRowActive : ''}`}
                    >
                      <img
                        className={styles.animeThumb}
                        src={getCoverUrl(anime.cover_image)}
                        alt=""
                        loading="lazy"
                        onError={handleCoverImgError}
                      />
                      <div className={styles.animeMeta}>
                        <div className={styles.animeTitleLine}>
                          <p className={styles.animeTitleText}>
                            #{anime.id} | {anime.title}
                          </p>
                          <span className={`${styles.statusBadge} ${styles[resolveAnimeStatusClass(anime.status)]}`}>
                            {anime.status}
                          </span>
                        </div>
                        <p className={styles.hint}>
                          Typ: {anime.type} | Jahr: {anime.year ?? '-'} | Max Episoden: {anime.max_episodes ?? '-'}
                        </p>
                        <div className={styles.actions}>
                          <button
                            className={styles.button}
                            type="button"
                            onClick={() => handleSelectAnime(anime)}
                            disabled={isSubmittingCreate}
                          >
                            Auswaehlen
                          </button>
                          <a
                            className={styles.buttonSecondary}
                            href={`/anime/${anime.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Oeffnen
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="create-anime-id">Anime ID *</label>
              <input
                id="create-anime-id"
                value={createAnimeID}
                onChange={(event) => setCreateAnimeID(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 13394"
              />
              {selectedAnime ? (
                <p className={styles.hint}>
                  Ausgewaehlt: #{selectedAnime.id} | {selectedAnime.title}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="create-episode-number">Episode Number *</label>
              <input
                id="create-episode-number"
                value={createEpisodeNumber}
                onChange={(event) => setCreateEpisodeNumber(event.target.value)}
                disabled={isSubmittingCreate}
                placeholder="z. B. 01"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="create-status">Status *</label>
              <select
                id="create-status"
                value={createStatus}
                onChange={(event) => setCreateStatus(event.target.value as EpisodeStatus)}
                disabled={isSubmittingCreate}
              >
                {EPISODE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="create-title">Title</label>
              <input
                id="create-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                disabled={isSubmittingCreate}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={isSubmittingCreate}>
              {isSubmittingCreate ? 'Speichern...' : 'Episode erstellen'}
            </button>
            {parsePositiveInt(createAnimeID) ? (
              <Link href={`/anime/${createAnimeID}`} className={styles.buttonSecondary}>
                Anime oeffnen
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <h2>Episode bearbeiten (Patch)</h2>
        <p className={styles.hint}>
          Nur ausgewaehlte Felder werden gesendet. Fuer nullable Felder kannst du explizit Wert loeschen (null) waehlen.
        </p>
        <form className={styles.form} onSubmit={handleUpdateSubmit}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="update-episode-id">Episode ID *</label>
              <input
                id="update-episode-id"
                value={updateEpisodeID}
                onChange={(event) => setUpdateEpisodeID(event.target.value)}
                disabled={isSubmittingUpdate}
                placeholder="z. B. 33336"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-episode-number">Episode Number</label>
              <input
                id="update-episode-number"
                value={updateEpisodeNumber}
                onChange={(event) => setUpdateEpisodeNumber(event.target.value)}
                disabled={isSubmittingUpdate}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="update-status">Status</label>
              <select
                id="update-status"
                value={updateStatus}
                onChange={(event) => setUpdateStatus(event.target.value)}
                disabled={isSubmittingUpdate}
              >
                <option value="">-- unveraendert --</option>
                {EPISODE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="update-title">Title</label>
              <input
                id="update-title"
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
                disabled={isSubmittingUpdate || clearUpdateTitle}
              />
              <label className={styles.nullToggle}>
                <input
                  type="checkbox"
                  checked={clearUpdateTitle}
                  onChange={(event) => setClearUpdateTitle(event.target.checked)}
                  disabled={isSubmittingUpdate}
                />
                Wert loeschen (null)
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.buttonSecondary} type="submit" disabled={isSubmittingUpdate}>
              {isSubmittingUpdate ? 'Speichern...' : 'Episode aktualisieren'}
            </button>
            {parsePositiveInt(updateEpisodeID) ? (
              <Link href={`/episodes/${updateEpisodeID}`} className={styles.buttonSecondary}>
                Episode oeffnen
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
      {lastRequest ? (
        <pre className={styles.resultBox}>
          {'LAST REQUEST\n'}
          {lastRequest}
        </pre>
      ) : null}
      {lastResponse ? (
        <pre className={styles.resultBox}>
          {'LAST RESPONSE\n'}
          {lastResponse}
        </pre>
      ) : null}
    </main>
  )
}
