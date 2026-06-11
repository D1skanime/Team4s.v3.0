'use client'

import { Badge } from '@/components/ui'
import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

import styles from './FansubEdit.module.css'

type Props = {
  /** null = noch nicht geladen (neutral zeigen, D-12); 0 = geladen und leer (danger) */
  contributionCount: number | null
  note: AnimeFansubProjectNote | null | undefined // undefined = noch nicht geladen (lazy)
}

export function ProjectCockpitBadges({ contributionCount, note }: Props) {
  return (
    <div className={styles.chipRow}>
      {contributionCount === null ? null : contributionCount > 0 ? (
        <Badge variant="neutral">Mitwirkende ({contributionCount})</Badge>
      ) : (
        <Badge variant="danger">Mitwirkende fehlen</Badge>
      )}
      {note !== undefined ? (
        note !== null ? (
          <Badge variant="success">Einblick vorhanden</Badge>
        ) : (
          <Badge variant="warning">Einblick fehlt</Badge>
        )
      ) : null}
    </div>
  )
}

export default ProjectCockpitBadges
