import Image from 'next/image'
import { useEffect, useId, useRef } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'

import { Button, FormField, Input, Textarea } from '@/components/ui'
import type { UploadFileDraft, UploadQueueItem } from './useReleaseVersionMedia'
import { buildLocalPreviewURL, fileKey, statusClassName, statusLabel } from './ReleaseVersionMediaSection.helpers'
import styles from './ReleaseVersionMediaSection.module.css'

interface UploadQueueProps {
  drafts: UploadFileDraft[]
  items: UploadQueueItem[]
  previewFileKey: string | null
  allowsPreview: boolean
  locked: boolean
  busy: boolean
  onChange: (key: string, field: 'title' | 'caption', value: string) => void
  onRemove: (key: string) => void
  onPreviewChange: (key: string | null) => void
  onRetry: (index: number) => void
}

function FilePreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const next = buildLocalPreviewURL(file)
    if (next && image.current) image.current.src = next
    return () => {
      if (next) URL.revokeObjectURL(next)
    }
  }, [file])
  return (
    <Image ref={image} src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt={`Vorschau ${file.name}`} width={160} height={160} unoptimized className={styles.localPreviewImage} />
  )
}

export function ReleaseVersionMediaUploadQueue({
  drafts, items, previewFileKey, allowsPreview, locked, busy, onChange, onRemove, onPreviewChange, onRetry,
}: UploadQueueProps) {
  const id = useId()
  const queued = new Map(items.map((item, index) => [fileKey(item.file), { item, index }]))
  const rows = drafts.length > 0 ? drafts : items.map((item) => ({ file: item.file, title: item.title ?? '', caption: item.caption ?? '' }))
  if (rows.length === 0) return null

  return (
    <div className={styles.uploadQueueContainer}>
      {allowsPreview ? (
        <label className={styles.checkboxRow}>
          <Input className={styles.previewRadio} type="radio" name={`${id}-preview`} checked={previewFileKey === null} disabled={locked}
            onChange={() => onPreviewChange(null)} />
          <span>Keine neue Vorschau</span>
        </label>
      ) : null}
      {allowsPreview ? <p className={styles.helper}>Wähle höchstens ein Bild. Ohne neue Auswahl bleibt die bisherige Vorschau erhalten.</p> : null}
      <div className={styles.queue}>
        {rows.map((draft, index) => {
          const key = fileKey(draft.file)
          const progress = queued.get(key)
          const nameID = `${id}-file-${index}`
          return (
            <section key={key} className={styles.uploadFileRow} aria-labelledby={nameID}>
              <div className={styles.uploadFilePreview}><FilePreview file={draft.file} /></div>
              <div className={styles.uploadFileFields}>
                <p id={nameID} className={styles.filename}>{draft.file.name}</p>
                <FormField label="Titel" htmlFor={`${nameID}-title`}>
                  <Input id={`${nameID}-title`} value={draft.title} maxLength={200} placeholder="Optionaler Bildtitel"
                    disabled={locked} onChange={(event) => onChange(key, 'title', event.target.value)} />
                </FormField>
                <FormField label="Beschreibung" htmlFor={`${nameID}-caption`}>
                  <Textarea id={`${nameID}-caption`} value={draft.caption} rows={3} placeholder="Beschreibung zu diesem Bild"
                    disabled={locked} onChange={(event) => onChange(key, 'caption', event.target.value)} />
                </FormField>
                <div className={styles.uploadFileActions}>
                  {allowsPreview ? (
                    <label className={styles.checkboxRow}>
                      <Input className={styles.previewRadio} type="radio" name={`${id}-preview`} checked={previewFileKey === key} disabled={locked}
                        onChange={() => onPreviewChange(key)} />
                      <span>Als Vorschau verwenden</span>
                    </label>
                  ) : null}
                  {!locked ? (
                    <Button variant="subtle" size="sm" leftIcon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => onRemove(key)}>Aus Auswahl entfernen</Button>
                  ) : null}
                </div>
                {progress ? (
                  <div className={styles.uploadFileStatus} aria-live="polite">
                    <span className={`${styles.badge} ${statusClassName(progress.item)}`}>{statusLabel(progress.item)}</span>
                    {progress.item.status === 'uploading' ? (
                      <progress max={100} value={progress.item.progress} aria-label={`Übertragung: ${draft.file.name}`} />
                    ) : null}
                    {progress.item.errorMessage ? <p className={styles.errorText}>{progress.item.errorMessage}</p> : null}
                    {progress.item.status === 'failed' ? (
                      <Button variant="subtle" size="sm" disabled={busy} leftIcon={<RefreshCw size={14} aria-hidden="true" />}
                        onClick={() => onRetry(progress.index)}>Erneut versuchen</Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
