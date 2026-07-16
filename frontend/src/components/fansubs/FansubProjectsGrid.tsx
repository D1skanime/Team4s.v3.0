'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'

import { Button } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectBannerCard } from './FansubProjectBannerCard'
import styles from './FansubProjectsSection.module.css'

interface FansubProjectsGridItem {
  project: PublicFansubProject
  statusLabel: string
  statusVariant: 'warning' | 'success' | 'danger'
}

interface FansubProjectsGridProps {
  items: FansubProjectsGridItem[]
  groupId: number
  groupSlug?: string | null
}

const PREVIEW_COUNT = 20

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * AO6-06/AO7-03/AO8: Projekte als horizontales Slide-Karussell. Kartenbreite wird per
 * CSS aus --cards-visible berechnet (ganze Kartenzahl, skaliert mit der Breite), die
 * ersten PREVIEW_COUNT Projekte sind per Maus-Drag (mit Schwung/Momentum), Touch, Pfeilen
 * und Tastatur durchscrollbar und rasten weich auf die naechste Karte ein. Am Ende eine
 * Zaehler-Card ("+X weitere"), die alle Projekte inline als responsives Grid ausklappt.
 */
export function FansubProjectsGrid({ items, groupId, groupSlug }: FansubProjectsGridProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const animRef = useRef<number | null>(null)
  const drag = useRef({ active: false, startScroll: 0, lastX: 0, lastT: 0, vel: 0, moved: false, pointerId: -1, captured: false })
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) {
    return null
  }

  const hasMore = items.length > PREVIEW_COUNT
  const remaining = items.length - PREVIEW_COUNT

  if (expanded) {
    return (
      <div className={styles.projectsGroup}>
        <div className={styles.projectGrid}>
          {items.map(({ project, statusLabel, statusVariant }) => (
            <FansubProjectBannerCard
              key={project.id}
              project={project}
              groupId={groupId}
              fansubSlug={groupSlug}
              statusLabel={statusLabel}
              statusVariant={statusVariant}
            />
          ))}
        </div>
        <Button type="button" variant="subtle" size="sm" className={styles.moreTile} onClick={() => setExpanded(false)}>
          Weniger anzeigen
        </Button>
      </div>
    )
  }

  const previewItems = hasMore ? items.slice(0, PREVIEW_COUNT) : items

  const stepWidth = (track: HTMLDivElement): number => {
    const card = track.querySelector<HTMLElement>(`.${styles.carouselItem}`)
    const gap = parseFloat(getComputedStyle(track).columnGap) || 12
    return card ? card.getBoundingClientRect().width + gap : 240
  }

  const clampScroll = (track: HTMLDivElement, x: number): number =>
    Math.max(0, Math.min(x, track.scrollWidth - track.clientWidth))

  const glideTo = (target: number, duration: number, ease: (t: number) => number) => {
    const track = trackRef.current
    if (!track) return
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    const start = track.scrollLeft
    const dest = clampScroll(track, target)
    const dist = dest - start
    if (Math.abs(dist) < 1) {
      track.style.scrollSnapType = 'x mandatory'
      return
    }
    const t0 = performance.now()
    track.style.scrollSnapType = 'none'
    const frame = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration)
      track.scrollLeft = start + dist * ease(progress)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame)
      } else {
        animRef.current = null
        track.style.scrollSnapType = 'x mandatory'
      }
    }
    animRef.current = requestAnimationFrame(frame)
  }

  const slideToNearest = (projected: number, minDuration: number) => {
    const track = trackRef.current
    if (!track) return
    const step = stepWidth(track)
    const target = Math.round(projected / step) * step
    const dist = Math.abs(clampScroll(track, target) - track.scrollLeft)
    glideTo(target, Math.max(minDuration, Math.min(780, dist * 0.8)), easeOutCubic)
  }

  const moveByCard = (direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    const step = stepWidth(track)
    const base = Math.round(track.scrollLeft / step) * step
    glideTo(base + (direction === 'right' ? step : -step), 460, easeInOutCubic)
  }

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveByCard('right')
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveByCard('left')
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)
    drag.current = {
      active: true,
      startScroll: track.scrollLeft,
      lastX: event.clientX,
      lastT: performance.now(),
      vel: 0,
      moved: false,
      pointerId: event.pointerId,
      captured: false,
    }
    track.style.scrollSnapType = 'none'
    // WICHTIG: hier NICHT setPointerCapture -> sonst zielt der Klick auf den Track
    // statt auf Button/Link. Capture erst beim tatsaechlichen Ziehen (unten).
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state.active) return
    const track = trackRef.current
    if (!track) return
    const now = performance.now()
    const dxStep = event.clientX - state.lastX
    const dt = now - state.lastT
    if (dt > 0 && dxStep !== 0) {
      state.vel = 0.8 * (-dxStep / dt) + 0.2 * state.vel
    }
    track.scrollLeft = clampScroll(track, track.scrollLeft - dxStep)
    if (Math.abs(track.scrollLeft - state.startScroll) > 4 && !state.captured) {
      // echtes Ziehen erkannt -> jetzt erst Klasse + Pointer-Capture
      state.moved = true
      state.captured = true
      track.classList.add(styles.dragging)
      try {
        track.setPointerCapture(state.pointerId)
      } catch {
        /* pointer bereits freigegeben */
      }
    }
    state.lastX = event.clientX
    state.lastT = now
  }

  const endDrag = () => {
    const state = drag.current
    if (!state.active) return
    state.active = false
    const track = trackRef.current
    if (track) track.classList.remove(styles.dragging)
    if (state.moved) {
      slideToNearest((track?.scrollLeft ?? 0) + state.vel * 180, 280)
    } else if (track) {
      track.style.scrollSnapType = 'x mandatory'
    }
  }

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      event.preventDefault()
      event.stopPropagation()
      drag.current.moved = false
    }
  }

  return (
    <div className={styles.carouselShell}>
      <div className={styles.carouselRow}>
        <Button
          variant="ghost"
          iconOnly
          className={styles.carouselArrow}
          aria-label="Vorherige Projekte"
          onClick={() => moveByCard('left')}
        >
          <ChevronLeft size={18} />
        </Button>
        <div
          ref={trackRef}
          className={styles.carouselTrack}
          role="region"
          aria-label="Projekt-Vorschau"
          tabIndex={0}
          onKeyDown={handleTrackKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(event) => event.preventDefault()}
          onClickCapture={handleClickCapture}
        >
          {previewItems.map(({ project, statusLabel, statusVariant }) => (
            <div key={project.id} className={styles.carouselItem}>
              <FansubProjectBannerCard
                project={project}
                groupId={groupId}
                fansubSlug={groupSlug}
                statusLabel={statusLabel}
                statusVariant={statusVariant}
              />
            </div>
          ))}
          {hasMore ? (
            <Button
              type="button"
              variant="ghost"
              className={`${styles.carouselItem} ${styles.projectCountCard}`}
              onClick={() => setExpanded(true)}
              aria-label={`Alle ${items.length} Projekte anzeigen`}
            >
              <span className={styles.projectCountValue}>+{remaining}</span>
              <span className={styles.projectCountLabel}>weitere Projekte</span>
              <span className={styles.projectCountAction}>Alle anzeigen</span>
            </Button>
          ) : null}
        </div>
        <Button
          variant="ghost"
          iconOnly
          className={styles.carouselArrow}
          aria-label="Weitere Projekte"
          onClick={() => moveByCard('right')}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  )
}
