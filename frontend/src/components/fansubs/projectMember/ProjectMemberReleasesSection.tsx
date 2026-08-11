'use client'

import { useCallback } from 'react'

import { Button } from '@/components/ui'
import { getProjectMemberReleases } from '@/lib/api'
import type { ProjectMemberRelease } from '@/types/projectMember'

import { ProjectMemberReleaseCard } from './ProjectMemberReleaseCard'
import styles from './ProjectMemberReleasesSection.module.css'
import pageStyles from './ProjectMemberPage.module.css'
import { useProjectMemberCollection } from './useProjectMemberCollection'

const INITIAL_LIMIT = 15
const PAGE_LIMIT = 10

interface ProjectMemberReleasesSectionProps {
  animeID: number
  groupID: number
  memberSlug: string
  projectPath: string
  count: number
}

// Release-Mitwirkung (Brief 3.4/20): kompakte Zeilen-Liste, cursor-nachgeladen mit weniger/mehr.
export function ProjectMemberReleasesSection({
  animeID,
  groupID,
  memberSlug,
  projectPath,
  count,
}: ProjectMemberReleasesSectionProps) {
  const key = useCallback((release: ProjectMemberRelease) => release.release_version_id, [])
  const fetchPage = useCallback(
    (params: { cursor?: string; limit?: number; signal?: AbortSignal }) =>
      getProjectMemberReleases(animeID, groupID, memberSlug, params),
    [animeID, groupID, memberSlug],
  )
  const { shown, loading, error, canShowMore, canShowLess, showMore, showLess } =
    useProjectMemberCollection<ProjectMemberRelease>({
      initialLimit: INITIAL_LIMIT,
      pageLimit: PAGE_LIMIT,
      key,
      fetchPage,
    })

  return (
    <section id="releases" className={pageStyles.section} aria-labelledby="pm-releases-title">
      <div className={pageStyles.sectionHead}>
        <h2 id="pm-releases-title" className={pageStyles.sectionTitle}>
          Mitwirkung an Releases
        </h2>
        <span className={pageStyles.sectionCount}>{count}</span>
      </div>
      {error ? (
        <p className={styles.error}>Die Release-Mitwirkung konnte nicht geladen werden.</p>
      ) : null}
      <ul className={styles.list}>
        {shown.map((release) => (
          <ProjectMemberReleaseCard
            key={release.release_version_id}
            release={release}
            projectPath={projectPath}
          />
        ))}
      </ul>
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
              Weitere laden
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
