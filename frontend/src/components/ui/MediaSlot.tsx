'use client'

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'

import { MediaFrame } from './MediaFrame'
import { ResponsiveImage } from './ResponsiveImage'
import { Text } from './Text'
import { classNames } from './classNames'
import { UploadDropzone, resolveUploadSlotPresentation, type UploadDropzoneHandle } from './UploadDropzone'
import styles from './MediaSlot.module.css'

export type MediaSlotObjectFit = 'cover' | 'contain'

/**
 * Diskriminierte Union statt eines generischen `previewContent: ReactNode`: MediaSlot rendert
 * Bild-/Video-Vorschauen selbst (über `ResponsiveImage`/`<video>`), kein Aufrufer baut mehr seine
 * eigene img-/next-image-/video-Vorschau nach. `alt` ist für `kind: "image"` Pflicht (echter
 * Bildinhalt braucht einen vorlesbaren Namen); Videos in diesem Baustein sind stumme, rein
 * dekorative Vorschauen ohne eigenen Alternativtext-Bedarf. `className` ist bewusst eng gefasst:
 * nur für rein kosmetische Zusätze (z. B. ein Hover-Zoom-Übergang), nie für Quelle/Art/Fit --
 * diese bleiben vollständig bei MediaSlot, kein Zurückfallen auf eine eigene Bild-/Video-
 * Konstruktion durch den Aufrufer.
 */
export type MediaSlotMedia =
  | {
      kind: 'image'
      src: string
      alt: string
      objectFit?: MediaSlotObjectFit
      sizes?: string
      className?: string
      /** Erzwingt den unoptimierten Bild-Pfad -- für ein animiertes GIF/WebP, dessen Animation der
       *  Next.js-Optimierer beim Neukodieren zerstören würde (siehe ResponsiveImage). Ohne Angabe
       *  entscheidet ResponsiveImage selbst anhand der konfigurierten Bildquellen-Muster. */
      unoptimized?: boolean
    }
  | { kind: 'video'; src: string; objectFit?: MediaSlotObjectFit; className?: string }

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
  /** Die tatsächliche Bild-/Video-Vorschau, nur gerendert solange `hasValue` true ist. */
  media?: MediaSlotMedia | null
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

function renderMedia(media: MediaSlotMedia | null | undefined): ReactNode {
  if (!media) return null
  if (media.kind === 'video') {
    return (
      <video
        src={media.src}
        className={classNames(styles.mediaSlotVideo, media.className)}
        style={{ objectFit: media.objectFit ?? 'cover' }}
        muted
        playsInline
        preload="metadata"
      />
    )
  }
  return (
    <ResponsiveImage
      src={media.src}
      alt={media.alt}
      fill
      sizes={media.sizes ?? '320px'}
      className={media.className}
      unoptimized={media.unoptimized}
      style={{ objectFit: media.objectFit ?? 'cover' }}
      // Verhindert den nativen Bild-Ziehen-Schatten, der sonst mit der Ersetzen-per-Drop-Geste
      // der umgebenden Dropzone kollidieren würde -- gilt für jede MediaSlot-Vorschau einheitlich,
      // kein Aufrufer muss das selbst setzen.
      draggable={false}
    />
  )
}

/**
 * Geteilter Einzel-Bild-/Video-Upload-Slot: ein Slot mit bestehendem Wert zeigt keine zweite,
 * große Leer-Dropzone neben seiner Vorschau -- die Vorschau selbst wird zur Drop-Fläche. Ein
 * leerer Slot zeigt eine kompakte, zur künftigen Vorschau passend geformte Dropzone
 * (aspectRatio/shape), nie eine generische übergroße Fläche. Rendert Bild-/Video-Vorschauen über
 * `media` selbst (ResponsiveImage/<video>) -- kein Aufrufer baut mehr seine eigene Vorschau nach.
 * Form/Seitenverhältnis/Eckmarke kommen von `UploadDropzone`s offizieller `aspectRatio`-Option
 * (die wiederum `MediaFrame` nutzt), nicht von einem zusätzlichen, hier gerenderten Wrapper.
 * Wird vom Fansub-Logo-/Banner-Upload, dem Anime-Asset-Board und den Profil-Avatar-/Hintergrund-
 * Karten genutzt, damit jeder Einzel-Slot-Upload gleich aussieht und sich gleich verhält.
 */
export const MediaSlot = forwardRef<UploadDropzoneHandle, MediaSlotProps>(function MediaSlot({
  aspectRatio,
  shape = 'rect',
  label,
  hasValue,
  media,
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
      {onFilesSelected ? (
        <UploadDropzone
          ref={innerDropzoneRef}
          onFilesSelected={onFilesSelected}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          shape={shape}
          density="compact"
          aspectRatio={aspectRatio}
          cornerBadge={cornerBadge}
          promptLabel={promptLabel}
          overlayHintLabel={presentation === 'replace-overlay' ? replaceOverlayHintLabel : undefined}
          className={className}
        >
          {presentation === 'replace-overlay' ? renderMedia(media) : null}
        </UploadDropzone>
      ) : (
        <MediaFrame aspectRatio={aspectRatio} shape={shape} cornerBadge={cornerBadge} className={className}>
          <div className={styles.mediaSlotStatic}>
            {hasValue ? renderMedia(media) : staticEmptyContent}
          </div>
        </MediaFrame>
      )}
      {actions ? <div className={styles.mediaSlotActions}>{actions}</div> : null}
      {error ? (
        <Text variant="body" tone="error" role="alert" className={styles.mediaSlotError}>{error}</Text>
      ) : hint ? (
        <Text variant="soft" className={styles.mediaSlotHint}>{hint}</Text>
      ) : null}
    </div>
  )
})
