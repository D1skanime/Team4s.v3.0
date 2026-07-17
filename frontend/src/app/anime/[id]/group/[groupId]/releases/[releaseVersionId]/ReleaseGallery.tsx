'use client'

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'

import { Badge, Button, SectionHeader } from '@/components/ui'
import { FansubMediaLightbox, type PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import { ApiError, getGroupReleaseImages } from '@/lib/api'
import type { PublicReleaseImage } from '@/types/releaseDetail'
import { CATEGORY_LABELS, RELEASE_VERSION_MEDIA_CATEGORIES, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'

import { useResponsiveGalleryReveal } from './responsiveGalleryReveal'
import styles from './ReleaseGallery.module.css'

interface Props {
  animeID: number
  groupID: number
  releaseVersionID: number
  initialImages: PublicReleaseImage[]
  categoryTotals: Record<ReleaseVersionMediaCategory, number>
}

function mergeImages(previous: PublicReleaseImage[], incoming: PublicReleaseImage[]): PublicReleaseImage[] {
  const seen = new Set<number>()
  return [...previous, ...incoming].filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function toLightboxItem(image: PublicReleaseImage): PublicImageLightboxItem {
  const categoryLabel = CATEGORY_LABELS[image.category]
  const description = image.caption?.trim()
  return {
    id: image.id,
    title: categoryLabel,
    description: description && description !== categoryLabel ? description : null,
    media_type: categoryLabel,
    original_url: image.original_url ?? image.thumbnail_url,
  }
}

export function ReleaseGallery({ animeID, groupID, releaseVersionID, initialImages, categoryTotals }: Props) {
  const [items, setItems] = useState(() => mergeImages([], initialImages))
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { collapsedLimit, expanded, expand } = useResponsiveGalleryReveal()
  const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0)
  if (!total) return null

  const visibleCount = expanded ? items.length : Math.min(collapsedLimit, items.length)
  const visibleItems = items.slice(0, visibleCount)
  const remaining = Math.max(0, total - visibleCount)

  async function revealAll() {
    if (loading) return
    // Reveal images already delivered by the aggregate immediately. Cursor
    // requests only fill category gaps and must not block the local reveal.
    expand()
    if (items.length >= total) return

    setLoading(true)
    setError(null)
    try {
      const loadedByCategory = await Promise.all(RELEASE_VERSION_MEDIA_CATEGORIES.map(async category => {
        const loadedCount = items.filter(item => item.category === category).length
        if (!categoryTotals[category] || loadedCount >= categoryTotals[category]) return []
        const loaded: PublicReleaseImage[] = []
        let cursor: string | undefined
        do {
          const page = await getGroupReleaseImages(animeID, groupID, releaseVersionID, { category, cursor, limit: 50 })
          loaded.push(...page.items)
          cursor = page.has_more ? page.next_cursor ?? undefined : undefined
        } while (cursor)
        return loaded
      }))
      setItems(previous => mergeImages(previous, loadedByCategory.flat()))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Weitere Bilder konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  const lightboxItems = items.map(toLightboxItem)

  return <section id="galerie" className={styles.section}>
    <SectionHeader title="Bilder aus dem Release" description={`${total} Bilder`} underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.grid} data-testid="release-image-grid">
      {visibleItems.map((image, index) => {
        const src = image.thumbnail_url ?? image.original_url
        const title = image.caption?.trim() || CATEGORY_LABELS[image.category]
        return <article key={image.id} className={styles.card}>
          <Button type="button" variant="ghost" className={styles.imageButton} aria-label={`${title} öffnen`} onClick={() => setActiveIndex(index)}>
            <span className={styles.imageShell}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={title} className={styles.image} loading="lazy" />
              ) : <span className={styles.imagePlaceholder} aria-hidden="true" />}
              <span className={styles.maximize} aria-hidden="true"><Maximize2 size={16} /></span>
            </span>
          </Button>
          <div className={styles.meta}>
            <p className={styles.caption}>{title}</p>
            <div className={styles.metaRow}><Badge variant="muted">{CATEGORY_LABELS[image.category]}</Badge><span>Hochgeladen von {image.author_name ?? 'Unbekannt'}</span></div>
          </div>
        </article>
      })}
    </div>
    {remaining > 0 ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={revealAll}>Weitere {remaining} Bilder anzeigen</Button></div> : null}
    <FansubMediaLightbox media={lightboxItems} index={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />
  </section>
}
