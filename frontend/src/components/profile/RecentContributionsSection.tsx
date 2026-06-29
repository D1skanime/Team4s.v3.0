import { Badge, Button, Card, EmptyState } from '@/components/ui'
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
  const projects = new Map<string, RecentContributionProject>()

  for (const item of items) {
    const projectKey = `${item.anime_id}:${item.fansub_group_id}`
    const existing = projects.get(projectKey)
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
    projects.set(projectKey, project)
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

function projectWorkUnits(item: RecentContributionProject): number {
  return Math.max(1, item.release_version_count + item.episode_count)
}

function profileProjectHref(item: RecentContributionProject): string {
  const projectPath = `/me/projects/${item.anime_id}/group/${item.fansub_group_id}`
  return `${projectPath}?return_to=${encodeURIComponent('/me/profile')}`
}

export function RecentContributionsSection({ items, canView, isPublicView = false }: RecentContributionsSectionProps) {
  const projects = toRecentProjects(items)
  const maxWorkUnits = Math.max(1, ...projects.map(projectWorkUnits))

  if (!canView || projects.length === 0) {
    return <EmptyState title="Noch keine Projekte sichtbar." />
  }

  return (
    <ul className={styles.recentList} aria-label="Letzte Projekte">
      {projects.slice(0, 3).map((item) => {
        const stats = formatProjectStats(item)
        const progressValue = Math.round((projectWorkUnits(item) / maxWorkUnits) * 100)

        return (
          <li key={`${item.anime_id}:${item.fansub_group_id}`}>
            <Card variant="nestedFlat" className={styles.recentContributionCard}>
              <div className={styles.recentContributionCover} aria-hidden="true">
                {item.anime_title.slice(0, 2).toUpperCase()}
              </div>
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
                <div className={styles.projectProgress} aria-label={`Bearbeitungsumfang ${progressValue} Prozent`}>
                  <span style={{ width: `${progressValue}%` }} />
                </div>
                {!isPublicView ? (
                  <div className={styles.projectActionRow}>
                    <Button
                      href={profileProjectHref(item)}
                      variant="secondary"
                      size="sm"
                    >
                      Projekt öffnen
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
