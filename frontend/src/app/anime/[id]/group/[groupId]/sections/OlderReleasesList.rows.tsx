'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronRight, Eye, FileText, Image as ImageIcon, Play, Users } from 'lucide-react'

import { Accordion, AccentRule, Button, Card } from '@/components/ui'
import { buildFansubReleaseHref } from '@/lib/fansubProjectRoutes'
import { resolvePublicApiUrl } from '@/lib/publicApiUrl'
import type { EpisodeReleaseSummary, ReleaseTimelineSegment } from '@/types/group'

import styles from './OlderReleasesList.module.css'

const KARA_GROUP_LIMIT = 3

function episodeLabel(episode: EpisodeReleaseSummary): string {
  const label = episode.episode_number_label?.trim()
  if (!label) return `Folge ${episode.episode_number}`
  return /^\d+$/.test(label) ? `Folge ${label}` : label
}

function versionOnlyLabel(label?: string | null): string {
  return label?.match(/\bv(?:ersion)?\.?\s*\d+[a-z0-9._-]*/i)?.[0] ?? ''
}

function segmentDisplayLabel(type: string): string {
  switch (type.toUpperCase()) {
    case 'OP': return 'OP'
    case 'ED': return 'ED'
    case 'MIDDLE': return 'Middle'
    case 'KARA':
    case 'INSERT':
    case 'IN': return 'Karaoke'
    default: return type
  }
}

function startingSegments(episode: EpisodeReleaseSummary): ReleaseTimelineSegment[] {
  return (episode.timeline_segments ?? []).filter((segment) => (
    segment.start_episode == null || segment.start_episode === episode.episode_number
  ))
}

function karaGroup(segmentType: string): string {
  const type = segmentType.toUpperCase()
  if (type === 'OP') return 'Opening'
  if (type === 'ED') return 'Ending'
  if (type === 'INSERT' || type === 'IN') return 'Insert Song'
  return 'Karaoke / Sonstige'
}

function buildKaraHref(detailHref: string, segmentID: number): string {
  return `${detailHref}?kara=${segmentID}&autoplay=1#op-ed-middle`
}

function segmentClassName(segmentType: string): string {
  const type = segmentType.toUpperCase()
  if (type === 'OP') return `${styles.segmentPill} ${styles.segmentOp}`
  if (type === 'ED') return `${styles.segmentPill} ${styles.segmentEd}`
  if (type === 'INSERT') return `${styles.segmentPill} ${styles.segmentInsert}`
  if (type === 'KARA') return `${styles.segmentPill} ${styles.segmentKara}`
  return styles.segmentPill
}

interface RowProps {
  animeID: number
  groupID: number
  episode: EpisodeReleaseSummary
  canonicalProjectPath?: string | null
}

export function DesktopReleaseRow({ animeID, groupID, episode, canonicalProjectPath }: RowProps) {
  const detailHref = buildFansubReleaseHref({ animeID, groupID, releaseVersionID: episode.id, canonicalProjectPath })
  const contextLabel = episode.title?.trim() || 'Unbenanntes Release'
  const versionLabel = versionOnlyLabel(episode.version_label) || 'Version'

  return (
    <Card variant="flat" className={styles.desktopReleaseCard}>
      <Link href={detailHref} className={styles.desktopReleaseImageLink} aria-label={episodeLabel(episode) + ' öffnen'}>
        {episode.thumbnail_url ? (
          <Image
            src={resolvePublicApiUrl(episode.thumbnail_url)}
            alt={'Vorschau zu ' + episodeLabel(episode)}
            width={160}
            height={90}
            unoptimized
            className={styles.desktopReleaseImage}
          />
        ) : (
          <span className={styles.desktopReleasePlaceholder} aria-hidden="true">
            <ImageIcon size={22} />
          </span>
        )}
      </Link>
      <div className={styles.desktopReleaseBody}>
        <Link href={detailHref} className={styles.desktopReleaseTitle}>{episodeLabel(episode)}</Link>
        <p className={styles.desktopReleaseMeta}>{contextLabel} · {versionLabel}</p>
        {startingSegments(episode).length > 0 ? (
          <div className={styles.desktopReleaseSegments} aria-label="Beginnende Segmente">
            {startingSegments(episode).map((segment) => (
              <span key={segment.id} className={styles.desktopReleaseSegment} title={segment.title}>
                {segmentDisplayLabel(segment.type)}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.desktopReleaseCounts}>
          <span><ImageIcon size={14} aria-hidden="true" />{episode.images_count ?? 0} Bilder</span>
          <span><FileText size={14} aria-hidden="true" />{episode.notes_count ?? 0} Texte</span>
        </div>
      </div>
      <Link href={detailHref} className={styles.desktopReleaseArrow} aria-label={episodeLabel(episode) + ' öffnen'}>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  )
}
function KaraGroup({
  title,
  segments,
  detailHref,
}: {
  title: string
  segments: ReleaseTimelineSegment[]
  detailHref: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleSegments = expanded ? segments : segments.slice(0, KARA_GROUP_LIMIT)

  return (
    <Card variant="flat" className={styles.timelineTrack}>
      <p className={styles.timelineTimes}>{title}</p>
      <AccentRule thickness="thin" />
      {visibleSegments.map((segment) => (
        <Link
          key={segment.id}
          href={buildKaraHref(detailHref, segment.id)}
          className={styles.segmentPill}
          aria-label={`${segment.title} auf der Release-Seite abspielen`}
        >
          <Play size={16} aria-hidden="true" />
          <span className={styles.segmentType}>{segment.title || segment.type}</span>
          {segment.version ? <span className={styles.segmentTime}>{segment.version}</span> : null}
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ))}
      {segments.length > KARA_GROUP_LIMIT ? (
        <Button variant="subtle" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Weniger anzeigen' : `${segments.length - KARA_GROUP_LIMIT} weitere anzeigen`}
        </Button>
      ) : null}
    </Card>
  )
}

function ReleaseDetails({ animeID, groupID, episode, canonicalProjectPath }: RowProps) {
  const detailHref = buildFansubReleaseHref({
    animeID,
    groupID,
    releaseVersionID: episode.id,
    canonicalProjectPath,
  })
  const groups = (episode.timeline_segments ?? []).reduce<Record<string, ReleaseTimelineSegment[]>>((result, segment) => {
    const group = karaGroup(segment.type)
    result[group] = [...(result[group] ?? []), segment]
    return result
  }, {})

  return (
    <Card variant="nestedFlat" className={styles.row}>
      {episode.thumbnail_url ? (
        <Image
          src={resolvePublicApiUrl(episode.thumbnail_url)}
          alt={`Vorschau zu ${episodeLabel(episode)}`}
          width={640}
          height={360}
          unoptimized
          style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)' }}
        />
      ) : null}
      {Object.entries(groups).length > 0 ? (
        <div className={styles.timelinePreview}>
          {Object.entries(groups).map(([title, segments]) => (
            <KaraGroup key={title} title={title} segments={segments} detailHref={detailHref} />
          ))}
        </div>
      ) : (
        <p className={styles.rowMeta}>Für dieses Release sind keine Karas hinterlegt.</p>
      )}
    </Card>
  )
}

function MobileReleaseHeader({ episode }: { episode: EpisodeReleaseSummary }) {
  const contextLabel = episode.title?.trim() ?? ''
  const versionLabel = versionOnlyLabel(episode.version_label)

  return (
    <div className={styles.rowHeader}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitleLine}>
          <strong className={styles.rowTitle}>{episodeLabel(episode)}</strong>
          <span className={styles.rowTitleDivider} aria-hidden="true">|</span>
          <span className={styles.rowVersion}>{versionLabel}</span>
          <span className={styles.rowTitleDivider} aria-hidden="true">|</span>
          <span className={styles.rowMeta}>{contextLabel}</span>
        </div>
        <div className={styles.rowCountGroup}>
          <span className={styles.rowCount}><ImageIcon size={14} aria-hidden="true" />{episode.images_count ?? 0} Bilder</span>
          <span className={styles.rowCount}><FileText size={14} aria-hidden="true" />{episode.notes_count ?? 0} Texte</span>
          <span className={styles.rowCount}><Users size={14} aria-hidden="true" />{episode.contributors_count ?? 0} Fansubber</span>
        </div>
      </div>
    </div>
  )
}

export function MobileDirectReleaseRow({ animeID, groupID, episode, canonicalProjectPath }: RowProps) {
  const detailHref = buildFansubReleaseHref({
    animeID,
    groupID,
    releaseVersionID: episode.id,
    canonicalProjectPath,
  })

  return (
    <Card variant="flat" className={`${styles.row} ${styles.mobileDirectRow}`}>
      <MobileReleaseHeader episode={episode} />
      <Button
        href={detailHref}
        variant="subtle"
        size="sm"
        leftIcon={<Eye size={15} aria-hidden="true" />}
        className={styles.mobileDirectAction}
      >
        Release öffnen
      </Button>
    </Card>
  )
}

/**
 * AO4-Bugfix (260718-2w4): "Release öffnen" muss bei Kara-Folgen ohne Aufklappen
 * sichtbar sein. Header + Release-Link liegen deshalb strukturell
 * AUSSERHALB des Accordion-Toggle-Buttons; nur die Kara-Segmentliste
 * (ReleaseDetails) steckt im aufklappbaren Bereich.
 */
export function MobileKaraReleaseRow({ animeID, groupID, episode, canonicalProjectPath }: RowProps) {
  const detailHref = buildFansubReleaseHref({
    animeID,
    groupID,
    releaseVersionID: episode.id,
    canonicalProjectPath,
  })
  const karaCount = episode.timeline_segments?.length ?? 0
  const karaDisclosureTitle = karaCount === 1 ? '1 Kara anzeigen' : `${karaCount} Karas anzeigen`

  return (
    <Card variant="flat" className={`${styles.row} ${styles.mobileDirectRow}`}>
      <MobileReleaseHeader episode={episode} />
      <Button
        href={detailHref}
        variant="subtle"
        size="sm"
        leftIcon={<Eye size={15} aria-hidden="true" />}
        className={styles.mobileDirectAction}
      >
        Release öffnen
      </Button>
      <Accordion
        items={[{
          id: String(episode.id),
          title: karaDisclosureTitle,
          children: (
            <ReleaseDetails
              animeID={animeID}
              groupID={groupID}
              episode={episode}
              canonicalProjectPath={canonicalProjectPath}
            />
          ),
        }]}
      />
    </Card>
  )
}
