'use client'

import { useEffect, useId, useMemo } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'

import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { FormField } from './FormField'
import { Heading } from './Heading'
import { Input } from './Input'
import { MediaFrame } from './MediaFrame'
import { ProgressBar } from './ProgressBar'
import { ResponsiveImage } from './ResponsiveImage'
import { Text } from './Text'
import { Textarea } from './Textarea'
import { classNames } from './classNames'
import styles from './UploadFileRow.module.css'

export type UploadFileRowStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

export interface UploadFileRowProps {
  /** For the local preview thumbnail. */
  file: File
  title?: string
  caption?: string
  /** Required unless `showMetadataFields={false}`. */
  onChange?: (field: 'title' | 'caption', value: string) => void
  /** `false` hides Titel/Beschreibung entirely (single-slot ways with no such backend column). */
  showMetadataFields?: boolean
  status: UploadFileRowStatus
  /** Only rendered (als Fortschrittsbalken) während `status === 'uploading'` oder `'processing'`. */
  progress?: number | null
  errorMessage?: string | null
  /** Only rendered (variant="subtle" + RefreshCw) when `status === 'failed'`. */
  onRetry?: () => void
  /** "Aus Auswahl entfernen" — no ConfirmDialog. */
  onRemove?: () => void
  density?: 'roomy' | 'compact'
}

export function statusBadgeVariant(status: UploadFileRowStatus): 'muted' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'uploading':
    case 'processing':
      return 'warning'
    case 'ready':
      return 'success'
    case 'failed':
      return 'danger'
    default:
      return 'muted'
  }
}

export function statusLabel(status: UploadFileRowStatus): string {
  switch (status) {
    case 'uploading':
      return 'Lädt hoch …'
    case 'processing':
      return 'Wird verarbeitet …'
    case 'ready':
      return 'Hochgeladen'
    case 'failed':
      return 'Fehlgeschlagen'
    default:
      return 'Wartet'
  }
}

function FilePreview({ file, density }: { file: File; density: 'roomy' | 'compact' }) {
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  return (
    <MediaFrame aspectRatio={1}>
      <ResponsiveImage src={objectUrl} alt={`Vorschau ${file.name}`} fill sizes={density === 'compact' ? '64px' : '128px'} />
    </MediaFrame>
  )
}

export function UploadFileRow({
  file,
  title = '',
  caption = '',
  onChange,
  showMetadataFields = true,
  status,
  progress = null,
  errorMessage = null,
  onRetry,
  onRemove,
  density = 'roomy',
}: UploadFileRowProps) {
  const id = useId()
  const nameId = `${id}-name`
  const titleFieldId = `${id}-title`
  const captionFieldId = `${id}-caption`

  return (
    <Card variant="compact" className={styles.row} aria-labelledby={nameId}>
      <div className={classNames(styles.previewWrap, density === 'compact' && styles.previewWrapCompact)}>
        <FilePreview file={file} density={density} />
      </div>
      <div className={styles.fields}>
        <Heading level={4} id={nameId} className={styles.filename}>{file.name}</Heading>

        {showMetadataFields ? (
          <>
            <FormField label="Titel" htmlFor={titleFieldId}>
              <Input
                id={titleFieldId}
                value={title}
                maxLength={200}
                placeholder="Optionaler Bildtitel"
                onChange={(event) => onChange?.('title', event.target.value)}
              />
            </FormField>
            <FormField label="Beschreibung" htmlFor={captionFieldId}>
              <Textarea
                id={captionFieldId}
                value={caption}
                rows={3}
                placeholder="Beschreibung zu diesem Bild"
                onChange={(event) => onChange?.('caption', event.target.value)}
              />
            </FormField>
          </>
        ) : null}

        <div className={styles.statusRow} aria-live="polite">
          <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
          {status === 'uploading' ? (
            <ProgressBar value={progress ?? 0} label={`Übertragung: ${file.name}`} size="sm" className={styles.progress} />
          ) : status === 'processing' ? (
            <ProgressBar indeterminate label={`Wird verarbeitet: ${file.name}`} size="sm" className={styles.progress} />
          ) : null}
        </div>
        {errorMessage ? <Text variant="body" role="alert" className={styles.errorText}>{errorMessage}</Text> : null}

        <div className={styles.actions}>
          {status === 'failed' && onRetry ? (
            <Button variant="subtle" size="sm" leftIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={onRetry}>
              Erneut versuchen
            </Button>
          ) : null}
          {onRemove ? (
            <Button variant="subtle" size="sm" leftIcon={<Trash2 size={14} aria-hidden="true" />} onClick={onRemove}>
              Aus Auswahl entfernen
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
