'use client'

import { useEffect, useMemo, useState } from 'react'

import { GroupedEpisode, EpisodeVersion } from '@/types/episodeVersion'
import { AnimeFansubRelation } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

interface FansubVersionBrowserProps {
  animeID: number
  fansubs: AnimeFansubRelation[]
  episodes: GroupedEpisode[]
}

type FilterMode = 'all' | 'single'

interface PersistedFilterState {
  mode?: FilterMode
  activeFansubGroupId?: number | null
}

interface FilterState {
  mode: FilterMode
  activeFansubGroupID: number | null
}

function getStorageKey(animeID: number): string {
  return `anime:${animeID}:fansub-filter`
}

function collectFansubOptions(fansubs: AnimeFansubRelation[]): AnimeFansubRelation[] {
  const map = new Map<number, AnimeFansubRelation>()
  for (const relation of fansubs) {
    if (!relation.fansub_group) continue
    map.set(relation.fansub_group.id, relation)
  }
  return Array.from(map.values())
}

function resolveInitialFilterState(animeID: number, fansubs: AnimeFansubRelation[]): FilterState {
  const options = collectFansubOptions(fansubs)
  const optionIDs = new Set(options.map((item) => item.fansub_group?.id).filter((item): item is number => Boolean(item)))
  const primary = options.find((item) => item.is_primary && item.fansub_group)?.fansub_group?.id ?? null
  const fallback = primary ?? (options[0]?.fansub_group?.id ?? null)

  if (typeof window === 'undefined') {
    return {
      mode: fallback ? 'single' : 'all',
      activeFansubGroupID: fallback,
    }
  }

  const storageValue = window.localStorage.getItem(getStorageKey(animeID))
  if (!storageValue) {
    return {
      mode: fallback ? 'single' : 'all',
      activeFansubGroupID: fallback,
    }
  }

  try {
    const parsed = JSON.parse(storageValue) as PersistedFilterState
    const mode = parsed.mode === 'single' ? 'single' : 'all'
    const candidate = parsed.activeFansubGroupId
    const activeFansubGroupID =
      typeof candidate === 'number' && optionIDs.has(candidate) ? candidate : fallback
    return {
      mode: activeFansubGroupID ? mode : 'all',
      activeFansubGroupID,
    }
  } catch {
    return {
      mode: fallback ? 'single' : 'all',
      activeFansubGroupID: fallback,
    }
  }
}

function resolveLogoUrl(raw?: string | null): string | null {
  const value = (raw || '').trim()
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  return `/covers/${value}`
}

function formatSubtitleType(value?: string | null): string {
  if (value === 'softsub') return 'Softsub'
  if (value === 'hardsub') return 'Hardsub'
  return 'Unbekannt'
}

function formatReleaseDate(value?: string | null): string {
  if (!value) return 'Kein Datum'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Kein Datum'
  return parsed.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function resolveEpisodeTitle(episode: GroupedEpisode, summaryVersion: EpisodeVersion | null): string {
  const explicitTitle = (episode.episode_title || '').trim()
  if (explicitTitle) return explicitTitle
  const summaryTitle = (summaryVersion?.title || '').trim()
  if (summaryTitle) return summaryTitle
  return `Folge ${episode.episode_number}`
}

function resolveReleaseName(version: EpisodeVersion): string {
  const explicit = (version.title || '').trim()
  if (explicit) return explicit
  return `Release #${version.id}`
}

function getFallbackVersion(episode: GroupedEpisode): EpisodeVersion | null {
  if (episode.versions.length === 0) return null
  return episode.versions[0]
}

function getSummaryVersion(
  episode: GroupedEpisode,
  mode: FilterMode,
  activeFansubGroupID: number | null,
): EpisodeVersion | null {
  if (episode.versions.length === 0) return null
  if (mode === 'all' || activeFansubGroupID === null) {
    if (episode.default_version_id) {
      const defaultVersion = episode.versions.find((item) => item.id === episode.default_version_id)
      if (defaultVersion) return defaultVersion
    }
    return episode.versions[0]
  }

  const preferred = episode.versions.find((item) => item.fansub_group?.id === activeFansubGroupID)
  return preferred || episode.versions[0]
}

export function FansubVersionBrowser({ animeID, fansubs, episodes }: FansubVersionBrowserProps) {
  const [filterState, setFilterState] = useState<FilterState>(() => resolveInitialFilterState(animeID, fansubs))
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, true>>({})

  const fansubOptions = useMemo(() => collectFansubOptions(fansubs), [fansubs])
  const filterMode = filterState.mode
  const activeFansubGroupID = filterState.activeFansubGroupID

  useEffect(() => {
    if (typeof window === 'undefined') return
    const value: PersistedFilterState = {
      mode: filterState.mode,
      activeFansubGroupId: filterState.activeFansubGroupID,
    }
    window.localStorage.setItem(getStorageKey(animeID), JSON.stringify(value))
  }, [animeID, filterState])

  function setAllMode() {
    setFilterState((current) => ({ ...current, mode: 'all' }))
  }

  function setSingleMode(groupID: number) {
    setFilterState({
      mode: 'single',
      activeFansubGroupID: groupID,
    })
  }

  function toggleEpisode(episodeNumber: number) {
    setExpandedEpisodes((current) => {
      if (current[episodeNumber]) {
        const next = { ...current }
        delete next[episodeNumber]
        return next
      }
      return { ...current, [episodeNumber]: true }
    })
  }

  return (
    <section className={styles.section}>
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterChip} ${filterMode === 'all' ? styles.filterChipActive : ''}`}
          onClick={setAllMode}
          aria-pressed={filterMode === 'all'}
        >
          Alle Versionen
        </button>
        {fansubOptions.map((relation) => {
          if (!relation.fansub_group) return null
          const logoURL = resolveLogoUrl(relation.fansub_group.logo_url)
          const isActive = filterMode === 'single' && activeFansubGroupID === relation.fansub_group.id
          return (
            <button
              key={relation.fansub_group.id}
              type="button"
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
              onClick={() => setSingleMode(relation.fansub_group!.id)}
              aria-pressed={isActive}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoURL ? <img src={logoURL} alt="" className={styles.logo} /> : null}
              {relation.fansub_group.name}
            </button>
          )
        })}
      </div>

      {episodes.length === 0 ? (
        <div className={styles.emptyBox}>Keine Episoden-Versionen vorhanden.</div>
      ) : (
        <ul className={styles.episodeList}>
          {episodes.map((episode) => {
            const expanded = Boolean(expandedEpisodes[episode.episode_number])
            const summaryVersion = getSummaryVersion(episode, filterMode, activeFansubGroupID)
            const hasSingleGroupFilter = filterMode === 'single' && activeFansubGroupID !== null
            const groupMatchedVersions = hasSingleGroupFilter
              ? episode.versions.filter((item) => item.fansub_group?.id === activeFansubGroupID)
              : episode.versions
            const fallbackToAllVersions =
              hasSingleGroupFilter && groupMatchedVersions.length === 0 && episode.versions.length > 0
            const displayedVersions = fallbackToAllVersions ? episode.versions : groupMatchedVersions
            const fallbackVersion = getFallbackVersion(episode)
            const panelID = `episode-versions-${episode.episode_number}`
            const episodeTitle = resolveEpisodeTitle(episode, summaryVersion)

            return (
              <li key={episode.episode_number} className={styles.episodeCard}>
                <button
                  type="button"
                  className={styles.episodeHeader}
                  onClick={() => toggleEpisode(episode.episode_number)}
                  aria-expanded={expanded}
                  aria-controls={panelID}
                >
                  <div>
                    <p className={styles.episodeNumber}>Folge {episode.episode_number}</p>
                    <p className={styles.summaryLine}>{episodeTitle}</p>
                  </div>
                  <span className={styles.countBadge}>+{episode.version_count} Versionen</span>
                </button>

                {expanded ? (
                  <div id={panelID} className={styles.versionList}>
                    {displayedVersions.length === 0 ? (
                      <div className={styles.fallbackRow}>
                        <p>Keine Version dieser Gruppe gefunden.</p>
                        {fallbackVersion ? (
                          <p className={styles.fallbackHint}>
                            Alternative: {fallbackVersion.fansub_group?.name || 'Unbekannt'} /{' '}
                            {fallbackVersion.video_quality || 'n/a'}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {fallbackToAllVersions ? (
                          <div className={styles.fallbackRow}>
                            <p>Keine Version dieser Gruppe direkt zugeordnet.</p>
                            <p className={styles.fallbackHint}>Zeige alle verfuegbaren Versionen als Fallback.</p>
                          </div>
                        ) : null}
                        {displayedVersions.map((version) => {
                        const versionLogoURL = resolveLogoUrl(version.fansub_group?.logo_url)
                        return (
                          <div key={version.id} className={styles.versionRow}>
                            <div className={styles.versionMeta}>
                              <div className={styles.versionIdentity}>
                                {versionLogoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={versionLogoURL}
                                  alt=""
                                  className={styles.versionLogo}
                                />
                              ) : (
                                <div className={styles.versionLogoFallback} aria-hidden="true">
                                  {version.fansub_group?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                )}
                                <div className={styles.versionIdentityText}>
                                  <p className={styles.versionGroupName}>{version.fansub_group?.name || 'Unbekannt'}</p>
                                  <p className={styles.versionReleaseName}>{resolveReleaseName(version)}</p>
                                </div>
                              </div>
                              <div className={styles.badgeRow}>
                                <span className={styles.metaBadge}>{version.video_quality || 'n/a'}</span>
                                <span className={styles.metaBadge}>{formatSubtitleType(version.subtitle_type)}</span>
                                <span className={styles.metaBadge}>{formatReleaseDate(version.release_date)}</span>
                              </div>
                            </div>
                            <a
                              href={`/api/releases/${version.id}/stream`}
                              className={styles.playButton}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Version abspielen"
                            >
                              Play
                            </a>
                          </div>
                        )
                        })}
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
