'use client'

import { Badge } from '@/components/ui'
import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

import styles from './FansubEdit.module.css'

type Props = {
  /** null = noch nicht geladen (neutral zeigen, D-12); 0 = geladen und leer (danger) */
  contributionCount: number | null
  note?: AnimeFansubProjectNote | null // Legacy: undefined = noch nicht geladen (lazy)
  hasProjectNote?: boolean | null // undefined = noch nicht geladen (lazy)
}

export function ProjectCockpitBadges({ contributionCount, note, hasProjectNote }: Props) {
  const notePresent =
    hasProjectNote === undefined
      ? note === undefined
        ? undefined
        : note !== null
      : Boolean(hasProjectNote)

  return (
    <div className={styles.chipRow}>
      {contributionCount === null ? null : contributionCount > 0 ? (
        <Badge variant="neutral">Mitwirkende ({contributionCount})</Badge>
      ) : (
        <Badge variant="danger">Mitwirkende fehlen</Badge>
      )}
      {notePresent !== undefined ? (
        notePresent ? (
          <Badge variant="success">Einblick vorhanden</Badge>
        ) : (
          <Badge variant="warning">Einblick fehlt</Badge>
        )
      ) : null}
    </div>
  )
}

export default ProjectCockpitBadges
