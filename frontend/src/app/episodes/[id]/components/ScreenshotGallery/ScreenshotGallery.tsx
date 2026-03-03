'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { ScreenshotImage, ScreenshotImagesResponse } from '@/types/screenshotImage'

import styles from './ScreenshotGallery.module.css'

interface ScreenshotGalleryProps {
  releaseId: number
}

export default function ScreenshotGallery({ releaseId }: ScreenshotGalleryProps) {
  const [images, setImages] = useState<ScreenshotImage[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadTriggerRef = useRef<HTMLDivElement | null>(null)

  // Fetch images from API
  const fetchImages = useCallback(
    async (nextCursor: string | null = null) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.append('limit', '12')
        if (nextCursor) {
          params.append('cursor', nextCursor)
        }

        const response = await fetch(`/api/v1/releases/${releaseId}/images?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Screenshots konnten nicht geladen werden.')
        }

        const data: { data: ScreenshotImagesResponse } = await response.json()

        setImages((prev) => (nextCursor ? [...prev, ...data.data.images] : data.data.images))
        setCursor(data.data.cursor)
        setHasMore(data.data.cursor !== null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.')
      } finally {
        setLoading(false)
      }
    },
    [releaseId]
  )

  // Initial load
  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // Intersection Observer for infinite loading
  useEffect(() => {
    if (!hasMore || loading) return

    const callback: IntersectionObserverCallback = (entries) => {
      const [entry] = entries
      if (entry.isIntersecting && cursor) {
        fetchImages(cursor)
      }
    }

    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: '200px',
    })

    if (loadTriggerRef.current) {
      observerRef.current.observe(loadTriggerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [cursor, hasMore, loading, fetchImages])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setLightboxOpen(false)
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigatePrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateNext()
          break
        case 'Home':
          e.preventDefault()
          setActiveIndex(0)
          break
        case 'End':
          e.preventDefault()
          setActiveIndex(images.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, activeIndex, images.length])

  const openLightbox = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const navigatePrevious = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const navigateNext = () => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev))
  }

  const handleRetry = () => {
    setImages([])
    setCursor(null)
    setHasMore(true)
    fetchImages()
  }

  // Empty state: Hide section completely
  if (!loading && images.length === 0 && !error) {
    return null
  }

  return (
    <section className={styles.screenshotGallerySection}>
      <h2 className={styles.screenshotGalleryHeading}>Screenshots</h2>

      {error && (
        <div className={styles.screenshotError}>
          <p className={styles.screenshotErrorText}>{error}</p>
          <button type="button" className={styles.screenshotRetryButton} onClick={handleRetry}>
            Erneut versuchen
          </button>
        </div>
      )}

      <div className={styles.screenshotGrid}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className={styles.screenshotThumbnail}
            onClick={() => openLightbox(index)}
            aria-label={`Screenshot ${index + 1} anzeigen${image.caption ? `: ${image.caption}` : ''}`}
          >
            <img src={image.thumbnail_url} alt={image.caption || `Screenshot ${index + 1}`} className={styles.screenshotThumbnailImage} />
          </button>
        ))}

        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={styles.screenshotSkeleton} aria-hidden="true" />
          ))}
      </div>

      {hasMore && !loading && <div ref={loadTriggerRef} className={styles.screenshotLoadTrigger} aria-hidden="true" />}

      {lightboxOpen && images[activeIndex] && (
        <div
          className={styles.screenshotLightbox}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot Lightbox"
        >
          <div className={styles.screenshotLightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={images[activeIndex].url}
              alt={images[activeIndex].caption || `Screenshot ${activeIndex + 1}`}
              className={styles.screenshotLightboxImage}
            />

            <button
              type="button"
              className={`${styles.screenshotLightboxNav} ${styles.screenshotLightboxNavPrev}`}
              onClick={navigatePrevious}
              disabled={activeIndex === 0}
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              type="button"
              className={`${styles.screenshotLightboxNav} ${styles.screenshotLightboxNavNext}`}
              onClick={navigateNext}
              disabled={activeIndex === images.length - 1}
              aria-label="Naechstes Bild"
            >
              <ChevronRight size={24} />
            </button>

            <button type="button" className={styles.screenshotLightboxClose} onClick={closeLightbox} aria-label="Lightbox schliessen">
              <X size={24} />
            </button>

            <div className={styles.screenshotLightboxCounter}>
              {activeIndex + 1} / {images.length}
            </div>

            {images[activeIndex].caption && <div className={styles.screenshotLightboxCaption}>{images[activeIndex].caption}</div>}
          </div>
        </div>
      )}
    </section>
  )
}
