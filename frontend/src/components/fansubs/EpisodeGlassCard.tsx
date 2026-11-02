'use client'

import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { DisclosureTrigger } from '@/components/ui/DisclosureTrigger'
import { Text } from '@/components/ui/Text'
import type { PublicGroupedEpisode } from '@/types/episodeVersion'

import { classificationAndTypeLine, formatVersionCountLabel, mutedOnGlassTextStyle } from './episodePreviewFormat'
import styles from './EpisodeGlassCard.module.css'

// Episodentyp -> Farbton-Zuordnung für Cards generischen Tönungs-Hook (tintHue, 0-360). Card
// selbst kennt KEINE Episodentypen -- diese fachliche Zuordnung bleibt bewusst hier (261102-hlg,
// D-07/D-08, RESEARCH-CARD.md Abschnitt 10). `unknown` bekommt bewusst keine Tönung (`undefined`).
const TINT_HUE_BY_FILLER_TYPE: Record<PublicGroupedEpisode['filler_type'], number | undefined> = {
  canon: 222,
  filler: 2,
  mixed: 272,
  recap: 42,
  unknown: undefined,
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
  const tintHue = TINT_HUE_BY_FILLER_TYPE[episode.filler_type]
  const classificationLine = classificationAndTypeLine(episode)

  return (
    <li className={styles.listItem} data-classification={episode.filler_type}>
      <Card variant="glass" tintHue={tintHue} className={styles.card}>
        <DisclosureTrigger
          className={styles.header}
          onClick={onToggle}
          aria-controls={panelId}
          open={expanded}
          title={
            <span className={styles.headerTitleRow}>
              <span className={styles.headerText}>
                <Text as="span" variant="meta" style={mutedOnGlassTextStyle} className={styles.episodeNumber}>
                  Folge {episode.episode_number}
                </Text>
                <Text as="span" variant="body" tone="onScrim" className={styles.episodeTitle}>
                  {episodeTitle}
                </Text>
                <Text as="span" variant="small" style={mutedOnGlassTextStyle} className={styles.classificationLine}>
                  {classificationLine}
                </Text>
              </span>
              <Text as="span" variant="meta" style={mutedOnGlassTextStyle} className={styles.versionCounter}>
                {formatVersionCountLabel(episode.version_count)}
              </Text>
            </span>
          }
        />

        {expanded ? (
          <div id={panelId} className={styles.versionList}>
            {children}
          </div>
        ) : null}
      </Card>
    </li>
  )
}
