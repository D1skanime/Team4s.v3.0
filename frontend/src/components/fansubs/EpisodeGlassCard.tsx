'use client'

import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { DisclosureTrigger } from '@/components/ui/DisclosureTrigger'
import { Text } from '@/components/ui/Text'
import type { PublicGroupedEpisode } from '@/types/episodeVersion'

import { classificationAndTypeLine, formatVersionCountLabel, mutedOnGlassTextStyle } from './episodePreviewFormat'
import styles from './EpisodeGlassCard.module.css'

// Episodentyp -> Tönungszuordnung für Cards generischen Tönungs-Hook. Card selbst kennt KEINE
// Episodentypen -- diese fachliche Zuordnung bleibt bewusst hier. `canon`/`filler` nutzen Cards
// Standardformel (Sättigung/Helligkeit/Deckkraft bleiben ungesetzt); `mixed`/`recap` hatten vor
// dieser Umstellung davon abweichende Einzelwerte und bekommen sie über die optionalen
// tintSaturation/tintLightness/tintSurfaceAlpha/tintBorderAlpha-Props exakt zurück, damit sich
// die Optik durch den Wechsel auf den generischen Hook nicht verändert. `unknown` bekommt bewusst
// keine Tönung (`undefined`).
interface EpisodeTint {
  hue: number
  saturation?: number
  lightness?: number
  surfaceAlpha?: number
  borderAlpha?: number
}
const TINT_BY_FILLER_TYPE: Record<PublicGroupedEpisode['filler_type'], EpisodeTint | undefined> = {
  canon: { hue: 222 },
  filler: { hue: 2 },
  mixed: { hue: 272, saturation: 60, lightness: 64 },
  recap: { hue: 42, saturation: 75, lightness: 58, surfaceAlpha: 14, borderAlpha: 34 },
  unknown: undefined,
}

export interface EpisodeGlassCardProps {
  episode: PublicGroupedEpisode
  episodeTitle: string
  expanded: boolean
  onToggle: () => void
  panelId: string
  /** Bereits gerenderte ReleasePreviewRow-Instanzen, vom Elternteil durchgereicht. */
  children: ReactNode
}

export function EpisodeGlassCard({ episode, episodeTitle, expanded, onToggle, panelId, children }: EpisodeGlassCardProps) {
  const tint = TINT_BY_FILLER_TYPE[episode.filler_type]
  const classificationLine = classificationAndTypeLine(episode)

  return (
    <li className={styles.listItem} data-classification={episode.filler_type}>
      <Card
        variant="glass"
        tintHue={tint?.hue}
        tintSaturation={tint?.saturation}
        tintLightness={tint?.lightness}
        tintSurfaceAlpha={tint?.surfaceAlpha}
        tintBorderAlpha={tint?.borderAlpha}
        className={styles.card}
      >
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
