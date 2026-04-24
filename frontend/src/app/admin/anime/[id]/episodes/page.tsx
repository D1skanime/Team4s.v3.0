'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { createAdminEpisode, getAnimeByID, getRuntimeAuthToken, getGroupedEpisodes } from '@/lib/api'
import { AnimeDetail, EpisodeStatus } from '@/types/anime'
import { GroupedEpisode } from '@/types/episodeVersion'
import { EpisodesOverview } from '@/components/episodes/EpisodesOverview'

import styles from '../../AdminStudio.module.css'
import { parsePositiveInt, formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import { formatAdminError, normalizeOptionalText } from '../../utils/studio-helpers'

const EPISODE_STATUSES: EpisodeStatus[] = ['disabled', 'private', 'public']

export default function AdminAnimeEpisodesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [groupedEpisodes, setGroupedEpisodes] = useState<GroupedEpisode[]>([])
  const [isLoadingAnime, setIsLoadingAnime] = useState(true)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versionsErrorMessage, setVersionsErrorMessage] = useState<string | null>(null)
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
        setIsLoadingAnime(false)
        return
      }

      setIsLoadingAnime(true)
      setErrorMessage(null)

      try {
        const response = await getAnimeByID(animeID, { include_disabled: true })
        setAnime(response.data)
      } catch (error) {
        setAnime(null)
        setErrorMessage(formatAdminError(error, 'Episoden konnten nicht geladen werden.'))
      } finally {
        setIsLoadingAnime(false)
      }
    }

    void loadAnime()
  }, [animeID])

  useEffect(() => {
    async function loadGroupedEpisodes() {
      if (!animeID) {
        return
      }

      setIsLoadingVersions(true)
      setVersionsErrorMessage(null)

      try {
        const response = await getGroupedEpisodes(animeID)
        setGroupedEpisodes(response.data.episodes)
      } catch (error) {
        setVersionsErrorMessage(formatAdminError(error, 'Versionen konnten nicht geladen werden.'))
        setGroupedEpisodes([])
      } finally {
        setIsLoadingVersions(false)
      }
    }

    void loadGroupedEpisodes()
  }, [animeID])

  const episodeCount = useMemo(() => anime?.episodes?.length || 0, [anime?.episodes])

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

      const [refreshedAnime, refreshedVersions] = await Promise.all([
        getAnimeByID(animeID, { include_disabled: true }),
        getGroupedEpisodes(animeID),
      ])

      setAnime(refreshedAnime.data)
      setGroupedEpisodes(refreshedVersions.data.episodes)
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
            Episoden mit allen Versionen, Fansub-Zuordnungen und Version-Counts pro Episode. Accordion zeigt Details bei
            Bedarf.
          </p>
        </div>
        {anime ? (
          <div className={styles.headerActions}>
            <Link href={`/admin/anime/${anime.id}/edit`} className={`${styles.button} ${styles.buttonSecondary}`}>
              Zurueck zum Anime
            </Link>
            <Link
              href={`/admin/anime/${anime.id}/episodes/import`}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Import & Mapping
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

      {isLoadingAnime ? <div className={styles.noticeBox}>Episoden werden geladen...</div> : null}
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
                <p className={styles.summaryValue}>{episodeCount}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Versionen gesamt</p>
                <p className={styles.summaryValue}>
                  {groupedEpisodes.reduce((sum, ep) => sum + ep.version_count, 0)}
                </p>
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
                <h2 className={styles.sectionTitle}>Episoden mit Versionen</h2>
                <p className={styles.sectionMeta}>
                  Accordion-Ansicht mit Version-Counts, Fansub-Badges und direkten Bearbeitungslinks. Der normale Staffel-Import bleibt der Jellyfin Saison-Sync im Anime-Editor.
                </p>
              </div>
            </div>

            {versionsErrorMessage ? <div className={styles.errorBox}>{versionsErrorMessage}</div> : null}

            <EpisodesOverview
              episodes={groupedEpisodes}
              isLoading={isLoadingVersions}
              error={versionsErrorMessage}
            />
          </section>
        </>
      ) : null}
    </main>
  )
}
