import { BarChart3 } from 'lucide-react'

import type { ProjectMemberSummary } from '@/types/projectMember'

import styles from './ProjectMemberSummaryBand.module.css'

// Beitragszusammenfassung (Referenzdesign 157-02, Workstream D): liest role_labels + counts aus
// der Summary-Response und konsumiert den additiven episodes-Count aus 157-01. „für N Folgen"
// entfällt vollständig bei 0 Folgen statt „für 0 Folgen" anzuzeigen; ohne Rollenangabe entfällt
// auch das „<Rollen> für"-Segment.
export function ProjectMemberSummaryBand({ summary }: { summary: ProjectMemberSummary }) {
  const roles = summary.role_labels.join(', ')
  const episodesClause =
    summary.counts.episodes > 0 ? ` für ${summary.counts.episodes} Folgen` : ''
  const roleSegment = roles ? `${roles}${episodesClause}` : ''
  const sentence = [
    roleSegment,
    `${summary.counts.notes} dokumentierte Arbeitsnotizen`,
    `${summary.counts.media} Medien`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={styles.band}>
      <span className={styles.icon} aria-hidden="true">
        <BarChart3 size={18} />
      </span>
      <p className={styles.text}>{sentence}</p>
    </div>
  )
}
