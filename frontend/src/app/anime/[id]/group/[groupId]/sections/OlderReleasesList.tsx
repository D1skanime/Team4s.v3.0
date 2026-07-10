'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Eye, FileText, Image as ImageIcon } from 'lucide-react'

import { Button, Card, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseListCursor } from '@/lib/api'
import type { EpisodeReleaseSummary, ReleaseTimelineSegment } from '@/types/group'

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

function parseTimeToSeconds(value?: string | null): number | null {
  if (!value) return null
  const parts = value.split(':').map((part) => Number.parseFloat(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null
  return Math.max(0, Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]))
}

function formatSeconds(totalSeconds?: number | null): string {
  if (!totalSeconds || totalSeconds < 0) return '00:00:00'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatTimeRange(segment: ReleaseTimelineSegment): string | null {
  if (segment.start_time && segment.end_time) return `${segment.start_time} - ${segment.end_time}`
  return segment.start_time ?? segment.end_time ?? null
}

function segmentClassName(segmentType: string): string {
  const type = segmentType.toUpperCase()
  if (type === 'OP') return `${styles.segmentPill} ${styles.segmentOp}`
  if (type === 'ED') return `${styles.segmentPill} ${styles.segmentEd}`
  if (type === 'INSERT') return `${styles.segmentPill} ${styles.segmentInsert}`
  if (type === 'KARA') return `${styles.segmentPill} ${styles.segmentKara}`
  return styles.segmentPill
}

function segmentPositionStyle(segment: ReleaseTimelineSegment, durationSeconds?: number | null): CSSProperties {
  const start = parseTimeToSeconds(segment.start_time) ?? 0
  const end = parseTimeToSeconds(segment.end_time)
  const inferredDuration = Math.max(durationSeconds ?? 0, end ?? 0, start + 1)
  const rawWidth = end != null ? (Math.max(end - start, 1) / inferredDuration) * 100 : 18
  const width = Math.min(Math.max(rawWidth, 14), 34)
  const left = Math.min(Math.max((start / inferredDuration) * 100, 0), 100 - width)

  return {
    '--segment-left': `${left}%`,
    '--segment-width': `${width}%`,
  } as CSSProperties
}

function ReleaseTimelinePreview({
  animeID,
  groupID,
  episode,
}: {
  animeID: number
  groupID: number
  episode: EpisodeReleaseSummary
}) {
  const segments = episode.timeline_segments ?? []
  const detailHref = `/anime/${animeID}/group/${groupID}/releases/${episode.id}`

  return (
    <div className={styles.timelinePreview}>
      <div className={styles.timelineTimes} aria-hidden="true">
        <span>00:00:00</span>
        <span>{formatSeconds(episode.duration_seconds)}</span>
      </div>
      <div className={styles.timelineTrack}>
        <span className={styles.mainContentLabel}>Hauptinhalt</span>
        {segments.map((segment) => {
          const range = formatTimeRange(segment)
          return (
            <Link
              key={segment.id}
              href={`${detailHref}#op-ed-middle`}
              className={segmentClassName(segment.type)}
              style={segmentPositionStyle(segment, episode.duration_seconds)}
              aria-label={`${segment.title} in der Release-Ansicht öffnen`}
            >
              <span className={styles.segmentType}>{segment.type}</span>
              {range ? <span className={styles.segmentTime}>{range}</span> : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
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
          {visibleItems.map((episode) => {
            const detailHref = `/anime/${animeID}/group/${groupID}/releases/${episode.id}`
            return (
              <Card key={episode.id} variant="flat" className={styles.row}>
                <div className={styles.rowHeader}>
                  <div className={styles.rowMain}>
                    <Link href={detailHref} className={styles.rowTitle}>
                      {releaseLabel(episode)}
                    </Link>
                    {episode.version_label ? <span className={styles.rowMeta}>{episode.version_label}</span> : null}
                  </div>
                  <div className={styles.rowActions}>
                    <span className={styles.rowCount}>
                      <ImageIcon size={14} aria-hidden="true" />
                      {episode.images_count ?? 0} Bilder
                    </span>
                    <span className={styles.rowCount}>
                      <FileText size={14} aria-hidden="true" />
                      {episode.notes_count ?? 0} Texte
                    </span>
                    <Button
                      href={detailHref}
                      variant="subtle"
                      size="sm"
                      leftIcon={<Eye size={15} aria-hidden="true" />}
                    >
                      Ansicht
                    </Button>
                  </div>
                </div>
                <ReleaseTimelinePreview animeID={animeID} groupID={groupID} episode={episode} />
              </Card>
            )
          })}
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
