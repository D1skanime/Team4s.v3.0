import { SectionHeader } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectsGrid } from './FansubProjectsGrid'

interface FansubProjectsSectionProps {
  projects: PublicFansubProject[]
  groupId: number
  groupSlug?: string | null
}

type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'

const projectBucketOrder: ProjectBucketKey[] = ['ongoing', 'completed', 'archived']

const projectBucketLabel: Record<ProjectBucketKey, string> = {
  ongoing: 'Laufend',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

// Status-Farben aus dem globalen Badge-System: laufend gelb, abgeschlossen gruen, archiviert rot
const projectBucketBadge: Record<ProjectBucketKey, 'warning' | 'success' | 'danger'> = {
  ongoing: 'warning',
  completed: 'success',
  archived: 'danger',
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
 * AO6-06/AO7-03: alle Projekte in EINEM responsiven Grid (laufende zuerst, dann
 * abgeschlossene/archivierte), jede Karte gleich gross mit Status-Pill. Das Grid
 * bricht per Breakpoint um und blendet den Rest ueber "X weitere anzeigen" inline
 * ein - kein horizontales Karussell, keine ueberbreite Einzelkarte, ein Header.
 */
export function FansubProjectsSection({ projects, groupId, groupSlug }: FansubProjectsSectionProps) {
  if (projects.length === 0) {
    return null
  }

  const projectsByBucket = groupProjects(projects)
  const items = projectBucketOrder.flatMap((bucket) =>
    projectsByBucket[bucket].map((project) => ({
      project,
      statusLabel: projectBucketLabel[bucket],
      statusVariant: projectBucketBadge[bucket],
    })),
  )

  return (
    <section id="projekte">
      <SectionHeader title="Projekte" underline />
      <FansubProjectsGrid items={items} groupId={groupId} groupSlug={groupSlug} />
    </section>
  )
}
