'use client'

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, RefreshCw, Star, Trash2, Upload } from 'lucide-react'

import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionMediaCategory, ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

import { Badge, Button, Drawer, EmptyState, FormField, Textarea } from '@/components/ui'
import { UploadQueueItem, useReleaseVersionMedia, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'
import { ReleaseVersionMediaReplaceControls } from './ReleaseVersionMediaReplaceControls'
import { RELEASE_REVIEW_REJECTION_CATEGORY_LABELS } from '../../../fansubs/releaseReviewPresentation'
import { CATEGORY_OPTIONS, buildLocalPreviewURL, buildSelectedItemSavePayload, fileKey, isTerminalStatus, resolveEditDrawerPrimaryLabel, statusClassName, statusLabel } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaSectionProps {
  versionId: number
  fansubGroupName: string
  releaseVersionLabel: string
  mediaState?: UseReleaseVersionMediaResult
}

function categoryLabel(category: ReleaseVersionMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function getAssetName(item: ReleaseVersionMediaItem): string {
  const caption = item.caption?.trim()
  if (caption) return caption
  return `Asset #${item.media_asset_id}`
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
  const [editPreviewCandidate, setEditPreviewCandidate] = useState(false)
  const [editCategory, setEditCategory] = useState<ReleaseVersionMediaCategory>('screenshot')
  const [stagedReplaceFile, setStagedReplaceFile] = useState<File | null>(null)
  const [isReplaceDragActive, setIsReplaceDragActive] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [previewSavingId, setPreviewSavingId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null)

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

  const stagedReplacePreviewURL = useMemo(() => (stagedReplaceFile ? buildLocalPreviewURL(stagedReplaceFile) : null), [stagedReplaceFile])

  useEffect(() => {
    return () => {
      if (stagedReplacePreviewURL && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(stagedReplacePreviewURL)
      }
    }
  }, [stagedReplacePreviewURL])

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
    () => persistedItems.filter((item) => (
      item.category === selectedCategory &&
      !(item.review_state === 'pending' && item.can_update === false)
    )),
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
  const canEditSelectedItem = Boolean(selectedItem && (selectedItem.can_update ?? canUpdateMedia))
  const canDeleteSelectedItem = Boolean(selectedItem && (selectedItem.can_delete ?? (canDeleteMedia || canDeleteOwnMedia)))
  const isRejectedEditable = Boolean(selectedItem?.review_state === 'rejected' && canEditSelectedItem)
  const hasStagedChanges = Boolean(stagedReplaceFile) ||
    (selectedItem != null && editCategory !== selectedItem.category) ||
    (selectedItem != null && (editCaption.trim() || null) !== (selectedItem.caption ?? null))
  const uploadSummaryVisible =
    media.uploadItems.length > 0 && media.uploadItems.every((item) => isTerminalStatus(item.status))
  const successCount = media.uploadItems.filter((item) => item.status === 'ready').length

  function showToast(message: string) {
    setToast(message)
  }

  function openEditSheet(item: ReleaseVersionMediaItem) {
    setEditCaption(item.caption ?? '')
    setEditPreviewCandidate(item.is_preview_candidate)
    setEditCategory(item.category)
    setStagedReplaceFile(null)
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

  function onReplaceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file) setStagedReplaceFile(file)
    event.target.value = ''
  }

  function openReplaceFilePicker() {
    replaceFileInputRef.current?.click()
  }

  function onReplaceDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openReplaceFilePicker()
    }
  }

  function onReplaceDragToggle(event: DragEvent<HTMLDivElement>, active: boolean) {
    event.preventDefault()
    if (active) event.dataTransfer.dropEffect = 'copy'
    setIsReplaceDragActive(active)
  }

  function onReplaceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsReplaceDragActive(false)
    const file = event.dataTransfer.files?.[0] ?? null
    if (file) setStagedReplaceFile(file)
  }

  async function handleUploadClick() {
    if (!canUpload) return

    setUploadError(null)
    try {
      const result = await media.startUpload(
        selectedCategory,
        selectedFiles,
        defaultCaption,
        canShowPreviewToggle ? isPreviewCandidate : false,
      )
      if (!result.allSucceeded) {
        return
      }
      setSelectedFiles([])
      setDefaultCaption('')
      setIsPreviewCandidate(false)
      setIsUploadOpen(false)
      showToast('Upload abgeschlossen.')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.')
    }
  }

  function handleRetryClick(index: number) {
    media.retryUpload(index).catch((error: unknown) => {
      setUploadError(error instanceof Error ? error.message : 'Erneuter Versuch fehlgeschlagen.')
    })
  }

  async function handleSaveSelectedItem() {
    if (!selectedItem || !canEditSelectedItem) return

    const saveOp = buildSelectedItemSavePayload({
      selectedItem,
      editCategory,
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
    if (!(item.can_update ?? canUpdateMedia) || !CATEGORY_ALLOWS_PREVIEW[item.category]) return
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
              <div key={item.id} className={`${styles.mediaCard} ${item.is_preview_candidate ? styles.mediaCardPreview : ''}`}>
                <button type="button" className={styles.mediaCardOpen} onClick={() => openEditSheet(item)} aria-label={`${getAssetName(item)} ${(item.can_update ?? canUpdateMedia) ? 'bearbeiten' : 'ansehen'}${item.is_preview_candidate ? ', aktuelles Vorschaubild' : ''}`}>
                  <span className={styles.mediaThumb}>
                    {item.thumbnail_url || item.original_url ? (
                      <img src={item.thumbnail_url ?? item.original_url ?? ''} alt="" />
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
                    <span className={styles.mediaName}>{getAssetName(item)}</span>
                    <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>
                    {item.review_state === 'confirmed' && item.visibility === 'oeffentlich' ? (
                      <Badge variant="success">Öffentlich</Badge>
                    ) : null}
                    {formatLastActivity(item.last_activity_at) ? (
                      <span className={styles.helper}>
                        Letzte Aktivität: {formatLastActivity(item.last_activity_at)}
                      </span>
                    ) : null}
                  </span>
                </button>
                {CATEGORY_ALLOWS_PREVIEW[item.category] && (item.can_update ?? canUpdateMedia) ? (
                  <Button type="button" variant={item.is_preview_candidate ? 'success' : 'subtle'} size="sm" leftIcon={<Star size={14} aria-hidden="true" />} loading={previewSavingId === item.id} aria-pressed={item.is_preview_candidate} onClick={() => void handlePreviewChange(item, !item.is_preview_candidate)}>
                    {item.is_preview_candidate ? 'Vorschau entfernen' : 'Als Vorschau wählen'}
                  </Button>
                ) : null}
              </div>
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
                      onClick={() => handleRetryClick(index)}
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
        title={canEditSelectedItem ? 'Medium bearbeiten' : 'Medium ansehen'}
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
              disabled={!canEditSelectedItem || (selectedItem?.review_state === 'rejected' && !hasStagedChanges)}
            >
              {resolveEditDrawerPrimaryLabel(selectedItem, hasStagedChanges)}
            </Button>
          </>
        }
      >
        {selectedItem ? (
          <div className={styles.sheetStack}>
            <div className={styles.editPreview}>
              {stagedReplacePreviewURL ? (
                <img src={stagedReplacePreviewURL} alt="" />
              ) : selectedItem.original_url || selectedItem.thumbnail_url ? (
                <img src={selectedItem.original_url ?? selectedItem.thumbnail_url ?? ''} alt="" />
              ) : (
                <ImageIcon size={28} aria-hidden="true" />
              )}
            </div>
            {editError ? <div className={styles.errorBox}>{editError}</div> : null}
            {selectedItem.review_state === 'rejected' ? (
              <div className={styles.statusHint} role="status">
                <strong>
                  {RELEASE_REVIEW_REJECTION_CATEGORY_LABELS[selectedItem.rejection_category ?? 'other'] ?? 'Sonstiger Grund'}
                </strong>
                {selectedItem.rejection_reason ? <p>{selectedItem.rejection_reason}</p> : null}
              </div>
            ) : null}
            {isRejectedEditable ? <ReleaseVersionMediaReplaceControls editCategory={editCategory} onCategoryChange={setEditCategory} /> : null}
            {isRejectedEditable ? (
              <FormField label="Datei ersetzen" hint="Ersetzt die aktuell abgelehnte Datei durch eine neue Fassung. Beschreibung und Kategorie kannst du im selben Formular anpassen.">
                <div
                  className={[styles.dropZone, isReplaceDragActive ? styles.dropZoneActive : ''].filter(Boolean).join(' ')}
                  role="button"
                  tabIndex={0}
                  onClick={openReplaceFilePicker}
                  onKeyDown={onReplaceDropZoneKeyDown}
                  onDragEnter={(event) => onReplaceDragToggle(event, true)}
                  onDragOver={(event) => onReplaceDragToggle(event, true)}
                  onDragLeave={(event) => onReplaceDragToggle(event, false)}
                  onDrop={onReplaceDrop}
                >
                  <div className={styles.dropZoneHeader}>
                    <p className={styles.dropZoneCallout}>Neue Datei hier hineinziehen oder antippen.</p>
                    {stagedReplaceFile ? <p className={styles.helper}>Ausgewählt: {stagedReplaceFile.name}</p> : null}
                  </div>
                  <input
                    ref={replaceFileInputRef}
                    className={styles.fileInput}
                    type="file"
                    aria-label="Ersatzdatei"
                    accept="image/*"
                    onChange={onReplaceFileChange}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              </FormField>
            ) : null}
            <FormField label="Beschreibung">
              <Textarea
                value={editCaption}
                onChange={(event) => setEditCaption(event.target.value)}
                placeholder="Kurze Beschreibung ergänzen"
                rows={4}
                disabled={!canEditSelectedItem}
              />
            </FormField>
            {canEditPreviewCandidate ? (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={editPreviewCandidate}
                  onChange={(event) => void handlePreviewChange(selectedItem, event.target.checked)}
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
