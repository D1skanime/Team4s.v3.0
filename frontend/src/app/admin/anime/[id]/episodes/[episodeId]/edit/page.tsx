'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { deleteAdminEpisode, getAnimeByID, getRuntimeAuthToken, updateAdminEpisode } from '@/lib/api'
import { AnimeDetail, EpisodeListItem, EpisodeStatus } from '@/types/anime'

import styles from '../../../../AdminStudio.module.css'
import { formatEpisodeStatusLabel, parsePositiveInt } from '../../../../utils/anime-helpers'
import { formatAdminError, normalizeOptionalText } from '../../../../utils/studio-helpers'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

export default function AdminAnimeEpisodeEditPage() {
  const params = useParams<{ id: string; episodeId: string }>()
  const router = useRouter()

  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])
  const episodeID = useMemo(() => parsePositiveInt((params.episodeId || '').trim()), [params.episodeId])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [episode, setEpisode] = useState<EpisodeListItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    number: '',
    title: '',
    status: 'disabled' as EpisodeStatus,
    streamLink: '',
  })

  useEffect(() => {
    async function loadData() {
      if (!animeID || !episodeID) {
        setErrorMessage('Ungueltige Route fuer Anime oder Episode.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getAnimeByID(animeID, { include_disabled: true })
        const nextAnime = response.data
        const nextEpisode = nextAnime.episodes.find((item) => item.id === episodeID) || null

        if (!nextEpisode) {
          setAnime(nextAnime)
          setEpisode(null)
          setErrorMessage('Episode wurde in diesem Anime nicht gefunden.')
          return
        }

        setAnime(nextAnime)
        setEpisode(nextEpisode)
        setFormState({
          number: nextEpisode.episode_number,
          title: nextEpisode.title || '',
          status: nextEpisode.status,
          streamLink: nextEpisode.stream_links?.[0] || '',
        })
      } catch (error) {
        setAnime(null)
        setEpisode(null)
        setErrorMessage(formatAdminError(error, 'Episode konnte nicht geladen werden.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [animeID, episodeID])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!episodeID) {
      setErrorMessage('Ungueltige Episode-ID.')
      return
    }

    if (!authToken.trim()) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const parsedEpisodeNumber = parsePositiveInt(formState.number)
    if (!parsedEpisodeNumber) {
      setErrorMessage('Die Episodennummer muss groesser als 0 sein.')
      return
    }

    setIsSaving(true)
    try {
      await updateAdminEpisode(
        episodeID,
        {
          episode_number: String(parsedEpisodeNumber),
          title: normalizeOptionalText(formState.title),
          status: formState.status,
          stream_link: normalizeOptionalText(formState.streamLink),
        },
        authToken,
      )

      const refreshed = animeID ? await getAnimeByID(animeID, { include_disabled: true }) : null
      const refreshedEpisode = refreshed?.data.episodes.find((item) => item.id === episodeID) || null
      if (refreshed) setAnime(refreshed.data)
      if (refreshedEpisode) setEpisode(refreshedEpisode)
      setSuccessMessage(`Episode ${parsedEpisodeNumber} wurde gespeichert.`)
    } catch (error) {
      setErrorMessage(formatAdminError(error, 'Episode konnte nicht gespeichert werden.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!animeID || !episodeID || !episode) return

    if (!authToken.trim()) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const confirmed = window.confirm(
      `Episode ${episode.episode_number} wirklich loeschen?\n\nZugehoerige Versionen werden ebenfalls entfernt.`,
    )
    if (!confirmed) return

    setIsDeleting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await deleteAdminEpisode(episodeID, authToken)
      router.push(`/admin/anime/${animeID}/episodes`)
    } catch (error) {
      setErrorMessage(formatAdminError(error, 'Episode konnte nicht geloescht werden.'))
      setIsDeleting(false)
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        <Link href={animeID ? `/admin/anime/${animeID}/episodes` : '/admin/anime'}>Episoden</Link>
        <span>/</span>
        <span>Episode bearbeiten</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>Schritt 4</p>
          <h1 className={styles.pageTitle}>Episode bearbeiten</h1>
          <p className={styles.pageSubtitle}>
            Fokus auf genau einer Episode: Titel, Nummer, Status und Streaming-Link. Versionsdetails bleiben auf der
            naechsten Route.
          </p>
        </div>
        {anime && episode ? (
          <div className={styles.headerActions}>
            <Link href={`/admin/anime/${anime.id}/episodes`} className={`${styles.button} ${styles.buttonSecondary}`}>
              Zur Uebersicht
            </Link>
            <Link
              href={`/admin/anime/${anime.id}/episodes/${episode.id}/versions`}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Versionen verwalten
            </Link>
          </div>
        ) : null}
      </header>

      {isLoading ? <div className={styles.noticeBox}>Episode-Daten werden geladen...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {anime && episode ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                {anime.title} | Episode {episode.episode_number}
              </h2>
              <p className={styles.sectionMeta}>Episode-ID #{episode.id}</p>
            </div>
          </div>

          <form className={styles.stack} onSubmit={(event) => void handleSave(event)}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Episodentitel</span>
                <input
                  className={styles.input}
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label className={styles.field}>
                <span>Nummer</span>
                <input
                  className={styles.input}
                  value={formState.number}
                  onChange={(event) => setFormState((current) => ({ ...current, number: event.target.value }))}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Status</span>
                <select
                  className={styles.select}
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, status: event.target.value as EpisodeStatus }))
                  }
                >
                  {EPISODE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatEpisodeStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Streaming-Link</span>
                <input
                  className={styles.input}
                  value={formState.streamLink}
                  onChange={(event) => setFormState((current) => ({ ...current, streamLink: event.target.value }))}
                  placeholder="https://.../item?id=..."
                />
              </label>
            </div>

            <div className={styles.actionsRow}>
              <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit" disabled={isSaving}>
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
              <Link
                href={`/admin/anime/${anime.id}/episodes/${episode.id}/versions`}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Versionen verwalten
              </Link>
            </div>
          </form>

          <details className={styles.developerPanel}>
            <summary>Developer Panel</summary>
            <div className={styles.developerPanelContent}>
              <p className={styles.metaText}>Interne Episode-ID: {episode.id}</p>
              <p className={styles.metaText}>Aktueller gespeicherter Link: {episode.stream_links?.[0] || 'nicht gesetzt'}</p>
              <div className={styles.actionsRow}>
                <Link href={`/episodes/${episode.id}`} className={`${styles.button} ${styles.buttonGhost}`} target="_blank" rel="noreferrer">
                  Public oeffnen
                </Link>
                <button className={`${styles.button} ${styles.buttonDanger}`} type="button" onClick={() => void handleDelete()} disabled={isDeleting}>
                  {isDeleting ? 'Loescht...' : 'Episode loeschen'}
                </button>
              </div>
            </div>
          </details>
        </section>
      ) : null}
    </main>
  )
}
