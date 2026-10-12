import type { Dispatch, DragEvent, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { Ban, Check, Edit3, GripVertical, X } from 'lucide-react'
import Image from 'next/image'

import { Badge, Button, Card, EmptyState, Input } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'
import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  resolveApiUrl,
} from '@/lib/api'

import styles from './GroupMediaReviewSection.module.css'
import { isInteractiveDragTarget } from './useGroupMediaReviewReorder.helpers'

interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  title: string
  description: string
  alt_text: string
  category: FansubGroupMediaCategory
  sort_order: number
}

const CATEGORY_OPTIONS: Array<{ value: FansubGroupMediaCategory; label: string }> = [
  { value: 'gallery', label: 'Galerie' },
  { value: 'history_screenshot', label: 'Historische Screenshots' },
  { value: 'old_website', label: 'Alte Webseite' },
  { value: 'forum', label: 'Forum' },
  { value: 'irc_chat', label: 'IRC / Chat' },
  { value: 'event_meeting', label: 'Event / Treffen' },
  { value: 'artwork_fanart', label: 'Artwork / Fanart' },
  { value: 'other', label: 'Sonstiges' },
]

const REVIEW_STATUS_OPTIONS: Array<{ value: FansubMediaReviewStatus; label: string; variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = [
  { value: 'in_pruefung', label: 'In Prüfung', variant: 'warning' },
  { value: 'freigegeben', label: 'Freigegeben', variant: 'success' },
  { value: 'abgelehnt', label: 'Abgelehnt', variant: 'danger' },
  { value: 'archiviert', label: 'Archiviert', variant: 'muted' },
  { value: 'entfernt', label: 'Entfernt', variant: 'muted' },
]

const VISIBILITY_OPTIONS: Array<{ value: FansubMediaVisibility; label: string }> = [
  { value: 'intern', label: 'Intern' },
  { value: 'oeffentlich', label: 'Öffentlich' },
]

function itemToDraft(item: FansubGroupMediaItem): MediaDraft {
  return {
    visibility: item.visibility ?? 'intern',
    review_status: item.review_status ?? 'in_pruefung',
    title: item.title ?? '',
    description: item.description ?? '',
    alt_text: item.alt_text ?? '',
    category: item.category ?? 'other',
    sort_order: item.sort_order ?? 0,
  }
}

function getCategoryLabel(value: FansubGroupMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? 'Sonstiges'
}

function getReviewStatusOption(value: FansubMediaReviewStatus) {
  return REVIEW_STATUS_OPTIONS.find((option) => option.value === value) ?? REVIEW_STATUS_OPTIONS[0]
}

function getVisibilityLabel(value: FansubMediaVisibility): string {
  return VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ?? 'Intern'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function getOverviewImageURL(item: FansubGroupMediaItem): string {
  return item.thumbnail_url || item.preview_url || item.original_url || ''
}

function getMediaDisplayTitle(item: FansubGroupMediaItem): string {
  const title = item.title?.trim()
  if (title) return title

  const date = formatDate(item.created_at)
  const suffix = date ? ` vom ${date}` : ''

  switch (item.category) {
    case 'artwork_fanart':
      return `Artwork${suffix}`
    case 'event_meeting':
      return `Treffen${suffix}`
    case 'forum':
      return `Forenbild${suffix}`
    case 'history_screenshot':
      return `Historischer Screenshot${suffix}`
    case 'irc_chat':
      return `Chatbild${suffix}`
    case 'old_website':
      return `Webseitenbild${suffix}`
    case 'gallery':
      return `Galeriebild${suffix}`
    default:
      return `Gruppenbild${suffix}`
  }
}

function getUploaderLine(item: FansubGroupMediaItem): string {
  const uploader = item.uploaded_by_display_name?.trim() || 'Unbekannt'
  const createdAt = formatDate(item.created_at)
  return createdAt ? `Hochgeladen von ${uploader} am ${createdAt}` : `Hochgeladen von ${uploader}`
}

interface GroupMediaReviewGridProps {
  totalMediaItemsCount: number
  filteredMediaItemsCount: number
  visibleMediaItems: FansubGroupMediaItem[]
  remainingMediaCount: number
  onLoadMore: () => void
  selectedMediaIds: Set<number>
  editingMediaId: number | null
  saving: Record<number, boolean>
  saveErrors: Record<number, string>
  failedPreviewIds: Record<number, boolean>
  setFailedPreviewIds: Dispatch<SetStateAction<Record<number, boolean>>>
  draggedMediaId: number | null
  dragOverMediaId: number | null
  setDragOverMediaId: (mediaId: number | null) => void
  canUpdate: boolean
  canUpdateOwn: boolean
  canReview: boolean
  canReorder: boolean
  canReorderMedia: boolean
  isBulkSaving: boolean
  toggleMediaSelection: (mediaId: number) => void
  startEditing: (item: FansubGroupMediaItem) => void
  cancelEditing: (item: FansubGroupMediaItem) => void
  handleQuickReview: (item: FansubGroupMediaItem, reviewStatus: FansubMediaReviewStatus) => void | Promise<void>
  handleDragOver: (event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) => void
  handleReorderDrop: (event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) => void | Promise<void>
  handleDragStart: (event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) => void
  handleDragEnd: () => void
  handlePointerDragStart: (event: ReactPointerEvent<HTMLElement>, item: FansubGroupMediaItem) => void
  handlePointerDragMove: (event: ReactPointerEvent<HTMLElement>) => void
  handlePointerDragEnd: (event: ReactPointerEvent<HTMLElement>) => void | Promise<void>
}

export function GroupMediaReviewGrid({
  totalMediaItemsCount,
  filteredMediaItemsCount,
  visibleMediaItems,
  remainingMediaCount,
  onLoadMore,
  selectedMediaIds,
  editingMediaId,
  saving,
  saveErrors,
  failedPreviewIds,
  setFailedPreviewIds,
  draggedMediaId,
  dragOverMediaId,
  setDragOverMediaId,
  canUpdate,
  canUpdateOwn,
  canReview,
  canReorder,
  canReorderMedia,
  isBulkSaving,
  toggleMediaSelection,
  startEditing,
  cancelEditing,
  handleQuickReview,
  handleDragOver,
  handleReorderDrop,
  handleDragStart,
  handleDragEnd,
  handlePointerDragStart,
  handlePointerDragMove,
  handlePointerDragEnd,
}: GroupMediaReviewGridProps) {
  return (
    <>
      {totalMediaItemsCount === 0 ? (
        <EmptyState
          title="Keine Medien vorhanden"
          description="Für diese Gruppe sind noch keine Medien angelegt."
        />
      ) : filteredMediaItemsCount === 0 ? (
        <EmptyState
          title="Keine Treffer"
          description="Passe Filter oder Suche an, um weitere Medien zu sehen."
        />
      ) : (
        <div className={styles.mediaReviewGrid}>
          {visibleMediaItems.map((item) => {
            const persisted = itemToDraft(item)
            const reviewStatus = getReviewStatusOption(persisted.review_status)
            const isEditing = editingMediaId === item.id
            const isSelected = selectedMediaIds.has(item.id)
            const isSavingItem = saving[item.id] ?? false
            const canEditItem = canUpdate || (canUpdateOwn && item.uploaded_by_current_user)
            const isDragging = draggedMediaId === item.id
            const isDropTarget = dragOverMediaId === item.id && draggedMediaId !== null && draggedMediaId !== item.id
            const overviewImageURL = getOverviewImageURL(item)
            const displayTitle = getMediaDisplayTitle(item)
            const uploaderLine = getUploaderLine(item)

            const reorderLockedHint = canReorder && !canReorderMedia
              ? 'Reihenfolge kann nur in der Gesamtansicht geändert werden'
              : undefined

            return (
              <Card
                key={item.id}
                variant="nested"
                data-media-card-id={item.id}
                className={classNames(
                  styles.mediaCard,
                  isSelected && styles.mediaCardSelected,
                  isDragging && styles.mediaCardDragging,
                  isDropTarget && styles.mediaCardDropTarget,
                )}
                tabIndex={0}
                draggable={canReorderMedia}
                onDragStart={(event) => handleDragStart(event, item)}
                onDragEnd={handleDragEnd}
                onDragEnter={(event) => handleDragOver(event, item)}
                onDragOver={(event) => handleDragOver(event, item)}
                onDrop={(event) => void handleReorderDrop(event, item)}
                onDragLeave={() => {
                  if (dragOverMediaId === item.id) setDragOverMediaId(null)
                }}
                onClick={(event) => {
                  if (isInteractiveDragTarget(event.target as Element)) return
                  startEditing(item)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  if (isInteractiveDragTarget(event.target as Element)) return
                  event.preventDefault()
                  startEditing(item)
                }}
              >
                <div className={styles.selectionRow}>
                  {canReview ? (
                    <label className={styles.selectionControl}>
                      <Input
                        type="checkbox"
                        className={classNames(styles.selectionCheckbox, 'media-checkbox')}
                        checked={isSelected}
                        disabled={isBulkSaving}
                        onChange={() => toggleMediaSelection(item.id)}
                        aria-label={`${displayTitle} auswählen`}
                      />
                      <span>{isSelected ? 'Ausgewählt' : 'Auswählen'}</span>
                    </label>
                  ) : (
                    <span />
                  )}
                  {canReorder ? (
                    <span
                      className={classNames(styles.dragHandle, !canReorderMedia && styles.dragHandleDisabled)}
                      title={canReorderMedia ? 'Ganze Karte ziehen, um die Reihenfolge zu ändern' : reorderLockedHint}
                      aria-hidden="true"
                      onPointerDown={(event) => handlePointerDragStart(event, item)}
                      onPointerMove={handlePointerDragMove}
                      onPointerUp={(event) => void handlePointerDragEnd(event)}
                      onPointerCancel={handleDragEnd}
                    >
                      <GripVertical size={16} />
                    </span>
                  ) : null}
                </div>

                {!item.owner_consistent ? (
                  <div className={styles.ownerFlagRow}>
                    <Badge variant="warning">Owner-Zuordnung prüfen</Badge>
                  </div>
                ) : null}

                <div className={styles.mediaCompactRow}>
                  <button
                    type="button"
                    className={styles.previewFrame}
                    onClick={() => startEditing(item)}
                    aria-label={`${displayTitle} öffnen`}
                  >
                    {overviewImageURL && !failedPreviewIds[item.id] ? (
                      <Image
                        src={resolveApiUrl(overviewImageURL)}
                        alt={persisted.alt_text || displayTitle}
                        fill
                        sizes="96px"
                        unoptimized
                        loading="lazy"
                        draggable={false}
                        onError={() => setFailedPreviewIds((prev) => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <span>Keine Vorschau</span>
                    )}
                  </button>

                  <div className={styles.mediaSummary}>
                    <div className={styles.mediaTitleRow}>
                      <h3>{displayTitle}</h3>
                      <Badge variant="neutral">{getCategoryLabel(persisted.category)}</Badge>
                    </div>
                    <div className={styles.badgeRow}>
                      <Badge variant={reviewStatus.variant}>{reviewStatus.label}</Badge>
                      <Badge variant="info">{getVisibilityLabel(persisted.visibility)}</Badge>
                    </div>
                    <p className={styles.mediaMetaLine}>{uploaderLine}</p>
                  </div>

                  <div className={styles.compactActions}>
                    {canReview ? (
                      <>
                        {persisted.review_status !== 'freigegeben' ? (
                          <Button
                            variant="success"
                            size="sm"
                            iconOnly
                            leftIcon={<Check size={16} />}
                            aria-label={`${displayTitle} freigeben`}
                            title="Freigeben"
                            disabled={isSavingItem || isBulkSaving}
                            onClick={() => void handleQuickReview(item, 'freigegeben')}
                          />
                        ) : null}
                        <Button
                          variant="danger"
                          size="sm"
                          iconOnly
                          leftIcon={<Ban size={16} />}
                          aria-label={`${displayTitle} ablehnen`}
                          title="Ablehnen"
                          disabled={isSavingItem || isBulkSaving}
                          onClick={() => void handleQuickReview(item, 'abgelehnt')}
                        />
                      </>
                    ) : null}
                    {canEditItem ? (
                      <Button
                        variant={isEditing ? 'secondary' : 'primary'}
                        size="sm"
                        iconOnly
                        leftIcon={isEditing ? <X size={16} /> : <Edit3 size={16} />}
                        aria-label={`${displayTitle} bearbeiten`}
                        title={isEditing ? 'Schließen' : 'Bearbeiten'}
                        disabled={isBulkSaving}
                        onClick={() => (isEditing ? cancelEditing(item) : startEditing(item))}
                      />
                    ) : null}
                  </div>
                </div>

                {saveErrors[item.id] ? <p className={styles.inlineCardError} role="alert">{saveErrors[item.id]}</p> : null}
              </Card>
            )
          })}
        </div>
      )}

      {remainingMediaCount > 0 ? (
        <div className={styles.loadMoreRow}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
          >
            Weitere Medien anzeigen ({remainingMediaCount})
          </Button>
        </div>
      ) : null}
    </>
  )
}
