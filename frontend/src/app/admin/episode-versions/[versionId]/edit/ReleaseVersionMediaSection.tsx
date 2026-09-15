'use client'

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, Star, Trash2 } from 'lucide-react'

import { CATEGORY_ALLOWS_PREVIEW, ReleaseVersionMediaCategory, ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

import { Badge, Button, Drawer, FormField, Input, Textarea } from '@/components/ui'
import { UploadFileDraft, useReleaseVersionMedia, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'
import { ReleaseVersionMediaUploadQueue } from './ReleaseVersionMediaUploadQueue'
import { ReleaseVersionMediaReplaceControls } from './ReleaseVersionMediaReplaceControls'
import { RELEASE_REVIEW_REJECTION_CATEGORY_LABELS } from '../../../fansubs/releaseReviewPresentation'
import { CATEGORY_OPTIONS, buildLocalPreviewURL, buildSelectedItemSavePayload, fileKey, isTerminalStatus, resolveEditDrawerPrimaryLabel } from './ReleaseVersionMediaSection.helpers'
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
  const title = item.title?.trim() || item.caption?.trim()
  if (title) return title
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
  const persistedItems = useMemo(() => (Array.isArray(media.items) ? media.items : []), [media.items])

  const [uploadCategory, setUploadCategory] = useState<ReleaseVersionMediaCategory>('screenshot')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null)
  const [selectedDrafts, setSelectedDrafts] = useState<UploadFileDraft[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
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

  const isBusy = media.uploadItems.some(
    (item) => item.status === 'uploading' || item.status === 'processing',
  )
  const canViewMedia = media.capabilities?.can_view_media ?? false
  const canUploadMedia = media.capabilities?.can_upload_media ?? false
  const canUpdateMedia = media.capabilities?.can_update_media ?? false
  const canDeleteMedia = media.capabilities?.can_delete_media ?? false
  const canDeleteOwnMedia = media.capabilities?.can_delete_own_media ?? false
  const canShowPreviewToggle = CATEGORY_ALLOWS_PREVIEW[uploadCategory]
  const uploadStarted = media.uploadItems.length > 0
  const canChooseFiles = canUploadMedia && versionId > 0 && !isBusy && !uploadStarted
  const canUpload = canChooseFiles && selectedDrafts.length > 0
  const canEditPreviewCandidate = selectedItem ? CATEGORY_ALLOWS_PREVIEW[selectedItem.category] : false
  const canEditSelectedItem = Boolean(selectedItem && (selectedItem.can_update ?? canUpdateMedia))
  const canDeleteSelectedItem = Boolean(selectedItem && (selectedItem.can_delete ?? (canDeleteMedia || canDeleteOwnMedia)))
  const isRejectedEditable = Boolean(selectedItem?.review_state === 'rejected' && canEditSelectedItem)
  const hasStagedChanges = Boolean(stagedReplaceFile) ||
    (selectedItem != null && (editTitle.trim() || null) !== (selectedItem.title ?? null)) ||
    (selectedItem != null && editCategory !== selectedItem.category) ||
    (selectedItem != null && (editCaption.trim() || null) !== (selectedItem.caption ?? null))
  const uploadSummaryVisible =
    media.uploadItems.length > 0 && media.uploadItems.every((item) => isTerminalStatus(item.status))
  const successCount = media.uploadItems.filter((item) => item.status === 'ready').length

  function showToast(message: string) {
    setToast(message)
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

  function resetUploadDraft() {
    setSelectedDrafts([])
    setPreviewFileKey(null)
    setUploadError(null)
    setIsDragActive(false)
    media.clearUploadQueue()
  }

  function openCategoryUpload(category: ReleaseVersionMediaCategory) {
    if (isBusy || !canUploadMedia || versionId <= 0) return
    setUploadCategory(category)
    resetUploadDraft()
    setIsUploadOpen(true)
  }

  function closeUploadSheet() {
    if (isBusy) return
    resetUploadDraft()
    setIsUploadOpen(false)
  }

  function handleFiles(nextFiles: File[]) {
    if (!canChooseFiles) return
    setSelectedDrafts((current) => {
      const merged = [...current]
      const seen = new Set(current.map((draft) => fileKey(draft.file)))
      for (const file of nextFiles) {
        const key = fileKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push({ file, title: '', caption: '' })
      }
      return merged
    })
  }

  function changeDraft(key: string, field: 'title' | 'caption', value: string) {
    if (uploadStarted) return
    setSelectedDrafts((current) => current.map((draft) => fileKey(draft.file) === key ? { ...draft, [field]: value } : draft))
  }

  function removeDraft(key: string) {
    if (uploadStarted) return
    setSelectedDrafts((current) => current.filter((draft) => fileKey(draft.file) !== key))
    setPreviewFileKey((current) => current === key ? null : current)
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
        uploadCategory,
        selectedDrafts,
        canShowPreviewToggle ? previewFileKey : null,
      )
      if (!result.allSucceeded) {
        return
      }
      setSelectedDrafts([])
      setPreviewFileKey(null)
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
                aria-haspopup={canUploadMedia && versionId > 0 && !isBusy ? 'dialog' : undefined}
                disabled={isBusy || !canUploadMedia || versionId <= 0}
                className={styles.segmentButton}
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

      {visibleItems.length > 0 ? (
        <h3 className={styles.categoryTitle}>Vorhandene Medien · {visibleItems.length}</h3>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className={styles.mediaGrid}>
          {visibleItems.map((item) => {
            const badge = statusBadge(item)
            const lastActivity = formatLastActivity(item.last_activity_at)
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
                    <Badge variant="muted" className={styles.mediaCategory}>{categoryLabel(item.category)}</Badge>
                    {item.title && item.caption ? <span className={`${styles.helper} ${styles.mediaCaption}`}>{item.caption}</span> : null}
                    <Badge variant={badge.variant} className={`${badge.className} ${styles.mediaStatus}`}>{badge.label}</Badge>
                    {item.review_state === 'confirmed' && item.visibility === 'oeffentlich' ? (
                      <Badge variant="success" className={styles.mediaStatus}>Öffentlich</Badge>
                    ) : null}
                    {lastActivity ? (
                      <span className={`${styles.helper} ${styles.mediaActivity}`}>
                        Letzte Aktivität:
                        <time dateTime={item.last_activity_at ?? undefined}>{lastActivity}</time>
                      </span>
                    ) : null}
                  </span>
                </button>
                {CATEGORY_ALLOWS_PREVIEW[item.category] && (item.can_update ?? canUpdateMedia) ? (
                  <Button type="button" className={styles.mediaPreviewAction} variant={item.is_preview_candidate ? 'success' : 'subtle'} size="sm" leftIcon={<Star size={14} aria-hidden="true" />} loading={previewSavingId === item.id} aria-pressed={item.is_preview_candidate} onClick={() => void handlePreviewChange(item, !item.is_preview_candidate)}>
                    {item.is_preview_candidate ? 'Vorschau entfernen' : 'Als Vorschau wählen'}
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {!canUploadMedia && canViewMedia ? (
        <p className={styles.helper}>Du darfst Medien dieser Release-Version ansehen, aber nicht hochladen.</p>
      ) : null}

      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}

      <Drawer
        open={isUploadOpen}
        onClose={closeUploadSheet}
        title="Medien hochladen"
        description={`Kategorie: ${categoryLabel(uploadCategory)}`}
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
              <p className={styles.helper}>Alle Dateien landen in „{categoryLabel(uploadCategory)}“.</p>
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

          <ReleaseVersionMediaUploadQueue
            drafts={selectedDrafts}
            items={media.uploadItems}
            previewFileKey={previewFileKey}
            allowsPreview={canShowPreviewToggle}
            locked={uploadStarted}
            busy={isBusy}
            onChange={changeDraft}
            onRemove={removeDraft}
            onPreviewChange={setPreviewFileKey}
            onRetry={handleRetryClick}
          />
          {uploadSummaryVisible ? (
            <p className={styles.summaryRow}>{successCount} von {media.uploadItems.length} erfolgreich hochgeladen.</p>
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
            <FormField label="Titel" htmlFor="release-media-edit-title">
              <Input id="release-media-edit-title" value={editTitle} maxLength={200}
                onChange={(event) => setEditTitle(event.target.value)} disabled={!canEditSelectedItem} />
            </FormField>
            <FormField label="Beschreibung" htmlFor="release-media-edit-caption">
              <Textarea
                id="release-media-edit-caption"
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
