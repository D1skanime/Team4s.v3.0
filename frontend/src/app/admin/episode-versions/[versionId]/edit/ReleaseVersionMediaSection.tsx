'use client'

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import {
  CATEGORY_ALLOWS_PREVIEW,
  ReleaseVersionMediaCategory,
} from '@/types/releaseVersionMedia'

import { MediaOwnershipContext, MediaOwnershipContextValue } from '@/components/admin/media/MediaOwnershipContext'
import { ReleaseVersionMediaDetailPanel } from './ReleaseVersionMediaDetailPanel'
import { ReleaseVersionMediaGallery } from './ReleaseVersionMediaGallery'
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

export function ReleaseVersionMediaSection({
  versionId,
  fansubGroupName,
  releaseVersionLabel,
  mediaState,
}: ReleaseVersionMediaSectionProps) {
  const internalMedia = useReleaseVersionMedia(versionId)
  const media = mediaState ?? internalMedia
  const persistedItems = Array.isArray(media.items) ? media.items : []

  // ─── Owner-Kontext (MediaOwnershipContext, D-07) ───────────────────────────
  const [ownerCtx, setOwnerCtx] = useState<MediaOwnershipContextValue | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<ReleaseVersionMediaCategory | ''>('')
  const [defaultCaption, setDefaultCaption] = useState('')
  const [isPreviewCandidate, setIsPreviewCandidate] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
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
  const canShowPreviewToggle =
    selectedCategory !== '' && CATEGORY_ALLOWS_PREVIEW[selectedCategory]
  const canChooseFiles = canUploadMedia && selectedCategory !== '' && !isBusy
  const canUpload = canUploadMedia && selectedCategory !== '' && selectedFiles.length > 0 && !isBusy
  const uploadSummaryVisible =
    media.uploadItems.length > 0 && media.uploadItems.every((item) => isTerminalStatus(item.status))
  const successCount = media.uploadItems.filter((item) => item.status === 'ready').length
  const selectedItem =
    persistedItems.find((item) => item.id === selectedItemId) ?? null

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
    // D-06-Guard: kein Upload ohne aufgelösten Owner-Kontext
    if (!ownerCtx?.ownerResolved) {
      setUploadError('Upload nicht möglich: Kein gültiger Owner-Kontext.')
      return
    }

    if (!selectedCategory || selectedFiles.length === 0) {
      return
    }

    setUploadError(null)
    await media.startUpload(
      selectedCategory,
      selectedFiles,
      defaultCaption,
      canShowPreviewToggle ? isPreviewCandidate : false,
      ownerCtx.visibilityCode,
      ownerCtx.reviewStatusCode,
    )
    setSelectedFiles([])
  }

  return (
    <section className={styles.section}>
      <div className={styles.uploadCard}>
        <div className={styles.contextLine}>
          <span>Fansub: {fansubGroupName}</span>
          <span>Release-Version: {releaseVersionLabel}</span>
        </div>
        <div>
          <h2 className={styles.headline}>Media / Assets verwalten</h2>
          <p className={styles.helper}>
            Wähle zuerst eine Kategorie. Erst danach können Dateien für diese konkrete
            Release-Version ausgewählt und hochgeladen werden.
          </p>
        </div>

        {/* D-07: MediaOwnershipContext — Surface 4, Prozessmedien */}
        <MediaOwnershipContext
          ownerType="release_version"
          ownerID={versionId}
          ownerLabel={`Version ${versionId}`}
          categoryMode="dropdown"
          categoryOptions={[...CATEGORY_OPTIONS]}
          statusPolicy="in_review"
          disabled={isBusy}
          onContextChange={(ctx) => {
            setOwnerCtx(ctx)
            // Kategorie-Dropdown aus MediaOwnershipContext übernehmen (D-08)
            if (ctx.categoryValue) {
              setSelectedCategory(ctx.categoryValue as ReleaseVersionMediaCategory)
            }
          }}
        />

        {media.error ? <div className={styles.errorBox}>API Fehler: {media.error}</div> : null}
        {uploadError ? <div className={styles.errorBox}>{uploadError}</div> : null}
        {media.capabilitiesError && !canViewMedia ? (
          <div className={styles.errorBox}>Diese Release-Version darfst du im Media-Bereich nicht bearbeiten.</div>
        ) : null}

        <div className={styles.controls}>
          {selectedCategory ? (
            <label className={styles.field}>
              <span>Standard-Beschreibung</span>
              <input
                className={styles.input}
                value={defaultCaption}
                onChange={(event) => setDefaultCaption(event.target.value)}
                placeholder="Optional für alle Dateien dieses Uploads"
              />
            </label>
          ) : null}

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
              <p className={styles.helper}>
                Alle Dateien dieses Upload-Vorgangs landen in derselben Kategorie.
              </p>
              <p className={styles.dropZoneCallout}>
                Dateien hier hineinziehen oder klicken, um Bilder auszuwählen.
              </p>
            </div>
            <label className={styles.field}>
              <span>Dateien</span>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                multiple
                accept="image/*"
                disabled={!canChooseFiles}
                onChange={onFileChange}
                onClick={(event) => event.stopPropagation()}
              />
            </label>
            {selectedFilePreviews.length > 0 ? (
              <div className={styles.localPreviewGrid}>
                {selectedFilePreviews.map(({ file, previewURL }) => (
                  <figure key={`${file.name}-${file.size}-${file.lastModified}`} className={styles.localPreviewCard}>
                    {previewURL ? (
                      <img
                        className={styles.localPreviewImage}
                        src={previewURL}
                        alt={`Vorschau ${file.name}`}
                      />
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
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={() => void handleUploadClick()}
              disabled={!canUpload || !ownerCtx?.ownerResolved}
            >
              Upload starten
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => {
                setSelectedFiles([])
                media.clearUploadQueue()
              }}
              disabled={isBusy && media.uploadItems.length > 0}
            >
              Auswahl leeren
            </button>
          </div>
          {!canUploadMedia && canViewMedia ? (
            <p className={styles.helper}>Du darfst Medien dieser Release-Version ansehen, aber nicht hochladen.</p>
          ) : null}

          <p className={styles.savedCount}>Persistierte Medien: {persistedItems.length}</p>
        </div>
      </div>

      {queueItems.length > 0 ? (
        <div className={styles.queue}>
          {queueItems.map((item, index) => (
            <div key={fileKey(item.file)} className={styles.queueRow}>
              <div className={styles.queueMeta}>
                <span className={styles.filename}>{item.file.name}</span>
                <div className={styles.statusLine}>
                  <span className={`${styles.badge} ${statusClassName(item)}`}>
                    {statusLabel(item)}
                  </span>
                </div>
                {item.errorMessage ? (
                  <p className={styles.errorText}>{item.errorMessage}</p>
                ) : null}
              </div>
              {item.status === 'failed' ? (
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => void media.retryUpload(index)}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </div>
          ))}

          {uploadSummaryVisible ? (
            <p className={styles.summaryRow}>
              {successCount} von {media.uploadItems.length} erfolgreich hochgeladen.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.galleryLayout}>
        {media.reorderError ? (
          <div className={styles.errorBox}>Reorder Fehler: {media.reorderError}</div>
        ) : null}
        <ReleaseVersionMediaGallery
          items={persistedItems}
          selectedItemId={selectedItemId}
          onSelectItem={(item) => setSelectedItemId(item.id)}
          versionId={versionId}
          onReorder={media.reorderItems}
          canReorder={canUpdateMedia}
        />
        {selectedItem ? (
          <ReleaseVersionMediaDetailPanel
            item={selectedItem}
            versionId={versionId}
            onClose={() => setSelectedItemId(null)}
            onPatch={media.patchItem}
            onDelete={media.deleteItem}
            canEdit={canUpdateMedia}
            canDelete={canDeleteMedia}
          />
        ) : (
          <div className={styles.galleryPlaceholder}>
            <p className={styles.helper}>
              Wähle eine Karte aus der Galerie, um Beschreibung,
              Preview-Status oder Delete für dieses Medium zu bearbeiten.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
