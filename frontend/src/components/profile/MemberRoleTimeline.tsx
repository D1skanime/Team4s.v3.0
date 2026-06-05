import { Badge, Card, SectionHeader } from '@/components/ui'
import type { PublicMemberRoleEntry } from '@/types/contributions'

import styles from './profile.module.css'

type MemberRoleTimelineProps = {
  entries: PublicMemberRoleEntry[]
  hasUnverified: boolean
  isVerified?: boolean
}

function sortEntries(entries: PublicMemberRoleEntry[]): PublicMemberRoleEntry[] {
  return [...entries].sort((a, b) => {
    if (a.started_year === null && b.started_year === null) return 0
    if (a.started_year === null) return 1
    if (b.started_year === null) return -1
    return a.started_year - b.started_year
  })
}

function formatYearRange(start: number | null, end: number | null): string {
  if (!start && !end) return ''
  if (start && end) return `${start}–${end}`
  if (start) return `ab ${start}`
  return `bis ${end}`
}

function contextLabel(entry: PublicMemberRoleEntry): string {
  return entry.context === 'group_history' ? 'Gruppenhistorie' : 'Anime-Beitrag'
}

export function MemberRoleTimeline({ entries, hasUnverified, isVerified = false }: MemberRoleTimelineProps) {
  if (entries.length === 0) {
    return (
      <section className={styles.roleTimelineSection}>
        <SectionHeader
          title="Rollen-Timeline"
          description="Öffentliche Rollen und Beiträge aus der Fansub-Geschichte dieses Mitglieds."
        />
        <p className={styles.emptyText}>
          Noch keine Rollen oder Beiträge öffentlich sichtbar.
        </p>
      </section>
    )
  }

  const sorted = sortEntries(entries)

  return (
    <section className={styles.roleTimelineSection}>
      <SectionHeader
        title="Rollen-Timeline"
        description="Öffentliche Rollen und Beiträge aus der Fansub-Geschichte dieses Mitglieds."
      />
      <ul className={styles.roleTimelineList}>
        {sorted.map((entry, idx) => {
          const yearRange = formatYearRange(entry.started_year, entry.ended_year)
          const isHistorical = entry.status === 'historical'
          const isGroupHistory = entry.context === 'group_history'

          return (
            <li
              key={`${entry.context}-${entry.fansub_group_slug}-${entry.role_code}-${entry.anime_id ?? 'x'}-${entry.started_year ?? idx}`}
            >
              <Card
                variant="nestedFlat"
                className={`${styles.roleTimelineEntry} ${
                  isGroupHistory ? styles.roleTimelineEntryHistory : styles.roleTimelineEntryAnime
                }`}
              >
                <span className={styles.roleTimelineYear}>{yearRange || 'ohne Jahr'}</span>
                <span className={styles.roleTimelineContent}>
                  <span className={styles.roleTimelineMeta}>
                    <Badge variant={isGroupHistory ? 'warning' : 'success'}>
                      {contextLabel(entry)}
                    </Badge>
                    {isHistorical && !isVerified ? (
                      <Badge variant="muted">Historisch ungeprüft</Badge>
                    ) : null}
                  </span>
                  <strong className={styles.roleTimelineRole}>{entry.role_label}</strong>
                  <span className={styles.roleTimelineGroup}>{entry.fansub_group_name}</span>
                  {entry.context === 'anime_contribution' && entry.anime_title ? (
                    <span className={styles.roleTimelineAnime}>
                      Anime: {entry.anime_title}
                    </span>
                  ) : null}
                </span>
              </Card>
            </li>
          )
        })}
      </ul>
      {hasUnverified && (
        <p className={styles.roleTimelineDisclaimer}>
          Einige Angaben sind historisch ungeprüft.
        </p>
      )}
    </section>
  )
}
