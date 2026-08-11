'use client'

import Link from 'next/link'

import type { ProjectMemberSummary } from '@/types/projectMember'

import { ProjectMemberHero } from './ProjectMemberHero'
import { ProjectMemberMediaGallery } from './ProjectMemberMediaGallery'
import { ProjectMemberNotesSection } from './ProjectMemberNotesSection'
import { ProjectMemberReleasesSection } from './ProjectMemberReleasesSection'
import { ProjectMemberStickyNav } from './ProjectMemberStickyNav'
import { ProjectMemberSummaryBar } from './ProjectMemberSummary'
import styles from './ProjectMemberPage.module.css'

export interface ProjectMemberPageProps {
  summary: ProjectMemberSummary
  memberSlug: string
  groupName: string
  groupSlug: string
  animeTitle: string
  animeID: number
  groupID: number
  projectPath: string
}

// Informationsarchitektur der Projekt-Member-Seite (Brief 4): Breadcrumb → Hero → Summary →
// Sticky-Nav → Sektionen. Die drei Detail-Sektionen (Texte/Bilder/Releases) werden in
// 122-06/07/08 als eigenständige, unabhängig ladende Client-Sektionen eingehängt; hier stehen
// vorerst Platzhalter mit den Ankern. Empty-State (D-13): ohne öffentliche Detailbeiträge nur
// Hero + Rollen + Hinweistext, keine Sektionen und keine Sticky-Nav.
export function ProjectMemberPage(props: ProjectMemberPageProps) {
  const { summary, memberSlug, groupName, groupSlug, animeTitle, projectPath, animeID, groupID } =
    props
  const { counts } = summary
  const isEmpty = counts.notes + counts.media + counts.releases === 0

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Brotkrumen">
          <Link href={`/fansubs/${groupSlug}`}>{groupName}</Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ›
          </span>
          <Link href={projectPath}>{animeTitle}</Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ›
          </span>
          <span className={styles.breadcrumbCurrent}>{summary.member_display_name}</span>
        </nav>

        <ProjectMemberHero
          summary={summary}
          memberSlug={memberSlug}
          groupName={groupName}
          animeTitle={animeTitle}
          projectPath={projectPath}
        />

        <ProjectMemberSummaryBar counts={counts} />

        {isEmpty ? (
          <div className={styles.emptyState}>
            Für diese Projektmitwirkung sind derzeit keine öffentlichen Detailbeiträge, Notizen oder
            Medien vorhanden.
          </div>
        ) : (
          <>
            <ProjectMemberStickyNav counts={counts} />

            <ProjectMemberNotesSection
              animeID={animeID}
              groupID={groupID}
              memberSlug={memberSlug}
              projectPath={projectPath}
              count={counts.notes}
            />

            <ProjectMemberMediaGallery
              animeID={animeID}
              groupID={groupID}
              memberSlug={memberSlug}
              projectPath={projectPath}
              count={counts.media}
            />

            <ProjectMemberReleasesSection
              animeID={animeID}
              groupID={groupID}
              memberSlug={memberSlug}
              projectPath={projectPath}
              count={counts.releases}
            />
          </>
        )}
      </div>
    </main>
  )
}
