'use client'

import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { Cluster } from '@/components/ui/Cluster'
import { DisclosureTrigger } from '@/components/ui/DisclosureTrigger'
import { Divider } from '@/components/ui/Divider'
import { Stack } from '@/components/ui/Stack'
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
      >
        <DisclosureTrigger
          onClick={onToggle}
          aria-controls={panelId}
          open={expanded}
          title={
            <Cluster
              as="span"
              gap="labelWithTrailingMeta"
              justify="between"
              align="center"
              growFirstChild
              wrap={false}
            >
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
            </Cluster>
          }
        />

        {expanded ? (
          // Die äußere EpisodeGlassCard (variant="glass") ist selbst ein Grundbaustein mit
          // display:grid + einem EINZIGEN, festen Abstands-Token zwischen all ihren direkten
          // Kindern (--card-gap) -- Divider und die verschachtelte Versionslisten-Card dürfen
          // deshalb NICHT als zwei eigene Geschwister-Kinder dieser äußeren Karte landen (das
          // würde einen ZWEITEN --card-gap-Abstand zwischen Header/Divider UND Divider/Liste
          // einfügen, per Playwright-Vollbild-Byte-Diff als 26px zusätzliche Kartenhöhe
          // nachgewiesen). Ein Stack gap="none" bündelt beide stattdessen zu einem EINZIGEN
          // Grid-Kind, exakt wie zuvor nur das eine <div id={panelId}>.
          <Stack gap="none">
            {/* Ersetzt den vormaligen border-top von .versionList -- die sichtbare Trennlinie
                zum Kopfzeilenbereich kommt jetzt aus einem echten Divider-Grundbaustein statt
                einer lokalen Rahmen-Deklaration. spacing="none": der komplette Vorlauf-Abstand
                (vormals exakt 1px border-top, direkt am oberen Kartenrand, ohne eigenen
                Aussenabstand) kommt bereits vollständig aus dem --card-gap der äußeren Karte. */}
            <Divider tone="onMedia" spacing="none" />
            {/* Die verschachtelte Versionslisten-Card braucht keine eigene CSS-Klasse (keine
                lokale .versionList-Klasse mit border-width:0/border-radius:0/background:
                transparent) -- Cards seamless-Prop zeroed Cards eigenen 1px-Rahmen samt
                Eckenrundung und variant="flat"s Farbverlaufsfläche (`--card-flat-bg`) bereits
                selbst über eine eigene Modifikatorklasse, sodass die Versionsliste randlos
                INNERHALB der bereits eigenständig gerahmten äußeren
                Episodenkarte sitzt (direkt nachgeprüft: keine bestehende Card-Variante erreicht
                border-width:0 UND border-radius:0 UND background:transparent gleichzeitig). Das
                "dividedSection"-Polsterungs-Rezept (oben/seitlich/unten, siehe Card.tsx) bleibt
                unverändert. id={panelId} wandert vom vormaligen <div> auf die Card selbst, damit
                DisclosureTriggers aria-controls weiterhin genau dieses Element trifft. */}
            <Card id={panelId} variant="flat" padding="dividedSection" seamless>
              {/* Die einzelnen ReleasePreviewRow-Instanzen bekommen ihren
                  Zwischenabstand über Stacks "independentBlocks"-Zweck (trennt voneinander
                  unabhängige Episodenzeilen) statt eines lokalen CSS-Grids -- exakt derselbe
                  Zweck, den Stack.tsx für "einzelne Episodenzeilen in der Episodenliste" bereits
                  dokumentiert. */}
              <Stack gap="independentBlocks">{children}</Stack>
            </Card>
          </Stack>
        ) : null}
      </Card>
    </li>
  )
}
