import type { PublicFansubLeaderEntry } from '@/types/contributions'

import styles from './GroupLeaderTimeline.module.css'

interface GroupLeaderTimelineProps {
  entries: PublicFansubLeaderEntry[]
  fallbackLeads?: PublicFansubLeaderEntry[]
}

export function GroupLeaderTimeline({ entries, fallbackLeads }: GroupLeaderTimelineProps) {
  const effectiveEntries = entries.length > 0 ? entries : (fallbackLeads ?? [])

  if (effectiveEntries.length === 0) {
    return (
      <section className={styles.timeline}>
        <h2 className={styles.heading}>Gruppenleitung</h2>
        <p className={styles.empty}>
          Noch keine Gruppenleitung eingetragen.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.timeline}>
      <h2 className={styles.heading}>Gruppenleitung</h2>
      <ol className={styles.list}>
        {effectiveEntries.map((entry, index) => (
          <li
            key={`${entry.member_slug ?? entry.member_display_name}-${entry.role_code}-${entry.started_year ?? index}`}
            className={styles.entry}
          >
            <span className={styles.year}>
              {entry.started_year ?? '?'}
              {entry.ended_year ? `–${entry.ended_year}` : ''}
            </span>
            <span className={styles.separator}>·</span>
            <span className={styles.name}>
              {entry.member_display_name}
              {entry.status === 'historical' && (
                <span className={styles.historicalLabel}>(historisch)</span>
              )}
            </span>
            <span className={styles.roleLabel}>{entry.role_label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
