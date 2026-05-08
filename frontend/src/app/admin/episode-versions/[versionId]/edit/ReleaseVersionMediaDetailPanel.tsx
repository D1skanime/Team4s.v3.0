'use client'

import { useEffect, useState } from 'react'

import {
  CATEGORY_ALLOWS_PREVIEW,
  CATEGORY_LABELS,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
} from '@/types/releaseVersionMedia'

import styles from './ReleaseVersionMediaSection.module.css'

interface ReleaseVersionMediaDetailPanelProps {
  item: ReleaseVersionMediaItem
  versionId: number
  onClose: () => void
  onPatch: (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => Promise<void>
  onDelete: (mediaId: number) => Promise<void>
}

function readError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function ReleaseVersionMediaDetailPanel({
  item,
  versionId: _versionId,
  onClose,
  onPatch,
  onDelete,
}: ReleaseVersionMediaDetailPanelProps) {
  const [caption, setCaption] = useState(item.caption ?? '')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setCaption(item.caption ?? '')
    setLocalError(null)
  }, [item])

  async function saveCaption() {
    setLocalError(null)
    setIsSaving(true)
    try {
      await onPatch(item.id, { caption: caption.trim() || null })
    } catch (error) {
      setLocalError(readError(error, 'Beschreibung konnte nicht gespeichert werden.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function togglePreview(nextValue: boolean) {
    setLocalError(null)
    setIsSaving(true)
    try {
      await onPatch(item.id, { is_preview_candidate: nextValue })
    } catch (error) {
      setLocalError(readError(error, 'Preview-Status konnte nicht gespeichert werden.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Dieses Medium wirklich entfernen?')) {
      return
    }

    setLocalError(null)
    setIsDeleting(true)
    try {
      await onDelete(item.id)
      onClose()
    } catch (error) {
      setLocalError(readError(error, 'Medium konnte nicht geloescht werden.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h3 className={styles.detailTitle}>Medium bearbeiten</h3>
          <p className={styles.helper}>Kategorie: {CATEGORY_LABELS[item.category]}</p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={onClose}>
          Schliessen
        </button>
      </div>

      <div className={styles.detailPreview}>
        {item.original_url || item.thumbnail_url ? (
          <img
            className={styles.detailPreviewImage}
            src={item.original_url || item.thumbnail_url || ''}
            alt={item.caption || `Asset ${item.id}`}
          />
        ) : (
          <span className={styles.placeholder}>Kein Bild verfuegbar</span>
        )}
      </div>

      <label className={styles.field}>
        <span>Beschreibung</span>
        <input
          className={styles.input}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </label>
      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={() => void saveCaption()}
          disabled={isSaving || isDeleting}
        >
          Beschreibung speichern
        </button>
      </div>

      {CATEGORY_ALLOWS_PREVIEW[item.category] ? (
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={item.is_preview_candidate}
            disabled={isSaving || isDeleting}
            onChange={(event) => void togglePreview(event.target.checked)}
          />
          <span>Als Preview aktiv</span>
        </label>
      ) : null}

      {localError ? <div className={styles.errorBox}>{localError}</div> : null}

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => void handleDelete()}
          disabled={isSaving || isDeleting}
        >
          {isDeleting ? 'Loeschen...' : 'Medium loeschen'}
        </button>
      </div>
    </aside>
  )
}
