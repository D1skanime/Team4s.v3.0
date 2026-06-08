import Link from 'next/link'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubProjectsSectionProps {
  projects: PublicFansubProject[]
  groupId: number
}

type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'

const projectBucketOrder: ProjectBucketKey[] = ['ongoing', 'completed', 'archived']

const projectBucketLabel: Record<ProjectBucketKey, string> = {
  ongoing: 'Laufend',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

function resolveProjectBucket(status: PublicFansubProject['status']): ProjectBucketKey {
  if (status === 'ongoing') return 'ongoing'
  if (status === 'done') return 'completed'
  return 'archived'
}

function groupProjects(projects: PublicFansubProject[]): Record<ProjectBucketKey, PublicFansubProject[]> {
  const buckets: Record<ProjectBucketKey, PublicFansubProject[]> = {
    ongoing: [],
    completed: [],
    archived: [],
  }

  for (const item of projects) {
    buckets[resolveProjectBucket(item.status)].push(item)
  }

  for (const bucket of projectBucketOrder) {
    buckets[bucket].sort((left, right) => left.title.localeCompare(right.title, 'de'))
  }

  return buckets
}

export function FansubProjectsSection({ projects, groupId }: FansubProjectsSectionProps) {
  const projectsByBucket = groupProjects(projects)

  return (
    <section id="projekte">
      <SectionHeader title="Projekte" />
      {projects.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Noch keine Projekte"
          description="Diese Gruppe hat bisher keine öffentlich zugänglichen Anime-Projekte."
        />
      ) : (
        <div className={styles.stack}>
          {projectBucketOrder.map((bucket) => {
            const items = projectsByBucket[bucket]
            if (items.length === 0) return null

            return (
              <div key={bucket} className={styles.compactStack}>
                <h3 className={styles.sectionTitle}>{projectBucketLabel[bucket]}</h3>
                <div className={styles.cardGrid}>
                  {items.map((item) => (
                    <Link key={item.id} href={`/anime/${item.id}/group/${groupId}`} className={styles.projectLink}>
                      <Card variant="interactive">
                        <strong>{item.title}</strong>
                        {item.year ? (
                          <p className={styles.projectYear}>{item.year}</p>
                        ) : null}
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
