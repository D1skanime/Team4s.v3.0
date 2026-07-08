import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicMemberCurrentProject } from '@/types/profile'

import styles from './MemberCurrentProjectsSection.module.css'

type MemberCurrentProjectsSectionProps = {
  projects: PublicMemberCurrentProject[]
}

function projectHref(project: PublicMemberCurrentProject): string {
  return `/anime/${project.anime_id}/group/${project.fansub_group_id}`
}

export function MemberCurrentProjectsSection({
  projects,
}: MemberCurrentProjectsSectionProps) {
  return (
    <section className={styles.section}>
      <SectionHeader title="Aktuelle Projekte" />

      {projects.length === 0 ? (
        <EmptyState title="Keine aktuellen Projekte sichtbar." />
      ) : (
        <ul className={styles.projectList} aria-label="Aktuelle Projekte">
          {projects.map((project) => (
            <li key={`${project.anime_id}:${project.fansub_group_id}`}>
              <Link
                href={projectHref(project)}
                className={styles.projectLink}
                aria-label={`${project.anime_title} öffnen`}
              >
                <Card variant="interactive" className={styles.projectCard}>
                  <span className={styles.cover} aria-hidden={!project.cover_url}>
                    {project.cover_url ? (
                      <Image
                        src={resolveApiUrl(project.cover_url)}
                        alt={`${project.anime_title} Cover`}
                        width={96}
                        height={136}
                        unoptimized
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
                        <Badge key={role} variant="success">{role}</Badge>
                      ))}
                      {project.is_project_level ? (
                        <Badge variant="info">
                          <Layers size={13} aria-hidden="true" />
                          Projektweit
                        </Badge>
                      ) : null}
                    </span>
                  </span>

                  <span className={styles.projectArrow} aria-hidden="true">
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
