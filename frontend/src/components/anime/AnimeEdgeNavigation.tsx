'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AdjacentNavigation, Card, Cluster, ResponsiveImage, Text, type AdjacentNavigationItem } from '@/components/ui'
import { parseAnimeListParamsFromGridQuery, resolveAnimeNeighbors, type AnimeNeighbors } from '@/lib/animeGridContext'

import { useAnimeEdgeNavigationHover, type EdgeNavigationDirection } from './useAnimeEdgeNavigationHover'
import styles from './AnimeEdgeNavigation.module.css'

interface AnimeEdgeNavigationProps {
  currentAnimeID: number
  gridQuery: string
  /** Serverseitig bereits aufgelöste Navigations-Ziele (Befund 19) -- die Links selbst stehen
   *  dadurch sofort im HTML, unabhängig vom clientseitigen Vorschaukarten-Ladevorgang unten. */
  previous: AdjacentNavigationItem | null
  next: AdjacentNavigationItem | null
}

function getTypeLabel(type: string): string {
  const lower = type.toLowerCase()
  if (lower === 'tv') return 'TV'
  if (lower === 'movie') return 'Movie'
  if (lower === 'ova') return 'OVA'
  if (lower === 'ona') return 'ONA'
  if (lower === 'special') return 'Special'
  if (lower === 'music') return 'Music'
  return type
}

export function AnimeEdgeNavigation(props: AnimeEdgeNavigationProps) {
  return <AnimeEdgeNavigationContext key={`${props.currentAnimeID}:${props.gridQuery}`} {...props} />
}

/**
 * Rendert die Randnavigations-Links sofort aus den serverseitig aufgelösten `previous`/`next`-
 * Props (Befund 19 -- die hrefs stehen dadurch bereits im Server-HTML, unabhängig von jeder
 * Client-Hydration). Der eigene `getAnimeList`-Aufruf über `resolveAnimeNeighbors` bleibt
 * ausschließlich für die Hover-Vorschaukarte (Bild/Titel/Typ) erhalten -- er bestimmt NICHT
 * mehr, ob/wohin die Navigations-Buttons zeigen.
 */
function AnimeEdgeNavigationContext({ currentAnimeID, gridQuery, previous, next }: AnimeEdgeNavigationProps) {
  const [neighbors, setNeighbors] = useState<AnimeNeighbors | null>(null)
  const requestRef = useRef<{ controller: AbortController; promise: Promise<AnimeNeighbors | null> } | null>(null)
  const gridParams = useMemo(() => parseAnimeListParamsFromGridQuery(gridQuery), [gridQuery])
  // Hover-/Fokus-Vorschauzustand lebt in einem eigenen, direkt testbaren Hook (Befund C) --
  // diese Komponente bleibt ein reiner Konsument der daraus abgeleiteten Vorschau-Werte.
  const { hoverDirection, previewAnime, previewCoverUrl, handlersFor } = useAnimeEdgeNavigationHover(neighbors)

  useEffect(() => () => { requestRef.current?.controller.abort() }, [])

  function loadNeighbors(): Promise<AnimeNeighbors | null> {
    if (!gridParams) return Promise.resolve(null)
    // Retain a successful promise for this route context. All actual interactions
    // share it, including a click that arrives during a slow hover request.
    if (requestRef.current) return requestRef.current.promise
    const controller = new AbortController()
    const promise = (async (): Promise<AnimeNeighbors | null> => {
      try {
        const result = await resolveAnimeNeighbors(gridParams, currentAnimeID, { signal: controller.signal })
        if (controller.signal.aborted) return null
        setNeighbors(result)
        return result
      } catch {
        if (!controller.signal.aborted && requestRef.current?.controller === controller) {
          requestRef.current = null
        }
        return null
      }
    })()
    requestRef.current = { controller, promise }
    return promise
  }

  useEffect(() => {
    if (gridParams) void loadNeighbors()
    // Die Route wird über den äußeren key neu gemountet; dadurch gehört der Vorabladevorgang
    // immer zu genau einem Grid-Kontext und benötigt keinen zweiten lokalen Zustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Ergänzt ein serverseitig bereits vollständiges Navigations-Item nur um die fünf
   *  Hover-/Fokus-Handler, die die client-seitige Vorschaukarte steuern -- href/label/ariaLabel
   *  selbst kommen unverändert vom Server, damit sie synchron im ersten Render stehen. */
  function withPreviewHandlers(item: AdjacentNavigationItem | null, direction: EdgeNavigationDirection): AdjacentNavigationItem | null {
    if (!item) return null
    return { ...item, ...handlersFor(direction) }
  }

  const previousItem = withPreviewHandlers(previous, 'prev')
  const nextItem = withPreviewHandlers(next, 'next')

  return (
    <>
      <AdjacentNavigation previous={previousItem} next={nextItem} variant="floating" ariaLabel="Anime-Navigation" />
      {previewAnime ? (
        <Card
          variant="glassStrong"
          padding="content"
          className={`${styles.previewCard} ${hoverDirection === 'prev' ? styles.previewLeft : styles.previewRight}`}
        >
          {/* Cluster statt eines eigenen display:flex -- align="stretch" reproduziert die
              bisherige, implizite Standard-Querachsen-Ausrichtung (Flex ohne align-items setzt
              den Browser-Standard "stretch", Clusters eigener Standard waere dagegen "center"). */}
          <Cluster gap="mediaCaption" align="stretch" wrap={false}>
            <ResponsiveImage src={previewCoverUrl} alt={previewAnime.title} width={66} height={92} className={styles.previewCover} unoptimized />
            <div className={styles.previewMeta}>
              <Text tone="onScrim" className={styles.previewTitle}>{previewAnime.title}</Text>
              <Text variant="small" tone="onScrim" className={styles.previewType}>{getTypeLabel(previewAnime.type)}</Text>
            </div>
          </Cluster>
        </Card>
      ) : null}
    </>
  )
}
