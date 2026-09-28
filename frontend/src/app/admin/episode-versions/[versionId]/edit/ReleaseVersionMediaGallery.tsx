'use client'

import { useRef, useState } from 'react'

import {
  CATEGORY_ALLOWS_PREVIEW,
  CATEGORY_LABELS,
  RELEASE_VERSION_MEDIA_CATEGORIES,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaReorderRequest,
} from '@/types/releaseVersionMedia'

import styles from './ReleaseVersionMediaGallery.module.css'

interface ReleaseVersionMediaGalleryProps {
  items: ReleaseVersionMediaItem[]
  selectedItemId: number | null
  onSelectItem: (item: ReleaseVersionMediaItem) => void
  versionId: number
  onReorder?: (versionId: number, body: ReleaseVersionMediaReorderRequest) => Promise<void>
  canReorder?: boolean
  canManageHighlights?: boolean
  onPreviewChange?: (mediaId: number, nextValue: boolean) => Promise<void>
  onHighlightChange?: (mediaId: number, nextValue: boolean) => Promise<void>
}

function cardLabel(item: ReleaseVersionMediaItem): string {
  return item.caption?.trim() || `Asset #${item.id}`
}

function isGif(item: ReleaseVersionMediaItem): boolean {
  return (
    item.original_url?.toLowerCase().endsWith('.gif') === true ||
    (item as unknown as { mime_type?: string }).mime_type === 'image/gif'
  )
}

interface DragState {
  draggedId: number | null
}

const INITIAL_DRAG_STATE: DragState = {
  draggedId: null,
}

interface HoverPreviewState {
  item: ReleaseVersionMediaItem | null
}

export function ReleaseVersionMediaGallery({
  items,
  selectedItemId,
  onSelectItem,
  versionId,
  onReorder,
  canReorder = true,
  canManageHighlights = false,
  onPreviewChange,
  onHighlightChange,
}: ReleaseVersionMediaGalleryProps) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE)
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null)
  const [hoveredItem, setHoveredItem] = useState<HoverPreviewState>({ item: null })
  const [gifHoveredIds, setGifHoveredIds] = useState<Set<number>>(new Set())
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter(item: ReleaseVersionMediaItem) {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem({ item })
      if (isGif(item)) {
        setGifHoveredIds((prev) => {
          const next = new Set(prev)
          next.add(item.id)
          return next
        })
      }
    }, 200)
  }

  function handleMouseLeave(item: ReleaseVersionMediaItem) {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setHoveredItem({ item: null })
    if (isGif(item)) {
      setGifHoveredIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  function handleDragStart(item: ReleaseVersionMediaItem) {
    setDragState({
      draggedId: item.id,
    })
  }

  function handleDragOver(item: ReleaseVersionMediaItem) {
    setDragOverItemId(item.id)
  }

  function handleDrop(targetItem: ReleaseVersionMediaItem) {
    const { draggedId } = dragState

    // Reset drag state immediately
    setDragState(INITIAL_DRAG_STATE)
    setDragOverItemId(null)

    if (draggedId == null || draggedId === targetItem.id) {
      return
    }

    if (!onReorder) {
      return
    }

    // Keep one global story order across all release images. Categories remain
    // visible as labels, but an admin can move a screenshot before a karaoke
    // example or an outtake when that is what the release story needs.
    const orderedItems = items
      .filter((i) => i.id !== draggedId)
      .sort((a, b) => a.sort_order - b.sort_order)

    const targetIndex = orderedItems.findIndex((i) => i.id === targetItem.id)

    const draggedItem = items.find((item) => item.id === draggedId)
    if (!draggedItem || targetIndex === -1) {
      return
    }

    const reordered = [...orderedItems]
    reordered.splice(targetIndex, 0, draggedItem)

    // Assign new sort_order values (gap of 10 to match backend convention)
    const reorderItems = reordered.map((item, index) => ({
      id: item.id,
      sort_order: (index + 1) * 10,
    }))

    onReorder(versionId, { items: reorderItems }).catch(() => {
      // Errors surface through the hook's error state; no local handling needed
    })
  }

  function handleDragEnd() {
    setDragState(INITIAL_DRAG_STATE)
    setDragOverItemId(null)
  }

  const previewItem = hoveredItem.item

  return (
    <div className={styles.gallery}>
      {RELEASE_VERSION_MEDIA_CATEGORIES.map((category) => {
        const categoryItems = items
          .filter((item) => item.category === category)
          .sort((a, b) => a.sort_order - b.sort_order)

        return (
          <section key={category} className={styles.section}>
            <div className={styles.headingRow}>
              <h3 className={styles.heading}>{CATEGORY_LABELS[category]}</h3>
              <span className={styles.count}>{categoryItems.length} Medien</span>
            </div>

            {categoryItems.length === 0 ? (
              <p className={styles.emptySection}>Noch keine Medien in dieser Kategorie.</p>
            ) : (
              <div className={styles.cardGrid}>
                {categoryItems.map((item) => {
                  const isDragging = dragState.draggedId === item.id
                  const isDropTarget =
                    dragOverItemId === item.id &&
                    dragState.draggedId !== null &&
                    dragState.draggedId !== item.id
                  const isGifHovered = gifHoveredIds.has(item.id)

                  return (
                    <div
                      key={item.id}
                      draggable={canReorder}
                      className={[
                        styles.cardWrapper,
                        isDragging ? styles.cardDragging : '',
                        isDropTarget ? styles.cardDropTarget : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseEnter={() => handleMouseEnter(item)}
                      onMouseLeave={() => handleMouseLeave(item)}
                      onDragStart={() => handleDragStart(item)}
                      onDragOver={(event) => {
                        event.preventDefault()
                        handleDragOver(item)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        handleDrop(item)
                      }}
                      onDragEnd={handleDragEnd}
                    >
                      <button
                        type="button"
                        draggable={canReorder}
                        className={[
                          styles.card,
                          selectedItemId === item.id ? styles.cardActive : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSelectItem(item)}
                        onMouseEnter={() => handleMouseEnter(item)}
                        onMouseLeave={() => handleMouseLeave(item)}
                      >
                        <div className={styles.thumb}>
                          {(item.thumbnail_url || (isGifHovered && item.original_url)) ? (
                            <img
                              className={styles.thumbImage}
                              src={isGifHovered && item.original_url ? item.original_url : (item.thumbnail_url ?? '')}
                              alt={cardLabel(item)}
                            />
                          ) : (
                            <span className={styles.placeholder}>Kein Thumbnail</span>
                          )}
                        </div>
                        <div className={styles.caption}>{cardLabel(item)}</div>
                        <div className={styles.metaRow}>
                          {item.is_preview_candidate ? (
                            <span className={styles.previewBadge}>Preview</span>
                          ) : (
                            <span />
                          )}
                          {item.original_url ? (
                            <a
                              className={styles.openLink}
                              href={item.original_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              Öffnen
                            </a>
                          ) : null}
                        </div>
                      </button>
                      <div className={styles.metaRow}>
                        {onPreviewChange && CATEGORY_ALLOWS_PREVIEW[item.category] ? (
                          <button
                            type="button"
                            className={styles.openLink}
                            aria-pressed={item.is_preview_candidate}
                            onClick={(event) => {
                              event.stopPropagation()
                              void onPreviewChange(item.id, !item.is_preview_candidate)
                            }}
                          >
                            {item.is_preview_candidate ? 'Vorschau entfernen' : 'Als Vorschau wählen'}
                          </button>
                        ) : null}
                        {canManageHighlights && onHighlightChange ? (
                          <button
                            type="button"
                            className={styles.openLink}
                            aria-pressed={item.is_highlight}
                            onClick={(event) => {
                              event.stopPropagation()
                              void onHighlightChange(item.id, !item.is_highlight)
                            }}
                          >
                            {item.is_highlight ? 'Highlight entfernen' : 'Als Highlight markieren'}
                          </button>
                        ) : null}
                      </div>

                      {previewItem?.id === item.id && (
                        <div
                          role="tooltip"
                          className={styles.hoverPreview}
                          aria-label={`Vorschau: ${cardLabel(item)}`}
                        >
                          <div className={styles.hoverPreviewImageWrapper}>
                            {(item.thumbnail_url || item.original_url) ? (
                              <img
                                className={styles.hoverPreviewImage}
                                src={
                                  isGifHovered && item.original_url
                                    ? item.original_url
                                    : (item.thumbnail_url ?? item.original_url ?? '')
                                }
                                alt={cardLabel(item)}
                              />
                            ) : (
                              <span className={styles.placeholder}>Kein Bild</span>
                            )}
                          </div>
                          <div className={styles.hoverPreviewCaption}>{cardLabel(item)}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
