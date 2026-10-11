'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'

import {
  Button,
  Card,
  ErrorState,
  getErrorStateCopy,
  LoadingState,
  SectionHeader,
  Toolbar,
} from '@/components/ui'
import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
} from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'
import { classNames } from '@/components/ui/classNames'

import styles from './GroupMediaReviewSection.module.css'
import { useGroupMediaReviewActions } from './useGroupMediaReviewActions'
import { LOAD_MORE_MEDIA_COUNT, useGroupMediaReviewFilters } from './useGroupMediaReviewFilters'
import { useGroupMediaReviewReorder } from './useGroupMediaReviewReorder'
import { GroupMediaReviewUploadPanel } from './GroupMediaReviewUploadPanel'
import { GroupMediaReviewFilterBar } from './GroupMediaReviewFilterBar'
import { GroupMediaReviewGrid } from './GroupMediaReviewGrid'
import { GroupMediaReviewBulkActionBar } from './GroupMediaReviewBulkActionBar'
import { GroupMediaReviewDetailDrawer } from './GroupMediaReviewDetailDrawer'

interface GroupMediaReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities | null
  isPlatformAdmin?: boolean
}

interface MediaDraft {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  title: string
  description: string
  alt_text: string
  category: FansubGroupMediaCategory
  sort_order: number
}

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

export function GroupMediaReviewSection({
  fansubId,
  capabilities,
  isPlatformAdmin = false,
}: GroupMediaReviewSectionProps) {
  const canUseMedia = isPlatformAdmin || Boolean(capabilities?.can_view_group_media)
  if (!canUseMedia) return null

  return (
    <GroupMediaReviewSectionInner
      fansubId={fansubId}
      capabilities={capabilities}
      isPlatformAdmin={isPlatformAdmin}
    />
  )
}

function GroupMediaReviewSectionInner({
  fansubId,
  capabilities,
  isPlatformAdmin,
}: {
  fansubId: number
  capabilities: FansubGroupCapabilities | null
  isPlatformAdmin: boolean
}) {
  const [mediaItems, setMediaItems] = useState<FansubGroupMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<ReturnType<typeof getErrorStateCopy> | null>(null)
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>({})
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [uploadCategory, setUploadCategory] = useState<FansubGroupMediaCategory>('gallery')
  const [toast, setToast] = useState<string | null>(null)
  const [editingMediaId, setEditingMediaId] = useState<number | null>(null)
  const [failedPreviewIds, setFailedPreviewIds] = useState<Record<number, boolean>>({})
  const [failedDetailIds, setFailedDetailIds] = useState<Record<number, boolean>>({})
  const [pendingDeleteItem, setPendingDeleteItem] = useState<FansubGroupMediaItem | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const canUpdate =
    isPlatformAdmin || Boolean(capabilities?.can_update_group_media || capabilities?.can_edit_group)
  const canUpdateOwn = Boolean(capabilities?.can_update_own_group_media)
  const canReview = isPlatformAdmin || Boolean(capabilities?.can_review_group_media)
  const canUpload =
    isPlatformAdmin || Boolean(capabilities?.can_upload_group_media || capabilities?.can_edit_group)
  const canDeleteAll =
    isPlatformAdmin || Boolean(capabilities?.can_delete_group_media || capabilities?.can_edit_group)
  const canDeleteOwn = Boolean(capabilities?.can_delete_own_group_media || canDeleteAll)
  const canReorder = Boolean(capabilities?.can_reorder_group_media || canUpdate)

  const {
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    visibilityFilter,
    setVisibilityFilter,
    sortMode,
    setSortMode,
    searchTerm,
    setSearchTerm,
    setVisibleLimit,
    filteredMediaItems,
    visibleMediaItems,
    filteredMediaIdSet,
    remainingMediaCount,
    activeFilterCount,
    isCanonicalReorderView,
    selectedMediaIds,
    setSelectedMediaIds,
    bulkSavingStatus,
    setBulkSavingStatus,
    bulkError,
    setBulkError,
    allFilteredSelected,
    resetFilters: resetFilterValues,
    toggleMediaSelection,
    clearSelection,
    toggleAllFilteredSelection,
  } = useGroupMediaReviewFilters(mediaItems)

  const editingItem = useMemo(
    () => mediaItems.find((item) => item.id === editingMediaId) ?? null,
    [editingMediaId, mediaItems],
  )
  const shouldShowUploadPanel = canUpload && isUploadOpen
  const selectedCount = selectedMediaIds.size
  const shouldShowBulkActionBar = selectedCount >= 2
  const isBulkSaving = bulkSavingStatus !== null

  const {
    pointerReorderRef,
    draggedMediaId,
    dragOverMediaId,
    setDragOverMediaId,
    reorderError,
    setReorderError,
    setReorderSaving,
    canReorderMedia,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getPointerTargetMediaId,
    handlePointerDragStart,
    handlePointerDragMove,
  } = useGroupMediaReviewReorder({ canReorder, isCanonicalReorderView, isBulkSaving })

  const {
    loadMedia,
    handleSave,
    handleQuickReview,
    handleBulkReview,
    handleReorderDrop,
    handlePointerDragEnd,
    handleDelete,
  } = useGroupMediaReviewActions({
    fansubId,
    mediaItems,
    setMediaItems,
    setIsLoading,
    setLoadError,
    drafts,
    setDrafts,
    setSaveErrors,
    setSaving,
    setToast,
    setEditingMediaId,
    canUpdate,
    canUpdateOwn,
    canReview,
    selectedMediaIds,
    filteredMediaIdSet,
    setSelectedMediaIds,
    setBulkSavingStatus,
    setBulkError,
    updateMediaReviewStatus,
    canReorderMedia,
    setReorderError,
    setReorderSaving,
    draggedMediaId,
    dragOverMediaId,
    handleDragEnd,
    pointerReorderRef,
    getPointerTargetMediaId,
    canDeleteMediaItem,
    editingMediaId,
    setPendingDeleteItem,
  })

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  function updateDraft<K extends keyof MediaDraft>(mediaId: number, field: K, value: MediaDraft[K]) {
    setDrafts((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }))
  }

  function canDeleteMediaItem(item: FansubGroupMediaItem): boolean {
    return canDeleteAll || (canDeleteOwn && item.uploaded_by_current_user === true)
  }

  async function handleUploadComplete() {
    setUploadCategory('gallery')
    setIsUploadOpen(false)
    setToast('Medien hochgeladen. Auswahl wurde zurückgesetzt.')
    await loadMedia()
    setTimeout(() => setToast(null), 3500)
  }

  function resetFilters() {
    resetFilterValues()
    setIsFilterOpen(false)
  }

  function updateMediaReviewStatus(mediaIds: number[], reviewStatus: FansubMediaReviewStatus) {
    const idSet = new Set(mediaIds)
    setMediaItems((current) =>
      current.map((item) => (idSet.has(item.id) ? { ...item, review_status: reviewStatus } : item)),
    )
    setDrafts((current) => {
      const next = { ...current }
      for (const mediaId of mediaIds) {
        if (next[mediaId]) {
          next[mediaId] = { ...next[mediaId], review_status: reviewStatus }
        }
      }
      return next
    })
  }

  function startEditing(item: FansubGroupMediaItem) {
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setDrafts((prev) => ({ ...prev, [item.id]: itemToDraft(item) }))
    setEditingMediaId(item.id)
  }

  function cancelEditing(item: FansubGroupMediaItem) {
    setDrafts((prev) => ({ ...prev, [item.id]: itemToDraft(item) }))
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setEditingMediaId(null)
  }

  if (isLoading) {
    return <LoadingState title="Medien werden geladen..." description="Gruppenmedien werden abgerufen." />
  }

  if (loadError) {
    return <ErrorState title={loadError.title} description={loadError.description} />
  }

  return (
    <div className={classNames(styles.reviewSection, shouldShowBulkActionBar && styles.reviewSectionWithBulkBar)}>
      <Toolbar
        className={styles.mediaToolbar}
        leading={
          <SectionHeader
            title="Medien prüfen"
            description="Gruppenmedien hochladen, filtern und gezielt bearbeiten."
          />
        }
        trailing={
          canUpload ? (
            <Button
              variant={shouldShowUploadPanel ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={shouldShowUploadPanel ? <X size={16} /> : <UploadCloud size={16} />}
              onClick={() => setIsUploadOpen((current) => !current)}
              aria-expanded={shouldShowUploadPanel}
            >
              {shouldShowUploadPanel ? 'Upload schließen' : 'Medien hochladen'}
            </Button>
          ) : null
        }
      />

      {toast ? <p className={styles.toastSuccess} role="status">{toast}</p> : null}

      {shouldShowUploadPanel ? (
        <GroupMediaReviewUploadPanel
          fansubId={fansubId}
          uploadCategory={uploadCategory}
          setUploadCategory={setUploadCategory}
          onUploadComplete={handleUploadComplete}
        />
      ) : null}

      <Card
        variant="section"
        className={styles.managementPanel}
      >
        <GroupMediaReviewFilterBar
          filteredMediaItemsCount={filteredMediaItems.length}
          totalMediaItemsCount={mediaItems.length}
          visibleMediaItemsCount={visibleMediaItems.length}
          remainingMediaCount={remainingMediaCount}
          activeFilterCount={activeFilterCount}
          resetFilters={resetFilters}
          canReview={canReview}
          isBulkSaving={isBulkSaving}
          allFilteredSelected={allFilteredSelected}
          toggleAllFilteredSelection={toggleAllFilteredSelection}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          visibilityFilter={visibilityFilter}
          setVisibilityFilter={setVisibilityFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {reorderError ? <p className={styles.inlineError} role="alert">{reorderError}</p> : null}
        {canUpdate && !isCanonicalReorderView ? (
          <p className={styles.reorderHint}>Reihenfolge kann nur in der Gesamtansicht geändert werden.</p>
        ) : null}

        <GroupMediaReviewGrid
          totalMediaItemsCount={mediaItems.length}
          filteredMediaItemsCount={filteredMediaItems.length}
          visibleMediaItems={visibleMediaItems}
          remainingMediaCount={remainingMediaCount}
          onLoadMore={() => setVisibleLimit((current) => current + LOAD_MORE_MEDIA_COUNT)}
          selectedMediaIds={selectedMediaIds}
          editingMediaId={editingMediaId}
          saving={saving}
          saveErrors={saveErrors}
          failedPreviewIds={failedPreviewIds}
          setFailedPreviewIds={setFailedPreviewIds}
          draggedMediaId={draggedMediaId}
          dragOverMediaId={dragOverMediaId}
          setDragOverMediaId={setDragOverMediaId}
          canUpdate={canUpdate}
          canUpdateOwn={canUpdateOwn}
          canReview={canReview}
          canReorder={canReorder}
          canReorderMedia={canReorderMedia}
          isBulkSaving={isBulkSaving}
          toggleMediaSelection={toggleMediaSelection}
          startEditing={startEditing}
          cancelEditing={cancelEditing}
          handleQuickReview={handleQuickReview}
          handleDragOver={handleDragOver}
          handleReorderDrop={handleReorderDrop}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handlePointerDragStart={handlePointerDragStart}
          handlePointerDragMove={handlePointerDragMove}
          handlePointerDragEnd={handlePointerDragEnd}
        />
      </Card>

      {shouldShowBulkActionBar ? (
        <GroupMediaReviewBulkActionBar
          selectedMediaIds={selectedMediaIds}
          bulkSavingStatus={bulkSavingStatus}
          bulkError={bulkError}
          handleBulkReview={handleBulkReview}
          clearSelection={clearSelection}
        />
      ) : null}

      <GroupMediaReviewDetailDrawer
        editingItem={editingItem}
        drafts={drafts}
        saveErrors={saveErrors}
        saving={saving}
        canUpdate={canUpdate}
        canUpdateOwn={canUpdateOwn}
        canReview={canReview}
        failedDetailIds={failedDetailIds}
        setFailedDetailIds={setFailedDetailIds}
        pendingDeleteItem={pendingDeleteItem}
        setPendingDeleteItem={setPendingDeleteItem}
        updateDraft={updateDraft}
        cancelEditing={cancelEditing}
        handleSave={handleSave}
        handleDelete={handleDelete}
        canDeleteMediaItem={canDeleteMediaItem}
      />
    </div>
  )
}
