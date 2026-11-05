'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Cluster } from '@/components/ui/Cluster'
import { Stack } from '@/components/ui/Stack'
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

  // D-20: Gruppenname/Release-Name und die drei Datenzeilen (Technik/Extras/Datum) leben in
  // EINEM vertikalen Stack, damit die Datenzeilen zwangsläufig dieselbe Spalte wie der
  // Gruppenname belegen -- statt (wie vor dem Fix) als Geschwister eines einspaltigen Grids auf
  // Höhe der Avatar-Spalte zu beginnen. Einmal gebaut, unten in beiden Zweigen (mit/ohne Avatare)
  // wiederverwendet, damit die fünf Textzeilen nur einmal geschrieben stehen.
  const textLines = (
    <Stack gap="relatedContent">
      <Text tone="onScrim" className={styles.groupName}>
        {groupNameLine}
        {/* Reiner Text, kein Chip/Badge/Rahmen -- bleibt deshalb bewusst Text statt
            Badge. */}
        {isCoop ? <Text as="span" style={mutedOnGlassTextStyle} className={styles.coopLabel}> COOP</Text> : null}
      </Text>
      <Text style={mutedOnGlassTextStyle} className={styles.releaseName}>
        {resolveReleaseName(version)}
      </Text>

      {techLine ? (
        <Text style={mutedOnGlassTextStyle} className={styles.techLine}>{techLine}</Text>
      ) : null}

      {extras.length > 0 ? (
        <Text style={mutedOnGlassTextStyle} className={styles.extrasLine}>{extras.join('   ')}</Text>
      ) : null}

      {dateLine ? (
        <Text style={mutedOnGlassTextStyle} className={styles.dateLine}>{dateLine}</Text>
      ) : null}
    </Stack>
  )

  return (
    // Innenabstand kommt jetzt ausschliesslich über Cards generischen padding-Override-Hook
    // (Befund B, Runde 3) -- der zuvor hier dokumentierte Zustaendigkeits-Konflikt zwischen
    // Cards eigenen Varianten-Regeln und einem lokalen `padding:` auf .row entfaellt dadurch, da
    // .row selbst kein `padding:` mehr deklariert. Das responsive Flex-Row-Layout von .row bleibt
    // eine eng dokumentierte Einzelfall-Ausnahme (siehe ReleasePreviewRow.module.css).
    <Card variant="glassStrong" padding="content">
      <div className={styles.row}>
        {groups.length > 0 ? (
          // Avatar(e) + Text-Stack nebeneinander, NIE übereinander (wrap={false}) -- die
          // Spaltenbreite der Avatar-Gruppe passt sich dadurch von selbst der tatsächlichen
          // Breite an (ein Avatar im Normalfall, zwei beim Koop-Fall), ohne ein festes Maß
          // vorzuschreiben.
          <Cluster gap="contentPair" align="start" wrap={false} className={styles.body}>
            {/* Avatar löst Bild+Fallback in einem Baustein: fehlt ein Gruppenlogo, zeigt Avatar
                automatisch ein Initialen-Kürzel statt -- wie bisher -- gar nichts zu rendern. Das
                ist eine ausdrücklich gewollte Verhaltenserweiterung, kein reiner
                Baustein-Tausch. */}
            <Cluster gap="badgeRow" className={styles.logos}>
              {groups.map((group) => (
                <Avatar
                  key={group.id}
                  src={resolveLogoUrl(group.logo_url)}
                  label={group.name}
                  size="sm"
                  className={styles.logo}
                />
              ))}
            </Cluster>
            {textLines}
          </Cluster>
        ) : (
          // D-20/Pitfall 1: bei null Gruppen wird GAR KEIN umschließender Cluster gerendert --
          // sonst würde dessen `gap` weiterhin reserviert und genau die "Lücke ohne Avatar"-
          // Regression aus Befund 20 nachbilden, obwohl die erste Spalte leer ist.
          <div className={styles.body}>{textLines}</div>
        )}

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
