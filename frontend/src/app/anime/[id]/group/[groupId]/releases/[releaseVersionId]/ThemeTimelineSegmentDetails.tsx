'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type ReactNode } from 'react'

import { Badge } from '@/components/ui'
import type { PublicReleaseSegment } from '@/types/releaseDetail'

import styles from './ThemeTimeline.module.css'

// Rein darstellerische deutsche Beschriftung, keyed auf den bereits
// kanonischen `segment.type`-Wert (CanonicalSegmentType, Plan 156-06/156-07).
// Diese Zuordnung ENTSCHEIDET nicht, welcher Typ vorliegt -- sie bildet nur
// einen bereits feststehenden Wert auf einen deutschen Anzeigetext ab.
const SEGMENT_TYPE_DISPLAY_LABEL: Record<string, string> = {
  OP: 'Opening',
  ED: 'Ending',
  INSERT: 'Insert',
  KARA: 'Karaoke',
}

export function segmentTypeDisplayLabel(type: string): string {
  return SEGMENT_TYPE_DISPLAY_LABEL[type] ?? type
}

function clock(seconds: number | null): string {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

function SegmentDetails({ segment, episodeNumber, projectPath }: { segment: PublicReleaseSegment; episodeNumber?: string; projectPath?: string | null }) {
  const start = segment.start_seconds ?? 0
  const end = segment.end_seconds ?? start
  const duration = segment.duration_seconds ?? Math.max(0, end - start)
  const participantsOnThisEpisode = !segment.applies_from_episode || segment.applies_from_episode === episodeNumber

  return (
    <div className={styles.segmentDetails}>
      {segment.preview_url ? (
        <Image className={styles.segmentPreview} src={segment.preview_url} alt={`Preview für ${segment.name}`} width={480} height={270} unoptimized loading="lazy" />
      ) : null}
      <Badge variant="muted" className={styles.typeBadge}>{segmentTypeDisplayLabel(segment.type)}</Badge>
      <strong className={styles.segmentName}>{segment.name}</strong>
      <div className={styles.timeRow}>
        <span>Dauer {clock(duration)}</span>
      </div>
      {segment.applies_through_episode ? (
        <Badge variant="muted">Gilt auch für Folge {episodeNumber}–{segment.applies_through_episode}</Badge>
      ) : null}
      {segment.participants.length > 0 && participantsOnThisEpisode ? (
        <div className={styles.participants}>
          <span className={styles.participantsLabel}>Mitwirkende</span>
          {segment.participants.map((participant, index) => (
            <div className={styles.participantRow} key={participant.member_id + '-' + index}>
              {projectPath && participant.member_slug
                ? <Link href={projectPath + '/mitwirkende/' + encodeURIComponent(participant.member_slug)} className={styles.participantName}>{participant.name}</Link>
                : <span className={styles.participantName}>{participant.name}</span>}
              <span className={styles.participantSeparator}>·</span>
              <span className={styles.participantRoles}>
                {participant.segment_role_label.split(',').map((role) => role.trim()).filter(Boolean).map((role) => (
                  <span className={styles.participantRole} key={role}>{role}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : segment.participants.length > 0 && segment.applies_from_episode ? (
        <span className={styles.participantsHint}>Mitwirkende siehe Folge {segment.applies_from_episode}</span>
      ) : null}
    </div>
  )
}

function SelectionSurface({
  segment,
  selected,
  playable,
  onSelect,
  episodeNumber,
  projectPath,
}: {
  segment: PublicReleaseSegment
  selected: boolean
  playable: boolean
  onSelect: () => void
  episodeNumber?: string
  projectPath?: string | null
}) {
  const content: ReactNode = <SegmentDetails segment={segment} episodeNumber={episodeNumber} projectPath={projectPath} />
  if (!playable) return <div className={styles.staticCardContent}>{content}</div>

  return (
    <button
      type="button"
      className={styles.cardSelection}
      aria-label={`${segmentTypeDisplayLabel(segment.type)} ${segment.name} auswählen`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {content}
    </button>
  )
}

export { SegmentDetails, SelectionSurface }
