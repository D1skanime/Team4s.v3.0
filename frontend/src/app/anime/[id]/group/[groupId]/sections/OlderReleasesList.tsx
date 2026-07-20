'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import fansubSurfaceStyles from '@/app/fansubs/[slug]/page.module.css'
import { Button, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseListCursor } from '@/lib/api'
import type { EpisodeReleaseSummary } from '@/types/group'

import { sortReleasesByEpisodeNumberAscending, useIsMobileReleasesList } from './OlderReleasesList.helpers'
import styles from './OlderReleasesList.module.css'
import { DesktopReleaseRow, MobileDirectReleaseRow, MobileKaraReleaseRow } from './OlderReleasesList.rows'

interface OlderReleasesListProps {
  animeID: number
  groupID: number
  canonicalProjectPath?: string | null
}

const INITIAL_LIMIT = 5
const PAGE_LIMIT = 10

export function OlderReleasesList({ animeID, groupID, canonicalProjectPath }: OlderReleasesListProps) {
  const [items, setItems] = useState<EpisodeReleaseSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadTriggerRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobileReleasesList()

  const loadPage = useCallback(async (nextCursor: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const page = await getGroupReleaseListCursor(animeID, groupID, {
        cursor: nextCursor ?? undefined,
        limit: nextCursor ? PAGE_LIMIT : INITIAL_LIMIT,
      })
      setItems((previous) => nextCursor ? [...previous, ...page.items] : page.items)
      setCursor(page.next_cursor)
      setHasMore(page.has_more)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Releases konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [animeID, groupID])

  useEffect(() => {
    void loadPage(null)
  }, [loadPage])

  useEffect(() => {
    if (!hasMore || loading || !cursor) return
    const callback: IntersectionObserverCallback = ([entry]) => {
      if (entry.isIntersecting) void loadPage(cursor)
    }
    observerRef.current = new IntersectionObserver(callback, { rootMargin: '200px' })
    if (loadTriggerRef.current) observerRef.current.observe(loadTriggerRef.current)
    return () => observerRef.current?.disconnect()
  }, [cursor, hasMore, loading, loadPage])

  const sortedItems = useMemo(() => sortReleasesByEpisodeNumberAscending(items), [items])
  return (
    <div id="weitere-releases" className={styles.section}>
      <SectionHeader title="Alle Releases" underline />
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading && items.length === 0 ? (
        <div className={styles.list}>
          {Array.from({ length: INITIAL_LIMIT }).map((_, index) => (
            <div key={`skeleton-${index}`} className={styles.skeletonRow} aria-hidden="true" />
          ))}
        </div>
      ) : (
        <section
          className={`${styles.list} ${fansubSurfaceStyles.heroCard} ${styles.releaseGlassCard}`}
          data-testid="release-list-glass-card"
        >
          {isMobile ? (
            <div className={styles.mobileList}>
              {sortedItems.map((episode) => {
                const hasKaras = (episode.timeline_segments?.length ?? 0) > 0
                return hasKaras ? (
                  <MobileKaraReleaseRow
                    key={episode.id}
                    animeID={animeID}
                    groupID={groupID}
                    episode={episode}
                    canonicalProjectPath={canonicalProjectPath}
                  />
                ) : (
                  <MobileDirectReleaseRow
                    key={episode.id}
                    animeID={animeID}
                    groupID={groupID}
                    episode={episode}
                    canonicalProjectPath={canonicalProjectPath}
                  />
                )
              })}
            </div>
          ) : (
            <div className={styles.timelinePreview}>
              {sortedItems.map((episode) => (
                <DesktopReleaseRow
                  key={episode.id}
                  animeID={animeID}
                  groupID={groupID}
                  episode={episode}
                  canonicalProjectPath={canonicalProjectPath}
                />
              ))}
            </div>
          )}
        </section>
      )}
      {hasMore ? (
        <div className={styles.loadMoreRow}>
          <div ref={loadTriggerRef} className={styles.loadTrigger} aria-hidden="true" />
          <Button variant="secondary" size="sm" onClick={() => void loadPage(cursor)} loading={loading && items.length > 0}>
            Weitere Releases laden
          </Button>
        </div>
      ) : null}
    </div>
  )
}
