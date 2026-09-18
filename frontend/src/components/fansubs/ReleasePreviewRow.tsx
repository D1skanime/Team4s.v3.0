'use client'

import Image from 'next/image'

import { Button } from '@/components/ui/Button'
import type { PublicEpisodeVersion } from '@/types/episodeVersion'

import {
  formatReleaseDateLine,
  formatSubtitleType,
  formatTechValue,
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
    <div className={styles.row}>
      <div className={styles.content}>
        <div className={styles.identity}>
          <div className={styles.logos}>
            {groups.map((group) => {
              const logoURL = resolveLogoUrl(group.logo_url)
              return logoURL ? (
                <Image
                  key={group.id}
                  src={logoURL}
                  alt=""
                  className={styles.logo}
                  width={36}
                  height={36}
                  unoptimized
                />
              ) : null
            })}
          </div>
          <div className={styles.identityText}>
            <p className={styles.groupName}>
              {groupNameLine}
              {isCoop ? <span className={styles.coopLabel}> COOP</span> : null}
            </p>
            <p className={styles.releaseName}>{resolveReleaseName(version)}</p>
          </div>
        </div>

        {techLine ? <p className={styles.techLine}>{techLine}</p> : null}

        {extras.length > 0 ? <p className={styles.extrasLine}>{extras.join('   ')}</p> : null}

        {dateLine ? <p className={styles.dateLine}>{dateLine}</p> : null}
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
  )
}
