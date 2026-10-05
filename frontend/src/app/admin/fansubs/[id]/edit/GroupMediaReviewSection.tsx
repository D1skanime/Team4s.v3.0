'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { Archive, Save, UploadCloud, X } from 'lucide-react'
import Image from 'next/image'

import {
  Button,
  Card,
  Drawer,
  ErrorState,
  FormField,
  getErrorStateCopy,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Textarea,
  Toolbar,
} from '@/components/ui'
import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  resolveApiUrl,
} from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'
import { classNames } from '@/components/ui/classNames'

import styles from './GroupMediaReviewSection.module.css'
import { useGroupMediaReviewActions } from './useGroupMediaReviewActions'
import { GroupMediaReviewUploadPanel } from './GroupMediaReviewUploadPanel'
import { GroupMediaReviewFilterBar } from './GroupMediaReviewFilterBar'
import { GroupMediaReviewGrid } from './GroupMediaReviewGrid'
import { GroupMediaReviewBulkActionBar } from './GroupMediaReviewBulkActionBar'

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

type CategoryFilter = 'all' | FansubGroupMediaCategory
type ReviewStatusFilter = 'all' | FansubMediaReviewStatus
type VisibilityFilter = 'all' | FansubMediaVisibility
type SortMode = 'sort_order' | 'created_desc' | 'created_asc'
type PointerReorderState = {
  mediaId: number
  pointerId: number
  startX: number
  startY: number
}

const INITIAL_VISIBLE_MEDIA_COUNT = 40
const LOAD_MORE_MEDIA_COUNT = 40
const POINTER_REORDER_THRESHOLD_PX = 6

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

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function getDetailImageURL(item: FansubGroupMediaItem): string {
  return item.original_url || item.preview_url || item.thumbnail_url || ''
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pointerReorderRef = useRef<PointerReorderState | null>(null)
  const [mediaItems, setMediaItems] = useState<FansubGroupMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<ReturnType<typeof getErrorStateCopy> | null>(null)
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>({})
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploadDragging, setIsUploadDragging] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<FansubGroupMediaCategory>('gallery')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editingMediaId, setEditingMediaId] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('sort_order')
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_MEDIA_COUNT)
  const [failedPreviewIds, setFailedPreviewIds] = useState<Record<number, boolean>>({})
  const [failedDetailIds, setFailedDetailIds] = useState<Record<number, boolean>>({})
  const [pendingDeleteItem, setPendingDeleteItem] = useState<FansubGroupMediaItem | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(() => new Set())
  const [bulkSavingStatus, setBulkSavingStatus] = useState<FansubMediaReviewStatus | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [draggedMediaId, setDraggedMediaId] = useState<number | null>(null)
  const [dragOverMediaId, setDragOverMediaId] = useState<number | null>(null)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)

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

  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({
      file,
      url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '',
    })),
    [selectedFiles],
  )

  useEffect(() => {
    return () => {
      selectedFilePreviews.forEach(({ url }) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [selectedFilePreviews])

  const filteredMediaItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return mediaItems
      .filter((item) => {
        const draft = itemToDraft(item)
        const matchesCategory = categoryFilter === 'all' || draft.category === categoryFilter
        const matchesStatus = statusFilter === 'all' || draft.review_status === statusFilter
        const matchesVisibility = visibilityFilter === 'all' || draft.visibility === visibilityFilter
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [getMediaDisplayTitle(item), item.description, item.alt_text, item.uploaded_by_display_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))

        return matchesCategory && matchesStatus && matchesVisibility && matchesSearch
      })
      .sort((left, right) => {
        const leftDate = Date.parse(left.created_at ?? '') || 0
        const rightDate = Date.parse(right.created_at ?? '') || 0
        if (sortMode === 'sort_order') {
          return (left.sort_order ?? 0) - (right.sort_order ?? 0) || leftDate - rightDate || left.id - right.id
        }
        return sortMode === 'created_asc' ? leftDate - rightDate : rightDate - leftDate
      })
  }, [categoryFilter, mediaItems, searchTerm, sortMode, statusFilter, visibilityFilter])

  useEffect(() => {
    // Setzt das Ladelimit bei Filteraenderung zurueck auf den Anfangswert.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleLimit(INITIAL_VISIBLE_MEDIA_COUNT)
  }, [categoryFilter, searchTerm, sortMode, statusFilter, visibilityFilter])

  const visibleMediaItems = useMemo(
    () => filteredMediaItems.slice(0, visibleLimit),
    [filteredMediaItems, visibleLimit],
  )
  const filteredMediaIdSet = useMemo(
    () => new Set(filteredMediaItems.map((item) => item.id)),
    [filteredMediaItems],
  )

  const remainingMediaCount = Math.max(filteredMediaItems.length - visibleMediaItems.length, 0)
  const editingItem = useMemo(
    () => mediaItems.find((item) => item.id === editingMediaId) ?? null,
    [editingMediaId, mediaItems],
  )
  const activeFilterCount = [
    categoryFilter !== 'all',
    statusFilter !== 'all',
    visibilityFilter !== 'all',
    searchTerm.trim().length > 0,
    sortMode !== 'sort_order',
  ].filter(Boolean).length
  const isCanonicalReorderView =
    categoryFilter === 'all' &&
    statusFilter === 'all' &&
    visibilityFilter === 'all' &&
    searchTerm.trim().length === 0 &&
    sortMode === 'sort_order'
  const shouldShowUploadPanel = canUpload && (isUploadOpen || selectedFiles.length > 0 || uploadProgress !== null || uploadError !== null)
  const selectedCount = selectedMediaIds.size
  const shouldShowBulkActionBar = selectedCount >= 2
  const isBulkSaving = bulkSavingStatus !== null
  const canReorderMedia = canReorder && isCanonicalReorderView && !isBulkSaving && !reorderSaving
  const allFilteredSelected =
    filteredMediaItems.length > 0 && filteredMediaItems.every((item) => selectedMediaIds.has(item.id))

  useEffect(() => {
    // Entfernt Auswahl-IDs, die nach einer Filteraenderung nicht mehr sichtbar sind.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMediaIds((current) => {
      const next = new Set(Array.from(current).filter((id) => filteredMediaIdSet.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredMediaIdSet])

  const {
    loadMedia,
    handleUpload,
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
    selectedFiles,
    uploadCategory,
    setUploadProgress,
    setUploadError,
    setToast,
    setEditingMediaId,
    resetUploadForm,
    setIsUploadOpen,
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

  function handleSelectedFiles(files: File[]) {
    setUploadError(null)
    setSelectedFiles(files.filter((file) => file.type.startsWith('image/')))
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsUploadDragging(false)
    handleSelectedFiles(Array.from(event.dataTransfer.files))
  }

  function resetUploadForm() {
    setSelectedFiles([])
    setIsUploadDragging(false)
    setUploadCategory('gallery')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetFilters() {
    setCategoryFilter('all')
    setStatusFilter('all')
    setVisibilityFilter('all')
    setSortMode('sort_order')
    setSearchTerm('')
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

  function toggleMediaSelection(mediaId: number) {
    setBulkError(null)
    setSelectedMediaIds((current) => {
      const next = new Set(current)
      if (next.has(mediaId)) {
        next.delete(mediaId)
      } else {
        next.add(mediaId)
      }
      return next
    })
  }

  function clearSelection() {
    setBulkError(null)
    setSelectedMediaIds(new Set())
  }

  function toggleAllFilteredSelection() {
    setBulkError(null)
    if (allFilteredSelected) {
      setSelectedMediaIds(new Set())
      return
    }
    setSelectedMediaIds(new Set(filteredMediaItems.map((item) => item.id)))
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

  function handleDragStart(event: DragEvent<HTMLButtonElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia) return
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(item.id))
    setReorderError(null)
    setDraggedMediaId(item.id)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia || draggedMediaId === null || draggedMediaId === item.id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverMediaId(item.id)
  }

  function handleDragEnd() {
    pointerReorderRef.current = null
    setDraggedMediaId(null)
    setDragOverMediaId(null)
  }

  function getPointerTargetMediaId(event: PointerEvent<HTMLButtonElement>): number | null {
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)
    const mediaCard = targetElement?.closest<HTMLElement>('[data-media-card-id]')
    const targetMediaId = Number(mediaCard?.dataset.mediaCardId)
    return Number.isInteger(targetMediaId) ? targetMediaId : null
  }

  function handlePointerDragStart(event: PointerEvent<HTMLButtonElement>, item: FansubGroupMediaItem) {
    if (!canReorderMedia || event.pointerType === 'mouse') return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerReorderRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setReorderError(null)
    setDraggedMediaId(item.id)
    setDragOverMediaId(null)
  }

  function handlePointerDragMove(event: PointerEvent<HTMLButtonElement>) {
    const pointerState = pointerReorderRef.current
    if (!canReorderMedia || !pointerState || pointerState.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const movementX = Math.abs(event.clientX - pointerState.startX)
    const movementY = Math.abs(event.clientY - pointerState.startY)
    if (movementX < POINTER_REORDER_THRESHOLD_PX && movementY < POINTER_REORDER_THRESHOLD_PX) return

    const targetMediaId = getPointerTargetMediaId(event)
    setDragOverMediaId(targetMediaId !== null && targetMediaId !== pointerState.mediaId ? targetMediaId : null)
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
          fileInputRef={fileInputRef}
          uploadCategory={uploadCategory}
          setUploadCategory={setUploadCategory}
          isUploadDragging={isUploadDragging}
          setIsUploadDragging={setIsUploadDragging}
          selectedFiles={selectedFiles}
          selectedFilePreviews={selectedFilePreviews}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          handleSelectedFiles={handleSelectedFiles}
          handleUploadDrop={handleUploadDrop}
          handleUpload={handleUpload}
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

      <Drawer
        open={editingItem !== null}
        onClose={() => {
          if (editingItem) cancelEditing(editingItem)
        }}
        title={editingItem ? getMediaDisplayTitle(editingItem) : 'Medium bearbeiten'}
        description={editingItem ? getUploaderLine(editingItem) : undefined}
        footer={
          editingItem ? (
            <div className={styles.drawerActions}>
              <Button
                variant="ghost"
                size="sm"
                className={styles.drawerCancelButton}
                leftIcon={<X size={16} />}
                disabled={saving[editingItem.id] ?? false}
                onClick={() => cancelEditing(editingItem)}
              >
                {canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user) ? 'Abbrechen' : 'Schließen'}
              </Button>
              {canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user) ? (
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<Save size={16} />}
                  disabled={saving[editingItem.id] ?? false}
                  onClick={() => void handleSave(editingItem)}
                >
                  Änderungen speichern
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {editingItem ? (
          <div className={styles.drawerDetail}>
            {(() => {
              const draft = drafts[editingItem.id] ?? itemToDraft(editingItem)
              const persisted = itemToDraft(editingItem)
              const detailImageURL = getDetailImageURL(editingItem)
              const displayTitle = getMediaDisplayTitle(editingItem)

              return (
                <>
                  <div className={styles.detailPreviewFrame}>
                    {detailImageURL && !failedDetailIds[editingItem.id] ? (
                      <Image
                        src={resolveApiUrl(detailImageURL)}
                        alt={persisted.alt_text || displayTitle}
                        fill
                        sizes="(max-width: 700px) 100vw, 720px"
                        unoptimized
                        loading="lazy"
                        onError={() => setFailedDetailIds((prev) => ({ ...prev, [editingItem.id]: true }))}
                      />
                    ) : (
                      <span>Keine große Vorschau</span>
                    )}
                  </div>

                  <div className={styles.detailGrid}>
                    <FormField label="Titel">
                      <Input
                        value={draft.title}
                        disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                        onChange={(event) => updateDraft(editingItem.id, 'title', event.target.value)}
                      />
                    </FormField>

                    <FormField label="Alternativtext">
                      <Input
                        value={draft.alt_text}
                        disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                        onChange={(event) => updateDraft(editingItem.id, 'alt_text', event.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Beschreibung">
                    <Textarea
                      className={styles.descriptionTextarea}
                      value={draft.description}
                      disabled={!(canUpdate || (canUpdateOwn && editingItem.uploaded_by_current_user))}
                      rows={4}
                      onChange={(event) => updateDraft(editingItem.id, 'description', event.target.value)}
                    />
                  </FormField>

                  <div className={styles.detailGrid}>
                    <FormField label="Kategorie">
                      <Select
                        value={draft.category}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'category', event.target.value as FansubGroupMediaCategory)}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  <div className={styles.detailGrid}>
                    <FormField label="Sichtbarkeit">
                      <Select
                        value={draft.visibility}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'visibility', event.target.value as FansubMediaVisibility)}
                      >
                        {VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Prüfstatus">
                      <Select
                        value={draft.review_status}
                        disabled={!canReview}
                        onChange={(event) => updateDraft(editingItem.id, 'review_status', event.target.value as FansubMediaReviewStatus)}
                      >
                        {REVIEW_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  {saveErrors[editingItem.id] ? <p className={styles.inlineError} role="alert">{saveErrors[editingItem.id]}</p> : null}

                  {canDeleteMediaItem(editingItem) ? (
                    <div className={styles.dangerZone}>
                      <div className={styles.dangerZoneText}>
                        <strong>Aus Gruppenmedien entfernen</strong>
                        <p>Entfernt die Zuordnung aus dieser Gruppenverwaltung. Datei und Asset werden nicht endgültig gelöscht.</p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Archive size={16} />}
                        disabled={saving[editingItem.id] ?? false}
                        onClick={() => setPendingDeleteItem(editingItem)}
                      >
                        Aus Gruppenmedien entfernen
                      </Button>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={pendingDeleteItem !== null}
        onClose={() => {
          if (!pendingDeleteItem || saving[pendingDeleteItem.id]) return
          setPendingDeleteItem(null)
        }}
        title="Medium aus Gruppenmedien entfernen"
        description="Die Zuordnung wird aus der Gruppenverwaltung entfernt. Datei und Asset werden nicht endgültig gelöscht."
        footer={
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              size="sm"
              disabled={pendingDeleteItem ? saving[pendingDeleteItem.id] ?? false : false}
              onClick={() => setPendingDeleteItem(null)}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Archive size={16} />}
              loading={pendingDeleteItem ? saving[pendingDeleteItem.id] ?? false : false}
              onClick={() => {
                if (pendingDeleteItem) void handleDelete(pendingDeleteItem)
              }}
            >
              Aus Gruppenmedien entfernen
            </Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          {pendingDeleteItem ? `${getMediaDisplayTitle(pendingDeleteItem)} wird aus den Gruppenmedien entfernt.` : ''}
        </p>
      </Modal>
    </div>
  )
}
