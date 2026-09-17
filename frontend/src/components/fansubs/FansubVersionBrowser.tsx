'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { classNames } from '@/components/ui/classNames'

import { PublicGroupedEpisode, PublicEpisodeVersion, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import { EpisodeGlassCard } from './EpisodeGlassCard'
import { resolveEpisodeTitle } from './episodePreviewFormat'
import { FansubGroupContext } from './FansubGroupContext'
import { FansubGroupPicker } from './FansubGroupPicker'
import { ReleasePreviewRow } from './ReleasePreviewRow'
import { useWindowedEpisodePages, type WindowedPage } from './useWindowedEpisodePages'
import { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

type Pagination = PublicGroupedEpisodesResponse['data']['pagination']

interface FansubVersionBrowserProps {
  animeID: number
  animeSlug?: string
  fansubs: AnimeFansubRelation[]
  episodes: PublicGroupedEpisode[]
  pagination?: Pagination
  storyGroups?: FansubGroupSummary[]
  /** SSR-Initialwert aus `searchParams.fansub` (D-04). Bei genau einer Gruppe wird der Wert ignoriert (D-02). */
  initialActiveSlug?: string | null
  /** Trefferzahl des aktuellen SSR-Filters (D-12), aus dem `page.tsx`-Fetch. */
  episodeCount?: number
}

function collectFansubOptions(fansubs: AnimeFansubRelation[]): AnimeFansubRelation[] {
  const map = new Map<number, AnimeFansubRelation>()
  for (const relation of fansubs) {
    if (!relation.fansub_group || !Number.isSafeInteger(relation.fansub_group.id) || relation.fansub_group.id <= 0) continue
    map.set(relation.fansub_group.id, relation)
  }
  return Array.from(map.values())
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

/** Phase 163's cursor paginates over (episode_number, episode_id, variant_id) ROWS, not whole
 * episodes -- an episode with more variants than the page's row_limit can legitimately span two
 * adjacent cursor pages. This merges such boundary-split episodes for DISPLAY across the
 * CURRENTLY WINDOWED pages only (never mutates the hook's own per-page cache), so the union of
 * versions renders once, attributed to the page where the episode_id first appears; the other
 * occurrence is skipped. If the first page is later evicted (spacer), this naturally degrades to
 * the still-windowed partial version list -- no crash, matches D-37's "bereits sichtbar bleiben". */
function computeBoundaryMergedRenderPlan(pages: WindowedPage[]): {
  merged: Map<number, PublicGroupedEpisode>
  firstPageIdByEpisodeId: Map<number, string>
} {
  const merged = new Map<number, PublicGroupedEpisode>()
  const firstPageIdByEpisodeId = new Map<number, string>()
  for (const page of pages) {
    for (const episode of page.episodes) {
      const previous = merged.get(episode.episode_id)
      if (!previous) {
        merged.set(episode.episode_id, episode)
        firstPageIdByEpisodeId.set(episode.episode_id, page.id)
        continue
      }
      const variantMap = new Map(previous.versions.map((version) => [version.variant_id, version]))
      for (const version of episode.versions) variantMap.set(version.variant_id, version)
      merged.set(episode.episode_id, { ...previous, ...episode, versions: Array.from(variantMap.values()) })
    }
  }
  return { merged, firstPageIdByEpisodeId }
}

/** Misst die gerenderte Hoehe einer Page fortlaufend (ResizeObserver), damit ein evtl. spaeter
 * ausgelagerter Spacer die zuletzt bekannte, echte Hoehe uebernimmt (D-34) statt 0px. Rendert
 * absichtlich kein zusaetzliches <li>/<ul> -- die enthaltenen EpisodeGlassCard-<li>-Elemente
 * bleiben direkte Nachfahren im Accessibility-Baum (li -> listitem ist kontextunabhaengig),
 * nur ein <div> uebernimmt die Messfunktion. */
function WindowedPageGroup({
  pageId, reportPageHeight, children,
}: {
  pageId: string
  reportPageHeight: (pageId: string, heightPx: number) => void
  children: React.ReactNode
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    reportPageHeight(pageId, node.getBoundingClientRect().height)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) reportPageHeight(pageId, entry.contentRect.height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [pageId, reportPageHeight])

  return <div ref={wrapperRef} data-page-id={pageId}>{children}</div>
}

export function FansubVersionBrowser(props: FansubVersionBrowserProps) {
  // Route identity resets selection, expansion and pending callbacks together.
  return <FansubVersionBrowserContent key={props.animeID} {...props} />
}

function FansubVersionBrowserContent({
  animeID, animeSlug, fansubs, episodes, pagination, initialActiveSlug, episodeCount = 0,
}: FansubVersionBrowserProps) {
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

  // D-08/D-10: ein Gruppenwechsel hat einen eigenen Lade-/Fehlerzustand (volle Listendimmung),
  // getrennt vom kompakten vorwaerts/rueckwaerts-Ladezustand des Infinite Scroll.
  const [switchState, setSwitchState] = useState<{ loading: boolean; error: string | null }>({
    loading: false, error: null,
  })

  const windowing = useWindowedEpisodePages({
    animeID,
    initialEpisodes: episodes,
    initialPagination: pagination,
    activeFansubSlug: activeGroup?.slug ?? null,
    initialEpisodeCount: episodeCount,
  })

  // D-34: eine Rueckwaerts-Wiederherstellung liefert ein Delta -- vor dem naechsten Paint per
  // scrollBy ausgleichen, damit der sichtbare Inhalt nicht sichtbar springt.
  useLayoutEffect(() => {
    if (!windowing.scrollAnchorAdjustment || windowing.scrollAnchorAdjustment.px === 0) return
    if (typeof window === 'undefined') return
    window.scrollBy(0, windowing.scrollAnchorAdjustment.px)
  }, [windowing.scrollAnchorAdjustment])

  // D-01/D-03: die URL ist die einzige Quelle des Gruppenkontexts. Browser Zurueck/Vor
  // liest den Parameter erneut und loest -- anders als bei 162 -- immer neu (D-09).
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)
      const rawSlug = params.get('fansub')
      setSelectedSlug(rawSlug)
      void switchTo(resolveGroupSlugForFetch(rawSlug))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resolveGroupSlugForFetch(rawSlug: string | null): string | null {
    if (fansubOptions.length < 2 || !rawSlug) return null
    const match = fansubOptions.find((relation) => relation.fansub_group?.slug === rawSlug)
    return match ? rawSlug : null
  }

  async function switchTo(targetSlug: string | null) {
    // D-09: der Wechsel bricht IMMER eine laufende Anfrage ab (vorwaerts, rueckwaerts oder ein
    // vorheriger Wechsel) -- windowing.resetForFilter teilt sich den einzigen requestRef der
    // Hook-Instanz, nur die letzte Auswahl darf Daten setzen.
    setSwitchState({ loading: true, error: null })
    const outcome = await windowing.resetForFilter(targetSlug)
    if (outcome.ok) {
      setSwitchState({ loading: false, error: null })
    } else if (!outcome.aborted) {
      setSwitchState({ loading: false, error: 'Episoden konnten nicht geladen werden.' })
    }
    // outcome.aborted: eine neuere switchTo-Anfrage laeuft bereits oder hat bereits committet --
    // diese veraltete Antwort darf switchState nicht mehr anfassen.
  }

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
    void switchTo(slug)
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

  function renderEpisode(episode: PublicGroupedEpisode) {
    const expanded = Boolean(expandedEpisodes[episode.episode_id])
    const summaryVersion = getSummaryVersion(episode, activeFansubGroupID)
    // Defensive Client-Filterung fuer den Fall, dass die Versionsliste (noch) nicht
    // serverseitig auf die aktive Gruppe eingeschraenkt ist (z. B. initialActiveSlug
    // vor dem ersten Wechsel/Refetch). Coop-Versionen (mehrere fansub_groups) matchen
    // fuer jede beteiligte Gruppe -- kein dritter Chip, kein Ausschluss (D-07/Testfall I).
    const groupMatchedVersions = activeFansubGroupID !== null
      ? episode.versions.filter((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
      : episode.versions
    const panelID = `episode-versions-${animeID}-${episode.episode_id}`
    const episodeTitle = resolveEpisodeTitle(episode, summaryVersion)

    return (
      <EpisodeGlassCard
        key={episode.episode_id}
        episode={episode}
        episodeTitle={episodeTitle}
        expanded={expanded}
        onToggle={() => toggleEpisode(episode.episode_id)}
        panelId={panelID}
      >
        {groupMatchedVersions.map((version) => (
          <ReleasePreviewRow key={version.variant_id} version={version} animeID={animeID} />
        ))}
      </EpisodeGlassCard>
    )
  }

  const hasAnyEpisodes = windowing.pages.some((page) => page.episodes.length > 0)

  return (
    <section className={styles.section}>
      {/* D-12: die Trefferzahl kommt aus dem Client-Zustand, aktualisiert sich bei jedem Wechsel. */}
      <h2>Episoden ({windowing.episodeCount})</h2>

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

      {switchState.error ? (
        <div role="alert">
          <ErrorState
            title="Episoden konnten nicht geladen werden."
            description={switchState.error}
            action={
              <Button variant="secondary" onClick={() => void switchTo(resolveGroupSlugForFetch(selectedSlug))}>
                Erneut versuchen
              </Button>
            }
          />
        </div>
      ) : null}

      {/* D-31/D-35: der obere Sentinel und die rueckwaerts-Lade-/Fehlerzustaende sind unabhaengig
          davon sichtbar, ob die aktuelle Page (noch) Episoden enthaelt -- analog zum vormaligen
          "Weitere laden"-Button, der ebenfalls ausserhalb der Leer-/Listen-Verzweigung stand. */}
      <div ref={windowing.topSentinelRef} aria-hidden="true" data-testid="top-sentinel" className={styles.sentinel} />
      {windowing.backwardLoading ? <LoadingState compact title="Frühere Episoden werden geladen …" /> : null}
      {windowing.backwardError ? (
        <div role="alert">
          <ErrorState
            title="Frühere Episoden konnten nicht geladen werden."
            description="Die bereits geladenen Episoden bleiben sichtbar."
            action={<Button variant="secondary" onClick={() => void windowing.retryPrevious()}>Erneut versuchen</Button>}
          />
        </div>
      ) : null}

      {!hasAnyEpisodes ? (
        activeFansubGroupID !== null ? (
          <EmptyState
            variant="compact"
            title="Keine Releases für diese Fansub-Gruppe"
            description="Für diese Fansub-Gruppe sind derzeit keine öffentlichen Releases hinterlegt."
          />
        ) : (
          <EmptyState variant="compact" title="Keine Episoden-Versionen vorhanden" />
        )
      ) : (
        <ul
          aria-busy={switchState.loading}
          className={classNames(styles.episodeList, switchState.loading && styles.episodeListDimmed)}
        >
          {(() => {
            const pageById = new Map(windowing.pages.map((page: WindowedPage) => [page.id, page]))
            const { merged, firstPageIdByEpisodeId } = computeBoundaryMergedRenderPlan(windowing.pages)
            return windowing.orderedPageIds.map((pageId: string) => {
              if (windowing.domWindowPageIds.includes(pageId)) {
                const page = pageById.get(pageId)
                if (!page) return null
                const episodesToRender = page.episodes
                  .filter((episode) => firstPageIdByEpisodeId.get(episode.episode_id) === pageId)
                  .map((episode) => merged.get(episode.episode_id) ?? episode)
                return (
                  <WindowedPageGroup key={pageId} pageId={pageId} reportPageHeight={windowing.reportPageHeight}>
                    {episodesToRender.map(renderEpisode)}
                  </WindowedPageGroup>
                )
              }
              const heightPx = windowing.spacers.get(pageId)
              if (heightPx === undefined) return null
              return <div key={pageId} aria-hidden="true" style={{ height: heightPx }} />
            })
          })()}
        </ul>
      )}

      <div ref={windowing.bottomSentinelRef} aria-hidden="true" data-testid="bottom-sentinel" className={styles.sentinel} />
      {windowing.forwardLoading ? <LoadingState compact title="Weitere Episoden werden geladen …" /> : null}
      {windowing.forwardError ? (
        <div role="alert">
          <ErrorState
            title="Weitere Episoden konnten nicht geladen werden."
            description="Die bereits geladenen Episoden bleiben sichtbar."
            action={<Button variant="secondary" onClick={() => void windowing.retryNext()}>Erneut versuchen</Button>}
          />
        </div>
      ) : null}
      {windowing.showEndMarker ? <EmptyState variant="inline" title="Das waren alle Episoden." /> : null}
    </section>
  )
}
