'use client'

import { useRef, useState } from 'react'

import { ApiError, patchReleaseVersionMediaItem, uploadReleaseVersionMedia } from '@/lib/api'
import { Button, Drawer, Input, UploadDropzone, UploadFileRow } from '@/components/ui'
import { useUploadQueue, UploadAdapter } from '@/hooks/useUploadQueue'
import { fileKey } from '@/hooks/useUploadQueue.helpers'
import { ReleaseVersionMediaCategory, ReleaseVersionMediaUploadResult } from '@/types/releaseVersionMedia'
import { CATEGORY_OPTIONS, isTerminalStatus } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaUploadDrawerProps {
  open: boolean
  onClose: () => void
  versionId: number
  uploadCategory: ReleaseVersionMediaCategory
  canChooseFiles: boolean
  canShowPreviewToggle: boolean
  onUploadComplete: () => void
}

function categoryLabel(category: ReleaseVersionMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function readableMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function ReleaseVersionMediaUploadDrawer({
  open,
  onClose,
  versionId,
  uploadCategory,
  canChooseFiles,
  canShowPreviewToggle,
  onUploadComplete,
}: ReleaseVersionMediaUploadDrawerProps) {
  const { items, selectFiles, removeDraft, updateDraft, startUpload, retryUpload, clearQueue, error } =
    useUploadQueue<ReleaseVersionMediaUploadResult>()
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null)
  const [previewPatchError, setPreviewPatchError] = useState<string | null>(null)

  // Weg-1-spezifischer Zustand, den der generische useUploadQueue-Hook bewusst nicht kennt
  // (Pitfall 5 / T-180-10): letzte bekannte source_revision pro resultId, über Upload- und
  // Patch-Antworten hinweg, damit der verlorene-Update-Schutz aus Phase 144 erhalten bleibt.
  const sourceRevisionRef = useRef<Map<number, number>>(new Map())

  const localUploadStarted = items.some((item) => item.status !== 'idle')
  const isBusy = items.some((item) => item.status === 'uploading' || item.status === 'processing')
  const canUpload = canChooseFiles && items.length > 0 && !localUploadStarted
  const uploadSummaryVisible = items.length > 0 && items.every((item) => isTerminalStatus(item.status))
  const successCount = items.filter((item) => item.status === 'ready').length

  const adapter: UploadAdapter<ReleaseVersionMediaUploadResult> = {
    uploadFiles: (files, onProgress) =>
      uploadReleaseVersionMedia({
        versionId,
        category: uploadCategory,
        files,
        onProgress: (_fileIndex, percent) => onProgress(percent),
      }).then((response) => {
        for (const result of response.results) {
          if (result.release_version_media_id != null && result.source_revision != null) {
            sourceRevisionRef.current.set(result.release_version_media_id, result.source_revision)
          }
        }
        return response.results
      }),
    readyResultId: (result) => result.release_version_media_id ?? null,
    isReady: (result) => result.status === 'ready' && typeof result.release_version_media_id === 'number',
    readErrorFromResult: (result) => result.error_code || 'Upload fehlgeschlagen.',
    patchMetadata: (resultId, patch) => {
      const sourceRevision = sourceRevisionRef.current.get(resultId)
      return patchReleaseVersionMediaItem(versionId, resultId, {
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.caption ? { caption: patch.caption } : {}),
        ...(sourceRevision != null ? { source_revision: sourceRevision } : {}),
      }).then(
        (updated) => {
          if (updated.source_revision != null) sourceRevisionRef.current.set(resultId, updated.source_revision)
          return { ok: true as const }
        },
        (patchError) => ({ ok: false as const, message: readableMessage(patchError, 'Metadaten konnten nach dem Upload nicht gesetzt werden.') }),
      )
    },
  }

  // Die Vorschau-Auswahl ist Weg-1-spezifisch (keine Spalte, die Weg 2 kennt) und lebt deshalb
  // bewusst außerhalb von useUploadQueue: ein eigener, bestätigender PATCH-Aufruf NACH dem
  // generischen Upload/Metadaten-Lauf, damit das Vorschaubild auch dann gesetzt wird, wenn die
  // Datei weder Titel noch Beschreibung hat (patchMetadata würde in diesem Fall nie aufgerufen).
  async function applyPreviewCandidateIfNeeded(key: string, outcome: { status: string; resultId: number | null } | undefined) {
    if (!canShowPreviewToggle || previewFileKey !== key) return
    if (!outcome || outcome.status !== 'ready' || outcome.resultId == null) return
    try {
      const sourceRevision = sourceRevisionRef.current.get(outcome.resultId)
      const updated = await patchReleaseVersionMediaItem(versionId, outcome.resultId, {
        is_preview_candidate: true,
        ...(sourceRevision != null ? { source_revision: sourceRevision } : {}),
      })
      if (updated.source_revision != null) sourceRevisionRef.current.set(outcome.resultId, updated.source_revision)
    } catch (patchError) {
      setPreviewPatchError(readableMessage(patchError, 'Vorschaubild konnte nicht gespeichert werden.'))
    }
  }

  async function handleUploadClick() {
    if (!canUpload) return
    setPreviewPatchError(null)
    const queuedAtClick = items
    try {
      const result = await startUpload(adapter)
      const previewIndex = previewFileKey ? queuedAtClick.findIndex((entry) => fileKey(entry.file) === previewFileKey) : -1
      if (previewIndex >= 0) {
        await applyPreviewCandidateIfNeeded(previewFileKey as string, result.items[previewIndex])
      }
      if (result.allSucceeded) {
        clearQueue()
        setPreviewFileKey(null)
        onUploadComplete()
        onClose()
      }
    } catch {
      // Hard-Fehler ist bereits in useUploadQueue's `error`-State gesetzt und wird unten gerendert.
    }
  }

  async function handleRetryClick(index: number) {
    const queuedAtClick = items
    const key = fileKey(queuedAtClick[index].file)
    try {
      const result = await retryUpload(adapter, index)
      await applyPreviewCandidateIfNeeded(key, result.items[0])
    } catch {
      // Fehler steckt bereits in useUploadQueue's `error`-State.
    }
  }

  function handleRemoveDraft(key: string) {
    removeDraft(key)
    setPreviewFileKey((current) => (current === key ? null : current))
  }

  function handleClose() {
    if (isBusy) return
    clearQueue()
    setPreviewFileKey(null)
    setPreviewPatchError(null)
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Medien hochladen"
      description={`Kategorie: ${categoryLabel(uploadCategory)}`}
      variant="responsiveSheet"
      footer={
        <>
          <Button variant="ghost" className={styles.ghostAction} onClick={handleClose} disabled={isBusy}>
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
        {error || previewPatchError ? <div className={styles.errorBox}>{error ?? previewPatchError}</div> : null}

        <UploadDropzone
          accept="image/*"
          multiple
          allowDrop
          density="roomy"
          disabled={!canChooseFiles || localUploadStarted}
          promptLabel="Dateien hier hineinziehen oder antippen."
          dropHintLabel={`Alle Dateien landen in „${categoryLabel(uploadCategory)}“.`}
          onFilesSelected={selectFiles}
        />

        <div className={styles.uploadQueueContainer}>
          {canShowPreviewToggle && items.length > 0 ? (
            <label className={styles.checkboxRow}>
              <Input
                className={styles.previewRadio}
                type="radio"
                name="release-version-media-preview"
                checked={previewFileKey === null}
                disabled={localUploadStarted}
                onChange={() => setPreviewFileKey(null)}
              />
              <span>Keine neue Vorschau</span>
            </label>
          ) : null}
          {canShowPreviewToggle && items.length > 0 ? (
            <p className={styles.helper}>Wähle höchstens ein Bild. Ohne neue Auswahl bleibt die bisherige Vorschau erhalten.</p>
          ) : null}
          <div className={styles.queue}>
            {items.map((item, index) => {
              const key = fileKey(item.file)
              return (
                <div key={key} className={styles.uploadFileRow} data-testid={`upload-row-${key}`}>
                  {canShowPreviewToggle ? (
                    <label className={styles.checkboxRow}>
                      <Input
                        className={styles.previewRadio}
                        type="radio"
                        name="release-version-media-preview"
                        checked={previewFileKey === key}
                        disabled={localUploadStarted}
                        onChange={() => setPreviewFileKey(key)}
                      />
                      <span>Als Vorschau verwenden</span>
                    </label>
                  ) : null}
                  <UploadFileRow
                    file={item.file}
                    title={item.title}
                    caption={item.caption}
                    showMetadataFields
                    status={item.status}
                    progress={item.progress}
                    errorMessage={item.errorMessage}
                    onChange={(field, value) => updateDraft(key, field, value)}
                    onRetry={item.status === 'failed' ? () => void handleRetryClick(index) : undefined}
                    onRemove={!localUploadStarted ? () => handleRemoveDraft(key) : undefined}
                    density="roomy"
                  />
                </div>
              )
            })}
          </div>
        </div>
        {uploadSummaryVisible ? (
          <p className={styles.summaryRow}>{successCount} von {items.length} erfolgreich hochgeladen.</p>
        ) : null}
      </div>
    </Drawer>
  )
}
