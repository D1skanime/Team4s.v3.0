'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

import { GroupedEpisode, EpisodeVersion } from '@/types/episodeVersion'
import { ActiveFansubStory } from './ActiveFansubStory'
import { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

interface FansubVersionBrowserProps {
  animeID: number
  animeSlug?: string
  fansubs: AnimeFansubRelation[]
  episodes: GroupedEpisode[]
  storyGroups?: FansubGroupSummary[]
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
    if (!relation.fansub_group || !Number.isSafeInteger(relation.fansub_group.id) || relation.fansub_group.id <= 0) continue
    map.set(relation.fansub_group.id, relation)
  }
  return Array.from(map.values())
}

function parseStoredSelection(raw: string | null, validIDs: number[], fallback: number | null): number | null {
  try {
    const candidate: unknown = raw ? (JSON.parse(raw) as PersistedFilterState | null)?.activeFansubGroupId : null
    return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0 && validIDs.includes(candidate)
      ? candidate : fallback
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

function formatVersionCount(count: number): string {
  return `+${count} ${count === 1 ? 'Version' : 'Versionen'}`
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

  const preferred = episode.versions.find((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
  return preferred || episode.versions[0]
}

export function FansubVersionBrowser(props: FansubVersionBrowserProps) {
  // Route identity resets selection, expansion and pending callbacks together.
  return <FansubVersionBrowserContent key={props.animeID} {...props} />
}

function FansubVersionBrowserContent({ animeID, animeSlug, fansubs, episodes, storyGroups = [], onActiveFansubChange }: FansubVersionBrowserProps) {
  const fansubOptions = useMemo(() => collectFansubOptions(fansubs), [fansubs])
  const validIDs = fansubOptions.map((relation) => relation.fansub_group!.id)
  const selectionScope = JSON.stringify(validIDs)
  const fallback = fansubOptions.find((relation) => relation.is_primary)?.fansub_group?.id ?? validIDs[0] ?? null
  const [selectedGroupID, setSelectedGroupID] = useState<number | null>(fallback)
  const activeFansubGroupID = selectedGroupID !== null && validIDs.includes(selectedGroupID) ? selectedGroupID : fallback
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, true>>({})
  const selectionContext = useRef<{ scope: string; active: boolean; revision: number } | null>(null)
  const activeGroup = fansubOptions.find((relation) => relation.fansub_group?.id === activeFansubGroupID)?.fansub_group
  const groupProjectHref = animeSlug?.trim() && activeGroup?.slug?.trim()
    ? buildPublicFansubProjectPath(activeGroup.slug, animeSlug)
    : `/anime/${animeID}/group/${activeFansubGroupID}`

  useEffect(() => {
    const ids = JSON.parse(selectionScope) as number[]
    const context = { scope: selectionScope, active: true, revision: 0 }
    selectionContext.current = context
    const key = getStorageKey(animeID)
    // The server and first hydration render use props only. A cancelled StrictMode
    // effect or an explicit selection must not be overwritten by this mount read.
    void Promise.resolve().then(() => {
      if (!context.active || context.revision !== 0) return
      let stored: string | null = null
      try { stored = window.localStorage.getItem(key) } catch { /* Storage can be unavailable. */ }
      setSelectedGroupID(parseStoredSelection(stored, ids, fallback))
    })
    const handleStorage = (event: StorageEvent) => {
      if (!context.active || (event.key !== null && event.key !== key)) return
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch { return }
      context.revision += 1
      setSelectedGroupID(parseStoredSelection(event.newValue, ids, fallback))
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      context.active = false
      window.removeEventListener('storage', handleStorage)
    }
  }, [animeID, selectionScope, fallback])

  function selectFansubGroup(groupID: number) {
    const context = selectionContext.current
    if (!context?.active || context.scope !== selectionScope || !validIDs.includes(groupID)) return
    context.revision += 1
    setSelectedGroupID(groupID)
    try {
      window.localStorage.setItem(getStorageKey(animeID), JSON.stringify({ activeFansubGroupId: groupID }))
    } catch { /* Keep the current tab usable when persistence is blocked. */ }
    onActiveFansubChange?.(groupID)
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
    <>
    <ActiveFansubStory activeFansubGroupID={activeFansubGroupID} groups={storyGroups} />
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
              {logoURL ? <Image src={logoURL} alt="" className={styles.logo} width={16} height={16} unoptimized /> : null}
              {relation.fansub_group.name}
            </button>
          )
        })}
      </div>
      {activeFansubGroupID !== null ? (
        <div className={styles.groupCtaRow}>
          <Link
            href={groupProjectHref}
            className={styles.groupButton}
            aria-label="Zum Gruppenbereich"
          >
            Gruppenbereich
          </Link>
        </div>
      ) : null}

      {episodes.length === 0 ? (
        <div className={styles.emptyBox}>Keine Episoden-Versionen vorhanden.</div>
      ) : (
        <ul className={styles.episodeList}>
          {episodes.map((episode) => {
            const expanded = Boolean(expandedEpisodes[episode.episode_number])
            const summaryVersion = getSummaryVersion(episode, activeFansubGroupID)
            const groupMatchedVersions = activeFansubGroupID !== null
              ? episode.versions.filter((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
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
                  <span className={styles.countBadge}>{formatVersionCount(episode.version_count)}</span>
                </button>

                {expanded ? (
                  <div id={panelID} className={styles.versionList}>
                    {hasNoMatchingVersion ? (
                      <div className={styles.noVersionHint}>
                        <p className={styles.noVersionText}>Keine Version dieser Gruppe verfügbar.</p>
                        <p className={styles.noVersionAction}>Wechseln Sie zu einer anderen Fansub-Gruppe.</p>
                      </div>
                    ) : (
                      groupMatchedVersions.map((version) => {
                        const versionLogoURL = resolveLogoUrl(version.fansub_groups?.[0]?.logo_url)
                        return (
                          <div key={version.id} className={styles.versionRow}>
                            <div className={styles.versionMeta}>
                              <div className={styles.versionIdentity}>
                                {versionLogoURL ? (
                                  <Image
                                    src={versionLogoURL}
                                    alt=""
                                    className={styles.versionLogo}
                                    width={36}
                                    height={36}
                                    unoptimized
                                  />
                                ) : (
                                  <div className={styles.versionLogoFallback} aria-hidden="true">
                                    {version.fansub_groups?.[0]?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <div className={styles.versionIdentityText}>
                                  <p className={styles.versionGroupName}>{version.fansub_groups?.map((g) => g.name).join(', ') || 'Unbekannt'}</p>
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
    </>
  )
}
