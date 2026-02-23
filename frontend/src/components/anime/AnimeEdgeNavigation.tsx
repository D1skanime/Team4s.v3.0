'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getAnimeList } from '@/lib/api'
import {
  buildAnimeDetailHref,
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

function getStatusLabel(status: AnimeListItem['status']): string {
  if (status === 'ongoing') return 'laufend'
  if (status === 'done') return 'abgeschlossen'
  if (status === 'licensed') return 'lizenziert'
  if (status === 'aborted') return 'abgebrochen'
  return status
}

export function AnimeEdgeNavigation({ currentAnimeID, gridQuery }: AnimeEdgeNavigationProps) {
  const router = useRouter()
  const [previousAnime, setPreviousAnime] = useState<AnimeListItem | null>(null)
  const [nextAnime, setNextAnime] = useState<AnimeListItem | null>(null)
  const [hoverDirection, setHoverDirection] = useState<Direction | null>(null)
  const [loadingDirection, setLoadingDirection] = useState<Direction | null>(null)

  const gridParams = useMemo(() => parseAnimeListParamsFromGridQuery(gridQuery), [gridQuery])
  const previewAnime = hoverDirection === 'prev' ? previousAnime : hoverDirection === 'next' ? nextAnime : null

  useEffect(() => {
    let cancelled = false

    async function loadNeighbors() {
      if (!gridParams) {
        setPreviousAnime(null)
        setNextAnime(null)
        return
      }

      try {
        const currentPage = gridParams.page ?? 1
        const currentResponse = await getAnimeList(gridParams)
        if (cancelled) return

        const items = currentResponse.data
        const currentIndex = items.findIndex((item) => item.id === currentAnimeID)
        if (currentIndex < 0) {
          setPreviousAnime(null)
          setNextAnime(null)
          return
        }

        let prev = currentIndex > 0 ? items[currentIndex - 1] : null
        let next = currentIndex < items.length - 1 ? items[currentIndex + 1] : null

        if (!prev && currentPage > 1) {
          const prevPageResponse = await getAnimeList({
            ...gridParams,
            page: currentPage - 1,
          })
          if (cancelled) return
          if (prevPageResponse.data.length > 0) {
            prev = prevPageResponse.data[prevPageResponse.data.length - 1]
          }
        }

        if (!next && currentPage < currentResponse.meta.total_pages) {
          const nextPageResponse = await getAnimeList({
            ...gridParams,
            page: currentPage + 1,
          })
          if (cancelled) return
          if (nextPageResponse.data.length > 0) {
            next = nextPageResponse.data[0]
          }
        }

        setPreviousAnime(prev)
        setNextAnime(next)
      } catch {
        if (!cancelled) {
          setPreviousAnime(null)
          setNextAnime(null)
        }
      }
    }

    void loadNeighbors()

    return () => {
      cancelled = true
    }
  }, [currentAnimeID, gridParams])

  if (!previousAnime && !nextAnime) {
    return null
  }

  function handleNavigate(direction: Direction) {
    if (loadingDirection) return

    const target = direction === 'prev' ? previousAnime : nextAnime
    if (!target) return

    setLoadingDirection(direction)
    router.push(buildAnimeDetailHref(target.id, gridQuery), { scroll: true })
  }

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.navButton}
        onMouseEnter={() => previousAnime && setHoverDirection('prev')}
        onMouseLeave={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
        onFocus={() => previousAnime && setHoverDirection('prev')}
        onBlur={() => setHoverDirection((current) => (current === 'prev' ? null : current))}
        onClick={() => handleNavigate('prev')}
        disabled={!previousAnime || loadingDirection !== null}
        aria-label="Vorheriger Anime"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        type="button"
        className={styles.navButton}
        onMouseEnter={() => nextAnime && setHoverDirection('next')}
        onMouseLeave={() => setHoverDirection((current) => (current === 'next' ? null : current))}
        onFocus={() => nextAnime && setHoverDirection('next')}
        onBlur={() => setHoverDirection((current) => (current === 'next' ? null : current))}
        onClick={() => handleNavigate('next')}
        disabled={!nextAnime || loadingDirection !== null}
        aria-label="Naechster Anime"
      >
        <ChevronRight size={22} />
      </button>

      {previewAnime ? (
        <div className={`${styles.previewCard} ${hoverDirection === 'prev' ? styles.previewLeft : styles.previewRight}`}>
          <Image
            src={getCoverUrl(previewAnime.cover_image)}
            alt={previewAnime.title}
            width={66}
            height={92}
            className={styles.previewCover}
          />
          <div className={styles.previewMeta}>
            <p className={styles.previewTitle}>{previewAnime.title}</p>
            <p className={styles.previewState}>#{previewAnime.id} - {getStatusLabel(previewAnime.status)}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
