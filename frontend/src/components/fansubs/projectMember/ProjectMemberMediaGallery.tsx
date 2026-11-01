'use client'

import { Image as ImageIcon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { Pagination, SectionHeader } from '@/components/ui'
import { FansubMediaLightbox } from '@/components/fansubs/FansubMediaLightbox'
import { getProjectMemberMedia } from '@/lib/api'
import type { ProjectMemberMediaItem } from '@/types/projectMember'

import { ProjectMemberMediaCard } from './ProjectMemberMediaCard'
import styles from './ProjectMemberMediaGallery.module.css'
import pageStyles from './ProjectMemberPage.module.css'
import { toProjectMemberLightboxItem } from './projectMemberMediaMapping'
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

// Projektweite Bilder-&-Medien-Galerie: lädt cursor-basiert nach (Pagination mode="loadMore"),
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
    <section id="bilder" className={pageStyles.section} aria-label="Bilder & Medien">
      <SectionHeader
        title="Bilder & Medien"
        underline
        icon={<ImageIcon size={18} aria-hidden="true" />}
        counter={<span className={pageStyles.sectionCount}>{count}</span>}
      />
      {error ? <p className={styles.error}>Die Medien konnten nicht geladen werden.</p> : null}
      <div className={styles.grid}>
        {shown.map((item, i) => (
          <ProjectMemberMediaCard key={item.id} item={item} index={i} onOpen={openViewer} />
        ))}
      </div>
      {loading ? <p className={styles.loadingText}>Wird geladen …</p> : null}
      <Pagination
        mode="loadMore"
        className={pageStyles.pager}
        shownCount={shown.length}
        totalCount={count}
        canShowMore={canShowMore}
        canShowLess={canShowLess}
        onShowMore={showMore}
        onShowLess={showLess}
        loading={loading}
        showMoreLabel="Weitere Bilder laden"
      />
      <FansubMediaLightbox
        media={shown.map((item) => toProjectMemberLightboxItem(item, projectPath))}
        index={openIndex}
        onClose={closeViewer}
        onNavigate={setOpenIndex}
      />
    </section>
  )
}
