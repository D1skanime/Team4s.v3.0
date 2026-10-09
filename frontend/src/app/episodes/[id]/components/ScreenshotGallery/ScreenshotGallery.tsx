'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { FansubMediaLightbox } from '@/components/fansubs/FansubMediaLightbox'
import { ApiError, getGroupReleaseImages } from '@/lib/api'
import type { PublicReleaseImage } from '@/types/releaseDetail'

import { toScreenshotLightboxItem } from './screenshotGalleryMapping'
import styles from './ScreenshotGallery.module.css'

interface ScreenshotGalleryProps {
  animeId: number
  groupId: number
  releaseVersionId: number
  episodeLabel?: string
}

export default function ScreenshotGallery({ animeId, groupId, releaseVersionId, episodeLabel }: ScreenshotGalleryProps) {
  const [images, setImages] = useState<PublicReleaseImage[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadTriggerRef = useRef<HTMLDivElement | null>(null)

  // Fetch images from the real release-version-media endpoint (D-04: the unified
  // viewer's shared data source, same helper ReleaseGallery.tsx already uses).
  const fetchImages = useCallback(
    async (nextCursor: string | null = null) => {
      try {
        setLoading(true)
        setError(null)

        const page = await getGroupReleaseImages(animeId, groupId, releaseVersionId, {
          category: 'screenshot',
          cursor: nextCursor ?? undefined,
          limit: 12,
        })

        setImages((prev) => (nextCursor ? [...prev, ...page.items] : page.items))
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Ein Fehler ist aufgetreten.')
      } finally {
        setLoading(false)
      }
    },
    [animeId, groupId, releaseVersionId]
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

  const lightboxItems = images.map((image) => toScreenshotLightboxItem(image, episodeLabel))

  return (
    <section className={styles.screenshotGallerySection}>
      <h2 className={styles.screenshotGalleryHeading}>Screenshots</h2>

      {error && (
        <div className={styles.screenshotError}>
          <p className={styles.screenshotErrorText}>{error}</p>
          <Button type="button" variant="secondary" onClick={handleRetry}>
            Erneut versuchen
          </Button>
        </div>
      )}

      <div className={styles.screenshotGrid}>
        {images.map((image, index) => (
          <Button
            key={image.id}
            type="button"
            variant="ghost"
            className={styles.screenshotThumbnail}
            onClick={() => setOpenIndex(index)}
            aria-label={`Screenshot ${index + 1} anzeigen${image.caption ? `: ${image.caption}` : ''}`}
          >
            <img
              src={image.thumbnail_url ?? undefined}
              alt={image.caption || `Screenshot ${index + 1}`}
              className={styles.screenshotThumbnailImage}
            />
          </Button>
        ))}

        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={styles.screenshotSkeleton} aria-hidden="true" />
          ))}
      </div>

      {hasMore && !loading && <div ref={loadTriggerRef} className={styles.screenshotLoadTrigger} aria-hidden="true" />}

      <FansubMediaLightbox media={lightboxItems} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
    </section>
  )
}
