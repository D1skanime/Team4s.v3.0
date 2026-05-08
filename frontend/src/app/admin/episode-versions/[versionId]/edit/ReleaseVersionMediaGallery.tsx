'use client'

import { useRef, useState } from 'react'

import {
  CATEGORY_LABELS,
  RELEASE_VERSION_MEDIA_CATEGORIES,
  ReleaseVersionMediaCategory,
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
}

function cardLabel(item: ReleaseVersionMediaItem): string {
  return item.caption?.trim() || `Asset #${item.id}`
}

interface DragState {
  draggedId: number | null
  draggedCategory: ReleaseVersionMediaCategory | null
  overCategory: ReleaseVersionMediaCategory | null
}

const INITIAL_DRAG_STATE: DragState = {
  draggedId: null,
  draggedCategory: null,
  overCategory: null,
}

export function ReleaseVersionMediaGallery({
  items,
  selectedItemId,
  onSelectItem,
  versionId,
  onReorder,
}: ReleaseVersionMediaGalleryProps) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE)
  const dragOverItemIdRef = useRef<number | null>(null)

  function handleDragStart(item: ReleaseVersionMediaItem) {
    setDragState({
      draggedId: item.id,
      draggedCategory: item.category,
      overCategory: null,
    })
  }

  function handleDragOver(item: ReleaseVersionMediaItem) {
    dragOverItemIdRef.current = item.id
    setDragState((prev) => ({ ...prev, overCategory: item.category }))
  }

  function handleDrop(targetItem: ReleaseVersionMediaItem) {
    const { draggedId, draggedCategory } = dragState

    // Reset drag state immediately
    setDragState(INITIAL_DRAG_STATE)
    dragOverItemIdRef.current = null

    if (draggedId == null || draggedId === targetItem.id) {
      return
    }

    // Cross-category drag is blocked
    if (draggedCategory !== targetItem.category) {
      return
    }

    if (!onReorder) {
      return
    }

    // Compute new order within the category
    const categoryItems = items
      .filter((i) => i.category === draggedCategory)
      .sort((a, b) => a.sort_order - b.sort_order)

    const draggedIndex = categoryItems.findIndex((i) => i.id === draggedId)
    const targetIndex = categoryItems.findIndex((i) => i.id === targetItem.id)

    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    // Build reordered array
    const reordered = [...categoryItems]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

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
    dragOverItemIdRef.current = null
  }

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
                    dragOverItemIdRef.current === item.id &&
                    dragState.draggedId !== null &&
                    dragState.draggedId !== item.id &&
                    dragState.draggedCategory === item.category

                  return (
                    <button
                      key={item.id}
                      type="button"
                      draggable={true}
                      className={[
                        styles.card,
                        selectedItemId === item.id ? styles.cardActive : '',
                        isDragging ? styles.cardDragging : '',
                        isDropTarget ? styles.cardDropTarget : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onSelectItem(item)}
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
                      <div className={styles.thumb}>
                        {item.thumbnail_url ? (
                          <img
                            className={styles.thumbImage}
                            src={item.thumbnail_url}
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
                            Oeffnen
                          </a>
                        ) : null}
                      </div>
                    </button>
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
