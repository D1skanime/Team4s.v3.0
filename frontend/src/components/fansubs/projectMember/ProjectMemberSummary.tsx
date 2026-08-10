import type { ProjectMemberCounts } from '@/types/projectMember'

import styles from './ProjectMemberPage.module.css'

const SUMMARY_CARDS: { key: keyof ProjectMemberCounts; label: string }[] = [
  { key: 'roles', label: 'Rollen' },
  { key: 'releases', label: 'Releases' },
  { key: 'notes', label: 'Textbeiträge' },
  { key: 'media', label: 'Bilder & Medien' },
]

// Kompakte Summary-Leiste (Brief 7): nur fachlich zuverlässige Counts aus der Summary-Response.
export function ProjectMemberSummaryBar({ counts }: { counts: ProjectMemberCounts }) {
  return (
    <div className={styles.summary}>
      {SUMMARY_CARDS.map((card) => (
        <div key={card.key} className={styles.summaryCard}>
          <div className={styles.summaryValue}>{counts[card.key]}</div>
          <div className={styles.summaryLabel}>{card.label}</div>
        </div>
      ))}
    </div>
  )
}
