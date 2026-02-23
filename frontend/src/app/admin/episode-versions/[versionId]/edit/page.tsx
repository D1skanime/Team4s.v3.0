'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
  ApiError,
  deleteEpisodeVersion,
  getAnimeByID,
  getAnimeFansubs,
  getEpisodeVersionByID,
  getRuntimeAuthToken,
  updateEpisodeVersion,
} from '@/lib/api'
import { EpisodeVersion, SubtitleType } from '@/types/episodeVersion'
import { FansubGroupSummary } from '@/types/fansub'

import adminStyles from '../../../admin.module.css'

function parsePositiveInt(raw: string): number | null {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
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

export default function AdminEpisodeVersionEditPage() {
  const params = useParams<{ versionId: string }>()
  const router = useRouter()

  const versionID = useMemo(() => parsePositiveInt((params.versionId || '').trim()), [params.versionId])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [animeID, setAnimeID] = useState<number | null>(null)
  const [animeTitle, setAnimeTitle] = useState('')
  const [fansubOptions, setFansubOptions] = useState<FansubGroupSummary[]>([])
  const [version, setVersion] = useState<EpisodeVersion | null>(null)

  const [title, setTitle] = useState('')
  const [fansubGroupID, setFansubGroupID] = useState('')
  const [mediaProvider, setMediaProvider] = useState('')
  const [mediaItemID, setMediaItemID] = useState('')
  const [videoQuality, setVideoQuality] = useState('')
  const [subtitleType, setSubtitleType] = useState<'' | SubtitleType>('')
  const [releaseDate, setReleaseDate] = useState('')
  const [streamURL, setStreamURL] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!versionID) {
        setErrorMessage('Ungueltige Version-ID.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      try {
        const versionResponse = await getEpisodeVersionByID(versionID)
        const found = versionResponse.data

        const resolvedAnimeID = found.anime_id
        const [animeResponse, fansubsResponse] = await Promise.all([
          getAnimeByID(resolvedAnimeID, { include_disabled: true }),
          getAnimeFansubs(resolvedAnimeID),
        ])

        setAnimeID(resolvedAnimeID)
        setAnimeTitle(animeResponse.data.title)
        setFansubOptions(
          fansubsResponse.data
            .map((item) => item.fansub_group)
            .filter((item): item is FansubGroupSummary => Boolean(item)),
        )
        setVersion(found)
        setTitle(found.title || '')
        setFansubGroupID(found.fansub_group?.id ? String(found.fansub_group.id) : '')
        setMediaProvider(found.media_provider || '')
        setMediaItemID(found.media_item_id || '')
        setVideoQuality(found.video_quality || '')
        setSubtitleType(found.subtitle_type || '')
        setReleaseDate(toDateTimeLocalValue(found.release_date))
        setStreamURL(found.stream_url || '')
      } catch (error) {
        setErrorMessage(formatError(error))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [versionID])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!versionID) {
      setErrorMessage('Ungueltige Version-ID.')
      return
    }
    if (!mediaProvider.trim() || !mediaItemID.trim()) {
      setErrorMessage('media_provider und media_item_id duerfen nicht leer sein.')
      return
    }

    setIsSaving(true)
    try {
      const response = await updateEpisodeVersion(
        versionID,
        {
          title: normalizeOptional(title),
          fansub_group_id: parsePositiveInt(fansubGroupID),
          media_provider: mediaProvider.trim(),
          media_item_id: mediaItemID.trim(),
          video_quality: normalizeOptional(videoQuality),
          subtitle_type: subtitleType || null,
          release_date: fromDateTimeLocalValue(releaseDate),
          stream_url: normalizeOptional(streamURL),
        },
        authToken,
      )

      setVersion(response.data)
      setAnimeID(response.data.anime_id)
      setSuccessMessage('Version gespeichert.')
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (!versionID) {
      setErrorMessage('Ungueltige Version-ID.')
      return
    }

    const ok = window.confirm(
      `Version #${versionID} wirklich loeschen?\n\nEpisode bleibt erhalten, nur diese Version wird entfernt.`,
    )
    if (!ok) return

    setIsDeleting(true)
    try {
      await deleteEpisodeVersion(versionID, authToken)
      if (animeID) {
        router.push(`/admin/anime/${animeID}/versions`)
      } else {
        router.push('/admin/anime')
      }
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className={adminStyles.page}>
      <p className={adminStyles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        {animeID ? <Link href={`/admin/anime/${animeID}/versions`}>Zurueck zu Episode-Versionen</Link> : null}
      </p>

      <header className={adminStyles.header}>
        <h1 className={adminStyles.title}>Episode-Version bearbeiten</h1>
        <p className={adminStyles.subtitle}>
          {versionID ? `Version #${versionID}` : 'ungueltige version'} {animeTitle ? `- ${animeTitle}` : ''}
        </p>
      </header>

      <section className={adminStyles.panel}>
        {isLoading ? <p className={adminStyles.hint}>Lade...</p> : null}
        {errorMessage ? <div className={adminStyles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={adminStyles.successBox}>{successMessage}</div> : null}

        {!isLoading && version ? (
          <form className={adminStyles.form} onSubmit={handleSave}>
            <div className={adminStyles.contextCard}>
              <p className={adminStyles.contextTitle}>
                Episode {version.episode_number} - Release: {version.title || '(ohne release-name)'}
              </p>
            </div>

            <div className={adminStyles.gridTwo}>
              <div className={adminStyles.field}>
                <label htmlFor="title">Release-Name</label>
                <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="fansub-group-id">Fansub (optional)</label>
                <select id="fansub-group-id" value={fansubGroupID} onChange={(event) => setFansubGroupID(event.target.value)}>
                  <option value="">keine gruppe</option>
                  {fansubOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="media-provider">Media Provider *</label>
                <input
                  id="media-provider"
                  value={mediaProvider}
                  onChange={(event) => setMediaProvider(event.target.value)}
                  required
                />
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="media-item-id">Jellyfin Item ID (media_item_id) *</label>
                <input
                  id="media-item-id"
                  value={mediaItemID}
                  onChange={(event) => setMediaItemID(event.target.value)}
                  required
                />
                <p className={adminStyles.hint}>Bei falscher Episode-Verknuepfung hier manuell korrigieren.</p>
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="video-quality">Aufloesung / Video Quality</label>
                <input
                  id="video-quality"
                  value={videoQuality}
                  onChange={(event) => setVideoQuality(event.target.value)}
                />
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="subtitle-type">Untertitel-Typ</label>
                <select
                  id="subtitle-type"
                  value={subtitleType}
                  onChange={(event) => setSubtitleType(event.target.value as '' | SubtitleType)}
                >
                  <option value="">keiner</option>
                  <option value="softsub">softsub</option>
                  <option value="hardsub">hardsub</option>
                </select>
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="release-date">Release Date</label>
                <input
                  id="release-date"
                  type="datetime-local"
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                />
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="stream-url">Stream URL</label>
                <input id="stream-url" value={streamURL} onChange={(event) => setStreamURL(event.target.value)} />
              </div>
            </div>

            <div className={adminStyles.actions}>
              <button className={adminStyles.button} type="submit" disabled={isSaving}>
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
              <button className={adminStyles.buttonSecondary} type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Loesche...' : 'Delete'}
          </button>
          {animeID ? <Link href={`/admin/anime/${animeID}/versions`} className={adminStyles.buttonSecondary}>Zurueck</Link> : null}
        </div>
      </form>
    ) : null}
      </section>
    </main>
  )
}
