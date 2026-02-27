'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import {
  createEpisodeVersion,
  deleteEpisodeVersion,
  getAnimeByID,
  getAnimeFansubs,
  getGroupedEpisodes,
  getRuntimeAuthToken,
} from '@/lib/api'
import { AnimeDetail, EpisodeListItem } from '@/types/anime'
import { EpisodeVersion, GroupedEpisode, SubtitleType } from '@/types/episodeVersion'
import { FansubGroupSummary } from '@/types/fansub'

import styles from '../../../../AdminStudio.module.css'
import { parsePositiveInt } from '../../../../utils/anime-helpers'
import {
  formatAdminError,
  formatDateTime,
  fromDateTimeLocalValue,
  normalizeOptionalText,
  resolveSubtitleLabel,
} from '../../../../utils/studio-helpers'

interface CreateFormState {
  title: string
  fansubGroupID: string
  mediaProvider: string
  mediaItemID: string
  videoQuality: string
  subtitleType: '' | SubtitleType
  releaseDate: string
  streamURL: string
}

function findGroupedEpisode(targetEpisode: EpisodeListItem, groupedEpisodes: GroupedEpisode[]) {
  const parsedNumber = parsePositiveInt(targetEpisode.episode_number)
  if (parsedNumber) {
    const exactMatch = groupedEpisodes.find((item) => item.episode_number === parsedNumber) || null
    if (exactMatch) {
      return { episode: exactMatch, matchMode: 'exact' as const }
    }
  }

  const targetTitle = (targetEpisode.title || '').trim().toLowerCase()
  if (!targetTitle) {
    return { episode: null, matchMode: 'none' as const }
  }

  const titleMatch =
    groupedEpisodes.find((item) => {
      if ((item.episode_title || '').trim().toLowerCase() === targetTitle) return true
      return item.versions.some((version) => (version.title || '').trim().toLowerCase() === targetTitle)
    }) || null

  if (!titleMatch) {
    return { episode: null, matchMode: 'none' as const }
  }

  return { episode: titleMatch, matchMode: 'title' as const }
}

function resolveVersionTitle(version: EpisodeVersion): string {
  const title = (version.title || '').trim()
  return title || `Release #${version.id}`
}

export default function AdminAnimeEpisodeVersionsPage() {
  const params = useParams<{ id: string; episodeId: string }>()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])
  const episodeID = useMemo(() => parsePositiveInt((params.episodeId || '').trim()), [params.episodeId])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [episode, setEpisode] = useState<EpisodeListItem | null>(null)
  const [groupedEpisode, setGroupedEpisode] = useState<GroupedEpisode | null>(null)
  const [matchMode, setMatchMode] = useState<'exact' | 'title' | 'none'>('none')
  const [fansubOptions, setFansubOptions] = useState<FansubGroupSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingVersionID, setDeletingVersionID] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState<CreateFormState>({
    title: '',
    fansubGroupID: '',
    mediaProvider: 'jellyfin',
    mediaItemID: '',
    videoQuality: '',
    subtitleType: '',
    releaseDate: '',
    streamURL: '',
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
        const [animeResponse, groupedResponse, fansubsResponse] = await Promise.all([
          getAnimeByID(animeID, { include_disabled: true }),
          getGroupedEpisodes(animeID),
          getAnimeFansubs(animeID),
        ])

        const nextAnime = animeResponse.data
        const nextEpisode = nextAnime.episodes.find((item) => item.id === episodeID) || null
        const nextFansubs = fansubsResponse.data
          .map((item) => item.fansub_group)
          .filter((item): item is FansubGroupSummary => Boolean(item))

        setAnime(nextAnime)
        setEpisode(nextEpisode)
        setFansubOptions(nextFansubs)

        if (!nextEpisode) {
          setGroupedEpisode(null)
          setMatchMode('none')
          setErrorMessage('Episode wurde in diesem Anime nicht gefunden.')
          return
        }

        const resolved = findGroupedEpisode(nextEpisode, groupedResponse.data.episodes)
        setGroupedEpisode(resolved.episode)
        setMatchMode(resolved.matchMode)
      } catch (error) {
        setAnime(null)
        setEpisode(null)
        setGroupedEpisode(null)
        setFansubOptions([])
        setErrorMessage(formatAdminError(error, 'Versionen konnten nicht geladen werden.'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [animeID, episodeID])

  const versions = useMemo(() => groupedEpisode?.versions || [], [groupedEpisode])

  async function reloadVersions() {
    if (!animeID) return

    const [animeResponse, groupedResponse, fansubsResponse] = await Promise.all([
      getAnimeByID(animeID, { include_disabled: true }),
      getGroupedEpisodes(animeID),
      getAnimeFansubs(animeID),
    ])

    const nextAnime = animeResponse.data
    const nextEpisode = nextAnime.episodes.find((item) => item.id === episodeID) || null
    const nextFansubs = fansubsResponse.data
      .map((item) => item.fansub_group)
      .filter((item): item is FansubGroupSummary => Boolean(item))

    setAnime(nextAnime)
    setEpisode(nextEpisode)
    setFansubOptions(nextFansubs)

    if (!nextEpisode) {
      setGroupedEpisode(null)
      setMatchMode('none')
      return
    }

    const resolved = findGroupedEpisode(nextEpisode, groupedResponse.data.episodes)
    setGroupedEpisode(resolved.episode)
    setMatchMode(resolved.matchMode)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken.trim()) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (!animeID || !episode) {
      setErrorMessage('Episode-Kontext fehlt.')
      return
    }

    const parsedEpisodeNumber = parsePositiveInt(episode.episode_number)
    if (!parsedEpisodeNumber) {
      setErrorMessage('Die Episode hat keine numerische Episodennummer fuer neue Versionen.')
      return
    }

    if (!formState.mediaProvider.trim() || !formState.mediaItemID.trim()) {
      setErrorMessage('Media Provider und Media Item ID sind Pflichtfelder.')
      return
    }

    setIsCreating(true)
    try {
      await createEpisodeVersion(
        animeID,
        parsedEpisodeNumber,
        {
          title: normalizeOptionalText(formState.title),
          fansub_group_id: parsePositiveInt(formState.fansubGroupID),
          media_provider: formState.mediaProvider.trim(),
          media_item_id: formState.mediaItemID.trim(),
          video_quality: normalizeOptionalText(formState.videoQuality),
          subtitle_type: formState.subtitleType || null,
          release_date: fromDateTimeLocalValue(formState.releaseDate),
          stream_url: normalizeOptionalText(formState.streamURL),
        },
        authToken,
      )

      await reloadVersions()
      setFormState({
        title: '',
        fansubGroupID: '',
        mediaProvider: 'jellyfin',
        mediaItemID: '',
        videoQuality: '',
        subtitleType: '',
        releaseDate: '',
        streamURL: '',
      })
      setShowCreateForm(false)
      setSuccessMessage(`Neue Version fuer Episode ${episode.episode_number} wurde angelegt.`)
    } catch (error) {
      setErrorMessage(formatAdminError(error, 'Version konnte nicht angelegt werden.'))
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(version: EpisodeVersion) {
    if (!authToken.trim()) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const confirmed = window.confirm(
      `Version #${version.id} wirklich loeschen?\n\nDie Episode bleibt erhalten, nur diese Version wird entfernt.`,
    )
    if (!confirmed) return

    setDeletingVersionID(version.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await deleteEpisodeVersion(version.id, authToken)
      await reloadVersions()
      setSuccessMessage(`Version #${version.id} wurde geloescht.`)
    } catch (error) {
      setErrorMessage(formatAdminError(error, 'Version konnte nicht geloescht werden.'))
    } finally {
      setDeletingVersionID(null)
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
        <Link href={animeID && episodeID ? `/admin/anime/${animeID}/episodes/${episodeID}/edit` : '/admin/anime'}>
          Episode bearbeiten
        </Link>
        <span>/</span>
        <span>Versionen</span>
      </nav>

      <header className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>Schritt 5</p>
          <h1 className={styles.pageTitle}>Versionen verwalten</h1>
          <p className={styles.pageSubtitle}>
            Klare Versionsliste pro Episode mit eindeutigen Aktionen. Keine Inline-Diagnose im Hauptbereich und kein
            Vermischen mit der Episode-Bearbeitung.
          </p>
        </div>
        {anime && episode ? (
          <div className={styles.headerActions}>
            <Link
              href={`/admin/anime/${anime.id}/episodes/${episode.id}/edit`}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Zur Episode
            </Link>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? 'Erstellen schliessen' : 'Neue Version erstellen'}
            </button>
          </div>
        ) : null}
      </header>

      {isLoading ? <div className={styles.noticeBox}>Versionen werden geladen...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {anime && episode ? (
        <>
          <section className={styles.card}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Anime</p>
                <p className={styles.summaryValue}>{anime.title}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Episode</p>
                <p className={styles.summaryValue}>{episode.episode_number}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Versionen</p>
                <p className={styles.summaryValue}>{versions.length}</p>
              </div>
            </div>
            {matchMode === 'title' ? (
              <p className={styles.noticeBox}>
                Kein exakter Nummern-Match gefunden. Die Versionsliste wurde ueber den Episodentitel zugeordnet.
              </p>
            ) : null}
          </section>

          {showCreateForm ? (
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Neue Version erstellen</h2>
                  <p className={styles.sectionMeta}>Neue Versionsdaten fuer die aktuell ausgewaehlte Episode anlegen.</p>
                </div>
              </div>

              <form className={styles.stack} onSubmit={(event) => void handleCreate(event)}>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Release-Name</span>
                    <input
                      className={styles.input}
                      value={formState.title}
                      onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Fansub</span>
                    <select
                      className={styles.select}
                      value={formState.fansubGroupID}
                      onChange={(event) => setFormState((current) => ({ ...current, fansubGroupID: event.target.value }))}
                    >
                      <option value="">keine Gruppe</option>
                      {fansubOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Media Provider</span>
                    <input
                      className={styles.input}
                      value={formState.mediaProvider}
                      onChange={(event) => setFormState((current) => ({ ...current, mediaProvider: event.target.value }))}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Media Item ID</span>
                    <input
                      className={styles.input}
                      value={formState.mediaItemID}
                      onChange={(event) => setFormState((current) => ({ ...current, mediaItemID: event.target.value }))}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Qualitaet</span>
                    <input
                      className={styles.input}
                      value={formState.videoQuality}
                      onChange={(event) => setFormState((current) => ({ ...current, videoQuality: event.target.value }))}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Subtitle</span>
                    <select
                      className={styles.select}
                      value={formState.subtitleType}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, subtitleType: event.target.value as '' | SubtitleType }))
                      }
                    >
                      <option value="">keiner</option>
                      <option value="softsub">softsub</option>
                      <option value="hardsub">hardsub</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Release Date</span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={formState.releaseDate}
                      onChange={(event) => setFormState((current) => ({ ...current, releaseDate: event.target.value }))}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span>Stream URL</span>
                    <input
                      className={styles.input}
                      value={formState.streamURL}
                      onChange={(event) => setFormState((current) => ({ ...current, streamURL: event.target.value }))}
                    />
                  </label>
                </div>

                <div className={styles.actionsRow}>
                  <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit" disabled={isCreating}>
                    {isCreating ? 'Speichert...' : 'Version speichern'}
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
                <h2 className={styles.sectionTitle}>Versionsliste</h2>
                <p className={styles.sectionMeta}>Pro Version: Badges, Release-Datum und klare Bearbeiten/Loeschen-Aktionen.</p>
              </div>
            </div>

            {versions.length === 0 ? <p className={styles.emptyState}>Fuer diese Episode sind aktuell keine Versionen vorhanden.</p> : null}

            {versions.length > 0 ? (
              <div className={styles.stack}>
                {versions.map((version) => (
                  <article key={version.id} className={styles.versionCard}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <h3 className={styles.itemTitle}>{resolveVersionTitle(version)}</h3>
                        <p className={styles.metaText}>
                          Provider {version.media_provider} | Item {version.media_item_id}
                        </p>
                      </div>
                      <p className={styles.metaText}>Release: {formatDateTime(version.release_date)}</p>
                    </div>

                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${styles.badgePrimary}`}>
                        {version.fansub_group?.name || 'Keine Gruppe'}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        {version.video_quality || 'Qualitaet offen'}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>{resolveSubtitleLabel(version.subtitle_type)}</span>
                    </div>

                    <div className={styles.actionsRow}>
                      <Link
                        href={`/admin/episode-versions/${version.id}/edit?animeId=${anime.id}&episodeId=${episode.id}`}
                        className={`${styles.button} ${styles.buttonSecondary}`}
                      >
                        Bearbeiten
                      </Link>
                      <button
                        className={`${styles.button} ${styles.buttonDanger}`}
                        type="button"
                        onClick={() => void handleDelete(version)}
                        disabled={deletingVersionID === version.id}
                      >
                        {deletingVersionID === version.id ? 'Loescht...' : 'Loeschen'}
                      </button>
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
