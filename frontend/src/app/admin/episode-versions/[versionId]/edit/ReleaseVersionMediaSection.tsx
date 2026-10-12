'use client'

import { DragEvent, useEffect, useMemo, useState } from 'react'

import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionMediaCategory, ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

import { useConfirmDialog } from '@/components/ui'
import { useReleaseVersionMedia, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'
import { ReleaseVersionMediaUploadDrawer } from './ReleaseVersionMediaUploadDrawer'
import { ReleaseVersionMediaGrid } from './ReleaseVersionMediaGrid'
import { ReleaseVersionMediaEditDrawer } from './ReleaseVersionMediaEditDrawer'
import { CATEGORY_OPTIONS, buildLocalPreviewURL, buildSelectedItemSavePayload, buildStoryReorderRequest, moveStoryItem, sortStoryItems, storyItemKey } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaSectionProps {
  versionId: number
  contextTitle?: string
  /** Legacy context props kept for callers outside the editor; context is rendered by the page header. */
  fansubGroupName?: string
  releaseVersionLabel?: string
  mediaState?: UseReleaseVersionMediaResult
  storyContext?: { animeId: number | null; groupId: number | null; version: string | null }
}

function categoryLabel(category: ReleaseVersionMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

export function ReleaseVersionMediaSection({
  versionId,
  contextTitle = 'Episode-Version',
  mediaState,
  storyContext,
}: ReleaseVersionMediaSectionProps) {
  const internalMedia = useReleaseVersionMedia(versionId, storyContext)
  const media = mediaState ?? internalMedia
  const persistedItems = useMemo(() => (Array.isArray(media.items) ? media.items : []), [media.items])
  const { confirm, confirmDialog } = useConfirmDialog()

  const [uploadCategory, setUploadCategory] = useState<ReleaseVersionMediaCategory>('screenshot')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editPreviewCandidate, setEditPreviewCandidate] = useState(false)
  const [editCategory, setEditCategory] = useState<ReleaseVersionMediaCategory>('screenshot')
  const [stagedReplaceFile, setStagedReplaceFile] = useState<File | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [previewSavingId, setPreviewSavingId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draggedStoryKey, setDraggedStoryKey] = useState<string | null>(null)
  const [dragOverStoryKey, setDragOverStoryKey] = useState<string | null>(null)

  const stagedReplacePreviewURL = useMemo(() => (stagedReplaceFile ? buildLocalPreviewURL(stagedReplaceFile) : null), [stagedReplaceFile])

  useEffect(() => {
    return () => {
      if (stagedReplacePreviewURL && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(stagedReplacePreviewURL)
      }
    }
  }, [stagedReplacePreviewURL])

  const visibleItems = useMemo(
    () => persistedItems.filter((item) => !(item.review_state === 'pending' && item.can_update === false)),
    [persistedItems],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<ReleaseVersionMediaCategory, number>()
    for (const option of CATEGORY_OPTIONS) {
      counts.set(option.value, 0)
    }
    for (const item of visibleItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }
    return counts
  }, [visibleItems])

  const selectedItem = persistedItems.find((item) => item.id === selectedItemId) ?? null

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const canViewMedia = media.capabilities?.can_view_media ?? false
  const canUploadMedia = media.capabilities?.can_upload_media ?? false
  const canUpdateMedia = media.capabilities?.can_update_media ?? false
  const canDeleteMedia = media.capabilities?.can_delete_media ?? false
  const canDeleteOwnMedia = media.capabilities?.can_delete_own_media ?? false
  const canReorderMedia = media.capabilities?.can_reorder_media ?? false
  const canManageHighlights = media.capabilities?.can_manage_highlights ?? false
  const canShowPreviewToggle = CATEGORY_ALLOWS_PREVIEW[uploadCategory]
  const canChooseFiles = canUploadMedia && versionId > 0
  const storyCount = media.storyItems?.length ?? visibleItems.length
  const karaCount = media.storyItems?.filter((item) => item.type === 'kara').length ?? 0
  const canEditSelectedItem = Boolean(selectedItem && (selectedItem.can_update ?? canUpdateMedia))
  const canEditPreviewCandidate = selectedItem
    ? CATEGORY_ALLOWS_PREVIEW[selectedItem.category] && (canEditSelectedItem || canManageHighlights)
    : false
  const canDeleteSelectedItem = Boolean(selectedItem && (selectedItem.can_delete ?? (canDeleteMedia || canDeleteOwnMedia)))
  const isRejectedEditable = Boolean(selectedItem?.review_state === 'rejected' && canEditSelectedItem)
  const hasStagedChanges = Boolean(stagedReplaceFile) ||
    (selectedItem != null && (editTitle.trim() || null) !== (selectedItem.title ?? null)) ||
    (selectedItem != null && editCategory !== selectedItem.category) ||
    (selectedItem != null && (editCaption.trim() || null) !== (selectedItem.caption ?? null))

  function showToast(message: string) {
    setToast(message)
  }

  function handleMediaDragStart(event: DragEvent<HTMLDivElement>, itemKey: string) {
    if (!canReorderMedia) return
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemKey)
    setDraggedStoryKey(itemKey)
  }

  function finishMediaDrag() {
    setDraggedStoryKey(null)
    setDragOverStoryKey(null)
  }

  function handleMediaDrop(targetKey: string) {
    if (!canReorderMedia || draggedStoryKey == null || draggedStoryKey === targetKey) {
      finishMediaDrag()
      return
    }
    const ordered = sortStoryItems(media.storyItems ?? visibleItems.map((item) => ({ type: 'media' as const, media: item, sort_order: item.sort_order })))
    const fromIndex = ordered.findIndex((item) => storyItemKey(item) === draggedStoryKey)
    const targetIndex = ordered.findIndex((item) => storyItemKey(item) === targetKey)
    if (fromIndex < 0 || targetIndex < 0) {
      finishMediaDrag()
      return
    }
    void media.reorderItems(versionId, buildStoryReorderRequest(moveStoryItem(ordered, fromIndex, targetIndex)))
    finishMediaDrag()
  }

  function moveStoryByOffset(itemKey: string, offset: number) {
    if (!canReorderMedia) return
    const ordered = sortStoryItems(media.storyItems ?? visibleItems.map((item) => ({ type: 'media' as const, media: item, sort_order: item.sort_order })))
    const fromIndex = ordered.findIndex((item) => storyItemKey(item) === itemKey)
    const nextIndex = fromIndex + offset
    if (fromIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return
    void media.reorderItems(versionId, buildStoryReorderRequest(moveStoryItem(ordered, fromIndex, nextIndex)))
  }

  function openEditSheet(item: ReleaseVersionMediaItem) {
    setEditTitle(item.title ?? '')
    setEditCaption(item.caption ?? '')
    setEditPreviewCandidate(item.is_preview_candidate)
    setEditCategory(item.category)
    setStagedReplaceFile(null)
    setEditError(null)
    setSelectedItemId(item.id)
  }

  function openCategoryUpload(category: ReleaseVersionMediaCategory) {
    if (!canUploadMedia || versionId <= 0) return
    setUploadCategory(category)
    setIsUploadOpen(true)
  }

  function closeUploadSheet() {
    setIsUploadOpen(false)
  }

  function handleReplaceFileSelected(files: File[]) {
    const file = files[0] ?? null
    if (file) setStagedReplaceFile(file)
  }

  async function handleSaveSelectedItem() {
    if (!selectedItem || !canEditSelectedItem) return

    const saveOp = buildSelectedItemSavePayload({
      selectedItem,
      editCategory,
      editTitle,
      editCaption,
      canEditPreviewCandidate,
      editPreviewCandidate,
      stagedReplaceFile,
    })

    setEditError(null)
    try {
      if (saveOp.mode === 'replace') {
        await media.replaceItem(selectedItem.id, saveOp.payload)
        setStagedReplaceFile(null)
        setSelectedItemId(null)
        showToast('Überarbeitung eingereicht.')
      } else {
        await media.patchItem(selectedItem.id, saveOp.payload)
        setSelectedItemId(null)
        showToast('Änderungen gespeichert.')
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.')
    }
  }

  async function handlePreviewChange(item: ReleaseVersionMediaItem, nextValue: boolean) {
    if (!(item.can_update ?? canUpdateMedia) && !canManageHighlights) return
    if (!CATEGORY_ALLOWS_PREVIEW[item.category]) return
    setPreviewSavingId(item.id)
    setEditError(null)
    try {
      await media.patchItem(item.id, { is_preview_candidate: nextValue })
      if (selectedItemId === item.id) setEditPreviewCandidate(nextValue)
      showToast(nextValue ? 'Vorschaubild festgelegt.' : 'Vorschaubild entfernt.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Vorschaubild konnte nicht gespeichert werden.')
    } finally {
      setPreviewSavingId(null)
    }
  }

  async function handleHighlightChange(mediaId: number, nextValue: boolean) {
    if (!canManageHighlights || !media.setHighlight) return
    setEditError(null)
    try {
      await media.setHighlight(mediaId, nextValue)
      showToast(nextValue ? 'Highlight festgelegt.' : 'Highlight entfernt.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Highlight konnte nicht gespeichert werden.')
    }
  }

  async function handleDeleteSelectedItem() {
    if (!selectedItem || !canDeleteSelectedItem) return
    const confirmed = await confirm({
      title: 'Dieses Medium aus der Release-Version entfernen?',
      confirmLabel: 'Entfernen',
      tone: 'danger',
    })
    if (!confirmed) return

    setEditError(null)
    try {
      await media.deleteItem(selectedItem.id)
      setSelectedItemId(null)
      showToast('Medium entfernt.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerCard}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.headline}>Media / Assets verwalten</h2>
            <p className={styles.helper}>
              {canUploadMedia
                ? 'Wähle eine Kategorie, um direkt Medien hochzuladen.'
                : 'Alle vorhandenen Medien dieser Release-Version im Überblick.'}
            </p>
          </div>
        </div>

        <div className={styles.segmentedControl} role="group" aria-label="Medienkategorie">
          {CATEGORY_OPTIONS.map((option) => {
            return (
              <button
                key={option.value}
                type="button"
                aria-haspopup={canUploadMedia && versionId > 0 ? 'dialog' : undefined}
                disabled={!canUploadMedia || versionId <= 0}
                className={`${styles.segmentButton} ${isUploadOpen && uploadCategory === option.value ? styles.segmentButtonActive : ''}`}
                title={`${option.label} hinzufügen`}
                onClick={() => openCategoryUpload(option.value)}
              >
                <span>{option.label}</span>
                <span className={styles.segmentCount}>{categoryCounts.get(option.value) ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      {media.error ? <div className={styles.errorBox}>API-Fehler: {media.error}</div> : null}
      {media.capabilitiesError && !canViewMedia ? (
        <div className={styles.errorBox}>Diese Release-Version darfst du im Media-Bereich nicht bearbeiten.</div>
      ) : null}
      {media.reorderError ? <div className={styles.errorBox}>Reorder-Fehler: {media.reorderError}</div> : null}
      {media.highlightError ? <div className={styles.errorBox}>Highlight-Fehler: {media.highlightError}</div> : null}
      {media.highlightReorderError ? <div className={styles.errorBox}>Highlight-Reorder-Fehler: {media.highlightReorderError}</div> : null}

      {visibleItems.length > 0 || (media.storyItems?.length ?? 0) > 0 ? (
        <>
          <h3 className={styles.categoryTitle}>Vorhandene Medien · {storyCount}{karaCount > 0 ? ' (' + karaCount + ' Kara-Segmente)' : ''}</h3>
          <ReleaseVersionMediaGrid
            storyItems={media.storyItems ?? visibleItems.map((item) => ({ type: 'media' as const, media: item, sort_order: item.sort_order }))}
            contextTitle={contextTitle}
            canReorderMedia={canReorderMedia}
            canManageHighlights={canManageHighlights}
            canUpdateMedia={canUpdateMedia}
            dragOverStoryKey={dragOverStoryKey}
            previewSavingId={previewSavingId}
            onDragStart={handleMediaDragStart}
            onDragOverTarget={setDragOverStoryKey}
            onDrop={handleMediaDrop}
            onDragEnd={finishMediaDrag}
            onMoveByOffset={moveStoryByOffset}
            onOpenEditSheet={openEditSheet}
            onPreviewChange={(item, nextValue) => void handlePreviewChange(item, nextValue)}
            onHighlightChange={media.setHighlight ? (mediaId, nextValue) => void handleHighlightChange(mediaId, nextValue) : undefined}
          />
        </>
      ) : null}

      {!canUploadMedia && canViewMedia ? (
        <p className={styles.helper}>Du darfst Medien dieser Release-Version ansehen, aber nicht hochladen.</p>
      ) : null}

      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}

      <ReleaseVersionMediaUploadDrawer
        open={isUploadOpen}
        onClose={closeUploadSheet}
        versionId={versionId}
        uploadCategory={uploadCategory}
        canChooseFiles={canChooseFiles}
        canShowPreviewToggle={canShowPreviewToggle}
        onUploadComplete={() => {
          media.reload()
          showToast('Upload abgeschlossen.')
        }}
      />

      <ReleaseVersionMediaEditDrawer
        selectedItem={selectedItem}
        categoryLabel={categoryLabel}
        editTitle={editTitle}
        editCaption={editCaption}
        editCategory={editCategory}
        editPreviewCandidate={editPreviewCandidate}
        stagedReplaceFile={stagedReplaceFile}
        stagedReplacePreviewURL={stagedReplacePreviewURL}
        editError={editError}
        canEditSelectedItem={canEditSelectedItem}
        canDeleteSelectedItem={canDeleteSelectedItem}
        canEditPreviewCandidate={canEditPreviewCandidate}
        canManageHighlights={canManageHighlights}
        isRejectedEditable={isRejectedEditable}
        hasStagedChanges={hasStagedChanges}
        setEditTitle={setEditTitle}
        setEditCaption={setEditCaption}
        setEditCategory={setEditCategory}
        onClose={() => setSelectedItemId(null)}
        onSave={() => void handleSaveSelectedItem()}
        onDelete={() => void handleDeleteSelectedItem()}
        onPreviewChange={(item, nextValue) => void handlePreviewChange(item, nextValue)}
        onReplaceFileSelected={handleReplaceFileSelected}
      />
      {confirmDialog}
    </section>
  )
}
