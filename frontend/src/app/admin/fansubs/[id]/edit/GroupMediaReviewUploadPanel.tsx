import type { DragEvent, MutableRefObject } from 'react'
import { UploadCloud } from 'lucide-react'
import Image from 'next/image'

import { Button, Card, FormField, Input, SectionHeader, Select } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'
import type { FansubGroupMediaCategory } from '@/lib/api'

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
  fileInputRef: MutableRefObject<HTMLInputElement | null>
  uploadCategory: FansubGroupMediaCategory
  setUploadCategory: (value: FansubGroupMediaCategory) => void
  isUploadDragging: boolean
  setIsUploadDragging: (value: boolean) => void
  selectedFiles: File[]
  selectedFilePreviews: Array<{ file: File; url: string }>
  uploadProgress: number | null
  uploadError: string | null
  handleSelectedFiles: (files: File[]) => void
  handleUploadDrop: (event: DragEvent<HTMLDivElement>) => void
  handleUpload: () => void | Promise<void>
}

export function GroupMediaReviewUploadPanel({
  fileInputRef,
  uploadCategory,
  setUploadCategory,
  isUploadDragging,
  setIsUploadDragging,
  selectedFiles,
  selectedFilePreviews,
  uploadProgress,
  uploadError,
  handleSelectedFiles,
  handleUploadDrop,
  handleUpload,
}: GroupMediaReviewUploadPanelProps) {
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
          <div
            className={classNames(styles.dropZone, isUploadDragging && styles.dropZoneActive)}
            role="button"
            tabIndex={0}
            aria-label="Bilder auswählen oder hier ablegen"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsUploadDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsUploadDragging(false)
            }}
            onDrop={handleUploadDrop}
          >
            <Input
              id="group-media-file-input"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              className={styles.fileInput}
              onChange={(event) => handleSelectedFiles(Array.from(event.currentTarget.files ?? []))}
            />
            <div className={styles.dropZoneIcon} aria-hidden="true"><UploadCloud size={22} /></div>
            <div className={styles.dropZoneCopy}>
              <p className={styles.dropZoneTitle}>Bilder auswählen oder hier ablegen</p>
              <p className={styles.fileHint}>Mehrere Dateien gleichzeitig möglich</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<UploadCloud size={16} />}
              onClick={(event) => {
                event.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              Dateien auswählen
            </Button>
            <p className={styles.fileHint}>PNG, JPG, WebP oder GIF. Die Auswahl wird nach erfolgreichem Upload zurückgesetzt.</p>
          </div>
        </FormField>
      </div>

      {selectedFiles.length > 0 ? (
        <div className={styles.fileSelection} role="status">
          <div className={styles.fileSelectionHeader}>
            <strong>{selectedFiles.length} {selectedFiles.length === 1 ? 'Bild ausgewählt' : 'Bilder ausgewählt'}</strong>
          </div>
          <div className={styles.filePreviewGrid} aria-label="Bildvorschauen">
            {selectedFilePreviews.map(({ file, url }) => (
              <figure
                className={styles.filePreview}
                key={`${file.name}-${file.lastModified}-${file.size}`}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={`Vorschau: ${file.name}`}
                    fill
                    unoptimized
                    sizes="(max-width: 600px) 50vw, 140px"
                  />
                ) : null}
                <figcaption title={file.name}>{file.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
      {uploadProgress !== null ? <p className={styles.fileHint}>Upload: {Math.round(uploadProgress)}%</p> : null}
      {uploadError ? <p className={styles.inlineError} role="alert">{uploadError}</p> : null}

      <div className={styles.cardFooterActions}>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UploadCloud size={16} />}
          loading={uploadProgress !== null}
          disabled={selectedFiles.length === 0 || uploadProgress !== null}
          onClick={() => void handleUpload()}
        >
          Bilder hochladen
        </Button>
      </div>
    </Card>
  )
}
