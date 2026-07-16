'use client'

import { useState } from 'react'
import { Badge, Button, SectionHeader } from '@/components/ui'
import { ApiError, getGroupReleaseImages } from '@/lib/api'
import type { PublicReleaseImage } from '@/types/releaseDetail'
import { CATEGORY_LABELS, RELEASE_VERSION_MEDIA_CATEGORIES, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'
import styles from './ReleaseGallery.module.css'

interface Props { animeID: number; groupID: number; releaseVersionID: number; initialImages: PublicReleaseImage[]; categoryTotals: Record<ReleaseVersionMediaCategory, number> }

function GalleryImage({ image }: { image: PublicReleaseImage }) {
  const src = image.thumbnail_url ?? image.original_url
  return <figure className={styles.card}>
    <div className={styles.imageShell}>{src ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt={image.caption ?? CATEGORY_LABELS[image.category]} className={styles.image} loading="lazy" /> : <div className={styles.imagePlaceholder} aria-hidden="true" />}</div>
    <figcaption><span className={styles.caption}>{image.caption ?? CATEGORY_LABELS[image.category]}</span><span className={styles.authorChip}>Hochgeladen von {image.author_name ?? 'Unbekannt'}</span></figcaption>
  </figure>
}

export function ReleaseGallery({ animeID, groupID, releaseVersionID, initialImages, categoryTotals }: Props) {
  const [items, setItems] = useState(initialImages)
  const [expanded, setExpanded] = useState<Partial<Record<ReleaseVersionMediaCategory, boolean>>>({})
  const [loading, setLoading] = useState<ReleaseVersionMediaCategory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0)
  if (!total) return null

  async function expand(category: ReleaseVersionMediaCategory) {
    setExpanded(value => ({ ...value, [category]: true }))
    const existing = items.filter(item => item.category === category)
    if (existing.length >= categoryTotals[category]) return
    setLoading(category); setError(null)
    try {
      let cursor: string | undefined
      let loaded: PublicReleaseImage[] = []
      do {
        const page = await getGroupReleaseImages(animeID, groupID, releaseVersionID, { category, cursor, limit: 50 })
        loaded = [...loaded, ...page.items]
        cursor = page.next_cursor ?? undefined
        if (!page.has_more) break
      } while (cursor)
      setItems(previous => { const seen = new Set(previous.map(item => item.id)); return [...previous, ...loaded.filter(item => !seen.has(item.id))] })
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Weitere Bilder konnten nicht geladen werden.') }
    finally { setLoading(null) }
  }

  return <section id="galerie" className={styles.section}>
    <SectionHeader title="Bilder aus dem Release" description={`${total} Bilder in vier Kategorien`} underline />
    {error ? <p className={styles.error}>{error}</p> : null}
    {RELEASE_VERSION_MEDIA_CATEGORIES.map(category => {
      const categoryItems = items.filter(item => item.category === category)
      const categoryTotal = categoryTotals[category]
      if (!categoryTotal) return null
      return <section key={category} className={styles.chapter}>
        <div className={styles.chapterHeader}><h3>{CATEGORY_LABELS[category]}</h3><Badge variant="muted">{categoryTotal} Bilder</Badge></div>
        <div className={`${styles.grid} ${expanded[category] ? styles.gridExpanded : ''}`}>{categoryItems.map(image => <GalleryImage key={image.id} image={image} />)}</div>
        {!expanded[category] || categoryItems.length < categoryTotal ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading === category} onClick={() => expand(category)}>Weitere {Math.max(0, categoryTotal - Math.min(6, categoryItems.length))} Bilder anzeigen</Button></div> : null}
      </section>
    })}
  </section>
}
