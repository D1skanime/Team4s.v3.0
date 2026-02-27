'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { createAdminEpisode, getAnimeByID, getRuntimeAuthToken } from '@/lib/api'
import { AnimeDetail, EpisodeListItem, EpisodeStatus } from '@/types/anime'

import styles from '../../AdminStudio.module.css'
import { parsePositiveInt, formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import { formatAdminError, normalizeOptionalText } from '../../utils/studio-helpers'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

function sortEpisodes(items: EpisodeListItem[]): EpisodeListItem[] {
  return [...items].sort((left, right) => {
    const leftNumber = parsePositiveInt(left.episode_number)
    const rightNumber = parsePositiveInt(right.episode_number)

    if (leftNumber && rightNumber) return leftNumber - rightNumber
    if (leftNumber) return -1
    if (rightNumber) return 1

    return left.episode_number.localeCompare(right.episode_number, 'de')
  })
}

function resolveEpisodeStatusClass(status: EpisodeStatus): string {
  switch (status) {
    case 'public':
      return styles.badgeSuccess
    case 'private':
      return styles.badgeWarning
    case 'disabled':
    default:
      return styles.badgeMuted
  }
}

export default function AdminAnimeEpisodesPage() {
  const params = useParams<{ id: string }>()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    number: '',
    title: '',
    status: 'disabled' as EpisodeStatus,
  })

  useEffect(() => {
    async function loadAnime() {
      if (!animeID) {
        setErrorMessage('Ungueltige Anime-ID.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getAnimeByID(animeID, { include_disabled: true })
        setAnime(response.data)
      } catch (error) {
        setAnime(null)
        setErrorMessage(formatAdminError(error, 'Episoden konnten nicht geladen werden.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadAnime()
  }, [animeID])

  const episodes = useMemo(() => sortEpisodes(anime?.episodes || []), [anime?.episodes])

  async function handleCreateEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!animeID) {
      setErrorMessage('Ungueltige Anime-ID.')
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

    setIsCreating(true)
    try {
      await createAdminEpisode(
        {
          anime_id: animeID,
          episode_number: String(parsedEpisodeNumber),
          title: normalizeOptionalText(formState.title) || undefined,
          status: formState.status,
        },
        authToken,
      )

      const refreshed = await getAnimeByID(animeID, { include_disabled: true })
      setAnime(refreshed.data)
      setFormState({ number: '', title: '', status: 'disabled' })
      setShowCreateForm(false)
      setSuccessMessage(`Episode ${parsedEpisodeNumber} wurde angelegt.`)
    } catch (error) {
      setErrorMessage(formatAdminError(error, 'Episode konnte nicht angelegt werden.'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/anime">Anime</Link>
        <span>/</span>
        <Link href={animeID ? `/admin/anime/${animeID}/edit` : '/admin/anime'}>Bearbeiten</Link>
        <span>/</span>
        <span>Episoden</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>Schritt 3</p>
          <h1 className={styles.pageTitle}>Episoden-Uebersicht</h1>
          <p className={styles.pageSubtitle}>
            Jede Route kuemmert sich um genau eine Aufgabe. Hier gibt es nur die Liste der Episoden und den Einstieg in
            die Episode-Bearbeitung.
          </p>
        </div>
        {anime ? (
          <div className={styles.headerActions}>
            <Link href={`/admin/anime/${anime.id}/edit`} className={`${styles.button} ${styles.buttonSecondary}`}>
              Zurueck zum Anime
            </Link>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? 'Erstellen schliessen' : 'Neue Episode'}
            </button>
          </div>
        ) : null}
      </header>

      {isLoading ? <div className={styles.noticeBox}>Episoden werden geladen...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {anime ? (
        <>
          <section className={styles.card}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Anime</p>
                <p className={styles.summaryValue}>{anime.title}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Episoden</p>
                <p className={styles.summaryValue}>{episodes.length}</p>
              </div>
            </div>
          </section>

          {showCreateForm ? (
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Neue Episode anlegen</h2>
                  <p className={styles.sectionMeta}>Neue Episode im gleichen Anime-Kontext erstellen.</p>
                </div>
              </div>

              <form className={styles.stack} onSubmit={(event) => void handleCreateEpisode(event)}>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Episodennummer</span>
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
                    <span>Titel</span>
                    <input
                      className={styles.input}
                      value={formState.title}
                      onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                </div>

                <div className={styles.actionsRow}>
                  <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit" disabled={isCreating}>
                    {isCreating ? 'Speichert...' : 'Episode speichern'}
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    type="button"
                    disabled={isCreating}
                    onClick={() => setShowCreateForm(false)}
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Episoden</h2>
                <p className={styles.sectionMeta}>Card-Liste mit Status-Badge und klarer Bearbeitungsaktion.</p>
              </div>
            </div>

            {episodes.length === 0 ? <p className={styles.emptyState}>Fuer diesen Anime sind noch keine Episoden vorhanden.</p> : null}

            {episodes.length > 0 ? (
              <div className={styles.stack}>
                {episodes.map((episode) => (
                  <article key={episode.id} className={styles.episodeCard}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <h3 className={styles.itemTitle}>
                          Episode {episode.episode_number}
                          {episode.title?.trim() ? ` | ${episode.title}` : ''}
                        </h3>
                        <p className={styles.metaText}>
                          Views {episode.view_count} | Downloads {episode.download_count}
                        </p>
                      </div>
                      <span className={`${styles.badge} ${resolveEpisodeStatusClass(episode.status)}`}>
                        {formatEpisodeStatusLabel(episode.status)}
                      </span>
                    </div>

                    <div className={styles.actionsRow}>
                      <Link
                        href={`/admin/anime/${anime.id}/episodes/${episode.id}/edit`}
                        className={`${styles.button} ${styles.buttonPrimary}`}
                      >
                        Episode bearbeiten
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  )
}
