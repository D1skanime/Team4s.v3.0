'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useEffect } from 'react'

import { Button, Modal } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import styles from './FansubMediaLightbox.module.css'

export interface PublicImageLightboxItem {
  id: number
  title?: string | null
  caption?: string | null
  description?: string | null
  media_type: string
  original_url?: string | null
}

interface FansubMediaLightboxProps {
  media: PublicImageLightboxItem[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}

const LIGHTBOX_IMAGE_SIZES = '(max-width: 768px) 100vw, 1100px'

/**
 * AO6-12: Lightbox fuer Gruppenmedien auf Basis des @/components/ui Modal.
 * Zeigt das Originalbild gross, den vollen Titel/Beschreibung und einen
 * Positions-Zaehler 'n / N'. Navigation per Button oder Tastatur (ArrowLeft/
 * ArrowRight) mit Wrap-around durch ALLE Medien der Gruppe. Escape,
 * role='dialog'/aria-modal, Fokus-Falle und Fokus-Rueckgabe uebernimmt Modal.
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
        onNavigate((index + 1) % total)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onNavigate((index - 1 + total) % total)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, index, total, onNavigate])

  if (!isOpen || index === null) {
    return null
  }

  const currentItem = media[index]
  const title = currentItem.title?.trim() || currentItem.caption?.trim() || currentItem.media_type
  const description = currentItem.description?.trim()
  const resolvedOriginalUrl = currentItem.original_url ? resolveApiUrl(currentItem.original_url) : null

  function goToPrevious() {
    if (index === null) return
    onNavigate((index - 1 + total) % total)
  }

  function goToNext() {
    if (index === null) return
    onNavigate((index + 1) % total)
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="lg">
      <div className={styles.lightboxBody}>
        {resolvedOriginalUrl ? (
          <div className={styles.imageFrame}>
            <Image
              src={resolvedOriginalUrl}
              alt={title}
              fill
              sizes={LIGHTBOX_IMAGE_SIZES}
              loading="lazy"
              className={styles.image}
              unoptimized
            />
          </div>
        ) : null}
        {description ? <p className={styles.description}>{description}</p> : null}
        <div className={styles.navigationRow}>
          <Button type="button" variant="ghost" aria-label="Vorheriges Bild" onClick={goToPrevious}>
            <ChevronLeft size={20} />
          </Button>
          <span className={styles.counter}>
            {index + 1} / {total}
          </span>
          <Button type="button" variant="ghost" aria-label="Nächstes Bild" onClick={goToNext}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
