'use client'

import { DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, ImageIcon, Star } from 'lucide-react'

import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionAdminStoryItem, ReleaseVersionMediaCategory, ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

import { Badge, Button } from '@/components/ui'
import { CATEGORY_OPTIONS, formatKaraDuration, formatKaraEpisodeHint, getKaraCategoryLabel, getKaraStatusLabel } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

function categoryLabel(category: ReleaseVersionMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function getAssetName(item: ReleaseVersionMediaItem, contextTitle: string): string {
  const title = item.title?.trim() || item.caption?.trim()
  if (title) return title
  return contextTitle
}

function statusBadge(item: ReleaseVersionMediaItem): { label: string; className: string; variant: 'success' | 'warning' | 'danger' | 'muted' } {
  switch (item.review_state) {
    case 'confirmed':
      return { label: 'Bestätigt', className: styles.assetStatusPublic, variant: 'success' }
    case 'rejected':
      return { label: 'Abgelehnt', className: styles.assetStatusRejected, variant: 'danger' }
    case 'tombstoned':
      return { label: 'Entfernt', className: styles.assetStatusMuted, variant: 'muted' }
    case 'pending':
      return { label: 'In Prüfung', className: styles.assetStatusReview, variant: 'warning' }
    default:
      if (item.review_status === 'freigegeben') {
        return {
          label: item.visibility === 'oeffentlich' ? 'Öffentlich' : 'Intern',
          className: item.visibility === 'oeffentlich' ? styles.assetStatusPublic : styles.assetStatusMuted,
          variant: item.visibility === 'oeffentlich' ? 'success' : 'muted',
        }
      }
      if (item.review_status === 'abgelehnt') {
        return { label: 'Abgelehnt', className: styles.assetStatusRejected, variant: 'danger' }
      }
      return { label: 'In Prüfung', className: styles.assetStatusReview, variant: 'warning' }
  }
}

function formatLastActivity(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export interface ReleaseVersionMediaGridProps {
  storyItems: ReleaseVersionAdminStoryItem[]
  contextTitle: string
  canReorderMedia: boolean
  canManageHighlights: boolean
  canUpdateMedia: boolean
  dragOverStoryKey: string | null
  previewSavingId: number | null
  onDragStart: (event: DragEvent<HTMLDivElement>, itemKey: string) => void
  onDragOverTarget: (itemKey: string) => void
  onDrop: (targetKey: string) => void
  onDragEnd: () => void
  onMoveByOffset: (itemKey: string, offset: number) => void
  onOpenEditSheet: (item: ReleaseVersionMediaItem) => void
  onPreviewChange: (item: ReleaseVersionMediaItem, nextValue: boolean) => void
  onHighlightChange?: (mediaId: number, nextValue: boolean) => void
}

export function ReleaseVersionMediaGrid({
  storyItems,
  contextTitle,
  canReorderMedia,
  canManageHighlights,
  canUpdateMedia,
  dragOverStoryKey,
  previewSavingId,
  onDragStart,
  onDragOverTarget,
  onDrop,
  onDragEnd,
  onMoveByOffset,
  onOpenEditSheet,
  onPreviewChange,
  onHighlightChange,
}: ReleaseVersionMediaGridProps) {
  return (
    <div className={styles.mediaGrid}>
      {[...storyItems].sort((a, b) => a.sort_order - b.sort_order).map((storyItem) => {
        if (storyItem.type === 'kara') {
          const segment = storyItem.segment
          const category = getKaraCategoryLabel(segment)
          const duration = formatKaraDuration(segment)
          const episodeHint = formatKaraEpisodeHint(segment)
          return (
            <div
              key={'kara-' + segment.id}
              className={styles.mediaCard + ' ' + styles.karaCard}
              data-kara-category={category.toLowerCase()}
              draggable={canReorderMedia}
              onDragStart={(event) => onDragStart(event, 'kara:' + segment.id)}
              onDragOver={(event) => {
                if (!canReorderMedia) return
                event.preventDefault()
                onDragOverTarget('kara:' + segment.id)
              }}
              onDrop={(event) => {
                event.preventDefault()
                onDrop('kara:' + segment.id)
              }}
              onDragEnd={() => {
                onDragEnd()
              }}
              data-drop-target={dragOverStoryKey === 'kara:' + segment.id ? 'true' : undefined}
              data-testid={'admin-kara-card-' + segment.id}
            >
              <div
                className={styles.mediaCardOpen}
                draggable={canReorderMedia}
                onDragStart={(event) => onDragStart(event, 'kara:' + segment.id)}

              >
                {canReorderMedia ? (
                  <span className={styles.storyDragControls}>
                    <GripVertical size={16} aria-hidden="true" />
                    <Button type="button" variant="subtle" size="sm" aria-label="Nach oben verschieben" onClick={() => onMoveByOffset('kara:' + segment.id, -1)}><ArrowUp size={14} aria-hidden="true" /></Button>
                    <Button type="button" variant="subtle" size="sm" aria-label="Nach unten verschieben" onClick={() => onMoveByOffset('kara:' + segment.id, 1)}><ArrowDown size={14} aria-hidden="true" /></Button>
                  </span>
                ) : null}
                <span className={styles.mediaThumb}>
                  {storyItem.thumbnail_url ? <img draggable={false} src={storyItem.thumbnail_url} alt="" /> : <ImageIcon size={22} aria-hidden="true" />}
                </span>
                <span className={styles.mediaCardBody}>
                  <span className={styles.mediaName}>{(segment.theme_title || segment.library_segment_name || segment.theme_type_name)}</span>
                  <span className={styles.mediaMeta}>
                    <Badge variant="muted" className={styles.mediaCategory}>{category}</Badge>
                    <Badge variant="muted" className={styles.mediaStatus}>{getKaraStatusLabel(segment)}</Badge>
                  </span>
                  {duration ? <span className={styles.helper}>Dauer {duration}</span> : null}
                  {episodeHint ? <span className={styles.helper}>{episodeHint}</span> : null}
                  <span className={styles.helper}>Kara-Segment · nur Orientierung</span>
                  <span className={styles.karaFooter}>
                    <span className={styles.karaStoryLabel}>Story</span>
                    <span className={styles.karaOrderHint}>Per Drag-and-drop verschieben</span>
                  </span>
                </span>
              </div>
            </div>
          )
        }
        const item = storyItem.media
        const badge = statusBadge(item)
        const lastActivity = formatLastActivity(item.last_activity_at)
        const uploaderName = item.uploaded_by_display_name?.trim() || 'Unbekannt'
        const uploaderLabel = item.uploaded_by_current_user ? 'dir (' + uploaderName + ')' : uploaderName
        return (
          <div
            key={item.id}
            className={styles.mediaCard + ' ' + (item.is_preview_candidate ? styles.mediaCardPreview : '')}
            draggable={canReorderMedia}
            onDragStart={(event) => onDragStart(event, 'media:' + item.id)}
            onDragOver={(event) => {
              if (!canReorderMedia) return
              event.preventDefault()
              onDragOverTarget('media:' + item.id)
            }}
            onDrop={(event) => {
              event.preventDefault()
              onDrop('media:' + item.id)
            }}
            onDragEnd={() => {
              onDragEnd()
            }}
            data-drop-target={dragOverStoryKey === 'media:' + item.id ? 'true' : undefined}
          >
            <div
              className={styles.mediaCardOpen}
              draggable={canReorderMedia}
              onDragStart={(event) => onDragStart(event, 'media:' + item.id)}

            >
              {canReorderMedia ? (
                <span className={styles.storyDragControls}>
                  <GripVertical size={16} aria-hidden="true" />
                  <Button type="button" variant="subtle" size="sm" aria-label="Nach oben verschieben" onClick={() => onMoveByOffset('media:' + item.id, -1)}><ArrowUp size={14} aria-hidden="true" /></Button>
                  <Button type="button" variant="subtle" size="sm" aria-label="Nach unten verschieben" onClick={() => onMoveByOffset('media:' + item.id, 1)}><ArrowDown size={14} aria-hidden="true" /></Button>
                </span>
              ) : null}
              <span className={styles.mediaThumb}>
                {item.thumbnail_url || item.original_url ? (
                  <img draggable={false} src={item.thumbnail_url ?? item.original_url ?? ''} alt="" />
                ) : (
                  <ImageIcon size={22} aria-hidden="true" />
                )}
                {item.is_preview_candidate ? (
                  <Badge variant="success" className={styles.previewBadge}>
                    <Star size={13} aria-hidden="true" />
                    Aktuelles Vorschaubild
                  </Badge>
                ) : null}
              </span>
              <span className={styles.mediaCardBody}>
                <span className={styles.mediaName}>{getAssetName(item, contextTitle)}</span>
                <span className={styles.mediaMeta}>
                  <Badge variant="muted" className={styles.mediaCategory}>{categoryLabel(item.category)}</Badge>
                  <Badge variant={badge.variant} className={badge.className + ' ' + styles.mediaStatus}>{badge.label}</Badge>
                  {item.review_state === 'confirmed' && item.visibility === 'oeffentlich' ? (
                    <Badge variant="success" className={styles.mediaStatus}>Öffentlich</Badge>
                  ) : null}
                </span>
                <span className={styles.helper}>Hochgeladen von {uploaderLabel}</span>
                {item.title && item.caption ? <span className={styles.helper + ' ' + styles.mediaCaption}>{item.caption}</span> : null}
                {lastActivity ? (
                  <span className={styles.helper + ' ' + styles.mediaActivity}>
                    Letzte Aktivität:
                    <time dateTime={item.last_activity_at ?? undefined}>{lastActivity}</time>
                  </span>
                ) : null}
              </span>
            </div>
            <Button type="button" className={styles.mediaPreviewAction} variant="subtle" size="sm" onClick={() => onOpenEditSheet(item)} aria-label={getAssetName(item, contextTitle) + ' ' + ((item.can_update ?? canUpdateMedia) ? 'bearbeiten' : 'ansehen') + (item.is_preview_candidate ? ', aktuelles Vorschaubild' : '')}>{'Öffnen'}</Button>
            {CATEGORY_ALLOWS_PREVIEW[item.category] && ((item.can_update ?? canUpdateMedia) || canManageHighlights) ? (
              <Button type="button" className={styles.mediaPreviewAction} variant={item.is_preview_candidate ? 'success' : 'subtle'} size="sm" leftIcon={<Star size={14} aria-hidden="true" />} loading={previewSavingId === item.id} aria-pressed={item.is_preview_candidate} onClick={() => onPreviewChange(item, !item.is_preview_candidate)}>
                {item.is_preview_candidate ? 'Vorschau entfernen' : 'Als Vorschau wählen'}
              </Button>
            ) : null}
            {canManageHighlights && onHighlightChange ? (
              <Button type="button" className={styles.mediaPreviewAction} variant={item.is_highlight ? 'success' : 'subtle'} size="sm" leftIcon={<Star size={14} aria-hidden="true" />} aria-pressed={item.is_highlight} onClick={() => onHighlightChange(item.id, !item.is_highlight)}>
                {item.is_highlight ? 'Highlight entfernen' : 'Als Highlight markieren'}
              </Button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
