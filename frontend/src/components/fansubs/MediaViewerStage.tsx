'use client'

import { useEffect, useState } from 'react'

import { NavArrow } from '@/components/ui'
import { ErrorState } from '@/components/ui/ErrorState'
import { resolveApiUrl } from '@/lib/api'
import {
  selectDisplaySrc,
  shouldShowNavigationControls,
} from '@/lib/mediaViewerNavigation'

import type { PublicImageLightboxItem } from './FansubMediaLightbox'
import { useMediaViewerZoomPan } from './useMediaViewerZoomPan'
import styles from './MediaViewerStage.module.css'

interface MediaViewerStageProps {
  item: PublicImageLightboxItem
  title: string
  index: number
  total: number
  prevOriginalUrl?: string | null
  nextOriginalUrl?: string | null
  captionPanelOpen: boolean
  zoomLevel: number
  onZoomLevelChange: (level: number) => void
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
  zoomLevel,
  onZoomLevelChange,
  onGestureNavigate,
  onPrevious,
  onNext,
}: MediaViewerStageProps) {
  const [originalLoaded, setOriginalLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const displayUrl = item.display_url ? resolveApiUrl(item.display_url) : null
  const originalUrl = item.original_url ? resolveApiUrl(item.original_url) : null
  const thumbnailUrl = item.thumbnail_url ? resolveApiUrl(item.thumbnail_url) : null

  const { containerRef, imageRef, pan, zoomed, onDoubleClick, onMouseDown, onTouchStart, onTouchEnd } =
    useMediaViewerZoomPan({
      zoomLevel,
      onZoomLevelChange,
      resetKey: item.id,
      captionPanelOpen,
      onGestureNavigate,
    })

  // Ladezustand/Fehlerzustand duerfen beim Wechsel auf ein anderes Bild nicht
  // uebernommen werden (Zoom-/Pan-Reset laeuft ueber useMediaViewerZoomPan's
  // eigenen resetKey-Effekt plus den lifted zoomLevel-Reset in FansubMediaLightbox.tsx).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const displaySrc = selectDisplaySrc({ displayUrl, originalUrl, thumbnailUrl, originalLoaded })
  const showLoadingPill = !hasError && shouldShowLoadingPill(displayUrl, originalUrl, originalLoaded)
  const showNavigationControls = shouldShowNavigationControls(total)

  return (
    <div
      ref={containerRef}
      className={[styles.stage, !showNavigationControls ? styles.stageSingle : null].filter(Boolean).join(' ')}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
          ref={imageRef}
          src={displaySrc}
          alt={title}
          className={styles.stageImage}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, cursor: zoomed ? 'grab' : 'zoom-in' }}
          onDoubleClick={onDoubleClick}
          onMouseDown={onMouseDown}
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

      {showLoadingPill ? <span className={styles.loadingPill}>Originalbild wird geladen …</span> : null}
    </div>
  )
}
