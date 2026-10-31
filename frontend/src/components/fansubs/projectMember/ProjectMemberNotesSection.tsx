'use client'

import { FileText } from 'lucide-react'
import { useCallback } from 'react'

import { Pagination, SectionHeader } from '@/components/ui'
import { getProjectMemberNotes } from '@/lib/api'
import type { ProjectMemberNote } from '@/types/projectMember'

import { ProjectMemberNoteEntry } from './ProjectMemberNoteEntry'
import styles from './ProjectMemberNotesSection.module.css'
import pageStyles from './ProjectMemberPage.module.css'
import { useProjectMemberCollection } from './useProjectMemberCollection'

const INITIAL_LIMIT = 15
const PAGE_LIMIT = 10

interface ProjectMemberNotesSectionProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
  hasMultipleRoles: boolean
}

// Projektweite Texte-&-Notizen-Sektion: lädt cursor-basiert nach (Pagination mode="loadMore"),
// statt zu einer festen Seitenzahl zu springen -- bereits angezeigte Einträge bleiben beim
// Nachladen erhalten.
export function ProjectMemberNotesSection({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
  hasMultipleRoles,
}: ProjectMemberNotesSectionProps) {
  const key = useCallback((note: ProjectMemberNote) => note.id, [])
  const fetchPage = useCallback(
    (params: { cursor?: string; limit?: number; signal?: AbortSignal }) =>
      getProjectMemberNotes(animeID, groupID, memberSlug, params),
    [animeID, groupID, memberSlug],
  )
  const { shown, loading, error, canShowMore, canShowLess, showMore, showLess } =
    useProjectMemberCollection<ProjectMemberNote>({
      initialLimit: INITIAL_LIMIT,
      pageLimit: PAGE_LIMIT,
      initialVisibleMobile: 5,
      key,
      fetchPage,
    })

  return (
    <section id="texte" className={pageStyles.section} aria-label="Texte & Notizen">
      <SectionHeader
        title="Texte & Notizen"
        underline
        icon={<FileText size={18} aria-hidden="true" />}
        counter={<span className={pageStyles.sectionCount}>{count}</span>}
      />
      <p className={pageStyles.sectionIntro}>
        Alle öffentlichen Textbeiträge dieses Fansub-Members zu diesem Projekt.
      </p>
      {error ? (
        <p className={styles.error}>Die Textbeiträge konnten nicht geladen werden.</p>
      ) : null}
      <div className={styles.notesGrid}>
        {shown.map((note) => (
          <ProjectMemberNoteEntry
            key={note.id}
            note={note}
            projectPath={projectPath}
            hasMultipleRoles={hasMultipleRoles}
          />
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
        showMoreLabel={(() => {
          const nextBatch = Math.min(PAGE_LIMIT, count - shown.length)
          return nextBatch === 1 ? 'Weiteren 1 Beitrag anzeigen' : `Weitere ${nextBatch} Beiträge anzeigen`
        })()}
      />
    </section>
  )
}
