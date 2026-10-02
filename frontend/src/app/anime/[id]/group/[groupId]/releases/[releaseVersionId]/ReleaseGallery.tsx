'use client'

import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge, Button, Modal, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { FansubMediaLightbox, type PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import { getGroupReleaseImages } from '@/lib/api'
import { buildFansubReleasePlaybackLoginHref } from '@/lib/fansubProjectRoutes'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicReleaseGroup, PublicReleaseImage, PublicReleaseSegment, PublicReleaseStoryItem } from '@/types/releaseDetail'
import { CATEGORY_LABELS, RELEASE_VERSION_MEDIA_CATEGORIES, type ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'

import { ParticipantsDisclosure, segmentTypeDisplayLabel } from './ThemeTimelineSegmentDetails'
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
  embedded?: boolean
  projectPath?: string | null
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

export function ReleaseGallery({ animeID, groupID, releaseVersionID, initialImages, story = [], categoryTotals, groups = [], episodeNumber, embedded = false, projectPath }: Props) {
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
  const remaining = Math.max(0, storyItems.length - visibleItems.length, total - visibleItems.length)

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
    const src = image.display_url ?? image.thumbnail_url ?? image.original_url
    const title = image.title?.trim() || image.caption?.trim() || CATEGORY_LABELS[image.category]
    const isFeaturedCard = featured || image.is_highlight
    // 173-16 Task 0: derived from ReleaseGallery.module.css's actual breakpoints --
    // .grid is 1 column at <=600px, 2 columns at 601-900px, 3 columns at >=901px
    // (verified via the "viewport contract" test above); a featured/highlight
    // card always spans the full grid row (grid-column: 1/-1) regardless of
    // column count, so it is always ~100vw-ish, not a fraction of a column.
    const sizes = isFeaturedCard
      ? '(max-width: 600px) 100vw, 66vw'
      : '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw'
    return <article key={image.id} data-testid={`release-image-card-${image.id}`} className={`${styles.card} ${isFeaturedCard ? styles.featuredCard : ''}`}>
      <Button type="button" variant="ghost" className={styles.imageButton} aria-label={`${title} öffnen`} onClick={() => setActiveImageID(image.id)}>
        <span className={styles.imageShell}>
          {src ? <ResponsiveImage src={src} alt={title} className={styles.image} fill sizes={sizes} quality={85} /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}
        </span>
      </Button>
      <Badge variant="muted" className={styles.imageCategory} data-category={image.category}>{CATEGORY_LABELS[image.category]}</Badge>
      <div className={styles.meta}>
        <p className={styles.caption}>{image.title?.trim() ? <strong>{title}</strong> : title}</p>
        {image.title?.trim() && image.caption?.trim() ? <p className={styles.caption}>{image.caption}</p> : null}
        <div className={styles.metaRow}>
          <span className={styles.uploaderChip}>Uploaded von {image.author_name ?? 'Unbekannt'}</span>
        </div>
      </div>
    </article>
  }

  const renderKara = (segment: PublicReleaseSegment) => {
    // D-10: Ersatzbild loest das Backend auf; fehlt es ganz, greift der Platzhalter unten.
    const previewUrl = segment.preview_url
    return <article id={'release-story-kara-' + segment.theme_segment_id} key={'kara-' + segment.theme_segment_id} data-testid={'release-kara-card-' + segment.theme_segment_id} data-kara-type={segmentTypeDisplayLabel(segment.type).toLowerCase()} className={styles.karaCard}>
      <div className={styles.karaPreviewWrap}>
        {/* Gleicher 16:9-Rahmen wie die normalen Bildkarten (imageShell + fill). */}
        <span className={styles.imageShell}>
          {previewUrl
            // 173-16 Task 0: the Kara preview card occupies one plain grid cell
            // (never grid-column: 1/-1 like a featured card), so it uses the same
            // corrected "normal card" sizes ladder as renderImage above.
            ? <ResponsiveImage src={previewUrl} alt={'Preview für ' + segment.name} className={styles.image} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" quality={85} />
            : <span className={styles.imagePlaceholder} aria-hidden="true" />}
        </span>
        <KaraStoryPlayback segment={segment} releaseVersionID={releaseVersionID} loginHref={buildFansubReleasePlaybackLoginHref({ animeID, groupID, releaseVersionID, segmentID: segment.theme_segment_id, canonicalProjectPath: projectPath })} />
      </div>
      <div className={styles.karaBadges}>
        <Badge variant="muted" className={styles.karaCategory} data-kara-type={segmentTypeDisplayLabel(segment.type).toLowerCase()}>{segmentTypeDisplayLabel(segment.type)}</Badge>
        {segment.applies_through_episode ? <Badge variant="muted" className={styles.karaApplies}>Gilt auch für Folge {episodeNumber}–{segment.applies_through_episode}</Badge> : null}
      </div>
      <div className={styles.karaContent}>
        <h3>{segment.name}</h3>
        <p className={styles.karaDuration}>Dauer {formatDuration(segment.duration_seconds)}</p>
        {segment.participants.length > 0 && (!segment.applies_from_episode || segment.applies_from_episode === episodeNumber) ? (
          <ParticipantsDisclosure segment={segment} projectPath={projectPath} />
        ) : segment.participants.length > 0 && segment.applies_from_episode ? (
          <span className={styles.participantsHint}>Mitwirkende siehe Folge {segment.applies_from_episode}</span>
        ) : null}
      </div>
    </article>
  }

  const categorySummary = RELEASE_VERSION_MEDIA_CATEGORIES
    .filter(category => categoryTotals[category] > 0)
    .map(category => ({ category, label: CATEGORY_LABELS[category], count: categoryTotals[category] }))

  return <section id="galerie" className={styles.section + (embedded ? ' ' + styles.embeddedSection : '')} data-release-atmosphere-band="true">
    {embedded ? null : <SectionHeader title="Bilder aus dem Release" description={total + ' Bilder · Einblicke in die Entstehung dieses Releases'} underline />}
    {embedded ? null : <p className={styles.storyIntro}>Screenshots, Typesetting, Karaoke, Qualitätsprüfung und kleine Outtakes erzählen die Geschichte hinter diesem Release.</p>}
    {embedded ? null : <div className={styles.categorySummary} aria-label="Kategorien der Release-Bilder">
      {categorySummary.map(({ category, label, count }) => <Badge key={category} variant="muted">{label} · {count}</Badge>)}
    </div>}
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

function KaraStoryPlayback({ segment, releaseVersionID, loginHref }: { segment: PublicReleaseSegment; releaseVersionID: number; loginHref: string }) {
  const session = useAuthSession()
  const hasSession = session.isClientInitialized && (session.hasAccessToken || session.hasRefreshToken)
  const [playing, setPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    function stopForOtherPlayback(event: Event) {
      const detail = (event as CustomEvent<{ segmentId?: number; source?: 'gallery' | 'timeline' }>).detail
      if (detail?.source !== 'timeline' && detail?.segmentId === segment.theme_segment_id) return
      videoRef.current?.pause()
      videoRef.current?.removeAttribute('src')
      videoRef.current?.load()
      setPlaying(false)
    }

    window.addEventListener('release-playback-start', stopForOtherPlayback)
    return () => window.removeEventListener('release-playback-start', stopForOtherPlayback)
  }, [segment.theme_segment_id])

  if (segment.readiness !== 'ready') return <span className={styles.karaUnavailable}>Noch nicht abspielbar</span>
  if (!session.isClientInitialized) return null
  if (!hasSession) {
    return <Button href={loginHref} variant="secondary" aria-label="Anmelden zum Abspielen" className={styles.karaPlayButton}><Play size={20} aria-hidden="true" /></Button>
  }
  function closePlayer() {
    videoRef.current?.pause()
    setPlaying(false)
  }

  // Abspielen im globalen Modal statt in der kleinen Kartenflaeche: gross, ueber allem und mit
  // funktionierendem Vollbild (die Karte schneidet ihren Inhalt per overflow ab).
  return <>
    <Button aria-label="Kara abspielen" className={styles.karaPlayButton} onClick={() => {
      window.dispatchEvent(new CustomEvent('release-playback-start', { detail: { segmentId: segment.theme_segment_id, source: 'gallery' } }))
      setPlaybackError(false)
      setPlaying(true)
    }}><Play size={20} aria-hidden="true" /></Button>
    <Modal open={playing} onClose={closePlayer} title={segment.name} description={'Kara · ' + segmentTypeDisplayLabel(segment.type)} size="lg">
      {playbackError
        ? <p className={styles.karaPlaybackError} role="alert">Dieses Kara-Segment konnte nicht abgespielt werden. Bitte versuche es erneut.</p>
        : <video
            className={styles.karaModalVideo}
            src={'/api/segments/' + segment.theme_segment_id + '/stream?release_version_id=' + releaseVersionID}
            ref={videoRef}
            controls
            autoPlay
            playsInline
            aria-label={'Kara: ' + segment.name}
            onError={() => setPlaybackError(true)}
          />}
    </Modal>
  </>
}
