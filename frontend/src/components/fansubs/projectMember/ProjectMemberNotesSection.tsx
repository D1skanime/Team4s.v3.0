'use client'

import { useCallback } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberNotes } from '@/lib/api'
import type { ProjectMemberNote } from '@/types/projectMember'

import { ProjectMemberNoteCard } from './ProjectMemberNoteCard'
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
}

// Projektweite Texte-&-Notizen-Sektion (Brief 3.2/10): cursor-nachgeladen mit weniger/mehr.
export function ProjectMemberNotesSection({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
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
      key,
      fetchPage,
    })

  return (
    <section id="texte" className={pageStyles.section} aria-labelledby="pm-texte-title">
      <div className={pageStyles.sectionHead}>
        <h2 id="pm-texte-title" className={pageStyles.sectionTitle}>
          Texte &amp; Notizen
        </h2>
        <span className={pageStyles.sectionCount}>{count}</span>
      </div>
      <p className={pageStyles.sectionIntro}>
        Alle öffentlichen Textbeiträge dieses Members zu diesem Projekt.
      </p>
      {error ? (
        <p className={styles.error}>Die Textbeiträge konnten nicht geladen werden.</p>
      ) : null}
      <div className={styles.notesGrid}>
        {shown.map((note) => (
          <ProjectMemberNoteCard key={note.id} note={note} projectPath={projectPath} />
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
              Weitere Beiträge laden
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
