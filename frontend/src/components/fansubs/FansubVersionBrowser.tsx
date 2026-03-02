'use client'

import { useEffect, useMemo, useState } from 'react'

import { GroupedEpisode, EpisodeVersion } from '@/types/episodeVersion'
import { AnimeFansubRelation } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

interface FansubVersionBrowserProps {
  animeID: number
  fansubs: AnimeFansubRelation[]
  episodes: GroupedEpisode[]
  onActiveFansubChange?: (fansubGroupId: number | null) => void
}

interface PersistedFilterState {
  activeFansubGroupId?: number | null
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

function resolveInitialActiveFansubGroupID(animeID: number, fansubs: AnimeFansubRelation[]): number | null {
  const options = collectFansubOptions(fansubs)
  const optionIDs = new Set(options.map((item) => item.fansub_group?.id).filter((item): item is number => Boolean(item)))
  const primary = options.find((item) => item.is_primary && item.fansub_group)?.fansub_group?.id ?? null
  const fallback = primary ?? (options[0]?.fansub_group?.id ?? null)

  if (typeof window === 'undefined') {
    return fallback
  }

  const storageValue = window.localStorage.getItem(getStorageKey(animeID))
  if (!storageValue) {
    return fallback
  }

  try {
    const parsed = JSON.parse(storageValue) as PersistedFilterState
    const candidate = parsed.activeFansubGroupId
    const activeFansubGroupID =
      typeof candidate === 'number' && optionIDs.has(candidate) ? candidate : fallback
    return activeFansubGroupID
  } catch {
    return fallback
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

function getSummaryVersion(
  episode: GroupedEpisode,
  activeFansubGroupID: number | null,
): EpisodeVersion | null {
  if (episode.versions.length === 0) return null
  if (activeFansubGroupID === null) {
    if (episode.default_version_id) {
      const defaultVersion = episode.versions.find((item) => item.id === episode.default_version_id)
      if (defaultVersion) return defaultVersion
    }
    return episode.versions[0]
  }

  const preferred = episode.versions.find((item) => item.fansub_group?.id === activeFansubGroupID)
  return preferred || episode.versions[0]
}

export function FansubVersionBrowser({ animeID, fansubs, episodes, onActiveFansubChange }: FansubVersionBrowserProps) {
  const [activeFansubGroupID, setActiveFansubGroupID] = useState<number | null>(() => resolveInitialActiveFansubGroupID(animeID, fansubs))
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, true>>({})

  const fansubOptions = useMemo(() => collectFansubOptions(fansubs), [fansubs])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const value: PersistedFilterState = {
      activeFansubGroupId: activeFansubGroupID,
    }
    window.localStorage.setItem(getStorageKey(animeID), JSON.stringify(value))
  }, [animeID, activeFansubGroupID])

  function selectFansubGroup(groupID: number) {
    setActiveFansubGroupID(groupID)
    if (onActiveFansubChange) {
      onActiveFansubChange(groupID)
    }
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
        {fansubOptions.map((relation) => {
          if (!relation.fansub_group) return null
          const logoURL = resolveLogoUrl(relation.fansub_group.logo_url)
          const isActive = activeFansubGroupID === relation.fansub_group.id
          return (
            <button
              key={relation.fansub_group.id}
              type="button"
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
              onClick={() => selectFansubGroup(relation.fansub_group!.id)}
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
            const summaryVersion = getSummaryVersion(episode, activeFansubGroupID)
            const groupMatchedVersions = activeFansubGroupID !== null
              ? episode.versions.filter((item) => item.fansub_group?.id === activeFansubGroupID)
              : episode.versions
            const hasNoMatchingVersion = activeFansubGroupID !== null && groupMatchedVersions.length === 0
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
                    {hasNoMatchingVersion ? (
                      <div className={styles.noVersionHint}>
                        <p className={styles.noVersionText}>Keine Version dieser Gruppe verfuegbar.</p>
                        <p className={styles.noVersionAction}>Wechseln Sie zu einer anderen Fansub-Gruppe.</p>
                      </div>
                    ) : (
                      groupMatchedVersions.map((version) => {
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
                      })
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
