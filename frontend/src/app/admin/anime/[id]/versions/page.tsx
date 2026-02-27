'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import {
  ApiError,
  createEpisodeVersion,
  deleteEpisodeVersion,
  getAnimeByID,
  getAnimeFansubs,
  getGroupedEpisodes,
  getRuntimeAuthToken,
  updateEpisodeVersion,
} from '@/lib/api'
import { EpisodeVersion, GroupedEpisode, SubtitleType } from '@/types/episodeVersion'
import { FansubGroupSummary } from '@/types/fansub'

import styles from './page.module.css'

type SubtitleFilter = 'all' | SubtitleType | 'none'

function parsePositiveInt(raw: string): number | null {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

function formatReleaseDate(value?: string | null): string {
  if (!value) return 'kein datum'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'kein datum'
  return parsed.toLocaleString('de-DE')
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  const hour = `${parsed.getHours()}`.padStart(2, '0')
  const minute = `${parsed.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function resolveEpisodeCardTitle(episode: GroupedEpisode): string {
  const title = (episode.episode_title || '').trim()
  if (title) return title
  const firstVersionTitle = (episode.versions[0]?.title || '').trim()
  if (firstVersionTitle) return firstVersionTitle
  return '(ohne episodentitel)'
}

function resolveReleaseName(version: EpisodeVersion): string {
  const title = (version.title || '').trim()
  if (title) return title
  return `(release #${version.id})`
}

function resolveSubtitleLabel(value?: SubtitleType | null): string {
  if (value === 'softsub') return 'Softsub'
  if (value === 'hardsub') return 'Hardsub'
  return 'Kein Subtitle'
}

function resolveEpisodeNumberFilterMatch(episode: GroupedEpisode, rawFilter: string): boolean {
  const filter = rawFilter.trim()
  if (!filter) return true
  return String(episode.episode_number).includes(filter)
}

function resolveVersionFilterMatch(
  version: EpisodeVersion,
  fansubFilter: string,
  subtitleFilter: SubtitleFilter,
): boolean {
  const fansubMatches =
    fansubFilter === 'all' ? true : String(version.fansub_group?.id || '') === fansubFilter

  let subtitleMatches = true
  if (subtitleFilter === 'hardsub' || subtitleFilter === 'softsub') {
    subtitleMatches = version.subtitle_type === subtitleFilter
  } else if (subtitleFilter === 'none') {
    subtitleMatches = !version.subtitle_type
  }

  return fansubMatches && subtitleMatches
}

interface EditState {
  versionID: number
  title: string
  fansubGroupID: string
  mediaProvider: string
  mediaItemID: string
  videoQuality: string
  subtitleType: '' | SubtitleType
  releaseDate: string
  streamURL: string
}

function buildEditState(version: EpisodeVersion): EditState {
  return {
    versionID: version.id,
    title: version.title || '',
    fansubGroupID: version.fansub_group?.id ? String(version.fansub_group.id) : '',
    mediaProvider: version.media_provider || '',
    mediaItemID: version.media_item_id || '',
    videoQuality: version.video_quality || '',
    subtitleType: version.subtitle_type || '',
    releaseDate: toDateTimeLocalValue(version.release_date),
    streamURL: version.stream_url || '',
  }
}

export default function AdminAnimeVersionsPage() {
  const params = useParams<{ id: string }>()
  const animeID = useMemo(() => parsePositiveInt((params.id || '').trim()), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [savingVersionID, setSavingVersionID] = useState<number | null>(null)
  const [deletingVersionID, setDeletingVersionID] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [animeTitle, setAnimeTitle] = useState<string>('')
  const [episodes, setEpisodes] = useState<GroupedEpisode[]>([])
  const [fansubOptions, setFansubOptions] = useState<FansubGroupSummary[]>([])

  const [episodeFilter, setEpisodeFilter] = useState('')
  const [fansubFilter, setFansubFilter] = useState('all')
  const [subtitleFilter, setSubtitleFilter] = useState<SubtitleFilter>('all')

  const [createEpisodeNumber, setCreateEpisodeNumber] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createFansubGroupID, setCreateFansubGroupID] = useState('')
  const [createMediaProvider, setCreateMediaProvider] = useState('jellyfin')
  const [createMediaItemID, setCreateMediaItemID] = useState('')
  const [createVideoQuality, setCreateVideoQuality] = useState('')
  const [createSubtitleType, setCreateSubtitleType] = useState<'' | SubtitleType>('')
  const [createReleaseDate, setCreateReleaseDate] = useState('')
  const [createStreamURL, setCreateStreamURL] = useState('')

  const [editState, setEditState] = useState<EditState | null>(null)

  async function loadData() {
    if (!animeID) {
      setErrorMessage('Ungueltige Anime-ID.')
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
      setAnimeTitle(animeResponse.data.title)
      setEpisodes(groupedResponse.data.episodes)
      setFansubOptions(
        fansubsResponse.data
          .map((item) => item.fansub_group)
          .filter((item): item is FansubGroupSummary => Boolean(item)),
      )
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeID])

  const filteredEpisodes = useMemo(() => {
    return episodes
      .map((episode) => ({
        ...episode,
        versions: episode.versions.filter((version) =>
          resolveVersionFilterMatch(version, fansubFilter, subtitleFilter),
        ),
      }))
      .filter((episode) => resolveEpisodeNumberFilterMatch(episode, episodeFilter))
  }, [episodes, episodeFilter, fansubFilter, subtitleFilter])

  const filteredVersionCount = useMemo(
    () => filteredEpisodes.reduce((total, episode) => total + episode.versions.length, 0),
    [filteredEpisodes],
  )

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!animeID) {
      setErrorMessage('Ungueltige Anime-ID.')
      return
    }

    const episodeNumber = parsePositiveInt(createEpisodeNumber)
    if (!episodeNumber) {
      setErrorMessage('Episode-Nummer muss groesser als 0 sein.')
      return
    }
    if (!createMediaProvider.trim() || !createMediaItemID.trim()) {
      setErrorMessage('media_provider und media_item_id sind Pflichtfelder.')
      return
    }

    const parsedFansubID = parsePositiveInt(createFansubGroupID)

    setIsCreating(true)
    try {
      await createEpisodeVersion(
        animeID,
        episodeNumber,
        {
          title: normalizeOptional(createTitle),
          fansub_group_id: parsedFansubID,
          media_provider: createMediaProvider.trim(),
          media_item_id: createMediaItemID.trim(),
          video_quality: normalizeOptional(createVideoQuality),
          subtitle_type: createSubtitleType || null,
          release_date: fromDateTimeLocalValue(createReleaseDate),
          stream_url: normalizeOptional(createStreamURL),
        },
        authToken,
      )

      setCreateTitle('')
      setCreateMediaItemID('')
      setCreateVideoQuality('')
      setCreateSubtitleType('')
      setCreateReleaseDate('')
      setCreateStreamURL('')
      setSuccessMessage('Episode-Version erstellt.')
      await loadData()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsCreating(false)
    }
  }

  function startEdit(version: EpisodeVersion) {
    setErrorMessage(null)
    setSuccessMessage(null)
    setEditState(buildEditState(version))
  }

  async function handleEditSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!editState) {
      setErrorMessage('Keine Version ausgewaehlt.')
      return
    }
    if (!editState.mediaProvider.trim() || !editState.mediaItemID.trim()) {
      setErrorMessage('media_provider und media_item_id duerfen nicht leer sein.')
      return
    }

    setSavingVersionID(editState.versionID)
    try {
      await updateEpisodeVersion(
        editState.versionID,
        {
          title: normalizeOptional(editState.title),
          fansub_group_id: parsePositiveInt(editState.fansubGroupID),
          media_provider: editState.mediaProvider.trim(),
          media_item_id: editState.mediaItemID.trim(),
          video_quality: normalizeOptional(editState.videoQuality),
          subtitle_type: editState.subtitleType || null,
          release_date: fromDateTimeLocalValue(editState.releaseDate),
          stream_url: normalizeOptional(editState.streamURL),
        },
        authToken,
      )
      setSuccessMessage(`Version #${editState.versionID} gespeichert.`)
      await loadData()
      setEditState(null)
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setSavingVersionID(null)
    }
  }

  async function handleDelete(version: EpisodeVersion) {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const ok = window.confirm(
      `Version #${version.id} wirklich loeschen?\n\nEpisode bleibt erhalten, nur diese Version wird entfernt.`,
    )
    if (!ok) return

    setDeletingVersionID(version.id)
    try {
      await deleteEpisodeVersion(version.id, authToken)
      setSuccessMessage(`Version #${version.id} geloescht.`)
      await loadData()
      if (editState?.versionID === version.id) {
        setEditState(null)
      }
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setDeletingVersionID(null)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span>/</span>
          <Link href="/admin/anime">Studio</Link>
          <span>/</span>
          <span>Episode-Versionen</span>
          {animeID ? (
            <>
              <span>/</span>
              <Link href={`/anime/${animeID}`} target="_blank" rel="noreferrer">
                Public Detail
              </Link>
            </>
          ) : null}
        </nav>

        <header className={styles.heroCard}>
          <div className={styles.heroEyebrow}>Admin Anime Studio</div>
          <div className={styles.heroRow}>
            <div className={styles.heroCopy}>
              <h1 className={styles.pageTitle}>Episode-Versionen</h1>
              <p className={styles.pageSubtitle}>
                {animeID ? `Anime #${animeID}${animeTitle ? ` - ${animeTitle}` : ''}` : 'Anime-ID ungueltig'}
              </p>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span>Gefilterte Episoden</span>
                <strong>{filteredEpisodes.length}</strong>
              </div>
              <div className={styles.heroStat}>
                <span>Versionen sichtbar</span>
                <strong>{filteredVersionCount}</strong>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? <div className={styles.infoBox}>Lade Episode-Versionen...</div> : null}
        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        {!isLoading ? (
          <>
            <section className={`${styles.card} ${styles.filterCard}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Filter</p>
                  <h2 className={styles.sectionTitle}>Versionen eingrenzen</h2>
                </div>
                <p className={styles.sectionHint}>Die Filter bleiben funktional, aber visuell bewusst reduziert.</p>
              </div>
              <div className={styles.filterGrid}>
                <div className={styles.field}>
                  <label htmlFor="episode-filter">Episode</label>
                  <input
                    id="episode-filter"
                    className={styles.control}
                    value={episodeFilter}
                    onChange={(event) => setEpisodeFilter(event.target.value)}
                    placeholder="z. B. 1"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="fansub-filter">Fansub</label>
                  <select
                    id="fansub-filter"
                    className={styles.control}
                    value={fansubFilter}
                    onChange={(event) => setFansubFilter(event.target.value)}
                  >
                    <option value="all">alle</option>
                    {fansubOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="subtitle-filter">Subtitle</label>
                  <select
                    id="subtitle-filter"
                    className={styles.control}
                    value={subtitleFilter}
                    onChange={(event) => setSubtitleFilter(event.target.value as SubtitleFilter)}
                  >
                    <option value="all">alle</option>
                    <option value="softsub">softsub</option>
                    <option value="hardsub">hardsub</option>
                    <option value="none">ohne subtitle_type</option>
                  </select>
                </div>
              </div>
              <div className={styles.filterSummary}>
                <span className={styles.summaryChip}>{filteredEpisodes.length} Episoden</span>
                <span className={styles.summaryChip}>{filteredVersionCount} Versionen</span>
                <span className={styles.summaryMeta}>
                  {fansubFilter === 'all' ? 'Alle Fansubs sichtbar' : 'Gezielter Fansub-Filter aktiv'}
                </span>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Create</p>
                  <h2 className={styles.sectionTitle}>Neue Version erstellen</h2>
                </div>
                <p className={styles.sectionHint}>Das Create-Form steht als eigener Block mit klarer Feldhierarchie.</p>
              </div>
              <form className={styles.form} onSubmit={handleCreate}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="create-episode-number">Episode-Nummer *</label>
                    <input
                      id="create-episode-number"
                      className={styles.control}
                      value={createEpisodeNumber}
                      onChange={(event) => setCreateEpisodeNumber(event.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-fansub-group-id">Fansub (optional)</label>
                    <select
                      id="create-fansub-group-id"
                      className={styles.control}
                      value={createFansubGroupID}
                      onChange={(event) => setCreateFansubGroupID(event.target.value)}
                    >
                      <option value="">keine gruppe</option>
                      {fansubOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-media-provider">Media Provider *</label>
                    <input
                      id="create-media-provider"
                      className={styles.control}
                      value={createMediaProvider}
                      onChange={(event) => setCreateMediaProvider(event.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-media-item-id">Media Item ID *</label>
                    <input
                      id="create-media-item-id"
                      className={styles.control}
                      value={createMediaItemID}
                      onChange={(event) => setCreateMediaItemID(event.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-title">Release-Name</label>
                    <input
                      id="create-title"
                      className={styles.control}
                      value={createTitle}
                      onChange={(event) => setCreateTitle(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-video-quality">Aufloesung / Video Quality</label>
                    <input
                      id="create-video-quality"
                      className={styles.control}
                      value={createVideoQuality}
                      onChange={(event) => setCreateVideoQuality(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-subtitle-type">Untertitel-Typ</label>
                    <select
                      id="create-subtitle-type"
                      className={styles.control}
                      value={createSubtitleType}
                      onChange={(event) => setCreateSubtitleType(event.target.value as '' | SubtitleType)}
                    >
                      <option value="">keiner</option>
                      <option value="softsub">softsub</option>
                      <option value="hardsub">hardsub</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="create-release-date">Release Date</label>
                    <input
                      id="create-release-date"
                      className={styles.control}
                      type="datetime-local"
                      value={createReleaseDate}
                      onChange={(event) => setCreateReleaseDate(event.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.formGridFull}`}>
                    <label htmlFor="create-stream-url">Stream URL</label>
                    <input
                      id="create-stream-url"
                      className={styles.control}
                      value={createStreamURL}
                      onChange={(event) => setCreateStreamURL(event.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={`${styles.actionButton} ${styles.primaryButton}`} type="submit" disabled={isCreating}>
                    {isCreating ? 'Speichern...' : 'Version anlegen'}
                  </button>
                </div>
              </form>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Library</p>
                  <h2 className={styles.sectionTitle}>Versionen pro Episode</h2>
                </div>
                <p className={styles.sectionHint}>Episode und Version bleiben als getrennte visuelle Ebenen lesbar.</p>
              </div>
              {filteredEpisodes.length === 0 ? <p className={styles.emptyState}>Keine Episoden im aktuellen Filter.</p> : null}
              <div className={styles.episodeGrid}>
                {filteredEpisodes.map((episode) => (
                  <article key={episode.episode_number} className={styles.episodeCard}>
                    <header className={styles.episodeCardHeader}>
                      <div className={styles.episodeCardTitleGroup}>
                        <p className={styles.episodeKicker}>Episode {episode.episode_number}</p>
                        <h3 className={styles.episodeCardTitle}>{resolveEpisodeCardTitle(episode)}</h3>
                      </div>
                      <span className={styles.episodeCountBadge}>{episode.versions.length} Versionen</span>
                    </header>

                    {episode.versions.length === 0 ? (
                      <p className={styles.emptyState}>Keine Versionen fuer diese Episode im aktuellen Filter.</p>
                    ) : (
                      <ul className={styles.versionList}>
                        {episode.versions.map((version) => {
                          const isBusy = savingVersionID === version.id || deletingVersionID === version.id
                          return (
                            <li key={version.id} className={styles.versionCard} id={`version-${version.id}`}>
                              <div className={styles.versionTopRow}>
                                <div className={styles.versionHeaderCopy}>
                                  <p className={styles.versionTitle}>
                                    #{version.id} - {resolveReleaseName(version)}
                                  </p>
                                  <p className={styles.versionMetaLine}>
                                    Provider {version.media_provider} | Item {version.media_item_id}
                                  </p>
                                </div>
                                <div className={styles.versionBadges}>
                                  <span className={`${styles.badge} ${styles.badgePrimary}`}>
                                    {version.fansub_group?.name || 'Keine Gruppe'}
                                  </span>
                                  <span className={`${styles.badge} ${styles.badgeWarning}`}>
                                    {version.video_quality || 'Qualitaet offen'}
                                  </span>
                                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                    {resolveSubtitleLabel(version.subtitle_type)}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.versionBottomRow}>
                                <p className={styles.versionMetaLine}>Release: {formatReleaseDate(version.release_date)}</p>
                                <div className={styles.versionActions}>
                                  <button
                                    type="button"
                                    className={`${styles.actionButton} ${styles.secondaryButton}`}
                                    onClick={() => startEdit(version)}
                                    disabled={isBusy}
                                  >
                                    Edit
                                  </button>
                                  <Link
                                    href={`/admin/episode-versions/${version.id}/edit`}
                                    className={`${styles.actionButton} ${styles.ghostButton}`}
                                  >
                                    Detail
                                  </Link>
                                  <button
                                    type="button"
                                    className={`${styles.actionButton} ${styles.dangerButton}`}
                                    onClick={() => handleDelete(version)}
                                    disabled={isBusy}
                                  >
                                    {deletingVersionID === version.id ? 'Loesche...' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Edit</p>
                  <h2 className={styles.sectionTitle}>Version bearbeiten</h2>
                </div>
                <p className={styles.sectionHint}>Die Bearbeitung bleibt inline, ist aber als eigener Arbeitsbereich getrennt.</p>
              </div>
              {!editState ? <p className={styles.emptyState}>Waehle zuerst eine Version aus der Liste.</p> : null}
              {editState ? (
                <form className={styles.form} onSubmit={handleEditSave}>
                  <div className={styles.editContext}>
                    <span className={styles.summaryChip}>Version #{editState.versionID}</span>
                    <p className={styles.sectionHint}>Bei falscher Episode-Verknuepfung kann die Zuordnung hier manuell korrigiert werden.</p>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="edit-title">Release-Name</label>
                      <input
                        id="edit-title"
                        className={styles.control}
                        value={editState.title}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, title: event.target.value } : current))
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-fansub-group-id">Fansub (optional)</label>
                      <select
                        id="edit-fansub-group-id"
                        className={styles.control}
                        value={editState.fansubGroupID}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, fansubGroupID: event.target.value } : current))
                        }
                      >
                        <option value="">keine gruppe</option>
                        {fansubOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-media-provider">Media Provider *</label>
                      <input
                        id="edit-media-provider"
                        className={styles.control}
                        value={editState.mediaProvider}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, mediaProvider: event.target.value } : current))
                        }
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-media-item-id">Media Item ID *</label>
                      <input
                        id="edit-media-item-id"
                        className={styles.control}
                        value={editState.mediaItemID}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, mediaItemID: event.target.value } : current))
                        }
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-video-quality">Aufloesung / Video Quality</label>
                      <input
                        id="edit-video-quality"
                        className={styles.control}
                        value={editState.videoQuality}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, videoQuality: event.target.value } : current))
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-subtitle-type">Untertitel-Typ</label>
                      <select
                        id="edit-subtitle-type"
                        className={styles.control}
                        value={editState.subtitleType}
                        onChange={(event) =>
                          setEditState((current) =>
                            current ? { ...current, subtitleType: event.target.value as '' | SubtitleType } : current,
                          )
                        }
                      >
                        <option value="">keiner</option>
                        <option value="softsub">softsub</option>
                        <option value="hardsub">hardsub</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-release-date">Release Date</label>
                      <input
                        id="edit-release-date"
                        className={styles.control}
                        type="datetime-local"
                        value={editState.releaseDate}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, releaseDate: event.target.value } : current))
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="edit-stream-url">Stream URL</label>
                      <input
                        id="edit-stream-url"
                        className={styles.control}
                        value={editState.streamURL}
                        onChange={(event) =>
                          setEditState((current) => (current ? { ...current, streamURL: event.target.value } : current))
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionButton} ${styles.primaryButton}`}
                      type="submit"
                      disabled={savingVersionID === editState.versionID}
                    >
                      {savingVersionID === editState.versionID ? 'Speichern...' : 'Version speichern'}
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.secondaryButton}`}
                      type="button"
                      disabled={savingVersionID === editState.versionID}
                      onClick={() => setEditState(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
