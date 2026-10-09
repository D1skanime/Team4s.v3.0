'use client'

import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui'
import { ThumbnailStrip } from '@/components/ui/ThumbnailStrip'
import { resolveApiUrl } from '@/lib/api'
import { resetCaptionPanelOpen, resolveEscapeTarget } from '@/lib/mediaViewerCaptionPanel'
import { resolveAccessibleTitle, resolveThumbnailUrl } from '@/lib/mediaViewerMetadata'
import { wrapIndex } from '@/lib/mediaViewerNavigation'

import { MediaViewerCaption } from './MediaViewerCaption'
import { MediaViewerHeader } from './MediaViewerHeader'
import { MediaViewerStage } from './MediaViewerStage'
import styles from './FansubMediaLightbox.module.css'

export interface PublicImageLightboxItem {
  id: number
  title?: string | null
  caption?: string | null
  description?: string | null
  media_type: string
  original_url?: string | null
  display_url?: string | null
  thumbnail_url?: string | null
  category?: string | null
  episode_label?: string | null
  release_version_label?: string | null
  release_href?: string | null
}

interface FansubMediaLightboxProps {
  media: PublicImageLightboxItem[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}

/**
 * AO6-12 / Phase 177 (F-18): gemeinsamer Bild-Viewer auf Basis des
 * @/components/ui Modal (variant="stage"). Zeigt den Kopfbereich
 * (MediaViewerHeader, D-30), die Bild-Bühne (MediaViewerStage: Zoom,
 * Progressive Load, Prefetch, Swipe, Mausrad-Navigation D-29), die
 * Bildunterschrift (MediaViewerCaption, D-30/D-31) und die Thumbnail-Leiste
 * (ThumbnailStrip, D-28). Navigation per Button, Tastatur (ArrowLeft/
 * ArrowRight/Home/End), Touch-Swipe oder Mausrad, mit Wrap-around durch ALLE
 * Medien der Gruppe -- einheitlich über wrapIndex(). Escape, role='dialog'/
 * aria-modal, Fokus-Falle und Fokus-Rückgabe übernimmt Modal; die
 * zweistufige Escape-Sequenz fuer das Caption-"Weiterlesen"-Panel (D-31)
 * laeuft ueber Modals additiven onEscapeKeyDown-Hook.
 */
export function FansubMediaLightbox({ media, index, onClose, onNavigate }: FansubMediaLightboxProps) {
  const total = media.length
  const isOpen = index !== null && index >= 0 && index < total
  const currentItemID = index !== null ? media[index]?.id : undefined
  const [captionPanelOpen, setCaptionPanelOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || index === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaptionPanelOpen(resetCaptionPanelOpen())
  }, [isOpen, index, currentItemID])

  useEffect(() => {
    if (!isOpen || index === null) return

    function handleKeyDown(event: KeyboardEvent) {
      if (index === null) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNavigate(wrapIndex(index, total, 1))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onNavigate(wrapIndex(index, total, -1))
      } else if (event.key === 'Home') {
        event.preventDefault()
        onNavigate(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        onNavigate(total - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, index, total, onNavigate])

  if (!isOpen || index === null) {
    return null
  }

  const currentIndex = index
  const currentItem = media[currentIndex]
  const title = resolveAccessibleTitle(currentItem.title, currentItem.caption)
  const prevIndex = wrapIndex(currentIndex, total, -1)
  const nextIndex = wrapIndex(currentIndex, total, 1)
  const prevOriginalUrl = media[prevIndex]?.original_url
  const nextOriginalUrl = media[nextIndex]?.original_url
  const thumbnailItems = media.map((m) => ({
    key: m.id,
    thumbnailUrl: resolveApiUrl(resolveThumbnailUrl(m.thumbnail_url, m.display_url, m.original_url)),
  }))

  function goToPrevious() {
    onNavigate(wrapIndex(currentIndex, total, -1))
  }

  function goToNext() {
    onNavigate(wrapIndex(currentIndex, total, 1))
  }

  function handleGestureNavigate(direction: 'prev' | 'next') {
    onNavigate(wrapIndex(currentIndex, total, direction === 'next' ? 1 : -1))
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      variant="stage"
      onEscapeKeyDown={() => {
        if (resolveEscapeTarget(captionPanelOpen) !== 'panel') return false
        setCaptionPanelOpen(false)
        return true
      }}
    >
      <div className={styles.lightboxBody}>
        <MediaViewerHeader item={currentItem} />
        <MediaViewerStage
          item={currentItem}
          title={title}
          index={currentIndex}
          total={total}
          prevOriginalUrl={prevOriginalUrl}
          nextOriginalUrl={nextOriginalUrl}
          captionPanelOpen={captionPanelOpen}
          onGestureNavigate={handleGestureNavigate}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
        <MediaViewerCaption item={currentItem} panelOpen={captionPanelOpen} onPanelOpenChange={setCaptionPanelOpen} />
        <ThumbnailStrip items={thumbnailItems} activeIndex={currentIndex} onSelect={onNavigate} regionLabel="Bildvorschau" />
      </div>
    </Modal>
  )
}
