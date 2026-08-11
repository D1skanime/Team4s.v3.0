'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberMedia } from '@/lib/api'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import { ProjectMemberMediaCard } from './ProjectMemberMediaCard'
import styles from './ProjectMemberMediaGallery.module.css'
import { ProjectMemberMediaViewer } from './ProjectMemberMediaViewer'
import pageStyles from './ProjectMemberPage.module.css'

const INITIAL_LIMIT = 24
const PAGE_LIMIT = 12

interface ProjectMemberMediaGalleryProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
  memberDisplayName?: string
}

// Projektweite Bilder-&-Medien-Galerie (Brief 3.3/12): cursor-nachgeladen, responsives Grid,
// öffnet den Media Viewer am Index; bereits geladene Medien werden im Viewer wiederverwendet.
export function ProjectMemberMediaGallery({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
  memberDisplayName,
}: ProjectMemberMediaGalleryProps) {
  const [items, setItems] = useState<ProjectMemberMediaItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const openViewer = useCallback((index: number) => {
    if (typeof document !== 'undefined') {
      triggerRef.current = document.activeElement as HTMLElement | null
    }
    setOpenIndex(index)
  }, [])

  const closeViewer = useCallback(() => {
    setOpenIndex(null)
    const trigger = triggerRef.current
    if (trigger && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => trigger.focus())
    }
  }, [])

  // Pure Dedup gegen den aktuellen State (kein externer Ref) — StrictMode-safe.
  const append = useCallback((incoming: ProjectMemberMediaItem[]) => {
    setItems((prev) => {
      const existing = new Set(prev.map((media) => media.id))
      const additions = incoming.filter((media) => !existing.has(media.id))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getProjectMemberMedia(animeID, groupID, memberSlug, {
      limit: INITIAL_LIMIT,
      signal: controller.signal,
    })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name !== 'AbortError') setError(true)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [animeID, groupID, memberSlug, append])

  const loadMore = useCallback(() => {
    if (!cursor) return
    setLoading(true)
    getProjectMemberMedia(animeID, groupID, memberSlug, { cursor, limit: PAGE_LIMIT })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [animeID, groupID, memberSlug, cursor, append])

  return (
    <section id="bilder" className={pageStyles.section} aria-labelledby="pm-bilder-title">
      <div className={pageStyles.sectionHead}>
        <h2 id="pm-bilder-title" className={pageStyles.sectionTitle}>
          Bilder &amp; Medien
        </h2>
        <span className={pageStyles.sectionCount}>{count}</span>
      </div>
      {error ? <p className={styles.error}>Die Medien konnten nicht geladen werden.</p> : null}
      <div className={styles.grid}>
        {items.map((item, i) => (
          <ProjectMemberMediaCard
            key={item.id}
            item={item}
            index={i}
            onOpen={openViewer}
          />
        ))}
      </div>
      {loading ? <p className={styles.loadingText}>Wird geladen …</p> : null}
      {hasMore && !loading ? (
        <div className={styles.loadMoreWrap}>
          <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
            Weitere Bilder laden
          </Button>
        </div>
      ) : null}
      {openIndex !== null ? (
        <ProjectMemberMediaViewer
          items={items}
          index={openIndex}
          projectPath={projectPath}
          memberDisplayName={memberDisplayName}
          onClose={closeViewer}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </section>
  )
}
