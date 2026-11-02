'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AdjacentNavigation, Card, ResponsiveImage, Text, type AdjacentNavigationItem } from '@/components/ui'
import { getAnimeList } from '@/lib/api'
import {
  buildAnimeDetailHref,
  buildAnimeGridQuery,
  parseAnimeListParamsFromGridQuery,
} from '@/lib/animeGridContext'
import { getCoverUrl } from '@/lib/utils'
import { AnimeListItem } from '@/types/anime'

import styles from './AnimeEdgeNavigation.module.css'

type Direction = 'prev' | 'next'

interface AnimeEdgeNavigationProps {
  currentAnimeID: number
  gridQuery: string
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

interface NeighborTarget { anime: AnimeListItem; page: number }
interface Neighbors { prev: NeighborTarget | null; next: NeighborTarget | null }

export function AnimeEdgeNavigation(props: AnimeEdgeNavigationProps) {
  return <AnimeEdgeNavigationContext key={`${props.currentAnimeID}:${props.gridQuery}`} {...props} />
}

function AnimeEdgeNavigationContext({ currentAnimeID, gridQuery }: AnimeEdgeNavigationProps) {
  const [neighbors, setNeighbors] = useState<Neighbors | null>(null)
  const [hoverDirection, setHoverDirection] = useState<Direction | null>(null)
  const requestRef = useRef<{ controller: AbortController; promise: Promise<Neighbors | null> } | null>(null)
  const gridParams = useMemo(() => parseAnimeListParamsFromGridQuery(gridQuery), [gridQuery])
  const previousAnime = neighbors?.prev?.anime ?? null
  const nextAnime = neighbors?.next?.anime ?? null
  const previewAnime = hoverDirection === 'prev' ? previousAnime : hoverDirection === 'next' ? nextAnime : null
  const previewCoverUrl = previewAnime ? getCoverUrl(previewAnime.cover_image) : ''

  useEffect(() => () => { requestRef.current?.controller.abort() }, [])

  function loadNeighbors(): Promise<Neighbors | null> {
    if (!gridParams) return Promise.resolve(null)
    // Retain a successful promise for this route context. All actual interactions
    // share it, including a click that arrives during a slow hover request.
    if (requestRef.current) return requestRef.current.promise
    const controller = new AbortController()
    const currentPage = gridParams.page ?? 1
    const promise = (async (): Promise<Neighbors | null> => {
      try {
        const current = await getAnimeList(gridParams, { signal: controller.signal })
        if (controller.signal.aborted) return null
        const index = current.data.findIndex((anime) => anime.id === currentAnimeID)
        const result: Neighbors = { prev: null, next: null }
        if (index >= 0) {
          if (index > 0) result.prev = { anime: current.data[index - 1], page: currentPage }
          else if (currentPage > 1) {
            const previous = await getAnimeList({ ...gridParams, page: currentPage - 1 }, { signal: controller.signal })
            if (controller.signal.aborted) return null
            const anime = previous.data[previous.data.length - 1]
            if (anime) result.prev = { anime, page: currentPage - 1 }
          }
          if (index < current.data.length - 1) result.next = { anime: current.data[index + 1], page: currentPage }
          else if (currentPage < current.meta.total_pages) {
            const next = await getAnimeList({ ...gridParams, page: currentPage + 1 }, { signal: controller.signal })
            if (controller.signal.aborted) return null
            if (next.data[0]) result.next = { anime: next.data[0], page: currentPage + 1 }
          }
        }
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

  if (!gridParams) return null

  function itemFor(direction: Direction): AdjacentNavigationItem | null {
    const target = neighbors?.[direction]
    if (!target) return null
    const isPrevious = direction === 'prev'
    return {
      href: buildAnimeDetailHref(target.anime.id, buildAnimeGridQuery({ ...gridParams, page: target.page })),
      label: isPrevious ? 'Zurück' : 'Weiter',
      ariaLabel: `${isPrevious ? 'Vorheriger' : 'Nächster'} Anime: ${target.anime.title}`,
      onMouseEnter: () => setHoverDirection(direction),
      onMouseLeave: () => setHoverDirection((current) => (current === direction ? null : current)),
      onFocus: () => setHoverDirection(direction),
      onBlur: () => setHoverDirection((current) => (current === direction ? null : current)),
      onTouchStart: () => setHoverDirection(direction),
    }
  }

  const previous = itemFor('prev')
  const next = itemFor('next')

  return (
    <>
      <AdjacentNavigation previous={previous} next={next} variant="floating" ariaLabel="Anime-Navigation" />
      {previewAnime ? (
        <Card variant="glassStrong" className={`${styles.previewCard} ${hoverDirection === 'prev' ? styles.previewLeft : styles.previewRight}`}>
          <ResponsiveImage src={previewCoverUrl} alt={previewAnime.title} width={66} height={92} className={styles.previewCover} unoptimized />
          <div className={styles.previewMeta}>
            <Text tone="onScrim" className={styles.previewTitle}>{previewAnime.title}</Text>
            <Text variant="small" tone="onScrim" className={styles.previewType}>{getTypeLabel(previewAnime.type)}</Text>
          </div>
        </Card>
      ) : null}
    </>
  )
}
