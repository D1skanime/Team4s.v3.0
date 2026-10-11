'use client'

import { UploadCloud } from 'lucide-react'

import {
  Button,
  Card,
  FormField,
  SectionHeader,
  Select,
  UploadDropzone,
  UploadFileRow,
} from '@/components/ui'
import type { FansubGroupMediaCategory, FansubGroupMediaUploadResult } from '@/lib/api'
import { patchFansubMediaReview, uploadFansubGroupMedia } from '@/lib/api'
import { useUploadQueue, type UploadAdapter } from '@/hooks/useUploadQueue'
import { fileKey } from '@/hooks/useUploadQueue.helpers'

import styles from './GroupMediaReviewSection.module.css'

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

interface GroupMediaReviewUploadPanelProps {
  fansubId: number
  uploadCategory: FansubGroupMediaCategory
  setUploadCategory: (value: FansubGroupMediaCategory) => void
  onUploadComplete: () => void
}

function readableMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

export function GroupMediaReviewUploadPanel({
  fansubId,
  uploadCategory,
  setUploadCategory,
  onUploadComplete,
}: GroupMediaReviewUploadPanelProps) {
  const { items, selectFiles, removeDraft, updateDraft, startUpload, retryUpload, error } =
    useUploadQueue<FansubGroupMediaUploadResult>()

  const isBusy = items.some((item) => item.status === 'uploading' || item.status === 'processing')
  const canUpload = items.length > 0 && !isBusy

  // Weg-2-Adapter: review_status bleibt unverändert fest auf 'in_review' verdrahtet
  // (Pitfall 5, T-180-12) — der geteilte Hook/die Primitives sehen diesen Wert nie.
  const adapter: UploadAdapter<FansubGroupMediaUploadResult> = {
    uploadFiles: (files, onProgress) =>
      uploadFansubGroupMedia({
        fansubID: fansubId,
        files,
        category: uploadCategory,
        visibilityCode: 'private',
        reviewStatusCode: 'in_review',
        onProgress,
      }).then((response) => response.results),
    readyResultId: (result) => result.fansub_group_media_id ?? null,
    isReady: (result) => result.status === 'ready' && typeof result.fansub_group_media_id === 'number',
    readErrorFromResult: (result) => result.message || result.error_code || 'Upload fehlgeschlagen.',
    // FansubMediaReviewPatch hat kein `caption`-Feld — die Übersetzung auf `description`
    // ist bewusst Aufgabe dieses Adapters, nicht des geteilten Hooks (T-180-13).
    patchMetadata: (resultId, patch) =>
      patchFansubMediaReview(fansubId, resultId, {
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.caption ? { description: patch.caption } : {}),
      }).then(
        () => ({ ok: true as const }),
        (patchError) => ({ ok: false as const, message: readableMessage(patchError, 'Metadaten konnten nach dem Upload nicht gesetzt werden.') }),
      ),
  }

  async function handleUploadClick() {
    if (!canUpload) return
    const result = await startUpload(adapter)
    if (result.allSucceeded) {
      onUploadComplete()
    }
  }

  async function handleRetryClick(index: number) {
    await retryUpload(adapter, index)
  }

  return (
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
          <UploadDropzone
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            allowDrop
            density="roomy"
            disabled={isBusy}
            promptLabel="Bilder auswählen oder hier ablegen"
            dropHintLabel="Mehrere Dateien gleichzeitig möglich"
            onFilesSelected={selectFiles}
          />
        </FormField>
      </div>

      {items.length > 0 ? (
        <div className={styles.uploadQueue}>
          {items.map((item, index) => {
            const key = fileKey(item.file)
            return (
              <UploadFileRow
                key={key}
                file={item.file}
                title={item.title}
                caption={item.caption}
                showMetadataFields
                status={item.status}
                progress={item.progress}
                errorMessage={item.errorMessage}
                onChange={(field, value) => updateDraft(key, field, value)}
                onRetry={item.status === 'failed' ? () => void handleRetryClick(index) : undefined}
                onRemove={!isBusy ? () => removeDraft(key) : undefined}
                density="roomy"
              />
            )
          })}
        </div>
      ) : null}

      {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}

      <div className={styles.cardFooterActions}>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UploadCloud size={16} />}
          loading={isBusy}
          disabled={!canUpload}
          onClick={() => void handleUploadClick()}
        >
          Bilder hochladen
        </Button>
      </div>
    </Card>
  )
}
