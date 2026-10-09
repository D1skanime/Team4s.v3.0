'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { isCaptionOverflowing, resolveCaptionPanelWidth } from '@/lib/mediaViewerCaptionPanel'
import { resolveCaption } from '@/lib/mediaViewerMetadata'

import type { PublicImageLightboxItem } from './FansubMediaLightbox'
import styles from './MediaViewerCaption.module.css'

interface MediaViewerCaptionProps {
  item: PublicImageLightboxItem
  panelOpen: boolean
  onPanelOpenChange: (open: boolean) => void
  imageWidthPx: number
}

// D-40: panel-text column width floor/ceiling, approximated at the panel's own
// 19px font size (~0.55em average character width for this project's sans font)
// -- floor ~70ch ("mindestens wie bisher"), ceiling ~96ch (comfortable reading
// width, don't let very wide images stretch the line length further).
const PANEL_COLUMN_MIN_WIDTH_PX = 720
const PANEL_COLUMN_MAX_WIDTH_PX = 1000

/**
 * Caption-Bereich unten zwischen Bühne und Thumbnail-Leiste (Phase 177 Gap-Fix, D-30/D-31).
 * Lange Bildunterschriften (> ca. 4 Zeilen) laufen mit Fade aus und bekommen einen
 * "Weiterlesen"-Button, der ein Slide-up-Textpanel oeffnet. Entfaellt nur, wenn weder
 * Bildunterschrift noch "Release öffnen"-CTA vorhanden sind (siehe REGRESSION-CRITICAL-Hinweis
 * im Plan: eine striktere "immer entfaellt ohne caption"-Lesart würde den bereits getesteten
 * CTA-ohne-caption-Fall in ProjectMemberMediaGallery.test.tsx brechen).
 */
export function MediaViewerCaption({ item, panelOpen, onPanelOpenChange, imageWidthPx }: MediaViewerCaptionProps) {
  const clampedRef = useRef<HTMLParagraphElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const caption = resolveCaption(item.caption, item.description)
  const hasReleaseHref = Boolean(item.release_href && item.release_href.trim())
  const panelTitle = item.title?.trim()
  const panelColumnWidthPx = resolveCaptionPanelWidth(
    imageWidthPx,
    PANEL_COLUMN_MIN_WIDTH_PX,
    PANEL_COLUMN_MAX_WIDTH_PX,
  )

  useLayoutEffect(() => {
    const node = clampedRef.current
    if (!node) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverflowing(false)
      return
    }
    const measure = () => setOverflowing(isCaptionOverflowing(node.scrollHeight, node.clientHeight))
    measure()
    // Re-measure on viewport resize/rotation: the clamp is line-height-based, so the
    // wrapped line count (and therefore overflow) can change without `caption` changing.
    if (typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(node)
    return () => resizeObserver.disconnect()
    // panelOpen: the preview <p> unmounts while the panel is open (see render below) and
    // remounts on close -- re-attach the observer to the fresh node instead of measuring stale.
  }, [caption, panelOpen])

  if (!caption && !hasReleaseHref) return null

  return (
    <div className={styles.caption}>
      {caption && !panelOpen ? (
        <>
          <p ref={clampedRef} className={overflowing ? `${styles.clamped} ${styles.clampedFading}` : styles.clamped}>
            {caption}
          </p>
          {overflowing ? (
            <Button type="button" variant="text" className={styles.moreButton} onClick={() => onPanelOpenChange(true)}>
              Weiterlesen
            </Button>
          ) : null}
        </>
      ) : null}
      {hasReleaseHref ? (
        <Link href={item.release_href as string} className={styles.cta}>
          Release öffnen →
        </Link>
      ) : null}

      {panelOpen ? (
        <div className={styles.panel} role="dialog" aria-label="Vollständige Bildunterschrift">
          <div className={styles.panelColumn} style={{ width: `${panelColumnWidthPx}px` }}>
            <div className={styles.panelHeader}>
              {panelTitle ? <h4 className={styles.panelTitle}>{panelTitle}</h4> : null}
              <Button
                type="button"
                variant="text"
                className={styles.panelCloseButton}
                onClick={() => onPanelOpenChange(false)}
              >
                Weniger anzeigen
              </Button>
            </div>
            <p className={styles.panelText}>{caption}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
