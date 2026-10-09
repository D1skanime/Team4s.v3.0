'use client'

import { useEffect } from 'react'

import { Modal } from '@/components/ui'
import { wrapIndex } from '@/lib/mediaViewerNavigation'

import { MediaViewerMetadataPanel } from './MediaViewerMetadataPanel'
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
 * @/components/ui Modal (variant="stage"). Zeigt die Bild-Bühne
 * (MediaViewerStage: Zoom, Progressive Load, Prefetch, Swipe) gefolgt vom
 * gestapelten Metadaten-Panel (MediaViewerMetadataPanel, D-21). Navigation
 * per Button, Tastatur (ArrowLeft/ArrowRight/Home/End) oder Touch-Swipe, mit
 * Wrap-around durch ALLE Medien der Gruppe -- einheitlich über
 * wrapIndex(). Escape, role='dialog'/aria-modal, Fokus-Falle und
 * Fokus-Rückgabe übernimmt Modal.
 */
export function FansubMediaLightbox({ media, index, onClose, onNavigate }: FansubMediaLightboxProps) {
  const total = media.length
  const isOpen = index !== null && index >= 0 && index < total

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
  const title = currentItem.title?.trim() || currentItem.caption?.trim() || currentItem.media_type
  const prevIndex = wrapIndex(currentIndex, total, -1)
  const nextIndex = wrapIndex(currentIndex, total, 1)
  const prevOriginalUrl = media[prevIndex]?.original_url
  const nextOriginalUrl = media[nextIndex]?.original_url

  function goToPrevious() {
    onNavigate(wrapIndex(currentIndex, total, -1))
  }

  function goToNext() {
    onNavigate(wrapIndex(currentIndex, total, 1))
  }

  function handleSwipeNavigate(direction: 'prev' | 'next') {
    onNavigate(wrapIndex(currentIndex, total, direction === 'next' ? 1 : -1))
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="lg" variant="stage">
      <div className={styles.lightboxBody}>
        <MediaViewerStage
          item={currentItem}
          title={title}
          index={currentIndex}
          total={total}
          prevOriginalUrl={prevOriginalUrl}
          nextOriginalUrl={nextOriginalUrl}
          onSwipeNavigate={handleSwipeNavigate}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
        <MediaViewerMetadataPanel item={currentItem} />
      </div>
    </Modal>
  )
}
