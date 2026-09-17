'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getGroupedEpisodes } from '@/lib/api'
import { Button } from '@/components/ui/Button'

import { PublicGroupedEpisode, PublicEpisodeVersion, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import { FansubGroupContext } from './FansubGroupContext'
import { FansubGroupPicker } from './FansubGroupPicker'
import { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

interface FansubVersionBrowserProps {
  animeID: number
  animeSlug?: string
  fansubs: AnimeFansubRelation[]
  episodes: PublicGroupedEpisode[]
  pagination?: PublicGroupedEpisodesResponse['data']['pagination']
  storyGroups?: FansubGroupSummary[]
  /** SSR-Initialwert aus `searchParams.fansub` (D-04). Bei genau einer Gruppe wird der Wert ignoriert (D-02). */
  initialActiveSlug?: string | null
}

function collectFansubOptions(fansubs: AnimeFansubRelation[]): AnimeFansubRelation[] {
  const map = new Map<number, AnimeFansubRelation>()
  for (const relation of fansubs) {
    if (!relation.fansub_group || !Number.isSafeInteger(relation.fansub_group.id) || relation.fansub_group.id <= 0) continue
    map.set(relation.fansub_group.id, relation)
  }
  return Array.from(map.values())
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

function resolveEpisodeTitle(episode: PublicGroupedEpisode, summaryVersion: PublicEpisodeVersion | null): string {
  const explicitTitle = (episode.episode_title || '').trim()
  if (explicitTitle) return explicitTitle
  const summaryTitle = (summaryVersion?.title || '').trim()
  if (summaryTitle) return summaryTitle
  return `Folge ${episode.episode_number}`
}

function resolveReleaseName(version: PublicEpisodeVersion): string {
  const explicit = (version.title || '').trim()
  if (explicit) return explicit
  return `Release #${version.release_version_id}`
}

function formatVersionCount(count: number): string {
  return `+${count} ${count === 1 ? 'Version' : 'Versionen'}`
}

function getSummaryVersion(
  episode: PublicGroupedEpisode,
  activeFansubGroupID: number | null,
): PublicEpisodeVersion | null {
  if (episode.versions.length === 0) return null
  if (activeFansubGroupID === null) {
    if (episode.default_version_id) {
      const defaultVersion = episode.versions.find((item) => item.variant_id === episode.default_version_id)
      if (defaultVersion) return defaultVersion
    }
    return episode.versions[0]
  }

  const preferred = episode.versions.find((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
  return preferred || episode.versions[0]
}

function mergeEpisodes(current: PublicGroupedEpisode[], incoming: PublicGroupedEpisode[]): PublicGroupedEpisode[] {
  const merged = new Map(current.map((episode) => [episode.episode_id, episode]))
  for (const episode of incoming) {
    const previous = merged.get(episode.episode_id)
    const variants = new Map(previous?.versions.map((version) => [version.variant_id, version]) ?? [])
    for (const version of episode.versions) variants.set(version.variant_id, version)
    merged.set(episode.episode_id, { ...previous, ...episode, versions: Array.from(variants.values()) })
  }
  return Array.from(merged.values())
}

export function FansubVersionBrowser(props: FansubVersionBrowserProps) {
  // Route identity resets selection, expansion and pending callbacks together.
  return <FansubVersionBrowserContent key={props.animeID} {...props} />
}

function FansubVersionBrowserContent({ animeID, animeSlug, fansubs, episodes, pagination, initialActiveSlug }: FansubVersionBrowserProps) {
  const fansubOptions = useMemo(() => collectFansubOptions(fansubs), [fansubs])
  const showAllChip = fansubOptions.length >= 2
  // D-02: bei genau einer Gruppe wird der URL-Parameter ignoriert -- die Gruppe ist immer aktiv.
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    fansubOptions.length === 1 ? null : (initialActiveSlug ?? null),
  )
  const activeFansubGroupID = fansubOptions.length === 0
    ? null
    : fansubOptions.length === 1
      ? fansubOptions[0].fansub_group!.id
      : fansubOptions.find((relation) => relation.fansub_group?.slug === selectedSlug)?.fansub_group?.id ?? null
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, true>>({})
  const activeGroup = activeFansubGroupID !== null
    ? fansubOptions.find((relation) => relation.fansub_group?.id === activeFansubGroupID)?.fansub_group ?? null
    : null

  // D-01/D-03: die URL ist die einzige Quelle des Gruppenkontexts. Browser Zurueck/Vor
  // liest den Parameter erneut, ohne einen neuen fachlichen Datenrequest auszuloesen.
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)
      setSelectedSlug(params.get('fansub'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function updateFansubSelection(groupID: number | null) {
    // Bei genau einer Gruppe gibt es keinen Klickpfad (kein "Alle"-Chip, kein Wechsel-Chip).
    if (fansubOptions.length < 2) return
    const slug = groupID === null
      ? null
      : fansubOptions.find((relation) => relation.fansub_group?.id === groupID)?.fansub_group?.slug ?? null
    const params = new URLSearchParams(window.location.search)
    if (slug) params.set('fansub', slug)
    else params.delete('fansub')
    const query = params.toString()
    // D-03: window.history.pushState statt der next/navigation-Router-Helfer -- diese Route
    // ist bereits dynamisch (liest searchParams.grid_query/from) und wuerde damit einen
    // RSC-Refetch der Seite ausloesen.
    window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    setSelectedSlug(slug)
  }

  const [inventory, setInventory] = useState({ source: episodes, episodes, pagination })
  const [loadState, setLoadState] = useState<{ source: PublicGroupedEpisode[]; loading: boolean; error: string | null }>({
    source: episodes, loading: false, error: null,
  })
  const requestRef = useRef<AbortController | null>(null)
  const loadedEpisodes = inventory.source === episodes ? inventory.episodes : episodes
  const page = inventory.source === episodes ? inventory.pagination : pagination
  const isLoading = loadState.source === episodes && loadState.loading
  const loadError = loadState.source === episodes ? loadState.error : null

  useEffect(() => {
    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [episodes, pagination])

  async function loadMore() {
    if (!page?.has_more || !page.next_cursor || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoadState({ source: episodes, loading: true, error: null })
    try {
      const response = await getGroupedEpisodes(animeID, {
        projection: 'public', limit: 24, cursor: page.next_cursor, signal: controller.signal,
      })
      if (controller.signal.aborted || requestRef.current !== controller) return
      setInventory({
        source: episodes,
        episodes: mergeEpisodes(loadedEpisodes, response.data.episodes),
        pagination: response.data.pagination,
      })
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return
      setLoadState({ source: episodes, loading: false, error: 'Weitere Episoden konnten nicht geladen werden.' })
    } finally {
      if (!controller.signal.aborted && requestRef.current === controller) {
        requestRef.current = null
        setLoadState((current) => ({ ...current, loading: false }))
      }
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
      {fansubOptions.length > 0 ? (
        <>
          <FansubGroupPicker
            options={fansubOptions.map((relation) => relation.fansub_group!)}
            activeGroupId={activeFansubGroupID}
            showAllChip={showAllChip}
            onSelect={updateFansubSelection}
          />
          <FansubGroupContext activeGroup={activeGroup} animeSlug={animeSlug} />
        </>
      ) : null}

      {loadedEpisodes.length === 0 ? (
        <div className={styles.emptyBox}>Keine Episoden-Versionen vorhanden.</div>
      ) : (
        <ul className={styles.episodeList}>
          {loadedEpisodes.map((episode) => {
            const expanded = Boolean(expandedEpisodes[episode.episode_id])
            const summaryVersion = getSummaryVersion(episode, activeFansubGroupID)
            const groupMatchedVersions = activeFansubGroupID !== null
              ? episode.versions.filter((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
              : episode.versions
            const hasNoMatchingVersion = activeFansubGroupID !== null && groupMatchedVersions.length === 0
            const panelID = `episode-versions-${animeID}-${episode.episode_id}`
            const episodeTitle = resolveEpisodeTitle(episode, summaryVersion)

            return (
              <li key={episode.episode_id} className={styles.episodeCard}>
                <button
                  type="button"
                  className={styles.episodeHeader}
                  onClick={() => toggleEpisode(episode.episode_id)}
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
                        <p className={styles.noVersionText}>{page?.has_more ? 'Im geladenen Ausschnitt ist noch keine Version dieser Gruppe vorhanden.' : 'Keine Version dieser Gruppe verfügbar.'}</p>
                        <p className={styles.noVersionAction}>{page?.has_more ? 'Laden Sie weitere Episoden und Versionen oder wählen Sie eine andere Gruppe.' : 'Wechseln Sie zu einer anderen Fansub-Gruppe.'}</p>
                      </div>
                    ) : (
                      groupMatchedVersions.map((version) => {
                        const versionLogoURL = resolveLogoUrl(version.fansub_groups?.[0]?.logo_url)
                        return (
                          <div key={version.variant_id} className={styles.versionRow}>
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
                              href={`/api/releases/${version.release_version_id}/stream?variant_id=${version.variant_id}`}
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
      {loadError ? <p role="alert">{loadError}</p> : null}
      {page?.has_more ? (
        <Button variant="secondary" loading={isLoading} onClick={() => void loadMore()}>
          {loadError ? 'Erneut versuchen' : 'Weitere Episoden und Versionen laden'}
        </Button>
      ) : null}
    </section>
  )
}
