import type { PublicMemberRoleEntry } from '@/types/contributions'

import styles from './profile.module.css'

type MemberRoleTimelineProps = {
  entries: PublicMemberRoleEntry[]
  hasUnverified: boolean
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

export function MemberRoleTimeline({ entries, hasUnverified }: MemberRoleTimelineProps) {
  if (entries.length === 0) {
    return (
      <section className={styles.roleTimelineSection}>
        <h3 className={styles.roleTimelineHeading}>Rollen-Timeline</h3>
        <p className={styles.emptyText}>
          Noch keine Contributions eingetragen. Du warst früher in einer Fansub-Gruppe aktiv? Bitte
          deinen ehemaligen Leader, dich einzutragen.
        </p>
      </section>
    )
  }

  const sorted = sortEntries(entries)

  return (
    <section className={styles.roleTimelineSection}>
      <h3 className={styles.roleTimelineHeading}>Rollen-Timeline</h3>
      <ul className={styles.roleTimelineList}>
        {sorted.map((entry, idx) => {
          const yearRange = formatYearRange(entry.started_year, entry.ended_year)
          const isHistorical = entry.status === 'historical'

          return (
            <li
              key={`${entry.context}-${entry.fansub_group_slug}-${entry.role_code}-${entry.anime_id ?? 'x'}-${entry.started_year ?? idx}`}
              className={styles.roleTimelineEntry}
            >
              <span className={styles.roleTimelineYear}>{yearRange || '–'}</span>
              <span className={styles.roleTimelineContent}>
                <span className={styles.roleTimelineGroup}>
                  {entry.fansub_group_name}
                  {isHistorical && (
                    <span className={styles.roleTimelineHistorical}> (historisch)</span>
                  )}
                </span>
                <span className={styles.roleTimelineRole}>{entry.role_label}</span>
                {entry.context === 'anime_contribution' && entry.anime_title && (
                  <span className={styles.roleTimelineAnime}>
                    Anime: {entry.anime_title}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {hasUnverified && (
        <p className={styles.roleTimelineDisclaimer}>
          ⚠ Einige Angaben historisch ungeprüft
        </p>
      )}
    </section>
  )
}
