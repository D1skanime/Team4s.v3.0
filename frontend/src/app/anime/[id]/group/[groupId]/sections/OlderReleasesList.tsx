'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { Button, Card, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseListCursor } from '@/lib/api'
import type { EpisodeReleaseSummary } from '@/types/group'

import styles from './OlderReleasesList.module.css'

interface OlderReleasesListProps {
  animeID: number
  groupID: number
  /** release_version_id des bereits eingebetteten neuesten Release (AO4-11) — wird hier ausgeblendet. */
  excludeReleaseVersionId: number
}

const PAGE_LIMIT = 10

function releaseLabel(episode: EpisodeReleaseSummary): string {
  return episode.title?.trim() || `Episode ${episode.episode_number}`
}

/**
 * AO4-12: kompakte Liste aelterer Releases (alle ausser dem eingebetteten neuesten),
 * nachgeladen ueber Seek-Cursor-Pagination (AO4-03/AO4-24). Automatisches Nachladen
 * per IntersectionObserver UND manueller "Mehr laden"-Button als Fallback (AO4-25).
 * Kein Bilder-/Text-Overload pro Eintrag — nur Name/Episode, Bild-/Text-Anzahl, Link.
 */
export function OlderReleasesList({ animeID, groupID, excludeReleaseVersionId }: OlderReleasesListProps) {
  const [items, setItems] = useState<EpisodeReleaseSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadTriggerRef = useRef<HTMLDivElement | null>(null)

  const loadPage = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true)
      setError(null)
      try {
        const page = await getGroupReleaseListCursor(animeID, groupID, {
          cursor: nextCursor ?? undefined,
          limit: PAGE_LIMIT,
        })
        setItems((prev) => (nextCursor ? [...prev, ...page.items] : page.items))
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Weitere Releases konnten nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    },
    [animeID, groupID],
  )

  // Initial load (AO4-12: erste Seite via initialem Cursor-Aufruf).
  useEffect(() => {
    loadPage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeID, groupID])

  // Automatisches Nachladen (AO4-21: Infinite Scroll ausschliesslich hier).
  useEffect(() => {
    if (!hasMore || loading || !cursor) return

    const callback: IntersectionObserverCallback = (entries) => {
      const [entry] = entries
      if (entry.isIntersecting) loadPage(cursor)
    }

    observerRef.current = new IntersectionObserver(callback, { rootMargin: '200px' })
    if (loadTriggerRef.current) observerRef.current.observe(loadTriggerRef.current)

    return () => observerRef.current?.disconnect()
  }, [cursor, hasMore, loading, loadPage])

  const visibleItems = items.filter((item) => item.id !== excludeReleaseVersionId)
  const showSkeleton = loading && items.length === 0

  return (
    <div id="weitere-releases" className={styles.section}>
      <SectionHeader title="Weitere Releases" />

      {error ? <p className={styles.error}>{error}</p> : null}

      {showSkeleton ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className={styles.skeletonRow} aria-hidden="true" />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {visibleItems.map((episode) => (
            <Card key={episode.id} variant="flat" className={styles.row}>
              <div className={styles.rowMain}>
                <Link href={`/anime/${animeID}/group/${groupID}/releases/${episode.id}`} className={styles.rowTitle}>
                  {releaseLabel(episode)}
                </Link>
                {episode.version_label ? <span className={styles.rowMeta}>{episode.version_label}</span> : null}
              </div>
              <div className={styles.rowCounts}>
                <span>{episode.images_count ?? 0} Bilder</span>
                <span>{episode.notes_count ?? 0} Texte</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className={styles.loadMoreRow}>
          <div ref={loadTriggerRef} className={styles.loadTrigger} aria-hidden="true" />
          <Button variant="secondary" size="sm" onClick={() => loadPage(cursor)} loading={loading && items.length > 0}>
            Mehr laden
          </Button>
        </div>
      ) : null}
    </div>
  )
}
