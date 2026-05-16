'use client'

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import {
  CATEGORY_ALLOWS_PREVIEW,
  CATEGORY_LABELS,
  RELEASE_VERSION_MEDIA_CATEGORIES,
  ReleaseVersionMediaCategory,
} from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaDetailPanel } from './ReleaseVersionMediaDetailPanel'
import { ReleaseVersionMediaGallery } from './ReleaseVersionMediaGallery'
import { UploadQueueItem, useReleaseVersionMedia, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'
import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaSectionProps {
  versionId: number
  fansubGroupName: string
  releaseVersionLabel: string
  mediaState?: UseReleaseVersionMediaResult
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function buildLocalPreviewURL(file: File): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null
  }

  return URL.createObjectURL(file)
}

function statusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading':
      return `hochladen... ${item.progress}%`
    case 'processing':
      return 'verarbeiten...'
    case 'ready':
      return 'Fertig'
    case 'failed':
      return 'Fehler'
    default:
      return 'idle'
  }
}

function statusClassName(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading':
      return styles.uploading
    case 'processing':
      return styles.processing
    case 'ready':
      return styles.ready
    case 'failed':
      return styles.failed
    default:
      return styles.idle
  }
}

function isTerminalStatus(status: UploadQueueItem['status']): boolean {
  return status === 'ready' || status === 'failed'
}

export function ReleaseVersionMediaSection({
  versionId,
  fansubGroupName,
  releaseVersionLabel,
  mediaState,
}: ReleaseVersionMediaSectionProps) {
  const media = mediaState ?? useReleaseVersionMedia(versionId)
  const persistedItems = Array.isArray(media.items) ? media.items : []
  const [selectedCategory, setSelectedCategory] = useState<ReleaseVersionMediaCategory | ''>('')
  const [defaultCaption, setDefaultCaption] = useState('')
  const [isPreviewCandidate, setIsPreviewCandidate] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
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
  const canShowPreviewToggle =
    selectedCategory !== '' && CATEGORY_ALLOWS_PREVIEW[selectedCategory]
  const canChooseFiles = selectedCategory !== '' && !isBusy
  const canUpload = selectedCategory !== '' && selectedFiles.length > 0 && !isBusy
  const uploadSummaryVisible =
    media.uploadItems.length > 0 && media.uploadItems.every((item) => isTerminalStatus(item.status))
  const successCount = media.uploadItems.filter((item) => item.status === 'ready').length
  const selectedItem =
    persistedItems.find((item) => item.id === selectedItemId) ?? null

  function handleCategoryChange(nextValue: string) {
    const nextCategory = nextValue as ReleaseVersionMediaCategory | ''
    setSelectedCategory(nextCategory)
    if (!nextCategory || !CATEGORY_ALLOWS_PREVIEW[nextCategory]) {
      setIsPreviewCandidate(false)
    }
    setSelectedFiles([])
    media.clearUploadQueue()
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
    if (!selectedCategory || selectedFiles.length === 0) {
      return
    }

    await media.startUpload(
      selectedCategory,
      selectedFiles,
      defaultCaption,
      canShowPreviewToggle ? isPreviewCandidate : false,
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

        {media.error ? <div className={styles.errorBox}>API Fehler: {media.error}</div> : null}

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Kategorie</span>
            <select
              className={styles.select}
              value={selectedCategory}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              <option value="">Kategorie wählen</option>
              {RELEASE_VERSION_MEDIA_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

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
              disabled={!canUpload}
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

          <p className={styles.savedCount}>Persistierte Medien: {persistedItems.length}</p>
        </div>
      </div>

      {queueItems.length > 0 ? (
        <div className={styles.queue}>
          {queueItems.map((item, index) => (
            <div key={`${item.file.name}-${index}`} className={styles.queueRow}>
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
        />
        {selectedItem ? (
          <ReleaseVersionMediaDetailPanel
            item={selectedItem}
            versionId={versionId}
            onClose={() => setSelectedItemId(null)}
            onPatch={media.patchItem}
            onDelete={media.deleteItem}
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
