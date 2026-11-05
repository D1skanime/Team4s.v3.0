'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Heading } from '@/components/ui/Heading'
import { LoadingState } from '@/components/ui/LoadingState'
import { Stack, type StackGapPurpose } from '@/components/ui/Stack'
import { classNames } from '@/components/ui/classNames'

import { PublicGroupedEpisode, PublicEpisodeVersion, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import { EpisodeGlassCard } from './EpisodeGlassCard'
import { resolveEpisodeTitle } from './episodePreviewFormat'
import { FansubGroupContext } from './FansubGroupContext'
import { FansubGroupPicker } from './FansubGroupPicker'
import { ReleasePreviewRow } from './ReleasePreviewRow'
import {
  resolveActiveFansubGroupID, resolveGroupSlugForFetch, toggleEpisodeExpansion, useFansubGroupSwitch,
} from './useFansubGroupSwitch'
import { useWindowedEpisodePages, type WindowedPage } from './useWindowedEpisodePages'
import { AnimeFansubRelation, FansubGroupSummary } from '@/types/fansub'

import styles from './FansubVersionBrowser.module.css'

type Pagination = PublicGroupedEpisodesResponse['data']['pagination']

// D-44: ein einzelner, ueberschriebener sessionStorage-Eintrag pro exaktem pathname+search --
// kein Verlauf, keine unbegrenzte Persistenz, kein Reset des Windowing-Zustands (T-164-10).
const SCROLL_HINT_STORAGE_PREFIX = 'team4s:episodeScroll:'

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
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<number, true>>({})

  // D-02: bei genau einer Gruppe wird der URL-Parameter ignoriert -- die Gruppe ist immer aktiv.
  // Dieser Seed-Wert speist NUR den initialen Fetch-Filter von useWindowedEpisodePages (deren
  // interner Ref nur beim allerersten Mount gelesen wird) -- der laufend aktuelle
  // Gruppenzustand lebt danach ausschließlich in useFansubGroupSwitch weiter unten.
  const initialSelectedSlug = fansubOptions.length === 1 ? null : (initialActiveSlug ?? null)
  const initialActiveFansubGroupID = resolveActiveFansubGroupID(fansubOptions, initialSelectedSlug)
  const initialActiveSlugForWindowing = initialActiveFansubGroupID !== null
    ? fansubOptions.find((relation) => relation.fansub_group?.id === initialActiveFansubGroupID)?.fansub_group?.slug ?? null
    : null

  const windowing = useWindowedEpisodePages({
    animeID,
    initialEpisodes: episodes,
    initialPagination: pagination,
    activeFansubSlug: initialActiveSlugForWindowing,
    initialEpisodeCount: episodeCount,
  })

  const {
    selectedSlug, setSelectedSlug, switchState, activeFansubGroupID, updateFansubSelection, switchTo,
  } = useFansubGroupSwitch({ fansubOptions, initialActiveSlug, resetForFilter: windowing.resetForFilter })

  const activeGroup = activeFansubGroupID !== null
    ? fansubOptions.find((relation) => relation.fansub_group?.id === activeFansubGroupID)?.fansub_group ?? null
    : null

  // D-34: eine Rueckwaerts-Wiederherstellung liefert ein Delta -- vor dem naechsten Paint per
  // scrollBy ausgleichen, damit der sichtbare Inhalt nicht sichtbar springt.
  useLayoutEffect(() => {
    if (!windowing.scrollAnchorAdjustment || windowing.scrollAnchorAdjustment.px === 0) return
    if (typeof window === 'undefined') return
    window.scrollBy(0, windowing.scrollAnchorAdjustment.px)
  }, [windowing.scrollAnchorAdjustment])

  const hasAnyEpisodes = windowing.pages.some((page) => page.episodes.length > 0)

  // D-44: auf einer echten Browser-Zurueck/Vor-Navigation (Navigation Timing API, kein neues
  // Paket) zur selben URL eine zuvor gespeicherte, ungefaehre Scrollposition wiederherstellen --
  // NICHT das mehrseitige DOM-Fenster (das bleibt bewusst bei Page 1 der frischen Navigation,
  // 164-05). Auf einem normalen Erstaufruf wird kein Hinweis gelesen oder angewendet. Der
  // Schreibpfad ist zeitstempel-gedrosselt (kein Schreiben pro Scroll-Pixel) und ueberschreibt
  // stets denselben Schluessel -- kein wachsender Verlauf.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const scrollKey = SCROLL_HINT_STORAGE_PREFIX + window.location.pathname + window.location.search
    const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const isBackForwardNavigation = navigationEntry?.type === 'back_forward'
    if (isBackForwardNavigation && hasAnyEpisodes) {
      const storedOffset = window.sessionStorage.getItem(scrollKey)
      if (storedOffset !== null) {
        const y = Number(storedOffset)
        if (Number.isFinite(y)) window.scrollTo(0, y)
      }
    }
    let lastWriteAt = 0
    function handleScroll() {
      const now = Date.now()
      if (now - lastWriteAt < 250) return
      lastWriteAt = now
      window.sessionStorage.setItem(scrollKey, String(window.scrollY))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasAnyEpisodes])

  // D-01/D-03: die URL ist die einzige Quelle des Gruppenkontexts. Browser Zurueck/Vor
  // liest den Parameter erneut und loest -- anders als bei 162 -- immer neu (D-09).
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)
      const rawSlug = params.get('fansub')
      setSelectedSlug(rawSlug)
      void switchTo(resolveGroupSlugForFetch(fansubOptions, rawSlug))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleEpisode(episodeNumber: number) {
    setExpandedEpisodes((current) => toggleEpisodeExpansion(current, episodeNumber))
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

  // Die drei Geschwister-Blöcke dieses Bausteins
  // (Überschrift, optionale Gruppen-Auswahl/-Kontext, Episoden-Inhalt) haben JE NACH realer
  // Render-Verzweigung unterschiedlich viele tatsächlich sichtbare Kinder (0, 1 oder 2
  // zusätzliche Blöcke zwischen Überschrift und Inhalt) -- ein Rhythmus-Array-Stack kann nur
  // EXAKT so viele Lücken-Werte tragen, wie tatsächlich Kinder vorhanden sind. Die drei vormals
  // über drei verschiedene Dateien verstreuten lokalen margin-Deklarationen (`.section`s
  // margin-top hier, `.wrapper`s margin-bottom in FansubGroupPicker, `.card`s margin-bottom in
  // FansubGroupContext) werden deshalb GEMEINSAM durch genau diese eine Lücken-Liste ersetzt,
  // statt durch drei eigenständige, unkoordinierte Werte.
  const contentColumnChildren: ReactNode[] = [
    <Heading key="heading" level={2} tone="onScrim">Episoden ({windowing.episodeCount})</Heading>,
  ]
  const contentColumnGaps: StackGapPurpose[] = []

  if (fansubOptions.length > 0) {
    // Überschrift hat margin:0 -- zwischen ihr und der Gruppen-Auswahl war nie ein Abstand
    // vorgesehen (gemessen: 0px), deshalb 'none' statt eines erfundenen Werts.
    contentColumnGaps.push('none')
    contentColumnChildren.push(
      <FansubGroupPicker
        key="picker"
        options={fansubOptions.map((relation) => relation.fansub_group!)}
        activeGroupId={activeFansubGroupID}
        showAllChip={showAllChip}
        onSelect={updateFansubSelection}
      />,
    )

    if (activeGroup) {
      // Gruppen-Auswahl -> Gruppen-Kontext: deckt sich wert- und zweckgleich mit dem bereits
      // bestehenden 'primaryContentBlocks' (24px, vormals FansubGroupPickers eigenes
      // .wrapper-margin-bottom).
      contentColumnGaps.push('primaryContentBlocks')
      contentColumnChildren.push(<FansubGroupContext key="context" activeGroup={activeGroup} animeSlug={animeSlug} />)
      // Gruppen-Kontext -> Episoden-Inhalt: 'supportingBlockToContent' (16px,
      // vormals FansubGroupContexts eigenes .card-margin-bottom).
      contentColumnGaps.push('supportingBlockToContent')
    } else {
      // Keine aktive Gruppe (z. B. "Alle" ausgewählt) -- die Gruppen-Auswahl ist dann das letzte
      // unterstützende Element vor dem Inhalt, behält aber denselben 24px-Abstand wie zu einem
      // Gruppen-Kontext (gemessen: identischer Wert in beiden Fällen, da er von der Gruppen-
      // Auswahl selbst ausgeht, nicht vom jeweils folgenden Element).
      contentColumnGaps.push('primaryContentBlocks')
    }
  } else {
    // Keine Fansub-Gruppen vorhanden -- Überschrift und Inhalt sind direkte Nachbarn, ebenfalls
    // ohne zusätzlichen Abstand (dieselbe 0px-Überschriften-Regel wie oben).
    contentColumnGaps.push('none')
  }

  contentColumnChildren.push(
    // D-31/D-35/Episoden-Inhalt als EIN stabiler Stack-Kindknoten (Fragmente sind für Stacks
    // Lücken-Mechanik kein gültiges Einzelkind): Fehlerzustand, oberer Sentinel, Rückwärts-
    // Lade-/Fehlerzustände, Leer-/Listenzustand, unterer Sentinel, Vorwärts-Lade-/Fehlerzustände
    // und Ende-Markierung bleiben untereinander exakt in ihrer bisherigen, abstandslosen Reihenfolge
    // -- diese Gruppierung ändert nur die STRUKTUR (ein gemeinsamer Wrapper), nicht den Abstand.
    <div key="content">
      {switchState.error ? (
        <ErrorState
          title="Episoden konnten nicht geladen werden."
          description={switchState.error}
          action={
            <Button variant="secondary" onClick={() => void switchTo(resolveGroupSlugForFetch(fansubOptions, selectedSlug))}>
              Erneut versuchen
            </Button>
          }
        />
      ) : null}

      {/* D-31/D-35: der obere Sentinel und die rückwärts-Lade-/Fehlerzustände sind unabhängig
          davon sichtbar, ob die aktuelle Page (noch) Episoden enthält -- analog zum vormaligen
          "Weitere laden"-Button, der ebenfalls außerhalb der Leer-/Listen-Verzweigung stand.
          Die 1px-Sentinel-Höhe ist eine technische IntersectionObserver-Ankerfläche, kein
          Layout-/Abstands-Wert -- deshalb Inline-Stil statt einer CSS-Modul-Klasse (dieselbe
          Konvention wie der Windowing-Platzhalter weiter unten, `style={{ height: heightPx }}`). */}
      <div ref={windowing.topSentinelRef} aria-hidden="true" data-testid="top-sentinel" style={{ height: '1px' }} />
      {windowing.backwardLoading ? <LoadingState compact title="Frühere Episoden werden geladen …" /> : null}
      {windowing.backwardError ? (
        <ErrorState
          title="Frühere Episoden konnten nicht geladen werden."
          description="Die bereits geladenen Episoden bleiben sichtbar."
          action={<Button variant="secondary" onClick={() => void windowing.retryPrevious()}>Erneut versuchen</Button>}
        />
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
        <Stack
          as="ul"
          gap="independentBlocks"
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
        </Stack>
      )}

      <div ref={windowing.bottomSentinelRef} aria-hidden="true" data-testid="bottom-sentinel" style={{ height: '1px' }} />
      {windowing.forwardLoading ? <LoadingState compact title="Weitere Episoden werden geladen …" /> : null}
      {windowing.forwardError ? (
        <ErrorState
          title="Weitere Episoden konnten nicht geladen werden."
          description="Die bereits geladenen Episoden bleiben sichtbar."
          action={<Button variant="secondary" onClick={() => void windowing.retryNext()}>Erneut versuchen</Button>}
        />
      ) : null}
      {windowing.showEndMarker ? <EmptyState variant="inline" title="Das waren alle Episoden." /> : null}
    </div>,
  )

  return (
    // D-12: die Trefferzahl kommt aus dem Client-Zustand, aktualisiert sich bei jedem Wechsel.
    // tone="onScrim" (an der Überschrift) macht die Lesbarkeit auf der dunklen .episodesSection-
    // Fläche explizit (statt sich auf die seiteneigene `.episodesSection h2`-Regel zu verlassen,
    // die zufällig dieselbe helle Farbe über das rendernde <h2>-Element erzwingt) -- Heading
    // rendert für `level={2}` ein echtes <h2>, die bestehende Selektor-/Größen-/Abstand-Regel in
    // page.episodes.module.css bleibt deshalb unverändert gültig. Der vormalige
    // Card-Rand-zu-Überschrift-Abstand (16px roh, `.section`s margin-top) wurde NICHT ersatzlos
    // gestrichen, sondern in Cards eigene 'section'-Polsterungsstufe verschoben (siehe
    // layout.css-Kommentar bei --card-padding-section) -- dieser Abstand liegt VOR der
    // Überschrift, eine Stack-Lücke kann aber nur ZWISCHEN Kindern wirken, nie davor.
    <Stack as="section" gap={contentColumnGaps}>
      {contentColumnChildren}
    </Stack>
  )
}
