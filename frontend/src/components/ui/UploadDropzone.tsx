'use client'

import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode } from 'react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { Badge } from './Badge'
import { Button } from './Button'
import { Heading } from './Heading'
import type { HeadingLevel } from './Heading'
import { Input } from './Input'
import { MediaFrame } from './MediaFrame'
import { StatusIcon } from './StatusIcon'
import { Text } from './Text'
import { classNames } from './classNames'
import { visuallyHiddenClassName } from './VisuallyHidden'
import styles from './UploadDropzone.module.css'

/** Imperative Handle für Aufrufer, die einen EXTERNEN Auslöser (z. B. einen "Ersetzen"-Button
 * neben einer bestehenden Vorschau) brauchen, um denselben Datei-Dialog wie die Dropzone selbst
 * zu öffnen, statt ein zweites, redundantes natives `<input type="file">` zu pflegen. */
export interface UploadDropzoneHandle {
  open: () => void
}

export interface UploadDropzoneProps {
  /** Feuert mit den ausgewählten oder abgelegten Dateien (für Einzel-Slot-Dropzones bereits auf
   * eine Datei gekürzt). */
  onFilesSelected: (files: File[]) => void
  /** Natives `<input accept>` — nur ein Hinweis auf Browser-Ebene, nie die alleinige Validierung. */
  accept?: string
  /** `false` hält die Dropzone einzel-slot-fähig: von mehreren abgelegten/ausgewählten Dateien
   * bleibt nur die erste erhalten. */
  multiple?: boolean
  /** Derzeit wirkungslos: Drag&Drop ist auf allen Einsatzstellen fest aktiv, der frühere
   * `false`-Codepfad wurde entfernt, nachdem kein Aufrufer ihn mehr nutzte. Die Prop bleibt nur
   * als reservierter, künftiger Erweiterungspunkt in der öffentlichen API erhalten --
   * `allowDrop={false}` deaktiviert Drag&Drop AKTUELL NICHT, trotz des Namens. */
  allowDrop?: boolean
  disabled?: boolean
  /** Eckig (Standard) oder rund -- muss zur Form der eventuellen Vorschau passen (z. B. ein
   *  rundes Avatar-Slot), damit der gestrichelte Leer-Zustand und ein per `children` übergebener
   *  Ersetzen-Rahmen dieselbe Form wie die umgebende Fläche haben. */
  shape?: 'rect' | 'round'
  /** Bestimmt nur Innenabstand/Typografie — nie eine feste Pixel-Breite/-Höhe. */
  density?: 'roomy' | 'compact'
  promptLabel?: string
  dropHintLabel?: string
  multiFileOnSingleSlotWarning?: string
  /** Zusätzliche Klasse auf der eigenen Wurzel der Dropzone — lässt einen Aufrufer die
   * Leer-Zustand-Dropzone auf die künftige Vorschau zuschneiden (z. B. quadratisch für ein
   * Avatar-/Logo-Slot, ein festes Banner-Seitenverhältnis) statt einer generischen, übergroßen
   * Fläche. */
  className?: string
  /** Wenn gesetzt, rendert die Dropzone über den offiziellen `MediaFrame`-Grundbaustein mit
   * diesem festen Seitenverhältnis (z. B. 1 für ein Logo-/Avatar-Slot) -- Form (`shape`) und
   * Eckmarke (`cornerBadge`) kommen dann ebenfalls von `MediaFrame`, keine eigene, parallele
   * Flächen-Logik mehr. Weglassen für eine generische, mehrdateifähige Upload-Fläche ohne festes
   * Seitenverhältnis (natürliche, inhaltsbestimmte Höhe, z. B. ein Mehrfach-Datei-Formularfeld). */
  aspectRatio?: number
  /** Nur zusammen mit `aspectRatio` wirksam -- kleine Markenüberlagerung in der Ecke der Fläche
   * (z. B. eine Herkunfts-Kennzeichnung), identisch zu `MediaFrame`s eigener Option. */
  cornerBadge?: ReactNode
  /** Überschreibt das semantische Überschriften-Level der Eingabeaufforderung (Standard: 4, das
   * tiefste verfügbare `Heading`-Level). Ein Aufrufer mit flacherer umgebender Überschriften-
   * Hierarchie (z. B. direkt nach einem h2 ohne zwischenliegenden h3) sollte hier explizit ein
   * passendes Level setzen, sonst überspringt die Seite eine Überschriften-Ebene. */
  headingLevel?: HeadingLevel
  /** Wenn gesetzt, rendert INNERHALB der Dropzone statt des Standard-Icon-/Hinweis-/Button-Aufbaus
   * — macht eine BESTEHENDE Vorschau (Bild o. Ä.) selbst zur Drop-Fläche, damit keine zweite,
   * redundante Drop-Fläche neben einem bereits befüllten Slot erscheint. Klick und Drag&Drop
   * öffnen/übernehmen weiterhin über denselben Datei-Dialog; `overlayHintLabel` zeigt einen
   * kurzen Hinweis nur während eine Datei darüber gezogen wird. */
  children?: ReactNode
  /** Kurzer Hinweis (z. B. "Zum Ersetzen loslassen"), nur sichtbar während über der Dropzone
   * gezogen wird UND `children` gesetzt ist. Ohne `children` ohne Wirkung. */
  overlayHintLabel?: string
}

const DEFAULT_PROMPT_LABEL = 'Dateien hier hineinziehen oder zum Auswählen klicken.'
const DEFAULT_MULTI_FILE_ON_SINGLE_SLOT_WARNING =
  'Nur die erste Datei wurde übernommen — dieser Platz erlaubt nur ein Bild.'

/**
 * Reine Hilfsfunktion: Wenn `multiple` false ist und mehr als eine Datei ankommt (Klick-Auswahl
 * oder Drop), wird nur die erste Datei behalten -- der Rest wird verworfen, und `droppedExtra`
 * signalisiert dem Aufrufer, den festen Warnsatz anzuzeigen. Bewusst ohne Hooks ausgelagert,
 * damit das Verhalten ohne DOM-Simulation testbar ist.
 */
export function sliceToSingleFileIfNeeded(
  files: File[],
  multiple: boolean,
): { selected: File[]; droppedExtra: boolean } {
  if (multiple || files.length <= 1) {
    return { selected: files, droppedExtra: false }
  }
  return { selected: files.slice(0, 1), droppedExtra: true }
}

export type UploadSlotPresentation = 'empty-dropzone' | 'replace-overlay'

/**
 * Reine Zustands-Weiche: ein Slot mit bestehendem Wert zeigt KEINE zweite, große Leer-Dropzone
 * neben seiner Vorschau -- die Vorschau selbst wird zur Drop-Fläche ('replace-overlay'). Nur ein
 * noch leerer Slot zeigt die volle Leer-Zustand-Dropzone ('empty-dropzone'). Geteilt von jedem
 * Upload-Slot-Aufrufer, statt dass jeder es selbst neu herleitet.
 */
export function resolveUploadSlotPresentation(hasExistingValue: boolean): UploadSlotPresentation {
  return hasExistingValue ? 'replace-overlay' : 'empty-dropzone'
}

export type UploadDropzoneLayout = 'roomy' | 'compact' | 'inline'

/** Unterhalb dieser verfügbaren Block-Größe (Höhe, px) passt der senkrechte StatusIcon-/Heading-/
 * Button-Stapel nicht mehr ohne Abschneiden -- ein flacher Slot (z. B. eine 5,4:1-Banner-Kachel)
 * kann deutlich unter 90px hoch sein. Spiegelt die `@container (max-height: ...)`-Regel in
 * UploadDropzone.module.css, dem eigentlichen Laufzeit-Mechanismus (CSS-Container-Queries, kein
 * per JS gemessener ResizeObserver) -- diese Konstante/Funktion dokumentiert und testet die
 * Schwelle, die das CSS umsetzt. */
export const INLINE_LAYOUT_MAX_HEIGHT_PX = 110

/**
 * Reine Entscheidungstabelle: unterhalb der Inline-Schwelle wechselt das Layout unabhängig von
 * der angeforderten Dichte auf eine einzelne, kompakte Zeile (sonst würde der senkrechte
 * StatusIcon-/Heading-/Button-Stapel in einem flachen, über aspect-ratio bemessenen Slot
 * abgeschnitten); darüber gilt die vom Aufrufer gewählte roomy/compact-Dichte unverändert.
 */
export function resolveUploadDropzoneLayout(
  density: 'roomy' | 'compact',
  availableHeightPx: number | null | undefined,
): UploadDropzoneLayout {
  if (typeof availableHeightPx === 'number' && availableHeightPx > 0 && availableHeightPx <= INLINE_LAYOUT_MAX_HEIGHT_PX) {
    return 'inline'
  }
  return density
}

/**
 * Datei-Auswahl-/Drop-Fläche: Klick öffnet den nativen Datei-Dialog, Drag&Drop übernimmt
 * abgelegte Dateien, beides über denselben `onFilesSelected`-Callback. Mit gesetztem
 * `aspectRatio` ist die Fläche selbst eine `MediaFrame`-Instanz (Form/Eckmarke kommen von dort);
 * ohne `aspectRatio` bleibt die Höhe inhaltsbestimmt (generische Mehrdatei-Flächen ohne festes
 * Seitenverhältnis). Der Leer-Zustand komponiert sich aus `StatusIcon` (Symbol), `Heading`
 * (Eingabeaufforderung) und `Text` (optionaler Zusatzhinweis) statt eigener Icon-/Text-Bausteine.
 */
export const UploadDropzone = forwardRef<UploadDropzoneHandle, UploadDropzoneProps>(function UploadDropzone({
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
  // Drag&Drop ist inzwischen immer aktiv; die Prop bleibt als legitimer künftiger
  // Erweiterungspunkt in der öffentlichen API erhalten, nur der `false`-Codepfad entfiel.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowDrop = true,
  disabled = false,
  shape = 'rect',
  density = 'roomy',
  promptLabel = DEFAULT_PROMPT_LABEL,
  dropHintLabel,
  multiFileOnSingleSlotWarning = DEFAULT_MULTI_FILE_ON_SINGLE_SLOT_WARNING,
  className,
  children,
  overlayHintLabel,
  aspectRatio,
  cornerBadge,
  headingLevel = 4,
}: UploadDropzoneProps, ref) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [showSingleSlotWarning, setShowSingleSlotWarning] = useState(false)

  function openFilePicker() {
    if (disabled) return
    inputRef.current?.click()
  }

  useImperativeHandle(ref, () => ({ open: openFilePicker }))

  function applySelection(files: File[]) {
    const { selected, droppedExtra } = sliceToSingleFileIfNeeded(files, multiple)
    setShowSingleSlotWarning(droppedExtra)
    if (selected.length === 0) return
    onFilesSelected(selected)
  }

  function onDropzoneClick() {
    openFilePicker()
  }

  function onDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (disabled || files.length === 0) return
    applySelection(files)
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!disabled) setIsDragActive(true)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!disabled) setIsDragActive(true)
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragActive(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragActive(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length === 0) return
    applySelection(files)
  }

  const hasOverlayContent = Boolean(children)
  const isSized = aspectRatio !== undefined

  const rootClassName = classNames(
    styles.dropzone,
    shape === 'round' ? styles.dropzoneRound : null,
    hasOverlayContent ? styles.dropzoneOverlay : (density === 'compact' ? styles.dropzoneCompact : styles.dropzoneRoomy),
    isDragActive ? styles.dropzoneDragging : null,
    disabled ? styles.dropzoneDisabled : null,
    isSized && !hasOverlayContent ? styles.dropzoneSized : null,
    className,
  )

  const content = (
    <>
      <Input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        aria-label="Dateien"
        disabled={disabled}
        tabIndex={-1}
        className={visuallyHiddenClassName}
        onClick={(event) => event.stopPropagation()}
        onChange={onInputChange}
      />
      {hasOverlayContent ? (
        <>
          {children}
          {isDragActive && overlayHintLabel ? (
            <Badge variant="info" className={styles.dropzoneOverlayHint}>{overlayHintLabel}</Badge>
          ) : null}
        </>
      ) : (
        <>
          <StatusIcon tone="neutral" size={density === 'compact' ? 'sm' : 'md'} icon={<UploadCloud size={22} aria-hidden="true" />} />
          <div className={styles.copy}>
            <Heading level={headingLevel} size={4} className={styles.promptLabel}>{promptLabel}</Heading>
            {dropHintLabel ? <Text variant="soft" className={styles.dropHintLabel}>{dropHintLabel}</Text> : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className={styles.selectButton}
            onClick={(event) => {
              event.stopPropagation()
              openFilePicker()
            }}
          >
            Dateien auswählen
          </Button>
        </>
      )}
      {showSingleSlotWarning ? (
        <Text variant="body" role="status" className={styles.singleSlotWarning}>
          {multiFileOnSingleSlotWarning}
        </Text>
      ) : null}
    </>
  )

  const interactionProps = {
    role: 'button' as const,
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled,
    'aria-label': promptLabel,
    onClick: onDropzoneClick,
    onKeyDown: onDropzoneKeyDown,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }

  if (isSized) {
    return (
      <MediaFrame aspectRatio={aspectRatio} shape={shape} cornerBadge={cornerBadge} className={rootClassName} {...interactionProps}>
        {content}
      </MediaFrame>
    )
  }

  return (
    <div className={rootClassName} {...interactionProps}>
      {content}
    </div>
  )
})
