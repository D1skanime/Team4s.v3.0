'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import type { PublicEpisodeVersion } from '@/types/episodeVersion'

import {
  formatReleaseDateLine,
  formatSubtitleType,
  formatTechValue,
  mutedOnGlassTextStyle,
  resolveCoopLinkGroupId,
  resolveLogoUrl,
  resolveReleaseName,
} from './episodePreviewFormat'
import styles from './ReleasePreviewRow.module.css'

export interface ReleasePreviewRowProps {
  version: PublicEpisodeVersion
  animeID: number
}

export function ReleasePreviewRow({ version, animeID }: ReleasePreviewRowProps) {
  const groups = version.fansub_groups ?? []
  const isCoop = groups.length >= 2
  const groupNameLine = groups.length > 0 ? groups.map((group) => group.name).join(' × ') : 'Unbekannt'
  const techLine = [
    formatTechValue(version.video_quality),
    formatTechValue(version.container),
    formatTechValue(version.video_codec),
    formatSubtitleType(version.subtitle_type),
  ]
    .filter((value): value is string => value !== null)
    .join(' · ')
  const extras: string[] = []
  if (version.has_images) extras.push('📷 Bilder')
  if (version.has_notes) extras.push('📝 Notizen')
  if (version.has_karaoke) extras.push('♪ Karaoke')
  const dateLine = formatReleaseDateLine(version.release_date)
  const linkGroupID = resolveCoopLinkGroupId(groups)

  return (
    // Card bringt eigene display:grid-/Padding-Regeln für ALLE Varianten mit (70+
    // Verwendungsstellen) -- das Flex-Row-Layout + Innenabstand dieser Zeile lebt deshalb in
    // einem eigenen inneren Wrapper (.row) statt auf Cards Wurzelelement selbst, sonst würden
    // beide Dateien um dieselbe display-/padding-Eigenschaft konkurrieren (Cross-Modul-
    // Spezifitätsgleichstand, nicht zuverlässig über die Bündel-Ladereihenfolge entscheidbar).
    <Card variant="glassStrong">
      <div className={styles.row}>
        <div className={styles.content}>
          <div className={styles.identity}>
            {/* Avatar löst Bild+Fallback in einem Baustein: fehlt ein Gruppenlogo, zeigt Avatar
                automatisch ein Initialen-Kürzel statt -- wie bisher -- gar nichts zu rendern. Das
                ist eine ausdrücklich gewollte Verhaltenserweiterung, kein reiner
                Baustein-Tausch. */}
            <div className={styles.logos}>
              {groups.map((group) => (
                <Avatar
                  key={group.id}
                  src={resolveLogoUrl(group.logo_url)}
                  label={group.name}
                  size="sm"
                  className={styles.logo}
                />
              ))}
            </div>
            <div className={styles.identityText}>
              <Text tone="onScrim" className={styles.groupName}>
                {groupNameLine}
                {/* Reiner Text, kein Chip/Badge/Rahmen -- bleibt deshalb bewusst Text statt
                    Badge. */}
                {isCoop ? <Text as="span" style={mutedOnGlassTextStyle} className={styles.coopLabel}> COOP</Text> : null}
              </Text>
              <Text style={mutedOnGlassTextStyle} className={styles.releaseName}>
                {resolveReleaseName(version)}
              </Text>
            </div>
          </div>

          {techLine ? (
            <Text style={mutedOnGlassTextStyle} className={styles.techLine}>{techLine}</Text>
          ) : null}

          {extras.length > 0 ? (
            <Text style={mutedOnGlassTextStyle} className={styles.extrasLine}>{extras.join('   ')}</Text>
          ) : null}

          {dateLine ? (
            <Text style={mutedOnGlassTextStyle} className={styles.dateLine}>{dateLine}</Text>
          ) : null}
        </div>

        <div className={styles.action}>
          <Button
            href={`/anime/${animeID}/group/${linkGroupID}/releases/${version.release_version_id}`}
            variant="secondary"
            size="md"
          >
            Zum Release →
          </Button>
        </div>
      </div>
    </Card>
  )
}
