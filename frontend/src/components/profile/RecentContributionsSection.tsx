import { Badge, Card, EmptyState } from '@/components/ui'
import type { MemberProfileRecentContribution } from '@/types/profile'

import styles from './profile.module.css'

type RecentContributionsSectionProps = {
  items: MemberProfileRecentContribution[]
  canView: boolean
  isPublicView?: boolean
}

type RecentContributionProject = MemberProfileRecentContribution & {
  fansub_group_names: string[]
  role_names: string[]
  role_labels: string[]
  release_version_count: number
  episode_count: number
}

function appendUnique(target: string[], values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed && !target.includes(trimmed)) target.push(trimmed)
  }
}

function toRecentProjects(items: MemberProfileRecentContribution[]): RecentContributionProject[] {
  const projects = new Map<number, RecentContributionProject>()

  for (const item of items) {
    const existing = projects.get(item.anime_id)
    const groupNames = [...(item.fansub_group_names ?? []), item.fansub_group_name]
    const roleNames = [...(item.role_names ?? []), item.role_name]
    const roleLabels = [...(item.role_labels ?? []), item.role_label]

    if (existing) {
      appendUnique(existing.fansub_group_names, groupNames)
      appendUnique(existing.role_names, roleNames)
      appendUnique(existing.role_labels, roleLabels)
      existing.release_version_count += item.release_version_count ?? 1
      existing.episode_count += item.episode_count ?? 1
      continue
    }

    const project: RecentContributionProject = {
      ...item,
      id: item.anime_id,
      fansub_group_names: [],
      role_names: [],
      role_labels: [],
      release_version_count: item.release_version_count ?? 1,
      episode_count: item.episode_count ?? 1,
    }
    appendUnique(project.fansub_group_names, groupNames)
    appendUnique(project.role_names, roleNames)
    appendUnique(project.role_labels, roleLabels)
    projects.set(item.anime_id, project)
  }

  return Array.from(projects.values())
}

function formatProjectStats(item: RecentContributionProject): string | null {
  const parts: string[] = []
  if (item.release_version_count > 0) {
    parts.push(`${item.release_version_count} Release-Version${item.release_version_count === 1 ? '' : 'en'}`)
  }
  if (item.episode_count > 0) {
    parts.push(`${item.episode_count} Folge${item.episode_count === 1 ? '' : 'n'}`)
  }
  return parts.length > 0 ? parts.join(' / ') : null
}

export function RecentContributionsSection({ items, canView }: RecentContributionsSectionProps) {
  const projects = toRecentProjects(items)

  if (!canView || projects.length === 0) {
    return <EmptyState title="Noch keine Projekte sichtbar." />
  }

  return (
    <ul className={styles.recentList} aria-label="Letzte Projekte">
      {projects.slice(0, 3).map((item) => {
        const stats = formatProjectStats(item)

        return (
          <li key={item.id}>
            <Card variant="nestedFlat" className={styles.recentContributionCard}>
              <div className={styles.recentItemBody}>
                <strong>{item.anime_title}</strong>
                <div className={styles.chipRow}>
                  {item.fansub_group_names.map((groupName) => (
                    <Badge key={groupName} variant="info">{groupName}</Badge>
                  ))}
                  {item.role_labels.map((roleLabel) => (
                    <Badge key={roleLabel} variant="success">{roleLabel}</Badge>
                  ))}
                </div>
                {stats ? <span>{stats}</span> : null}
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
