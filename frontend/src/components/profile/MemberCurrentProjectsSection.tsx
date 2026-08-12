'use client'

import Link from 'next/link'
import { Layers } from 'lucide-react'
import { useState } from 'react'

import { Badge, Button, Card, EmptyState, SectionHeader } from '@/components/ui'
import { getMemberProjects, resolveApiUrl } from '@/lib/api'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { useNearViewportActivation } from '@/hooks/useNearViewportActivation'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { PublicMemberCurrentProject } from '@/types/profile'

import styles from './MemberCurrentProjectsSection.module.css'

type MemberCurrentProjectsSectionProps = {
  memberSlug: string
  projects: PublicMemberCurrentProject[]
  totalCount: number
}

const PROJECT_PAGE_SIZE = 6
const ROLE_CODE_BY_LABEL = new Map(
  FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.label, option.code]),
)

function roleColorCode(roleLabel: string): string {
  const roleCode = ROLE_CODE_BY_LABEL.get(roleLabel)
  if (roleCode === 'techadmin') return 'admin'
  if (roleCode === 'gfxler') return 'designer'
  return roleCode ?? 'other'
}

function projectHref(project: PublicMemberCurrentProject): string {
  return `/anime/${project.anime_id}/group/${project.fansub_group_id}`
}

export function MemberCurrentProjectsSection({
  memberSlug,
  projects,
  totalCount,
}: MemberCurrentProjectsSectionProps) {
  const [sourceProjects, setSourceProjects] = useState(projects)
  const [visibleProjects, setVisibleProjects] = useState(projects)
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  if (sourceProjects !== projects) {
    setSourceProjects(projects)
    setVisibleProjects(projects)
  }
  const hasMore = visibleProjects.length < totalCount

  async function loadMoreProjects() {
    if (!interactionEnabled || isLoading || !hasMore) return
    setIsLoading(true)
    setLoadError('')
    try {
      const response = await getMemberProjects(memberSlug, PROJECT_PAGE_SIZE, visibleProjects.length)
      if (!('data' in response)) throw new Error('Profil ist nicht sichtbar.')
      setVisibleProjects((current) => [...current, ...response.data.items])
    } catch {
      setLoadError('Weitere Projekte konnten nicht geladen werden. Bitte versuche es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section ref={targetRef} className={styles.section}>
      <SectionHeader title="Fansub-Projekte" />

      {visibleProjects.length > 0 ? (
        <ul
          className={`${styles.projectList} ${styles.projectSkeleton}`}
          aria-hidden="true"
          data-visible={interactionEnabled ? 'false' : 'true'}
        >
          {visibleProjects.map((project) => (
            <li key={`skeleton:${project.anime_id}:${project.fansub_group_id}`}>
              <Card className={`${styles.projectCard} ${styles.skeletonCard}`}>
                <span className={`${styles.cover} ${styles.skeletonCover}`} />
                <span className={`${styles.projectBody} ${styles.skeletonBody}`}>
                  <span className={styles.skeletonTitle} />
                  <span className={styles.skeletonGroup} />
                  <span className={styles.skeletonChips} />
                </span>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {visibleProjects.length === 0 ? (
        <EmptyState title="Keine aktuellen Projekte sichtbar." />
      ) : (
        <ul className={styles.projectList} aria-label="Fansub-Projekte">
          {visibleProjects.map((project) => (
            <li key={`${project.anime_id}:${project.fansub_group_id}`}>
              <Link
                href={projectHref(project)}
                className={styles.projectLink}
                aria-label={`${project.anime_title} öffnen`}
              >
                <Card variant="interactive" className={styles.projectCard}>
                  <span className={styles.cover} aria-hidden={!project.cover_url}>
                    {project.cover_url ? (
                      <ResponsiveImage
                        src={resolveApiUrl(project.cover_url)}
                        alt={`${project.anime_title} Cover`}
                        width={96}
                        height={136}
                        sizes="(max-width: 720px) 68px, 90px"
                        loading="lazy"
                      />
                    ) : (
                      <span>{project.anime_title.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>

                  <span className={styles.projectBody}>
                    <span className={styles.projectTitleRow}>
                      <strong>{project.anime_title}</strong>
                      <span className={styles.projectGroup}>{project.fansub_group_name}</span>
                    </span>

                    <span className={styles.chipRow}>
                      {project.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="neutral"
                          className={styles.roleChip}
                          data-role-code={roleColorCode(role)}
                        >
                          {role}
                        </Badge>
                      ))}
                      {project.is_project_level ? (
                        <Badge variant="neutral">
                          <Layers size={13} aria-hidden="true" />
                          Projektweit
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visibleProjects.length > 0 ? (
        <div className={styles.projectFooter}>
          <span aria-live="polite">
            {visibleProjects.length} von {totalCount} Projekten sichtbar
          </span>
          {hasMore ? (
            <Button
              variant="secondary"
              size="sm"
              loading={isLoading}
              disabled={!interactionEnabled}
              onClick={loadMoreProjects}
            >
              Weitere Projekte laden
            </Button>
          ) : null}
        </div>
      ) : null}
      {loadError ? <p className={styles.loadError} role="alert">{loadError}</p> : null}
    </section>
  )
}
