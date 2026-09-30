'use client'

import { Lock, Maximize2, Play } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { Badge, Button, SectionHeader } from '@/components/ui'
import { FansubMediaLightbox, type PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import { getGroupReleaseImages } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicReleaseGroup, PublicReleaseImage, PublicReleaseSegment, PublicReleaseStoryItem } from '@/types/releaseDetail'
import { CATEGORY_LABELS, RELEASE_VERSION_MEDIA_CATEGORIES, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'

import { useResponsiveGalleryReveal } from './responsiveGalleryReveal'
import styles from './ReleaseGallery.module.css'

interface Props {
  animeID: number
  groupID: number
  releaseVersionID: number
  initialImages: PublicReleaseImage[]
  story?: PublicReleaseStoryItem[]
  categoryTotals: Record<ReleaseVersionMediaCategory, number>
  groups?: PublicReleaseGroup[]
  episodeNumber?: string
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
  const title = image.title?.trim() || categoryLabel
  const description = image.caption?.trim()
  return {
    id: image.id,
    title,
    description: description && (image.title?.trim() || description !== categoryLabel) ? description : null,
    media_type: categoryLabel,
    original_url: image.original_url ?? image.thumbnail_url,
  }
}

export function ReleaseGallery({ animeID, groupID, releaseVersionID, initialImages, story = [], categoryTotals, groups = [], episodeNumber }: Props) {
  const [items, setItems] = useState(() => mergeImages([], initialImages))
  const [activeImageID, setActiveImageID] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { collapsedLimit, expanded, expand } = useResponsiveGalleryReveal()
  const total = Math.max(Object.values(categoryTotals).reduce((sum, value) => sum + value, 0), story.length)
  useEffect(() => {
    function revealStoryTarget(event: Event) {
      const segmentID = (event as CustomEvent<{ segmentId?: number }>).detail?.segmentId
      if (segmentID == null || !story.some((item) => item.type === 'kara' && item.segment?.theme_segment_id === segmentID)) return
      expand()
      window.requestAnimationFrame(() => {
        document.getElementById('release-story-kara-' + segmentID)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    window.addEventListener('release-story-reveal', revealStoryTarget)
    return () => window.removeEventListener('release-story-reveal', revealStoryTarget)
  }, [expand, story])
  if (!total) return null

  const visibleCount = expanded ? Math.max(items.length, story.length) : Math.min(collapsedLimit, Math.max(items.length, story.length))
  const groupNamesByID = new Map(groups.map(group => [group.id, group.name]))
  const featuredImage = items.find(image => image.is_preview_candidate) ?? items[0] ?? null
  const legacyHighlights = items
    .filter(image => image.is_highlight && image.id !== featuredImage?.id)
    .sort((left, right) => (left.highlight_order ?? Number.MAX_SAFE_INTEGER) - (right.highlight_order ?? Number.MAX_SAFE_INTEGER) || left.id - right.id)
  const legacyRegular = items.filter(image => image.id !== featuredImage?.id && !image.is_highlight)
  const legacyOrderedImages = featuredImage
    ? [featuredImage, ...legacyHighlights, ...legacyRegular]
    : [...legacyHighlights, ...legacyRegular]
  const fallbackStory: PublicReleaseStoryItem[] = legacyOrderedImages.map((image, index) => ({ type: 'media', id: image.id, sort_order: index, image }))
  const storyItems = story.length > 0 ? story : fallbackStory
  const visibleItems = storyItems.slice(0, visibleCount)
  const remaining = Math.max(0, total - visibleItems.length)

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

  const orderedImages = storyItems.filter(item => item.type === 'media' && item.image).map(item => item.image as PublicReleaseImage)
  const lightboxItems = orderedImages.map(toLightboxItem)
  const activeIndex = activeImageID === null
    ? null
    : lightboxItems.findIndex(item => item.id === activeImageID)
  const renderImage = (image: PublicReleaseImage, featured = false) => {
    const src = image.thumbnail_url ?? image.original_url
    const title = image.title?.trim() || image.caption?.trim() || CATEGORY_LABELS[image.category]
    const sourceGroupName = image.fansub_group_id ? groupNamesByID.get(image.fansub_group_id) : null
    return <article key={image.id} data-testid={`release-image-card-${image.id}`} className={`${styles.card} ${featured ? styles.featuredCard : ''}`}>
      <Button type="button" variant="ghost" className={styles.imageButton} aria-label={`${title} öffnen`} onClick={() => setActiveImageID(image.id)}>
        <span className={styles.imageShell}>
          {src ? <Image src={src} alt={title} className={styles.image} fill sizes="(max-width: 600px) 45vw, (max-width: 900px) 40vw, 28vw" unoptimized /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}
          <span className={styles.maximize} aria-hidden="true"><Maximize2 size={16} /></span>
        </span>
      </Button>
      <div className={styles.meta}>
        <p className={styles.caption}>{image.title?.trim() ? <strong>{title}</strong> : title}</p>
        {image.title?.trim() && image.caption?.trim() ? <p className={styles.caption}>{image.caption}</p> : null}
        <div className={styles.metaRow}>
          {image.is_preview_candidate ? <Badge variant="info">Vorschau</Badge> : null}
          {image.is_highlight ? <Badge variant="success">Highlight</Badge> : null}
          <Badge variant="muted">{CATEGORY_LABELS[image.category]}</Badge>
          <span>Hochgeladen von {image.author_name ?? 'Unbekannt'}</span>
          {sourceGroupName ? <span>{sourceGroupName}</span> : null}
        </div>
      </div>
    </article>
  }

  const renderKara = (segment: PublicReleaseSegment) => {
    const previewUrl = segment.preview_url ?? featuredImage?.thumbnail_url ?? featuredImage?.original_url
    return <article id={'release-story-kara-' + segment.theme_segment_id} key={'kara-' + segment.theme_segment_id} data-testid={'release-kara-card-' + segment.theme_segment_id} className={styles.karaCard}>
      {previewUrl
        ? <Image src={previewUrl} alt={'Preview für ' + segment.name} className={styles.karaPreview} width={640} height={360} unoptimized />
        : <div className={styles.karaPlaceholder} aria-hidden="true" />}
      <div className={styles.karaContent}>
        <Badge variant="muted">{segment.type}</Badge>
        <h3>{segment.name}</h3>
        <p className={styles.karaDuration}>Dauer {formatDuration(segment.duration_seconds)}</p>
        {segment.applies_through_episode ? <Badge variant="muted">Gilt auch für Folge {episodeNumber}–{segment.applies_through_episode}</Badge> : null}
        <div className={styles.karaParticipants}>{segment.participants.length} Mitwirkende</div>
      </div>
      <KaraStoryPlayback segment={segment} releaseVersionID={releaseVersionID} />
    </article>
  }

  const categorySummary = RELEASE_VERSION_MEDIA_CATEGORIES
    .filter(category => categoryTotals[category] > 0)
    .map(category => ({ category, label: CATEGORY_LABELS[category], count: categoryTotals[category] }))

  return <section id="galerie" className={styles.section} data-release-atmosphere-band="true">
    <SectionHeader title="Bilder aus dem Release" description={`${total} Bilder · Einblicke in die Entstehung dieses Releases`} underline />
    <p className={styles.storyIntro}>Screenshots, Typesetting, Karaoke, Qualitätsprüfung und kleine Outtakes erzählen die Geschichte hinter diesem Release.</p>
    <div className={styles.categorySummary} aria-label="Kategorien der Release-Bilder">
      {categorySummary.map(({ category, label, count }) => <Badge key={category} variant="muted">{label} · {count}</Badge>)}
    </div>
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.storyGroups + ' ' + styles.grid} data-testid="release-image-grid">
      {visibleItems.map((item, index) => item.type === 'kara' && item.segment
        ? renderKara(item.segment)
        : item.image ? renderImage(item.image, index === 0 && item.image.id === featuredImage?.id) : null)}
    </div>
    {remaining > 0 ? <div className={styles.loadMoreRow}><Button variant="secondary" size="sm" loading={loading} onClick={revealAll}>Weitere {remaining} Bilder anzeigen</Button></div> : null}
    <FansubMediaLightbox
      media={lightboxItems}
      index={activeIndex !== null && activeIndex >= 0 ? activeIndex : null}
      onClose={() => setActiveImageID(null)}
      onNavigate={(index) => setActiveImageID(lightboxItems[index]?.id ?? null)}
    />
  </section>
}


function formatDuration(seconds: number | null): string {
  const safe = Math.max(0, Math.floor(seconds ?? 0))
  return Math.floor(safe / 60).toString().padStart(2, '0') + ':' + (safe % 60).toString().padStart(2, '0')
}

function KaraStoryPlayback({ segment, releaseVersionID }: { segment: PublicReleaseSegment; releaseVersionID: number }) {
  const session = useAuthSession()
  const hasSession = session.isClientInitialized && (session.hasAccessToken || session.hasRefreshToken)
  const [playing, setPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)

  if (segment.readiness !== 'ready') return <span className={styles.karaUnavailable}>Noch nicht abspielbar</span>
  if (!session.isClientInitialized) return null
  if (!hasSession) {
    return <Button href="/login" variant="secondary" leftIcon={<Lock size={16} aria-hidden="true" />} className={styles.karaPlayButton}>Anmelden zum Abspielen</Button>
  }
  if (playing) {
    return <div className={styles.karaPlayer}>
      <video
        src={'/api/segments/' + segment.theme_segment_id + '/stream?release_version_id=' + releaseVersionID}
        controls
        autoPlay
        playsInline
        aria-label={'Kara: ' + segment.name}
        onError={() => setPlaybackError(true)}
      />
      {playbackError ? <p className={styles.karaPlaybackError}>Dieses Kara-Segment konnte nicht abgespielt werden. Bitte versuche es erneut.</p> : null}
    </div>
  }
  return <Button leftIcon={<Play size={16} aria-hidden="true" />} className={styles.karaPlayButton} onClick={() => { setPlaybackError(false); setPlaying(true) }}>Kara abspielen</Button>
}
