'use client'

import Image from 'next/image'
import type { MutableRefObject } from 'react'
import { ImagePlus, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'

import { Button, UploadDropzone } from '@/components/ui'

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
  /** Ist disabled? */
  disabled?: boolean
  /** Ref auf das versteckte File-Input-Element (von den Aktions-Buttons verwendet) */
  inputRef: MutableRefObject<HTMLInputElement | null>
  /** Accept-Mime-Types für das File-Input */
  acceptedMime: string
  /** Wird vom versteckten Fallback-<input> (Aktions-Button) aufgerufen -- echtes ChangeEvent. */
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Wird von UploadDropzone (Klick oder Drag&Drop) mit den rohen Files aufgerufen -- kein
   * ChangeEvent, da UploadDropzone keinen echten `currentTarget` liefert. */
  onFilesSelected: (files: File[]) => void
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
  disabled,
  inputRef,
  acceptedMime,
  onFileInputChange,
  onFilesSelected,
  onEditClick,
  onRemoveClick,
}: MediaUploadCoreProps) {
  const isLogo = type === 'logo'
  const hasValue = Boolean(value?.publicURL?.trim())
  const title = isLogo ? 'Logo' : 'Banner'
  const uploadActionLabel = hasValue ? 'Ersetzen' : 'Hochladen'
  const previewBoxClassName = [
    styles.dropzone,
    isLogo ? styles.dropzoneLogo : styles.dropzoneBanner,
    hasValue ? styles.dropzoneWithPreview : '',
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

      <div className={previewBoxClassName} aria-busy={busy}>
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
      </div>

      <UploadDropzone
        onFilesSelected={onFilesSelected}
        accept={acceptedMime}
        multiple={false}
        allowDrop={true}
        disabled={disabled || busy}
        density="compact"
        promptLabel="Bild hierher ziehen oder klicken zum Hochladen"
      />

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
