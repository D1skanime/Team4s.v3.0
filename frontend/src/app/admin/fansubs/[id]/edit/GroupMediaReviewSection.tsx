'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Edit3, Save, UploadCloud, X } from 'lucide-react'
import Image from 'next/image'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
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
          [item.title, item.description, item.alt_text, item.uploaded_by_display_name]
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

  const remainingMediaCount = Math.max(filteredMediaItems.length - visibleMediaItems.length, 0)

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

  async function handleDelete(item: FansubGroupMediaItem) {
    if (!canDelete) return
    setSaving((prev) => ({ ...prev, [item.id]: true }))
    try {
      await deleteFansubGroupMedia(fansubId, item.id)
      setToast('Medium aus der Verwaltung entfernt.')
      if (editingMediaId === item.id) setEditingMediaId(null)
      await loadMedia()
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setSaveErrors((prev) => ({
        ...prev,
        [item.id]: readErrorMessage(err, 'Medium konnte nicht aus der Verwaltung entfernt werden.'),
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
    <div className={styles.reviewSection}>
      <Toolbar
        leading={
          <SectionHeader
            title="Medien prüfen"
            description="Gruppenmedien hochladen, filtern und gezielt bearbeiten."
          />
        }
      />

      {toast ? <p className={styles.toastSuccess} role="status">{toast}</p> : null}

      {canUpload ? (
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
        header={
          <SectionHeader
            title="Medienübersicht"
            description={`${filteredMediaItems.length} von ${mediaItems.length} Medien sichtbar`}
          />
        }
      >
        <div className={styles.filterBar}>
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
              const draft = drafts[item.id] ?? itemToDraft(item)
              const persisted = itemToDraft(item)
              const reviewStatus = getReviewStatusOption(persisted.review_status)
              const createdAt = formatDate(item.created_at)
              const isEditing = editingMediaId === item.id
              const overviewImageURL = getOverviewImageURL(item)
              const detailImageURL = getDetailImageURL(item)

              return (
                <Card key={item.id} variant="nested" className={styles.mediaCard}>
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
                      aria-label={`${persisted.title || `Medium ${item.id}`} öffnen`}
                    >
                      {overviewImageURL && !failedPreviewIds[item.id] ? (
                        <Image
                          src={resolveApiUrl(overviewImageURL)}
                          alt={persisted.alt_text || persisted.title || 'Gruppenmedium'}
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
                        <h3>{persisted.title || `Medium #${item.id}`}</h3>
                        <Badge variant="neutral">{getCategoryLabel(persisted.category)}</Badge>
                      </div>
                      <div className={styles.badgeRow}>
                        <Badge variant={reviewStatus.variant}>{reviewStatus.label}</Badge>
                        <Badge variant="info">{getVisibilityLabel(persisted.visibility)}</Badge>
                      </div>
                      <dl className={styles.compactMeta}>
                        <div>
                          <dt>Uploader</dt>
                          <dd>{item.uploaded_by_display_name ?? 'Unbekannt'}</dd>
                        </div>
                        {createdAt ? (
                          <div>
                            <dt>Upload</dt>
                            <dd>{createdAt}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <div className={styles.compactActions}>
                      {canUpdate ? (
                        <Button
                          variant={isEditing ? 'secondary' : 'primary'}
                          size="sm"
                          leftIcon={isEditing ? <X size={16} /> : <Edit3 size={16} />}
                          onClick={() => (isEditing ? cancelEditing(item) : startEditing(item))}
                        >
                          {isEditing ? 'Schließen' : 'Bearbeiten'}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Archive size={16} />}
                          disabled={saving[item.id] ?? false}
                          onClick={() => void handleDelete(item)}
                        >
                          Aus Verwaltung entfernen
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className={styles.detailPanel}>
                      <div className={styles.detailPreviewFrame}>
                        {detailImageURL && !failedDetailIds[item.id] ? (
                          <Image
                            src={resolveApiUrl(detailImageURL)}
                            alt={persisted.alt_text || persisted.title || 'Gruppenmedium'}
                            fill
                            sizes="(max-width: 700px) 100vw, 720px"
                            unoptimized
                            loading="lazy"
                            onError={() => setFailedDetailIds((prev) => ({ ...prev, [item.id]: true }))}
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
                            onChange={(event) => updateDraft(item.id, 'title', event.target.value)}
                          />
                        </FormField>

                        <FormField label="Alternativtext">
                          <Input
                            value={draft.alt_text}
                            disabled={!canUpdate}
                            onChange={(event) => updateDraft(item.id, 'alt_text', event.target.value)}
                          />
                        </FormField>
                      </div>

                      <FormField label="Beschreibung">
                        <Textarea
                          value={draft.description}
                          disabled={!canUpdate}
                          rows={3}
                          onChange={(event) => updateDraft(item.id, 'description', event.target.value)}
                        />
                      </FormField>

                      <div className={styles.detailGrid}>
                        <FormField label="Kategorie">
                          <Select
                            value={draft.category}
                            disabled={!canUpdate}
                            onChange={(event) => updateDraft(item.id, 'category', event.target.value as FansubGroupMediaCategory)}
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
                            value={draft.sort_order}
                            disabled={!canUpdate}
                            onChange={(event) => updateDraft(item.id, 'sort_order', Number(event.target.value))}
                          />
                        </FormField>
                      </div>

                      <div className={styles.detailGrid}>
                        <FormField label="Sichtbarkeit">
                          <Select
                            value={draft.visibility}
                            disabled={!canUpdate}
                            onChange={(event) => updateDraft(item.id, 'visibility', event.target.value as FansubMediaVisibility)}
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
                            onChange={(event) => updateDraft(item.id, 'review_status', event.target.value as FansubMediaReviewStatus)}
                          >
                            {REVIEW_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </Select>
                        </FormField>
                      </div>

                      {saveErrors[item.id] ? <p className={styles.inlineError} role="alert">{saveErrors[item.id]}</p> : null}

                      <div className={styles.cardFooterActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<X size={16} />}
                          disabled={saving[item.id] ?? false}
                          onClick={() => cancelEditing(item)}
                        >
                          {canUpdate ? 'Abbrechen' : 'Schließen'}
                        </Button>
                        {canUpdate ? (
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={<Save size={16} />}
                            disabled={saving[item.id] ?? false}
                            onClick={() => void handleSave(item)}
                          >
                            Änderungen speichern
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
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
    </div>
  )
}
