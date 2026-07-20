'use client'

import { Maximize2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Badge, Button, SectionHeader } from '@/components/ui'
import { FansubMediaLightbox, type PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import { getGroupReleaseImages } from '@/lib/api'
import type { PublicReleaseGroup, PublicReleaseImage } from '@/types/releaseDetail'
import { CATEGORY_LABELS, RELEASE_VERSION_MEDIA_CATEGORIES, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'

import { useResponsiveGalleryReveal } from './responsiveGalleryReveal'
import styles from './ReleaseGallery.module.css'

interface Props {
  animeID: number
  groupID: number
  releaseVersionID: number
  initialImages: PublicReleaseImage[]
  categoryTotals: Record<ReleaseVersionMediaCategory, number>
  groups?: PublicReleaseGroup[]
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

export function ReleaseGallery({ animeID, groupID, releaseVersionID, initialImages, categoryTotals, groups = [] }: Props) {
  const [items, setItems] = useState(() => mergeImages([], initialImages))
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { collapsedLimit, expanded, expand } = useResponsiveGalleryReveal()
  const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0)
  if (!total) return null

  const visibleCount = expanded ? items.length : Math.min(collapsedLimit, items.length)
  const visibleItems = items.slice(0, visibleCount)
  const groupNamesByID = new Map(groups.map(group => [group.id, group.name]))
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
    } catch {
      setError('Weitere Bilder konnten nicht geladen werden. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const lightboxItems = items.map(toLightboxItem)
  const renderImage = (image: PublicReleaseImage) => {
    const src = image.thumbnail_url ?? image.original_url
    const title = image.caption?.trim() || CATEGORY_LABELS[image.category]
    const sourceGroupName = image.fansub_group_id ? groupNamesByID.get(image.fansub_group_id) : null
    return <article key={image.id} className={styles.card}>
      <Button type="button" variant="ghost" className={styles.imageButton} aria-label={`${title} öffnen`} onClick={() => setActiveIndex(items.findIndex(item => item.id === image.id))}>
        <span className={styles.imageShell}>
          {src ? <Image src={src} alt={title} className={styles.image} fill sizes="(max-width: 600px) 45vw, (max-width: 900px) 40vw, 28vw" unoptimized /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}
          <span className={styles.maximize} aria-hidden="true"><Maximize2 size={16} /></span>
        </span>
      </Button>
      <div className={styles.meta}>
        <p className={styles.caption}>{title}</p>
        <div className={styles.metaRow}>
          <Badge variant="muted">{CATEGORY_LABELS[image.category]}</Badge>
          <span>Hochgeladen von {image.author_name ?? 'Unbekannt'}</span>
          {sourceGroupName ? <span>{sourceGroupName}</span> : null}
        </div>
      </div>
    </article>
  }

  return <section id="galerie" className={styles.section} data-release-atmosphere-band="true">
    <SectionHeader title="Bilder aus dem Release" description={`${total} Bilder`} underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.grid} data-testid="release-image-grid">{visibleItems.map(renderImage)}</div>
    {remaining > 0 ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={revealAll}>Weitere {remaining} Bilder anzeigen</Button></div> : null}
    <FansubMediaLightbox media={lightboxItems} index={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />
  </section>
}
