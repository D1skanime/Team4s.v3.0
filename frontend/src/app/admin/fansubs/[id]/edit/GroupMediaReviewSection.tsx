'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Ban, Check, Edit3, Filter, Save, UploadCloud, X } from 'lucide-react'
import Image from 'next/image'

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Textarea,
  Toolbar,
} from '@/components/ui'
import {
  ApiError,
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  deleteFansubGroupMedia,
  listFansubGroupMedia,
  patchFansubMediaReview,
  resolveApiUrl,
  uploadFansubGroupMedia,
} from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'
import { classNames } from '@/components/ui/classNames'

import styles from './GroupMediaReviewSection.module.css'

interface GroupMediaReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities
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
type SortMode = 'created_desc' | 'created_asc' | 'sort_order'

const INITIAL_VISIBLE_MEDIA_COUNT = 40
const LOAD_MORE_MEDIA_COUNT = 40

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

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
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

export function GroupMediaReviewSection({ fansubId, capabilities }: GroupMediaReviewSectionProps) {
  const canUseMedia =
    capabilities.can_view_group_media ||
    capabilities.can_upload_group_media ||
    capabilities.can_update_group_media ||
    capabilities.can_delete_group_media ||
    capabilities.can_edit_group
  if (!canUseMedia) return null

  return <GroupMediaReviewSectionInner fansubId={fansubId} capabilities={capabilities} />
}

function GroupMediaReviewSectionInner({
  fansubId,
  capabilities,
}: {
  fansubId: number
  capabilities: FansubGroupCapabilities
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [mediaItems, setMediaItems] = useState<FansubGroupMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, MediaDraft>>({})
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState<FansubGroupMediaCategory>('gallery')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editingMediaId, setEditingMediaId] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('created_desc')
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

  const canUpdate = capabilities.can_update_group_media || capabilities.can_edit_group
  const canUpload = capabilities.can_upload_group_media || capabilities.can_edit_group
  const canDelete = capabilities.can_delete_group_media || capabilities.can_edit_group

  const loadMedia = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const items = await listFansubGroupMedia(fansubId, undefined)
      setMediaItems(items)
      setDrafts(Object.fromEntries(items.map((item) => [item.id, itemToDraft(item)])))
    } catch (err) {
      setLoadError(readErrorMessage(err, 'Medien konnten nicht geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  const selectedFileNames = useMemo(
    () => selectedFiles.map((file) => file.name).join(', '),
    [selectedFiles],
  )

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
        if (sortMode === 'sort_order') return (left.sort_order ?? 0) - (right.sort_order ?? 0)
        const leftDate = Date.parse(left.created_at ?? '') || 0
        const rightDate = Date.parse(right.created_at ?? '') || 0
        return sortMode === 'created_asc' ? leftDate - rightDate : rightDate - leftDate
      })
  }, [categoryFilter, mediaItems, searchTerm, sortMode, statusFilter, visibilityFilter])

  useEffect(() => {
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
    sortMode !== 'created_desc',
  ].filter(Boolean).length
  const shouldShowUploadPanel = canUpload && (isUploadOpen || selectedFiles.length > 0 || uploadProgress !== null || uploadError !== null)
  const selectedCount = selectedMediaIds.size
  const shouldShowBulkActionBar = selectedCount >= 2
  const isBulkSaving = bulkSavingStatus !== null
  const allFilteredSelected =
    filteredMediaItems.length > 0 && filteredMediaItems.every((item) => selectedMediaIds.has(item.id))

  useEffect(() => {
    setSelectedMediaIds((current) => {
      const next = new Set(Array.from(current).filter((id) => filteredMediaIdSet.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredMediaIdSet])

  function updateDraft<K extends keyof MediaDraft>(mediaId: number, field: K, value: MediaDraft[K]) {
    setDrafts((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }))
  }

  function handleSelectedFiles(files: File[]) {
    setUploadError(null)
    setSelectedFiles(files.filter((file) => file.type.startsWith('image/')))
  }

  function resetUploadForm() {
    setSelectedFiles([])
    setUploadCategory('gallery')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetFilters() {
    setCategoryFilter('all')
    setStatusFilter('all')
    setVisibilityFilter('all')
    setSortMode('created_desc')
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

  async function handleUpload() {
    if (selectedFiles.length === 0) return
    setUploadError(null)
    setUploadProgress(0)
    try {
      const response = await uploadFansubGroupMedia({
        fansubID: fansubId,
        files: selectedFiles,
        category: uploadCategory,
        visibilityCode: 'private',
        reviewStatusCode: 'in_review',
        onProgress: setUploadProgress,
      })
      const failed = response.results.filter((result) => result.status === 'failed')
      if (failed.length > 0) {
        setUploadError(failed.map((result) => `${result.client_file_name}: ${result.message ?? 'Upload fehlgeschlagen'}`).join('\n'))
      } else {
        resetUploadForm()
        setToast('Medien hochgeladen. Auswahl wurde zurückgesetzt.')
        setIsUploadOpen(false)
      }
      await loadMedia()
    } catch (err) {
      setUploadError(readErrorMessage(err, 'Upload fehlgeschlagen.'))
    } finally {
      setUploadProgress(null)
      setTimeout(() => setToast(null), 3500)
    }
  }

  async function handleSave(item: FansubGroupMediaItem) {
    const draft = drafts[item.id]
    if (!draft || !canUpdate) return
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      await patchFansubMediaReview(fansubId, item.id, {
        visibility: draft.visibility,
        review_status: draft.review_status,
        title: draft.title.trim() || null,
        description: draft.description.trim() || null,
        alt_text: draft.alt_text.trim() || null,
        category: draft.category,
        sort_order: draft.sort_order,
      }, undefined)
      setToast('Änderungen gespeichert.')
      setEditingMediaId(null)
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Änderungen konnten nicht gespeichert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  async function handleQuickReview(item: FansubGroupMediaItem, reviewStatus: FansubMediaReviewStatus) {
    if (!canUpdate) return
    setSaveErrors((prev) => ({ ...prev, [item.id]: '' }))
    setSaving((prev) => ({ ...prev, [item.id]: true }))

    try {
      await patchFansubMediaReview(fansubId, item.id, { review_status: reviewStatus }, undefined)
      updateMediaReviewStatus([item.id], reviewStatus)
      setToast(reviewStatus === 'freigegeben' ? 'Medium freigegeben.' : 'Medium abgelehnt.')
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Prüfstatus konnte nicht aktualisiert werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  async function handleBulkReview(reviewStatus: FansubMediaReviewStatus) {
    if (!canUpdate || selectedMediaIds.size === 0) return
    const targetIds = Array.from(selectedMediaIds).filter((id) => filteredMediaIdSet.has(id))
    if (targetIds.length === 0) return

    setBulkError(null)
    setBulkSavingStatus(reviewStatus)

    const results = await Promise.all(
      targetIds.map(async (mediaId) => {
        try {
          await patchFansubMediaReview(fansubId, mediaId, { review_status: reviewStatus }, undefined)
          return { mediaId, ok: true as const }
        } catch (err) {
          return { mediaId, ok: false as const, message: readErrorMessage(err, 'Prüfstatus konnte nicht aktualisiert werden.') }
        }
      }),
    )

    const successfulIds = results.filter((result) => result.ok).map((result) => result.mediaId)
    const failed = results.filter((result) => !result.ok)
    if (successfulIds.length > 0) {
      updateMediaReviewStatus(successfulIds, reviewStatus)
    }

    if (failed.length === 0) {
      setSelectedMediaIds(new Set())
      setToast(
        reviewStatus === 'freigegeben'
          ? `${successfulIds.length} Medien freigegeben.`
          : `${successfulIds.length} Medien abgelehnt.`,
      )
      setTimeout(() => setToast(null), 3500)
    } else {
      setSelectedMediaIds(new Set(failed.map((result) => result.mediaId)))
      setBulkError(`${failed.length} von ${targetIds.length} Medien konnten nicht aktualisiert werden. ${failed[0]?.message ?? ''}`.trim())
    }

    setBulkSavingStatus(null)
  }

  async function handleDelete(item: FansubGroupMediaItem) {
    if (!canDelete) return
    setSaving((prev) => ({ ...prev, [item.id]: true }))
    try {
      await deleteFansubGroupMedia(fansubId, item.id)
      setToast('Medium aus den Gruppenmedien entfernt.')
      setPendingDeleteItem(null)
      if (editingMediaId === item.id) setEditingMediaId(null)
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Medium konnte nicht aus den Gruppenmedien entfernt werden.'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  if (isLoading) {
    return <LoadingState title="Medien werden geladen..." description="Gruppenmedien werden abgerufen." />
  }

  if (loadError) {
    return <ErrorState title="Fehler beim Laden" description={loadError} />
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
        <Card
          variant="section"
          className={styles.uploadPanel}
          header={
            <SectionHeader
              title="Medien hochladen"
              description="Neue Bilder werden der Gruppe zugeordnet und erscheinen anschließend in der Übersicht."
            />
          }
        >
          <div className={styles.uploadControls}>
            <FormField label="Kategorie">
              <Select
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value as FansubGroupMediaCategory)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Dateien">
              <div
                className={styles.dropZone}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  handleSelectedFiles(Array.from(event.dataTransfer.files))
                }}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className={styles.fileInput}
                  onChange={(event) => handleSelectedFiles(Array.from(event.currentTarget.files ?? []))}
                />
                <p className={styles.dropZoneTitle}>Bilder auswählen oder hier ablegen</p>
                <p className={styles.fileHint}>PNG, JPG, WebP oder GIF. Die Auswahl wird nach erfolgreichem Upload zurückgesetzt.</p>
              </div>
            </FormField>
          </div>

          {selectedFileNames ? <p className={styles.fileSelection}>{selectedFileNames}</p> : null}
          {uploadProgress !== null ? <p className={styles.fileHint}>Upload: {Math.round(uploadProgress)}%</p> : null}
          {uploadError ? <p className={styles.inlineError} role="alert">{uploadError}</p> : null}

          <div className={styles.cardFooterActions}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UploadCloud size={16} />}
              disabled={selectedFiles.length === 0 || uploadProgress !== null}
              onClick={() => void handleUpload()}
            >
              Hochladen
            </Button>
          </div>
        </Card>
      ) : null}

      <Card
        variant="section"
        className={styles.managementPanel}
      >
        <div className={styles.managementToolbar}>
          <div className={styles.managementSummary}>
            <h2>Medienübersicht</h2>
            <p className={styles.resultSummary}>
              <span className={styles.desktopSummary}>
                {filteredMediaItems.length} von {mediaItems.length} Medien sichtbar · {visibleMediaItems.length} geladen, {remainingMediaCount} weitere per Klick
              </span>
              <span className={styles.mobileSummary}>
                {visibleMediaItems.length} geladen · {remainingMediaCount} weitere
              </span>
            </p>
          </div>
          <div className={styles.managementActions}>
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Filter zurücksetzen ({activeFilterCount})
              </Button>
            ) : null}
            {canUpdate ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={filteredMediaItems.length === 0 || isBulkSaving}
                onClick={toggleAllFilteredSelection}
              >
                {allFilteredSelected ? 'Auswahl abbrechen' : 'Alle auswählen'}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              className={styles.filterToggleButton}
              leftIcon={<Filter size={16} />}
              onClick={() => setIsFilterOpen((current) => !current)}
              aria-expanded={isFilterOpen}
            >
              Filter
            </Button>
          </div>
        </div>

        <div className={classNames(styles.filterBar, isFilterOpen && styles.filterBarOpen)}>
          <FormField label="Kategorie">
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
              <option value="all">Alle Kategorien</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Prüfstatus">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReviewStatusFilter)}>
              <option value="all">Alle Status</option>
              {REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Sichtbarkeit">
            <Select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}>
              <option value="all">Alle Sichtbarkeiten</option>
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Sortierung">
            <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="created_desc">Neueste zuerst</option>
              <option value="created_asc">Älteste zuerst</option>
              <option value="sort_order">Sortierungswert</option>
            </Select>
          </FormField>

          <FormField label="Suche">
            <Input
              value={searchTerm}
              placeholder="Titel oder Beschreibung"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </FormField>
        </div>

        {mediaItems.length === 0 ? (
          <EmptyState
            title="Keine Medien vorhanden"
            description="Für diese Gruppe sind noch keine Medien angelegt."
          />
        ) : filteredMediaItems.length === 0 ? (
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
              const overviewImageURL = getOverviewImageURL(item)
              const displayTitle = getMediaDisplayTitle(item)
              const uploaderLine = getUploaderLine(item)

              return (
                <Card
                  key={item.id}
                  variant="nested"
                  className={classNames(styles.mediaCard, isSelected && styles.mediaCardSelected)}
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement
                    if (target.closest('button, input, label, a, select, textarea')) return
                    startEditing(item)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    const target = event.target as HTMLElement
                    if (target.closest('button, input, label, a, select, textarea')) return
                    event.preventDefault()
                    startEditing(item)
                  }}
                >
                  <div className={styles.selectionRow}>
                    {canUpdate ? (
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
                      {canUpdate ? (
                        <>
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
                        </>
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
              onClick={() => setVisibleLimit((current) => current + LOAD_MORE_MEDIA_COUNT)}
            >
              Weitere Medien anzeigen ({remainingMediaCount})
            </Button>
          </div>
        ) : null}
      </Card>

      {shouldShowBulkActionBar ? (
        <div className={styles.bulkActionBar} role="region" aria-label="Bulk-Aktionen für Medienauswahl">
          <div className={styles.bulkSummary}>
            <strong>{selectedCount} ausgewählt</strong>
            <span>Prüfstatus für die aktuelle Auswahl ändern</span>
          </div>
          {bulkError ? <p className={styles.bulkError} role="alert">{bulkError}</p> : null}
          <div className={styles.bulkActions}>
            <Button
              variant="success"
              size="sm"
              leftIcon={<Check size={16} />}
              loading={bulkSavingStatus === 'freigegeben'}
              disabled={isBulkSaving}
              onClick={() => void handleBulkReview('freigegeben')}
            >
              Freigeben
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Ban size={16} />}
              loading={bulkSavingStatus === 'abgelehnt'}
              disabled={isBulkSaving}
              onClick={() => void handleBulkReview('abgelehnt')}
            >
              Ablehnen
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<X size={16} />}
              disabled={isBulkSaving}
              onClick={clearSelection}
            >
              Abbrechen
            </Button>
          </div>
        </div>
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
                {canUpdate ? 'Abbrechen' : 'Schließen'}
              </Button>
              {canUpdate ? (
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
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'title', event.target.value)}
                      />
                    </FormField>

                    <FormField label="Alternativtext">
                      <Input
                        value={draft.alt_text}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'alt_text', event.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Beschreibung">
                    <Textarea
                      className={styles.descriptionTextarea}
                      value={draft.description}
                      disabled={!canUpdate}
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

                    <FormField label="Sortierung">
                      <Input
                        type="number"
                        min={0}
                        className={styles.sortOrderInput}
                        value={draft.sort_order}
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'sort_order', Number(event.target.value))}
                      />
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
                        disabled={!canUpdate}
                        onChange={(event) => updateDraft(editingItem.id, 'review_status', event.target.value as FansubMediaReviewStatus)}
                      >
                        {REVIEW_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  {saveErrors[editingItem.id] ? <p className={styles.inlineError} role="alert">{saveErrors[editingItem.id]}</p> : null}

                  {canDelete ? (
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
