import { SectionHeader } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectBannerCard } from './FansubProjectBannerCard'
import { FansubProjectsGrid } from './FansubProjectsGrid'
import styles from './FansubProjectsSection.module.css'

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

/**
 * AO6-06/AO6-01/AO6-04: laufende Projekte als volle 16:9-Banner-Karten, abgeschlossene
 * und archivierte Projekte gemeinsam im Lazy-Karussell (scroll-snap, Pfeile, Tastatur,
 * "weitere anzeigen"). Genau ein SectionHeader (kein "Laufende Projekte / Laufend"-Doppel).
 */
export function FansubProjectsSection({ projects, groupId }: FansubProjectsSectionProps) {
  if (projects.length === 0) {
    return null
  }

  const projectsByBucket = groupProjects(projects)
  const ongoing = projectsByBucket.ongoing
  const carouselItems = [...projectsByBucket.completed, ...projectsByBucket.archived].map((project) => ({
    project,
    statusLabel: projectBucketLabel[resolveProjectBucket(project.status)],
  }))

  return (
    <section id="projekte">
      <SectionHeader title="Projekte" />
      <div className={styles.stack}>
        {ongoing.length > 0 ? (
          <div className={styles.bannerGrid}>
            {ongoing.map((item) => (
              <FansubProjectBannerCard
                key={item.id}
                project={item}
                groupId={groupId}
                statusLabel={projectBucketLabel.ongoing}
              />
            ))}
          </div>
        ) : null}
        {carouselItems.length > 0 ? <FansubProjectsGrid items={carouselItems} groupId={groupId} /> : null}
      </div>
    </section>
  )
}
