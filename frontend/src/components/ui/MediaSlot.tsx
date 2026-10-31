'use client'

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'

import { MediaFrame } from './MediaFrame'
import { Text } from './Text'
import { UploadDropzone, resolveUploadSlotPresentation, type UploadDropzoneHandle } from './UploadDropzone'
import styles from './MediaSlot.module.css'

export interface MediaSlotProps {
  /** Breite/Höhe, z. B. 1 für ein quadratisches Avatar-/Logo-Bild, 2/3 für ein Hochformat-Cover,
   * 16/9 für eine Banner-/Hintergrund-/Video-Kachel. Bestimmt die Fläche über CSS `aspect-ratio`. */
  aspectRatio: number
  shape?: 'rect' | 'round'
  /** Kurze Bezeichnung dieses Slots (z. B. "Logo", "Banner", "Cover") -- ergibt den Standard-
   * Hinweis-/aria-label-Text für den Leer- und den Ersetzen-Überlagerungs-Zustand. */
  label: string
  /** Ob der Slot bereits einen Wert hat -- entscheidet über Leer-Dropzone vs. Ersetzen-
   * Überlagerung per `resolveUploadSlotPresentation` (nie eine zweite, übergroße Dropzone neben
   * einer bestehenden Vorschau). */
  hasValue: boolean
  /** Nur gerendert, solange `hasValue` true ist (die eigentliche Bild-/Video-Vorschau). */
  previewContent?: ReactNode
  disabled?: boolean
  /** Weglassen für einen Slot, der nur gelöscht, nie an Ort und Stelle ersetzt werden kann (z. B.
   * ein bestehender Eintrag einer Hintergrund-/Hintergrundvideo-Liste -- neue Einträge kommen über
   * einen eigenen "Adder"-Slot). Ohne diese Prop rendert der Slot eine reine, nicht-interaktive
   * Vorschaufläche -- keine UploadDropzone, kein Klick-/Drop-zum-Ersetzen --, `actions` bleibt
   * trotzdem nutzbar. */
  onFilesSelected?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  /** Überschreibt den Standard-Leer-Hinweis "`label` hierher ziehen oder klicken zum Hochladen". */
  emptyPromptLabel?: string
  /** Überschreibt den vorlesbaren Namen "`label` ersetzen" bei bereits vorhandenem Wert. */
  replaceAriaLabel?: string
  replaceOverlayHintLabel?: string
  /** Rendert als EIGENE Zeile direkt unter der Fläche -- nie von einer runden oder eckigen
   * Vorschau überlagert oder abgeschnitten. */
  actions?: ReactNode
  /** Kleine Marken-Überlagerung (z. B. eine Herkunfts-Kennzeichnung) in einer Ecke der Fläche. */
  cornerBadge?: ReactNode
  /** Wird in der reinen Vorschaufläche angezeigt, wenn `onFilesSelected` fehlt UND `hasValue`
   * false ist (z. B. eine gestrichelte "+ neuer Hintergrund"-Optik übernimmt stattdessen der
   * Aufrufer über `onFilesSelected` -- dies ist nur für einen echt leeren, nicht-interaktiven
   * statischen Slot gedacht). */
  staticEmptyContent?: ReactNode
  /** Hinweistext unterhalb der Fläche (z. B. "JPG oder PNG, max. 4 MB"). */
  hint?: ReactNode
  /** Fehlertext unterhalb der Fläche, ersetzt den Hinweistext, wenn beide gesetzt sind. */
  error?: ReactNode
  className?: string
}

/**
 * Geteilter Einzel-Bild-/Video-Upload-Slot: ein Slot mit bestehendem Wert zeigt keine zweite,
 * große Leer-Dropzone neben seiner Vorschau -- die Vorschau selbst wird zur Drop-Fläche. Ein
 * leerer Slot zeigt eine kompakte, zur künftigen Vorschau passend geformte Dropzone
 * (aspectRatio/shape), nie eine generische übergroße Fläche. Wird vom Fansub-Logo-/Banner-Upload,
 * dem Anime-Asset-Board und den Profil-Avatar-/Hintergrund-Karten genutzt, damit jeder
 * Einzel-Slot-Upload gleich aussieht und sich gleich verhält.
 */
export const MediaSlot = forwardRef<UploadDropzoneHandle, MediaSlotProps>(function MediaSlot({
  aspectRatio,
  shape = 'rect',
  label,
  hasValue,
  previewContent,
  disabled,
  onFilesSelected,
  accept,
  multiple = false,
  emptyPromptLabel,
  replaceAriaLabel,
  replaceOverlayHintLabel = 'Zum Ersetzen loslassen',
  actions,
  cornerBadge,
  staticEmptyContent,
  hint,
  error,
  className,
}, ref) {
  // Im statischen Modus (kein onFilesSelected) rendert der Slot gar keine UploadDropzone --
  // ohne diese Indirektion bliebe `ref.current` kommentarlos null und `ref.current?.open()` ein
  // unerklärter No-op. Diese IMMER vorhandene Handle macht "im statischen Modus nichts zu öffnen"
  // zu einem bewussten No-op statt einer ungeschützten Null-Dereferenzierung.
  const innerDropzoneRef = useRef<UploadDropzoneHandle>(null)
  useImperativeHandle(ref, () => ({
    open: () => innerDropzoneRef.current?.open(),
  }))

  const presentation = resolveUploadSlotPresentation(hasValue)
  const promptLabel = presentation === 'replace-overlay'
    ? (replaceAriaLabel ?? `${label} ersetzen`)
    : (emptyPromptLabel ?? `${label} hierher ziehen oder klicken zum Hochladen`)

  return (
    <div className={styles.mediaSlotWrapper}>
      <MediaFrame aspectRatio={aspectRatio} shape={shape} cornerBadge={cornerBadge} className={className}>
        {onFilesSelected ? (
          <UploadDropzone
            ref={innerDropzoneRef}
            onFilesSelected={onFilesSelected}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            shape={shape}
            density="compact"
            promptLabel={promptLabel}
            overlayHintLabel={presentation === 'replace-overlay' ? replaceOverlayHintLabel : undefined}
            className={styles.mediaSlotDropzone}
          >
            {presentation === 'replace-overlay' ? previewContent : null}
          </UploadDropzone>
        ) : (
          <div className={styles.mediaSlotStatic}>
            {hasValue ? previewContent : staticEmptyContent}
          </div>
        )}
      </MediaFrame>
      {actions ? <div className={styles.mediaSlotActions}>{actions}</div> : null}
      {error ? (
        <Text variant="body" role="alert" className={styles.mediaSlotError}>{error}</Text>
      ) : hint ? (
        <Text variant="soft" className={styles.mediaSlotHint}>{hint}</Text>
      ) : null}
    </div>
  )
})
