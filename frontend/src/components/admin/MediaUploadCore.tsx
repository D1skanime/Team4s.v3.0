'use client'

import Image from 'next/image'
import type { DragEvent, KeyboardEvent, MutableRefObject } from 'react'
import { ImagePlus, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui'

import type { EditableMediaValue } from './MediaUpload'
import styles from './MediaUpload.module.css'

export interface MediaUploadCoreProps {
  /** 'logo' oder 'banner' */
  type: 'logo' | 'banner'
  /** Aktuell gespeichertes Medium (für Preview) */
  value: EditableMediaValue | null
  /** Dateiname für Anzeige */
  /** Vorschau-URL (bereits mit Cache-Buster) */
  previewURL: string
  /** Formatierte Dateigröße */
  /** Logo-Fallback (Initialen + Farbe) */
  fallback: { initials: string; background: string; color: '#FFFFFF' | '#111111' }
  /** Läuft gerade eine Aktion? */
  busy: boolean
  /** Wird gerade bearbeitet (Cropper vorbereiten)? */
  preparingEdit: boolean
  /** Aktuelle Busy-Aktion */
  busyAction: 'upload' | 'delete' | null
  /** Upload-Fortschritt in Prozent */
  progress: number
  /** Fehlermeldung */
  error: string | null
  /** Warnmeldung */
  warning: string | null
  /** Dropzone im Drag-Zustand */
  dragging: boolean
  /** Ist disabled? */
  disabled?: boolean
  /** Ref auf das versteckte File-Input-Element */
  inputRef: MutableRefObject<HTMLInputElement | null>
  /** Accept-Mime-Types für das File-Input */
  acceptedMime: string
  /** Aria-Label für die Dropzone */
  dropzoneAriaLabel: string
  /** Wird aufgerufen, wenn der User eine Datei auswählt */
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Wird aufgerufen, wenn ein Drag über der Dropzone beginnt */
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  /** Wird aufgerufen, wenn ein Drag-Enter über der Dropzone stattfindet */
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void
  /** Wird aufgerufen, wenn ein Drag die Dropzone verlässt */
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  /** Wird aufgerufen, wenn eine Datei in die Dropzone fallen gelassen wird */
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  /** Wird aufgerufen, wenn die Dropzone per Tastatur aktiviert wird */
  onDropzoneKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  /** Wird aufgerufen, wenn der User auf „Edit" klickt */
  onEditClick: () => void
  /** Wird aufgerufen, wenn der User löschen möchte */
  onRemoveClick: () => void
}

/**
 * Reiner Render-Kern von MediaUpload.
 * Enthält Dropzone, Preview, Fortschrittsbalken, Aktions-Buttons und Meldungen.
 * Alle Zustands- und Upload-Logik verbleibt im Koordinator MediaUpload.tsx.
 */
export function MediaUploadCore({
  type,
  value,
  previewURL,
  fallback,
  busy,
  preparingEdit,
  busyAction,
  progress,
  error,
  warning,
  dragging,
  disabled,
  inputRef,
  acceptedMime,
  dropzoneAriaLabel,
  onFileInputChange,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDropzoneKeyDown,
  onEditClick,
  onRemoveClick,
}: MediaUploadCoreProps) {
  const isLogo = type === 'logo'
  const hasValue = Boolean(value?.publicURL?.trim())
  const title = isLogo ? 'Logo' : 'Banner'
  const uploadActionLabel = hasValue ? 'Ersetzen' : 'Hochladen'
  const dropzoneClassName = [
    styles.dropzone,
    isLogo ? styles.dropzoneLogo : styles.dropzoneBanner,
    hasValue ? styles.dropzoneWithPreview : '',
    dragging ? styles.dropzoneDrag : '',
    error ? styles.dropzoneError : '',
    disabled ? styles.dropzoneDisabled : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={styles.headerRow}>
        <h3>{title}</h3>
        {busy ? (
          <span className={styles.statusPill} aria-live="polite">
            <Loader2 size={14} className={styles.spinner} />
            {preparingEdit ? 'Bearbeiten...' : busyAction === 'upload' ? 'Upload...' : 'Löschen...'}
          </span>
        ) : null}
      </div>

      <div
        className={dropzoneClassName}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={dropzoneAriaLabel}
        aria-busy={busy}
        onClick={() => (!disabled && !busy ? inputRef.current?.click() : undefined)}
        onKeyDown={onDropzoneKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-disabled={disabled || busy}
      >
        {hasValue ? (
          <>
            {isLogo ? (
              <div className={styles.previewRound}>
                <Image
                  src={previewURL}
                  alt="Logo Vorschau"
                  className={styles.previewImageRound}
                  width={116}
                  height={116}
                  unoptimized
                />
              </div>
            ) : (
              <div className={styles.previewWide}>
                <Image
                  src={previewURL}
                  alt="Banner Vorschau"
                  className={styles.previewImageWide}
                  width={520}
                  height={130}
                  unoptimized
                />
              </div>
            )}
          </>
        ) : isLogo ? (
          <div className={styles.previewRoundFallback} style={{ backgroundColor: fallback.background, color: fallback.color }}>
            {fallback.initials}
          </div>
        ) : (
          <div className={styles.previewWideEmpty}>Kein Banner vorhanden</div>
        )}

        {!hasValue ? (
          <div className={styles.emptyState}>
            <ImagePlus size={20} />
            <span>Bild hierher ziehen oder klicken zum Hochladen</span>
          </div>
        ) : null}
      </div>

      {busyAction === 'upload' ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{progress}%</span>
        </div>
      ) : null}

      <div className={styles.actions}>
        {hasValue ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEditClick}
            disabled={disabled || busy}
            aria-label={`${title} bearbeiten`}
            leftIcon={<Pencil size={14} />}
          >
            Bearbeiten
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          aria-label={`${title} ${hasValue ? 'ersetzen' : 'hochladen'}`}
          leftIcon={hasValue ? <RefreshCw size={14} /> : <ImagePlus size={14} />}
        >
          {uploadActionLabel}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onRemoveClick}
          disabled={disabled || busy || !hasValue}
          aria-label={`${title} löschen`}
          leftIcon={<Trash2 size={14} />}
        >
          Löschen
        </Button>
      </div>

      {warning ? <p className={styles.warning} aria-live="polite">{warning}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={acceptedMime}
        aria-label={`${title} Datei auswählen`}
        onChange={onFileInputChange}
      />
    </>
  )
}
