'use client'

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react'

import {
  CATEGORY_ALLOWS_PREVIEW,
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
} from '@/types/releaseVersionMedia'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { UploadQueueItem, useReleaseVersionMedia, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'
import {
  CATEGORY_OPTIONS,
  buildLocalPreviewURL,
  fileKey,
  isTerminalStatus,
  statusClassName,
  statusLabel,
} from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaSectionProps {
  versionId: number
  fansubGroupName: string
  releaseVersionLabel: string
  mediaState?: UseReleaseVersionMediaResult
}

type AssetStatusValue = 'in_pruefung' | 'oeffentlich' | 'intern' | 'abgelehnt' | 'archiviert' | 'entfernt'

const assetStatusOptions: Array<{ value: AssetStatusValue; label: string }> = [
  { value: 'in_pruefung', label: 'In Prüfung' },
  { value: 'oeffentlich', label: 'Öffentlich' },
  { value: 'intern', label: 'Intern' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'archiviert', label: 'Archiviert' },
  { value: 'entfernt', label: 'Entfernt' },
]

function categoryLabel(category: ReleaseVersionMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function getAssetName(item: ReleaseVersionMediaItem): string {
  const caption = item.caption?.trim()
  if (caption) return caption
  return `Asset #${item.media_asset_id}`
}

function getAssetStatusValue(item: ReleaseVersionMediaItem | null): AssetStatusValue {
  if (!item) return 'in_pruefung'

  switch (item.review_status) {
    case 'freigegeben':
      return item.visibility === 'oeffentlich' ? 'oeffentlich' : 'intern'
    case 'abgelehnt':
      return 'abgelehnt'
    case 'archiviert':
      return 'archiviert'
    case 'entfernt':
      return 'entfernt'
    case 'in_pruefung':
    default:
      return 'in_pruefung'
  }
}

function statusPatch(value: AssetStatusValue): Pick<ReleaseVersionMediaPatchRequest, 'visibility' | 'review_status'> {
  switch (value) {
    case 'oeffentlich':
      return { visibility: 'oeffentlich', review_status: 'freigegeben' }
    case 'intern':
      return { visibility: 'intern', review_status: 'freigegeben' }
    case 'abgelehnt':
      return { visibility: 'intern', review_status: 'abgelehnt' }
    case 'archiviert':
      return { visibility: 'intern', review_status: 'archiviert' }
    case 'entfernt':
      return { visibility: 'intern', review_status: 'entfernt' }
    case 'in_pruefung':
    default:
      return { visibility: 'intern', review_status: 'in_pruefung' }
  }
}

function statusBadge(item: ReleaseVersionMediaItem): { label: string; className: string; variant: 'success' | 'warning' | 'danger' | 'muted' } {
  const value = getAssetStatusValue(item)
  switch (value) {
    case 'oeffentlich':
      return { label: 'Öffentlich', className: styles.assetStatusPublic, variant: 'success' }
    case 'intern':
      return { label: 'Intern', className: styles.assetStatusMuted, variant: 'muted' }
    case 'abgelehnt':
      return { label: 'Abgelehnt', className: styles.assetStatusRejected, variant: 'danger' }
    case 'archiviert':
      return { label: 'Archiviert', className: styles.assetStatusMuted, variant: 'muted' }
    case 'entfernt':
      return { label: 'Entfernt', className: styles.assetStatusMuted, variant: 'muted' }
    case 'in_pruefung':
    default:
      return { label: 'In Prüfung', className: styles.assetStatusReview, variant: 'warning' }
  }
}

export function ReleaseVersionMediaSection({
  versionId,
  fansubGroupName,
  releaseVersionLabel,
  mediaState,
}: ReleaseVersionMediaSectionProps) {
  const internalMedia = useReleaseVersionMedia(versionId)
  const media = mediaState ?? internalMedia
  const persistedItems = Array.isArray(media.items) ? media.items : []

  const [selectedCategory, setSelectedCategory] = useState<ReleaseVersionMediaCategory>('screenshot')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [defaultCaption, setDefaultCaption] = useState('')
  const [isPreviewCandidate, setIsPreviewCandidate] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [editStatus, setEditStatus] = useState<AssetStatusValue>('in_pruefung')
  const [editPreviewCandidate, setEditPreviewCandidate] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({ file, previewURL: buildLocalPreviewURL(file) })),
    [selectedFiles],
  )

  useEffect(() => {
    return () => {
      for (const preview of selectedFilePreviews) {
        if (preview.previewURL && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(preview.previewURL)
        }
      }
    }
  }, [selectedFilePreviews])

  const categoryCounts = useMemo(() => {
    const counts = new Map<ReleaseVersionMediaCategory, number>()
    for (const option of CATEGORY_OPTIONS) {
      counts.set(option.value, 0)
    }
    for (const item of persistedItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }
    return counts
  }, [persistedItems])

  const activeItems = useMemo(
    () => persistedItems.filter((item) => item.category === selectedCategory),
    [persistedItems, selectedCategory],
  )

  const selectedItem = persistedItems.find((item) => item.id === selectedItemId) ?? null

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const queueItems = useMemo<UploadQueueItem[]>(() => {
    if (media.uploadItems.length > 0) {
      return media.uploadItems
    }

    return selectedFiles.map((file) => ({
      file,
      status: 'idle',
      progress: 0,
      errorMessage: null,
      resultId: null,
    }))
  }, [media.uploadItems, selectedFiles])

  const isBusy = media.uploadItems.some(
    (item) => item.status === 'uploading' || item.status === 'processing',
  )
  const canViewMedia = media.capabilities?.can_view_media ?? false
  const canUploadMedia = media.capabilities?.can_upload_media ?? false
  const canUpdateMedia = media.capabilities?.can_update_media ?? false
  const canDeleteMedia = media.capabilities?.can_delete_media ?? false
  const canDeleteOwnMedia = media.capabilities?.can_delete_own_media ?? false
  const canShowPreviewToggle = CATEGORY_ALLOWS_PREVIEW[selectedCategory]
  const canChooseFiles = canUploadMedia && versionId > 0 && !isBusy
  const canUpload = canChooseFiles && selectedFiles.length > 0
  const canEditPreviewCandidate = selectedItem ? CATEGORY_ALLOWS_PREVIEW[selectedItem.category] : false
  const canEditSelectedItem = Boolean(selectedItem && canUpdateMedia)
  const canDeleteSelectedItem = Boolean(selectedItem && (canDeleteMedia || canDeleteOwnMedia))
  const uploadSummaryVisible =
    media.uploadItems.length > 0 && media.uploadItems.every((item) => isTerminalStatus(item.status))
  const successCount = media.uploadItems.filter((item) => item.status === 'ready').length

  function showToast(message: string) {
    setToast(message)
  }

  function openEditSheet(item: ReleaseVersionMediaItem) {
    setEditCaption(item.caption ?? '')
    setEditStatus(getAssetStatusValue(item))
    setEditPreviewCandidate(item.is_preview_candidate)
    setEditError(null)
    setSelectedItemId(item.id)
  }

  function resetUploadDraft() {
    setSelectedFiles([])
    setDefaultCaption('')
    setIsPreviewCandidate(false)
    setUploadError(null)
    setIsDragActive(false)
    media.clearUploadQueue()
  }

  function openUploadSheet() {
    resetUploadDraft()
    setIsUploadOpen(true)
  }

  function closeUploadSheet() {
    if (isBusy) return
    resetUploadDraft()
    setIsUploadOpen(false)
  }

  function handleFiles(nextFiles: File[]) {
    setSelectedFiles((current) => {
      const merged = [...current]
      const seen = new Set(current.map((file) => fileKey(file)))

      for (const file of nextFiles) {
        const key = fileKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(file)
      }

      return merged
    })
    media.clearUploadQueue()
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function openFilePicker() {
    if (!canChooseFiles) return
    fileInputRef.current?.click()
  }

  function onDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragActive(false)
    if (!canChooseFiles) return
    handleFiles(Array.from(event.dataTransfer.files ?? []))
  }

  async function handleUploadClick() {
    if (!canUpload) return

    setUploadError(null)
    try {
      await media.startUpload(
        selectedCategory,
        selectedFiles,
        defaultCaption,
        canShowPreviewToggle ? isPreviewCandidate : false,
        undefined,
        undefined,
      )
      setSelectedFiles([])
      setDefaultCaption('')
      setIsPreviewCandidate(false)
      setIsUploadOpen(false)
      showToast('Upload abgeschlossen.')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.')
    }
  }

  async function handleSaveSelectedItem() {
    if (!selectedItem || !canEditSelectedItem) return

    const patch: ReleaseVersionMediaPatchRequest = {
      caption: editCaption.trim() === '' ? null : editCaption.trim(),
      is_preview_candidate: canEditPreviewCandidate ? editPreviewCandidate : false,
      ...statusPatch(editStatus),
    }

    setEditError(null)
    try {
      await media.patchItem(selectedItem.id, patch)
      setSelectedItemId(null)
      showToast('Änderungen gespeichert.')
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.')
    }
  }

  async function handleDeleteSelectedItem() {
    if (!selectedItem || !canDeleteSelectedItem) return
    const confirmed = window.confirm('Dieses Medium aus der Release-Version entfernen?')
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
        <div className={styles.contextLine}>
          <span>Fansub: {fansubGroupName}</span>
          <span>Release-Version: {releaseVersionLabel}</span>
        </div>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.headline}>Media / Assets verwalten</h2>
            <p className={styles.helper}>
              Wähle eine Kategorie, prüfe die vorhandenen Assets und lade neue Medien gezielt in diese Kategorie.
            </p>
          </div>
          <Button
            variant="ghost"
            className={styles.accentButton}
            leftIcon={<Upload size={16} aria-hidden="true" />}
            onClick={openUploadSheet}
            disabled={!canUploadMedia || isBusy}
          >
            Hochladen
          </Button>
        </div>

        <div className={styles.segmentedControl} role="tablist" aria-label="Medienkategorie">
          {CATEGORY_OPTIONS.map((option) => {
            const active = selectedCategory === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${styles.segmentButton} ${active ? styles.segmentButtonActive : ''}`}
                onClick={() => setSelectedCategory(option.value)}
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

      <div className={styles.activeCategoryHeader}>
        <div>
          <p className={styles.categoryKicker}>Aktive Kategorie</p>
          <h3 className={styles.categoryTitle}>{categoryLabel(selectedCategory)}</h3>
        </div>
        <Badge variant="muted">{activeItems.length} Medien</Badge>
      </div>

      {activeItems.length > 0 ? (
        <div className={styles.mediaGrid}>
          {activeItems.map((item) => {
            const badge = statusBadge(item)
            return (
              <button
                key={item.id}
                type="button"
                className={styles.mediaCard}
                onClick={() => openEditSheet(item)}
                aria-label={`${getAssetName(item)} bearbeiten`}
              >
                <span className={styles.mediaThumb}>
                  {item.thumbnail_url || item.original_url ? (
                    <img src={item.thumbnail_url ?? item.original_url ?? ''} alt="" />
                  ) : (
                    <ImageIcon size={22} aria-hidden="true" />
                  )}
                </span>
                <span className={styles.mediaCardBody}>
                  <span className={styles.mediaName}>{getAssetName(item)}</span>
                  <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <EmptyState
          variant="compact"
          title="Noch keine Medien"
          description="In dieser Kategorie gibt es für diese Release-Version noch keine Assets."
          action={
            canUploadMedia ? (
              <Button
                variant="ghost"
                className={styles.ghostAction}
                leftIcon={<Upload size={16} aria-hidden="true" />}
                onClick={openUploadSheet}
              >
                Jetzt hochladen
              </Button>
            ) : null
          }
        />
      )}

      {!canUploadMedia && canViewMedia ? (
        <p className={styles.helper}>Du darfst Medien dieser Release-Version ansehen, aber nicht hochladen.</p>
      ) : null}

      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}

      <Drawer
        open={isUploadOpen}
        onClose={closeUploadSheet}
        title="Medien hochladen"
        description={`Kategorie: ${categoryLabel(selectedCategory)}`}
        variant="responsiveSheet"
        footer={
          <>
            <Button variant="ghost" className={styles.ghostAction} onClick={closeUploadSheet} disabled={isBusy}>
              Abbrechen
            </Button>
            <Button
              variant="ghost"
              className={styles.accentButton}
              onClick={() => void handleUploadClick()}
              disabled={!canUpload}
            >
              Upload starten
            </Button>
          </>
        }
      >
        <div className={styles.sheetStack}>
          <div className={styles.statusHint}>
            Neue Uploads starten als „In Prüfung“ und werden im Review freigegeben.
          </div>
          {uploadError ? <div className={styles.errorBox}>{uploadError}</div> : null}

          <FormField label="Standard-Beschreibung" hint="Optional für alle Dateien dieses Uploads.">
            <Textarea
              value={defaultCaption}
              onChange={(event) => setDefaultCaption(event.target.value)}
              placeholder="Kurze Beschreibung ergänzen"
              rows={3}
            />
          </FormField>

          {canShowPreviewToggle ? (
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={isPreviewCandidate}
                onChange={(event) => setIsPreviewCandidate(event.target.checked)}
              />
              <span>Als Vorschau markieren</span>
            </label>
          ) : null}

          <div
            className={[
              styles.dropZone,
              isDragActive ? styles.dropZoneActive : '',
              !canChooseFiles ? styles.dropZoneDisabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="button"
            tabIndex={canChooseFiles ? 0 : -1}
            aria-disabled={!canChooseFiles}
            onClick={() => openFilePicker()}
            onKeyDown={onDropZoneKeyDown}
            onDragEnter={(event) => {
              event.preventDefault()
              if (canChooseFiles) setIsDragActive(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
              if (canChooseFiles) setIsDragActive(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragActive(false)
            }}
            onDrop={onDrop}
          >
            <div className={styles.dropZoneHeader}>
              <p className={styles.dropZoneCallout}>Dateien hier hineinziehen oder antippen.</p>
              <p className={styles.helper}>Alle Dateien landen in „{categoryLabel(selectedCategory)}“.</p>
            </div>
            <input
              ref={fileInputRef}
              className={styles.fileInput}
              type="file"
              aria-label="Dateien"
              multiple
              accept="image/*"
              disabled={!canChooseFiles}
              onChange={onFileChange}
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          {selectedFilePreviews.length > 0 ? (
            <div className={styles.localPreviewGrid}>
              {selectedFilePreviews.map(({ file, previewURL }) => (
                <figure key={`${file.name}-${file.size}-${file.lastModified}`} className={styles.localPreviewCard}>
                  {previewURL ? (
                    <img className={styles.localPreviewImage} src={previewURL} alt={`Vorschau ${file.name}`} />
                  ) : (
                    <div className={styles.localPreviewFallback} aria-label={`Vorschau ${file.name}`}>
                      Keine Vorschau
                    </div>
                  )}
                  <figcaption className={styles.localPreviewCaption}>{file.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {queueItems.length > 0 ? (
            <div className={styles.queue}>
              {queueItems.map((item, index) => (
                <div key={fileKey(item.file)} className={styles.queueRow}>
                  <div className={styles.queueMeta}>
                    <span className={styles.filename}>{item.file.name}</span>
                    <span className={`${styles.badge} ${statusClassName(item)}`}>{statusLabel(item)}</span>
                    {item.errorMessage ? <p className={styles.errorText}>{item.errorMessage}</p> : null}
                  </div>
                  {item.status === 'failed' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.ghostAction}
                      leftIcon={<RefreshCw size={14} aria-hidden="true" />}
                      onClick={() => void media.retryUpload(index)}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ))}

              {uploadSummaryVisible ? (
                <p className={styles.summaryRow}>{successCount} von {media.uploadItems.length} erfolgreich hochgeladen.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Drawer>

      <Drawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItemId(null)}
        title={selectedItem ? getAssetName(selectedItem) : 'Medium bearbeiten'}
        description={selectedItem ? categoryLabel(selectedItem.category) : undefined}
        variant="responsiveSheet"
        footer={
          <>
            <Button
              variant="ghost"
              className={styles.dangerGhost}
              leftIcon={<Trash2 size={16} aria-hidden="true" />}
              onClick={() => void handleDeleteSelectedItem()}
              disabled={!canDeleteSelectedItem}
            >
              Löschen
            </Button>
            <Button
              variant="ghost"
              className={styles.accentButton}
              onClick={() => void handleSaveSelectedItem()}
              disabled={!canEditSelectedItem}
            >
              Speichern
            </Button>
          </>
        }
      >
        {selectedItem ? (
          <div className={styles.sheetStack}>
            <div className={styles.editPreview}>
              {selectedItem.original_url || selectedItem.thumbnail_url ? (
                <img src={selectedItem.original_url ?? selectedItem.thumbnail_url ?? ''} alt="" />
              ) : (
                <ImageIcon size={28} aria-hidden="true" />
              )}
            </div>
            {editError ? <div className={styles.errorBox}>{editError}</div> : null}
            <FormField label="Beschreibung">
              <Textarea
                value={editCaption}
                onChange={(event) => setEditCaption(event.target.value)}
                placeholder="Kurze Beschreibung ergänzen"
                rows={4}
                disabled={!canEditSelectedItem}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as AssetStatusValue)}
                disabled={!canEditSelectedItem}
              >
                {assetStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {canEditPreviewCandidate ? (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={editPreviewCandidate}
                  onChange={(event) => setEditPreviewCandidate(event.target.checked)}
                  disabled={!canEditSelectedItem}
                />
                <span>Als Vorschau markieren</span>
              </label>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </section>
  )
}
