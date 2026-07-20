'use client'

import { Lock, Play } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicReleaseSegment } from '@/types/releaseDetail'

import styles from './ThemeTimeline.module.css'

interface ThemeTimelineProps {
  releaseVersionID: number
  episodeDurationSeconds: number | null
  segments: PublicReleaseSegment[]
  initialSegmentID?: number | null
  autoPlayInitial?: boolean
}

type SegmentGeometry = {
  segment: PublicReleaseSegment
  leftPercent: number
  widthPercent: number
  centerPercent: number
  labelLane: number
  labelAlignment: 'start' | 'center' | 'end'
}

const TYPE_LABELS: Record<string, string> = {
  OP: 'Opening',
  ED: 'Ending',
  IN: 'Insert',
  MIDDLE: 'Middle',
  KARA: 'Karaoke',
  OTHER: 'Other',
}

const TYPE_STYLE_KEYS: Record<string, keyof typeof styles> = {
  OP: 'typeOp',
  'OP KARA': 'typeOp',
  OPENING: 'typeOp',
  'OPENING KARA': 'typeOp',
  ED: 'typeEd',
  'ED KARA': 'typeEd',
  ENDING: 'typeEd',
  'ENDING KARA': 'typeEd',
  IN: 'typeIn',
  'IN KARA': 'typeIn',
  INSERT: 'typeIn',
  'INSERT KARA': 'typeIn',
  MIDDLE: 'typeMiddle',
  'MIDDLE KARA': 'typeMiddle',
  KARA: 'typeKara',
  KARAOKE: 'typeKara',
  OTHER: 'typeOther',
  'OTHER KARA': 'typeOther',
}

const LABEL_HALF_WIDTH_PERCENT = 9
const LABEL_GAP_PERCENT = 1

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function clock(seconds: number | null): string {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

function typeKey(type: string): keyof typeof styles {
  const normalized = type.trim().toUpperCase().replace(/[\s_-]+/g, ' ')
  return TYPE_STYLE_KEYS[normalized] ?? 'typeOther'
}

function segmentTypeLabel(type: string): string {
  return TYPE_LABELS[type.toUpperCase()] ?? type
}

function resolveDuration(episodeDurationSeconds: number | null, segments: PublicReleaseSegment[]): number {
  if (episodeDurationSeconds !== null && episodeDurationSeconds > 0) return episodeDurationSeconds
  return Math.max(1, ...segments.map((segment) => segment.end_seconds ?? 0))
}

function allocateGeometry(segments: PublicReleaseSegment[], duration: number): SegmentGeometry[] {
  const raw = segments.map((segment, index) => {
    const start = segment.start_seconds ?? 0
    const end = segment.end_seconds ?? start
    const leftPercent = clamp(start / duration * 100, 0, 100)
    const widthPercent = clamp((end - start) / duration * 100, 0, 100 - leftPercent)
    const centerPercent = leftPercent + widthPercent / 2
    const labelAlignment = centerPercent < LABEL_HALF_WIDTH_PERCENT
      ? 'start' as const
      : centerPercent > 100 - LABEL_HALF_WIDTH_PERCENT
        ? 'end' as const
        : 'center' as const
    const labelStart = labelAlignment === 'start'
      ? 0
      : labelAlignment === 'end'
        ? 100 - LABEL_HALF_WIDTH_PERCENT * 2
        : centerPercent - LABEL_HALF_WIDTH_PERCENT
    return { segment, index, leftPercent, widthPercent, centerPercent, labelAlignment, labelStart }
  })

  const laneEnds: number[] = []
  const lanes = new Map<number, number>()
  ;[...raw]
    .sort((left, right) => left.labelStart - right.labelStart || left.index - right.index)
    .forEach((item) => {
      const availableLane = laneEnds.findIndex(laneEnd => item.labelStart >= laneEnd + LABEL_GAP_PERCENT)
      const labelLane = availableLane >= 0 ? availableLane : laneEnds.length
      laneEnds[labelLane] = item.labelStart + LABEL_HALF_WIDTH_PERCENT * 2
      lanes.set(item.index, labelLane)
    })

  return raw.map((item) => ({
    segment: item.segment,
    leftPercent: item.leftPercent,
    widthPercent: item.widthPercent,
    centerPercent: item.centerPercent,
    labelAlignment: item.labelAlignment,
    labelLane: lanes.get(item.index) ?? 0,
  }))
}

function geometryStyle(geometry: SegmentGeometry): CSSProperties {
  return {
    '--segment-left': `${geometry.leftPercent}%`,
    '--segment-width': `${geometry.widthPercent}%`,
    '--segment-center': `${geometry.centerPercent}%`,
    '--segment-label-lane': geometry.labelLane,
  } as CSSProperties
}

function segmentClassName(segment: PublicReleaseSegment, baseClass: string): string {
  return `${baseClass} ${styles[typeKey(segment.type)]}`
}

function SegmentDetails({ segment }: { segment: PublicReleaseSegment }) {
  const start = segment.start_seconds ?? 0
  const end = segment.end_seconds ?? start
  const duration = segment.duration_seconds ?? Math.max(0, end - start)

  return (
    <div className={styles.segmentDetails}>
      <Badge variant="muted" className={styles.typeBadge}>{segmentTypeLabel(segment.type)}</Badge>
      <strong className={styles.segmentName}>{segment.name}</strong>
      <div className={styles.timeRow}>
        <span>{clock(start)}–{clock(end)}</span>
        <span>Dauer {clock(duration)}</span>
      </div>
      {segment.participants.length > 0 ? (
        <span className={styles.participants}>
          {segment.participants.map((participant) => `${participant.name} · ${participant.role_label}`).join(', ')}
        </span>
      ) : null}
    </div>
  )
}

function SelectionSurface({
  segment,
  selected,
  playable,
  onSelect,
}: {
  segment: PublicReleaseSegment
  selected: boolean
  playable: boolean
  onSelect: () => void
}) {
  const content: ReactNode = <SegmentDetails segment={segment} />
  if (!playable) return <div className={styles.staticCardContent}>{content}</div>

  return (
    <button
      type="button"
      className={styles.cardSelection}
      aria-label={`${segmentTypeLabel(segment.type)} ${segment.name} auswählen`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {content}
    </button>
  )
}

export function ThemeTimeline({
  releaseVersionID,
  episodeDurationSeconds,
  segments,
  initialSegmentID = null,
  autoPlayInitial = false,
}: ThemeTimelineProps) {
  const session = useAuthSession()
  const hasSession = session.isClientInitialized && (session.hasAccessToken || session.hasRefreshToken)
  const validInitialSegmentID = segments.some((segment) => segment.theme_segment_id === initialSegmentID)
    ? initialSegmentID
    : null
  const [selectedSegmentID, setSelectedSegmentID] = useState<number | null>(validInitialSegmentID)
  const [streamSegmentID, setStreamSegmentID] = useState<number | null>(null)
  const [streamAttempt, setStreamAttempt] = useState(0)
  const [playbackError, setPlaybackError] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastVideoRef = useRef<HTMLVideoElement | null>(null)
  const initialPlaybackHandled = useRef(false)
  const duration = resolveDuration(episodeDurationSeconds, segments)
  const geometries = useMemo(() => allocateGeometry(segments, duration), [duration, segments])
  const labelLaneCount = Math.max(1, ...geometries.map(geometry => geometry.labelLane + 1))
  const selectedSegment = segments.find((segment) => segment.theme_segment_id === selectedSegmentID) ?? null
  const activeStreamSegment = hasSession
    ? segments.find((segment) => segment.theme_segment_id === streamSegmentID && segment.readiness === 'ready') ?? null
    : null

  const stopCurrentStream = useCallback(() => {
    const player = videoRef.current ?? lastVideoRef.current
    if (!player) return
    player.pause()
    player.removeAttribute('src')
    player.load()
  }, [])

  const playSegment = useCallback((segment: PublicReleaseSegment) => {
    if (!hasSession || segment.readiness !== 'ready') return
    stopCurrentStream()
    setPlaybackError(false)
    setSelectedSegmentID(segment.theme_segment_id)
    setStreamSegmentID(segment.theme_segment_id)
    setStreamAttempt((attempt) => attempt + 1)
  }, [hasSession, stopCurrentStream])

  const selectSegment = (segment: PublicReleaseSegment) => {
    if (!hasSession || segment.readiness !== 'ready') return
    setSelectedSegmentID(segment.theme_segment_id)
  }

  useEffect(() => {
    if (initialPlaybackHandled.current || !autoPlayInitial || !validInitialSegmentID) return
    initialPlaybackHandled.current = true
    const initialSegment = segments.find((segment) => segment.theme_segment_id === validInitialSegmentID)
    if (!hasSession || initialSegment?.readiness !== 'ready') return
    const timeout = window.setTimeout(() => playSegment(initialSegment), 0)
    return () => window.clearTimeout(timeout)
  }, [autoPlayInitial, hasSession, playSegment, segments, validInitialSegmentID])

  useEffect(() => {
    if (hasSession || streamSegmentID === null) return
    stopCurrentStream()
    const timeout = window.setTimeout(() => setStreamSegmentID(null), 0)
    return () => window.clearTimeout(timeout)
  }, [hasSession, stopCurrentStream, streamSegmentID])

  useEffect(() => () => stopCurrentStream(), [stopCurrentStream])

  if (segments.length === 0) return null

  return (
    <section id="op-ed-middle" className={styles.timelineSection} data-release-atmosphere-band="true">
      <SectionHeader title="Karas" underline />

      <div className={styles.desktopTimeline} aria-label="Kara-Zeitleiste der Episode">
        <div className={styles.timelineAnchors} aria-label="Gesamte Episodendauer">
          <time data-testid="kara-timeline-anchor" data-edge="start"><span>Start</span>{clock(0)}</time>
          <span>Gesamte Episode</span>
          <time data-testid="kara-timeline-anchor" data-edge="end"><span>Ende</span>{clock(duration)}</time>
        </div>

        <div className={styles.trackStage} style={{ '--label-lane-count': labelLaneCount } as CSSProperties}>
          <div className={styles.track} aria-hidden="true" />
          {geometries.map((geometry) => {
            const { segment } = geometry
            const playable = hasSession && segment.readiness === 'ready'
            const selected = selectedSegmentID === segment.theme_segment_id
            const style = geometryStyle(geometry)
            return (
              <div key={segment.theme_segment_id} className={styles.segmentLayer} style={style}>
                <span
                  className={segmentClassName(segment, styles.segmentGeometry)}
                  data-testid={`kara-segment-geometry-${segment.theme_segment_id}`}
                  style={{ left: `${geometry.leftPercent}%`, width: `${geometry.widthPercent}%` }}
                  aria-hidden="true"
                />
                {playable ? (
                  <button
                    type="button"
                    className={`${styles.hitTarget} ${selected ? styles.hitTargetSelected : ''}`}
                    data-testid={`kara-hit-target-${segment.theme_segment_id}`}
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    aria-label={`${segmentTypeLabel(segment.type)} ${segment.name}, ${clock(segment.start_seconds)} bis ${clock(segment.end_seconds)}, Dauer ${clock(segment.duration_seconds)}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => playSegment(segment)}
                  />
                ) : null}
                <span
                  className={segmentClassName(segment, styles.outsideLabel)}
                  data-testid={`kara-outside-label-${segment.theme_segment_id}`}
                  data-lane={geometry.labelLane}
                  data-alignment={geometry.labelAlignment}
                >
                  <strong>{segment.name}</strong>
                  <span>{segmentTypeLabel(segment.type)} · {clock(segment.start_seconds)}–{clock(segment.end_seconds)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.segmentCards}>
        {segments.map((segment) => {
          const playable = hasSession && segment.readiness === 'ready'
          const selected = selectedSegmentID === segment.theme_segment_id
          return (
            <Card
              key={segment.theme_segment_id}
              variant="flat"
              className={segmentClassName(segment, `${styles.segmentCard} ${selected ? styles.segmentCardSelected : ''}`)}
            >
              <SelectionSurface
                segment={segment}
                selected={selected}
                playable={playable}
                onSelect={() => selectSegment(segment)}
              />
              {playable ? (
                <Button
                  fullWidth
                  leftIcon={<Play size={16} aria-hidden="true" />}
                  className={styles.playButton}
                  onClick={() => playSegment(segment)}
                >
                  Kara abspielen
                </Button>
              ) : null}
              {session.isClientInitialized && !hasSession && segment.readiness === 'ready' ? (
                <Button
                  href="/login"
                  variant="secondary"
                  fullWidth
                  leftIcon={<Lock size={16} aria-hidden="true" data-testid={`kara-login-lock-${segment.theme_segment_id}`} />}
                  className={styles.playButton}
                >
                  Anmelden zum Abspielen
                </Button>
              ) : null}
              {segment.readiness !== 'ready' ? (
                <span className={styles.unavailable}>Noch nicht abspielbar</span>
              ) : null}
            </Card>
          )
        })}
      </div>

      <span className={styles.liveRegion} aria-live="polite">
        {selectedSegment ? `Kara ${selectedSegment.name} ausgewählt` : ''}
      </span>

      {activeStreamSegment ? (
        <div className={styles.playerRegion}>
          <video
            key={`${activeStreamSegment.theme_segment_id}-${streamAttempt}`}
            ref={(node) => {
              videoRef.current = node
              if (node) lastVideoRef.current = node
            }}
            className={styles.player}
            src={`/api/segments/${activeStreamSegment.theme_segment_id}/stream?release_version_id=${releaseVersionID}`}
            controls
            autoPlay
            playsInline
            aria-label={`Kara: ${activeStreamSegment.name}`}
            onLoadedData={(event) => { void event.currentTarget.play().catch(() => undefined) }}
            onError={() => setPlaybackError(true)}
          />
          {playbackError ? (
            <div className={styles.playerError}>
              <p>Dieses Kara-Segment konnte nicht abgespielt werden. Bitte versuche es erneut.</p>
              <Button variant="secondary" onClick={() => playSegment(activeStreamSegment)}>Erneut versuchen</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
