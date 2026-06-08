import { Card, EmptyState, SectionHeader } from '@/components/ui'
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
        <SectionHeader title="Gruppenleitung" />
        <EmptyState
          variant="compact"
          title="Noch keine Gruppenleitung eingetragen"
          description="Für diese Gruppe ist noch keine öffentliche Leitungs-Historie vorhanden."
        />
      </section>
    )
  }

  return (
    <section className={styles.timeline}>
      <SectionHeader title="Gruppenleitung" />
      <Card variant="flat">
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
      </Card>
    </section>
  )
}
