import Link from 'next/link'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { AnimeListItem } from '@/types/anime'

interface FansubProjectsSectionProps {
  projects: AnimeListItem[]
  groupId: number
}

type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'

const projectBucketOrder: ProjectBucketKey[] = ['ongoing', 'completed', 'archived']

const projectBucketLabel: Record<ProjectBucketKey, string> = {
  ongoing: 'Laufend',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

function resolveProjectBucket(status: AnimeListItem['status']): ProjectBucketKey {
  if (status === 'ongoing') return 'ongoing'
  if (status === 'done') return 'completed'
  return 'archived'
}

function groupProjects(projects: AnimeListItem[]): Record<ProjectBucketKey, AnimeListItem[]> {
  const buckets: Record<ProjectBucketKey, AnimeListItem[]> = {
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
        <div style={{ display: 'grid', gap: 16 }}>
          {projectBucketOrder.map((bucket) => {
            const items = projectsByBucket[bucket]
            if (items.length === 0) return null

            return (
              <div key={bucket} style={{ display: 'grid', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{projectBucketLabel[bucket]}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {items.map((item) => (
                    <Link key={item.id} href={`/anime/${item.id}/group/${groupId}`} style={{ textDecoration: 'none' }}>
                      <Card variant="interactive">
                        <strong>{item.title}</strong>
                        {item.year ? (
                          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                            {item.year}
                          </p>
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
