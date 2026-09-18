'use client'

import type { ReactNode } from 'react'

import { DisclosureIndicator } from '@/components/ui/DisclosureIndicator'
import { classNames } from '@/components/ui/classNames'
import type { PublicGroupedEpisode } from '@/types/episodeVersion'

import { classificationAndTypeLine, formatVersionCountLabel } from './episodePreviewFormat'
import styles from './EpisodeGlassCard.module.css'

// UI-SPEC decision 4: unknown bekommt weder Tint noch Klassifikations-Label -- die neutrale
// Glasflaeche (styles.card ohne Zusatzklasse) traegt die Karte in diesem Fall allein.
const TINT_CLASS_BY_FILLER_TYPE: Record<PublicGroupedEpisode['filler_type'], string | null> = {
  canon: 'tintCanon',
  filler: 'tintFiller',
  mixed: 'tintMixed',
  recap: 'tintRecap',
  unknown: null,
}

export interface EpisodeGlassCardProps {
  episode: PublicGroupedEpisode
  episodeTitle: string
  expanded: boolean
  onToggle: () => void
  panelId: string
  /** Bereits gerenderte ReleasePreviewRow-Instanzen des Elternteils (Task 3). */
  children: ReactNode
}

export function EpisodeGlassCard({ episode, episodeTitle, expanded, onToggle, panelId, children }: EpisodeGlassCardProps) {
  const tintClassKey = TINT_CLASS_BY_FILLER_TYPE[episode.filler_type]
  const classificationLine = classificationAndTypeLine(episode)

  return (
    <li
      className={classNames(styles.card, tintClassKey ? styles[tintClassKey] : null)}
      data-classification={episode.filler_type}
    >
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <div className={styles.headerText}>
          <p className={styles.episodeNumber}>Folge {episode.episode_number}</p>
          <p className={styles.episodeTitle}>{episodeTitle}</p>
          <p className={styles.classificationLine}>{classificationLine}</p>
        </div>
        <span className={styles.versionCounter}>
          <span>{formatVersionCountLabel(episode.version_count)}</span>
          <DisclosureIndicator open={expanded} size="sm" className={styles.disclosureIcon} />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className={styles.versionList}>
          {children}
        </div>
      ) : null}
    </li>
  )
}
