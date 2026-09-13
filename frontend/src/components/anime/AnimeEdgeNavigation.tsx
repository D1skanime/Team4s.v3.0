'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getAnimeList } from '@/lib/api'
import {
  buildAnimeDetailHref,
  buildAnimeGridQuery,
  parseAnimeListParamsFromGridQuery,
} from '@/lib/animeGridContext'
import { getCoverUrl, shouldUseUnoptimizedImage } from '@/lib/utils'
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
  const router = useRouter()
  const [neighbors, setNeighbors] = useState<Neighbors | null>(null)
  const [hoverDirection, setHoverDirection] = useState<Direction | null>(null)
  const [loadingDirection, setLoadingDirection] = useState<Direction | null>(null)
  const requestRef = useRef<{ controller: AbortController; promise: Promise<Neighbors | null> } | null>(null)
  const navigationRef = useRef(false)
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

  if (!gridParams) return null

  async function handleNavigate(direction: Direction) {
    if (navigationRef.current || !gridParams) return
    navigationRef.current = true
    setLoadingDirection(direction)
    const pending = loadNeighbors()
    const request = requestRef.current
    const result = await pending
    if (!request || request.controller.signal.aborted) return
    const target = result?.[direction]
    if (!target) {
      navigationRef.current = false
      setLoadingDirection(null)
      return
    }
    const targetQuery = buildAnimeGridQuery({ ...gridParams, page: target.page })
    router.push(buildAnimeDetailHref(target.anime.id, targetQuery), { scroll: true })
  }

  return (
    <>
      {/* Left button wrapper */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={styles.navButton}
          onMouseEnter={() => {
            void loadNeighbors()
            setHoverDirection('prev')
          }}
          onMouseLeave={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
          onFocus={() => {
            void loadNeighbors()
            setHoverDirection('prev')
          }}
          onTouchStart={() => {
            void loadNeighbors()
          }}
          onBlur={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
          onClick={() => void handleNavigate('prev')}
          disabled={(neighbors !== null && !previousAnime) || loadingDirection !== null}
          aria-label="Vorheriger Anime"
        >
          <ChevronLeft size={22} />
          <span>Zurück</span>
        </button>
        {previewAnime && hoverDirection === 'prev' ? (
          <div className={`${styles.previewCard} ${styles.previewLeft}`}>
            <Image
              src={previewCoverUrl}
              alt={previewAnime.title}
              width={66}
              height={92}
              className={styles.previewCover}
              unoptimized={shouldUseUnoptimizedImage(previewCoverUrl)}
            />
            <div className={styles.previewMeta}>
              <p className={styles.previewTitle}>{previewAnime.title}</p>
              <p className={styles.previewType}>{getTypeLabel(previewAnime.type)}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right button wrapper */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={styles.navButton}
          onMouseEnter={() => {
            void loadNeighbors()
            setHoverDirection('next')
          }}
          onMouseLeave={() => setHoverDirection((current) => (current === 'next' ? null : current))}
          onFocus={() => {
            void loadNeighbors()
            setHoverDirection('next')
          }}
          onTouchStart={() => {
            void loadNeighbors()
          }}
          onBlur={() => setHoverDirection((current) => (current === 'next' ? null : current))}
          onClick={() => void handleNavigate('next')}
          disabled={(neighbors !== null && !nextAnime) || loadingDirection !== null}
          aria-label="Nächster Anime"
        >
          <span>Weiter</span>
          <ChevronRight size={22} />
        </button>
        {previewAnime && hoverDirection === 'next' ? (
          <div className={`${styles.previewCard} ${styles.previewRight}`}>
            <Image
              src={previewCoverUrl}
              alt={previewAnime.title}
              width={66}
              height={92}
              className={styles.previewCover}
              unoptimized={shouldUseUnoptimizedImage(previewCoverUrl)}
            />
            <div className={styles.previewMeta}>
              <p className={styles.previewTitle}>{previewAnime.title}</p>
              <p className={styles.previewType}>{getTypeLabel(previewAnime.type)}</p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
