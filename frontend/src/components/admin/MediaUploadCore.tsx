'use client'

import Image from 'next/image'
import { Crop, Loader2, Trash2 } from 'lucide-react'

import { Button, MediaSlot } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'

import type { EditableMediaValue } from './MediaUpload'
import { BANNER_CROP_OUTPUT_HEIGHT, BANNER_CROP_OUTPUT_WIDTH, LOGO_CROP_OUTPUT_SIZE } from './MediaUpload'
import styles from './MediaUpload.module.css'

export interface MediaUploadCoreProps {
  /** 'logo' oder 'banner' */
  type: 'logo' | 'banner'
  /** Aktuell gespeichertes Medium (für Preview) */
  value: EditableMediaValue | null
  /** Vorschau-URL (bereits mit Cache-Buster) */
  previewURL: string
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
  /** Accept-Mime-Types für das File-Input */
  acceptedMime: string
  /** Wird von der MediaSlot-Dropzone (Klick, Dateiauswahl-Button oder Drag&Drop) mit den rohen
   * Files aufgerufen. */
  onFilesSelected: (files: File[]) => void
  /** Öffnet den Zuschnitt für das VORHANDENE Bild erneut (Stift/Crop-Icon, eindeutig Zuschnitt --
   * Fansub-Logo/Banner hat keine Provider-Suche, daher keine Bedeutungs-Kollision). */
  onEditClick: () => void
  /** Wird aufgerufen, wenn der User löschen möchte */
  onRemoveClick: () => void
}

/**
 * Reiner Render-Kern von MediaUpload.
 * Enthält den Medien-Slot (Vorschau + Dropzone), Fortschrittsbalken und Meldungen.
 * Alle Zustands- und Upload-Logik verbleibt im Koordinator MediaUpload.tsx.
 */
export function MediaUploadCore({
  type,
  value,
  previewURL,
  busy,
  preparingEdit,
  busyAction,
  progress,
  error,
  warning,
  disabled,
  acceptedMime,
  onFilesSelected,
  onEditClick,
  onRemoveClick,
}: MediaUploadCoreProps) {
  const isLogo = type === 'logo'
  const hasValue = Boolean(value?.publicURL?.trim())
  const title = isLogo ? 'Logo' : 'Banner'

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

      <MediaSlot
        aspectRatio={isLogo ? 1 : BANNER_CROP_OUTPUT_WIDTH / BANNER_CROP_OUTPUT_HEIGHT}
        shape={isLogo ? 'round' : 'rect'}
        label={title}
        hasValue={hasValue}
        onFilesSelected={onFilesSelected}
        accept={acceptedMime}
        disabled={disabled || busy}
        className={classNames(
          styles.mediaSlotDecoration,
          isLogo ? styles.logoSlot : null,
          error ? styles.dropzoneError : null,
        )}
        previewContent={
          isLogo ? (
            <Image
              src={previewURL}
              alt="Logo Vorschau"
              className={styles.previewImageRound}
              width={LOGO_CROP_OUTPUT_SIZE}
              height={LOGO_CROP_OUTPUT_SIZE}
              unoptimized
              draggable={false}
            />
          ) : (
            <Image
              src={previewURL}
              alt="Banner Vorschau"
              className={styles.previewImageWide}
              width={BANNER_CROP_OUTPUT_WIDTH}
              height={BANNER_CROP_OUTPUT_HEIGHT}
              unoptimized
              draggable={false}
            />
          )
        }
        actions={
          hasValue ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconOnly
                onClick={onEditClick}
                disabled={disabled || busy}
                aria-label="Ausschnitt bearbeiten"
                title="Ausschnitt bearbeiten"
                leftIcon={<Crop size={14} />}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                iconOnly
                onClick={onRemoveClick}
                disabled={disabled || busy}
                aria-label={`${title} löschen`}
                title="Löschen"
                leftIcon={<Trash2 size={14} />}
              />
            </>
          ) : null
        }
      />

      {busyAction === 'upload' ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{progress}%</span>
        </div>
      ) : null}

      {warning ? <p className={styles.warning} aria-live="polite">{warning}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </>
  )
}
