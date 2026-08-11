'use client'

import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberMedia } from '@/lib/api'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import { ProjectMemberMediaCard } from './ProjectMemberMediaCard'
import styles from './ProjectMemberMediaGallery.module.css'
import { ProjectMemberMediaViewer } from './ProjectMemberMediaViewer'
import pageStyles from './ProjectMemberPage.module.css'
import { useProjectMemberCollection } from './useProjectMemberCollection'

const INITIAL_LIMIT = 24
const PAGE_LIMIT = 12

interface ProjectMemberMediaGalleryProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
}

// Projektweite Bilder-&-Medien-Galerie (Brief 3.3/12): cursor-nachgeladen mit weniger/mehr,
// responsives Grid, öffnet den Media Viewer über die aktuell angezeigten Medien.
export function ProjectMemberMediaGallery({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
}: ProjectMemberMediaGalleryProps) {
  const key = useCallback((media: ProjectMemberMediaItem) => media.id, [])
  const fetchPage = useCallback(
    (params: { cursor?: string; limit?: number; signal?: AbortSignal }) =>
      getProjectMemberMedia(animeID, groupID, memberSlug, params),
    [animeID, groupID, memberSlug],
  )
  const { shown, loading, error, canShowMore, canShowLess, showMore, showLess } =
    useProjectMemberCollection<ProjectMemberMediaItem>({
      initialLimit: INITIAL_LIMIT,
      pageLimit: PAGE_LIMIT,
      initialVisibleMobile: 6,
      key,
      fetchPage,
    })

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
        {shown.map((item, i) => (
          <ProjectMemberMediaCard key={item.id} item={item} index={i} onOpen={openViewer} />
        ))}
      </div>
      {loading ? <p className={styles.loadingText}>Wird geladen …</p> : null}
      <div className={pageStyles.pager}>
        <span className={pageStyles.pagerInfo}>
          {canShowMore ? `${shown.length} von ${count} angezeigt` : `Alle ${count} angezeigt`}
        </span>
        <div className={pageStyles.pagerButtons}>
          {canShowLess ? (
            <Button type="button" variant="ghost" size="sm" onClick={showLess}>
              Weniger anzeigen
            </Button>
          ) : null}
          {canShowMore ? (
            <Button type="button" variant="secondary" size="sm" onClick={showMore} disabled={loading}>
              Weitere Bilder laden
            </Button>
          ) : null}
        </div>
      </div>
      {openIndex !== null ? (
        <ProjectMemberMediaViewer
          items={shown}
          index={openIndex}
          projectPath={projectPath}
          onClose={closeViewer}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </section>
  )
}
