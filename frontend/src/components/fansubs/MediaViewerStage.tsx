'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'

import { Button, NavArrow } from '@/components/ui'
import { ErrorState } from '@/components/ui/ErrorState'
import { resolveApiUrl } from '@/lib/api'
import { resolveWheelOrSwipeTarget } from '@/lib/mediaViewerCaptionPanel'
import {
  computeSwipeNavigation,
  nextZoomState,
  resolveWheelNavigation,
  selectDisplaySrc,
  shouldShowNavigationControls,
  shouldThrottleWheelNavigation,
} from '@/lib/mediaViewerNavigation'

import type { PublicImageLightboxItem } from './FansubMediaLightbox'
import styles from './MediaViewerStage.module.css'

// Horizontaler Schwellenwert fuer Touch-Swipe-Navigation, identisch zu --space-6 (32px).
const SWIPE_THRESHOLD = 32
// Mindestabstand zwischen zwei Mausrad-Navigationsschritten (D-29), verhindert Durchrasen.
const WHEEL_THROTTLE_MS = 500

interface MediaViewerStageProps {
  item: PublicImageLightboxItem
  title: string
  index: number
  total: number
  prevOriginalUrl?: string | null
  nextOriginalUrl?: string | null
  captionPanelOpen: boolean
  onGestureNavigate: (direction: 'prev' | 'next') => void
  onPrevious: () => void
  onNext: () => void
}

function prefetch(url: string | undefined | null) {
  if (!url) return
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') return
  const img = new window.Image()
  img.src = url
}

/**
 * Entscheidet, ob der "Originalbild wird geladen …"-Pill sichtbar sein soll:
 * nur solange ein tatsaechlicher Swap von einer abweichenden Anzeige-URL auf
 * die Original-URL noch ausstehend ist. Einzige nicht bereits in
 * mediaViewerNavigation.ts abgedeckte Logik dieser Datei (D-13).
 */
export function shouldShowLoadingPill(
  displayUrl: string | null,
  originalUrl: string | null,
  originalLoaded: boolean,
): boolean {
  if (!originalUrl) return false
  if (originalLoaded) return false
  return displayUrl !== originalUrl
}

export function MediaViewerStage({
  item,
  title,
  index,
  total,
  prevOriginalUrl,
  nextOriginalUrl,
  captionPanelOpen,
  onGestureNavigate,
  onPrevious,
  onNext,
}: MediaViewerStageProps) {
  const [zoomed, setZoomed] = useState(false)
  const [originalLoaded, setOriginalLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const lastWheelAtRef = useRef<number | null>(null)

  const displayUrl = item.display_url ? resolveApiUrl(item.display_url) : null
  const originalUrl = item.original_url ? resolveApiUrl(item.original_url) : null
  const thumbnailUrl = item.thumbnail_url ? resolveApiUrl(item.thumbnail_url) : null

  // Zoom-/Ladezustand/Fehlerzustand duerfen beim Wechsel auf ein anderes Bild
  // nicht uebernommen werden.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoomed(false)
    setOriginalLoaded(false)
    setHasError(false)
  }, [item.id])

  useEffect(() => {
    if (!originalUrl) return
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') return

    let cancelled = false
    const preload = new window.Image()
    preload.onload = () => {
      if (!cancelled) setOriginalLoaded(true)
    }
    preload.src = originalUrl

    return () => {
      cancelled = true
    }
  }, [item.id, originalUrl])

  useEffect(() => {
    prefetch(prevOriginalUrl ? resolveApiUrl(prevOriginalUrl) : null)
    prefetch(nextOriginalUrl ? resolveApiUrl(nextOriginalUrl) : null)
  }, [prevOriginalUrl, nextOriginalUrl])

  // Gedrosselte Mausrad-Navigation ueber der Bild-Buehne (D-29): deaktiviert
  // solange gezoomt oder solange das Caption-"Weiterlesen"-Panel offen ist
  // (D-31 -- dort scrollt das Rad den Text, nicht die Bilder).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (zoomed || resolveWheelOrSwipeTarget(captionPanelOpen) !== 'stage') return

    function handleWheel(event: WheelEvent) {
      const direction = resolveWheelNavigation(event.deltaY)
      if (!direction) return
      if (shouldThrottleWheelNavigation(Date.now(), lastWheelAtRef.current, WHEEL_THROTTLE_MS)) return
      lastWheelAtRef.current = Date.now()
      event.preventDefault()
      onGestureNavigate(direction)
    }

    stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => stage.removeEventListener('wheel', handleWheel)
  }, [zoomed, captionPanelOpen, onGestureNavigate])

  const displaySrc = selectDisplaySrc({ displayUrl, originalUrl, thumbnailUrl, originalLoaded })
  const showLoadingPill = !hasError && shouldShowLoadingPill(displayUrl, originalUrl, originalLoaded)
  const showNavigationControls = shouldShowNavigationControls(total)

  function toggleZoom() {
    setZoomed((current) => nextZoomState(current))
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (resolveWheelOrSwipeTarget(captionPanelOpen) === 'panel') {
      touchStartRef.current = null
      return
    }

    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const direction = computeSwipeNavigation(deltaX, deltaY, SWIPE_THRESHOLD)
    if (direction) {
      onGestureNavigate(direction)
    }
  }

  return (
    <div
      ref={stageRef}
      className={[styles.stage, !showNavigationControls ? styles.stageSingle : null].filter(Boolean).join(' ')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasError ? (
        <ErrorState
          title="Bild konnte nicht geladen werden"
          description="Bitte prüfen Sie Ihre Verbindung oder wählen Sie ein anderes Bild."
        />
      ) : displaySrc ? (
        // Bewusst natives <img>, nicht next/image: der Zoom-auf-native-Aufloesung
        // benoetigt direkte Kontrolle ueber intrinsisches Sizing, die next/image's
        // fill-/explizites-width-height-Vertrag nicht saubar abbilden kann.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={title}
          className={zoomed ? styles.stageImageZoomed : styles.stageImage}
          onClick={toggleZoom}
          onError={() => setHasError(true)}
        />
      ) : null}

      {showNavigationControls ? (
        <>
          <NavArrow
            direction="previous"
            size="large"
            label="Vorheriges Bild"
            className={styles.navPrev}
            onClick={onPrevious}
          />
          <NavArrow
            direction="next"
            size="large"
            label="Nächstes Bild"
            className={styles.navNext}
            onClick={onNext}
          />
        </>
      ) : null}

      <Button
        type="button"
        variant="floating"
        iconOnly
        aria-label={zoomed ? 'Bild verkleinern' : 'Bild vergrößern'}
        className={styles.zoomButton}
        onClick={toggleZoom}
      >
        {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
      </Button>

      {showLoadingPill ? <span className={styles.loadingPill}>Originalbild wird geladen …</span> : null}
    </div>
  )
}
