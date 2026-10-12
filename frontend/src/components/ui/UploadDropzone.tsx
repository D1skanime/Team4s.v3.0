'use client'

import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode } from 'react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { Button } from './Button'
import { Input } from './Input'
import { classNames } from './classNames'
import styles from './UploadDropzone.module.css'

/** Imperative handle for callers that need an EXTERNAL trigger (e.g. an action-row "Ersetzen"
 * button next to an existing preview) to open the SAME file picker as the dropzone itself,
 * instead of maintaining a second, redundant native `<input type="file">`. */
export interface UploadDropzoneHandle {
  open: () => void
}

export interface UploadDropzoneProps {
  /** Fires with the picked or dropped files (already sliced to one file for single-slot dropzones). */
  onFilesSelected: (files: File[]) => void
  /** Native `<input accept>` — browser-level hint only, never the sole validation. */
  accept?: string
  /** `false` keeps the dropzone single-slot: only the first file of a multi-file drop/pick is kept. */
  multiple?: boolean
  /** `false` disables the drag&drop surface and falls back to click-only. */
  allowDrop?: boolean
  disabled?: boolean
  /** Controls padding/typography only — never a fixed pixel width/height. */
  density?: 'roomy' | 'compact'
  promptLabel?: string
  dropHintLabel?: string
  multiFileOnSingleSlotWarning?: string
  /** Extra class on the dropzone's own root — lets a caller size/shape an EMPTY-state dropzone
   * to match the eventual preview (e.g. square for an avatar/logo slot, a fixed banner ratio for
   * a banner slot) instead of a generic oversized box. */
  className?: string
  /** When provided, rendered INSIDE the dropzone instead of the default icon/prompt/button chrome
   * — turns an EXISTING preview (image, etc.) into the drop target itself, so there is no second,
   * redundant drop area shown alongside an already-filled slot. Click and drag&drop both still
   * open/accept via the same picker; pass `overlayHintLabel` for a short hint shown only while a
   * file is dragged over. */
  children?: ReactNode
  /** Short hint (e.g. "Zum Ersetzen loslassen") shown only while dragging over the dropzone AND
   * `children` are present. Ignored in the default (no-children) chrome. */
  overlayHintLabel?: string
}

const DEFAULT_PROMPT_LABEL = 'Dateien hier hineinziehen oder zum Auswählen klicken.'
const DEFAULT_MULTI_FILE_ON_SINGLE_SLOT_WARNING =
  'Nur die erste Datei wurde übernommen — dieser Platz erlaubt nur ein Bild.'

/**
 * Pure helper: when `multiple` is false and more than one file arrives (click-pick or drop), only
 * the first file is kept — the rest are dropped and `droppedExtra` signals the caller to show the
 * locked D-16 warning sentence. Co-located here (no hooks) so the behavior is testable without any
 * DOM simulation.
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
 * Pure state switch (Live-UAT follow-up 2026-10-12): a slot that already has a value must NOT
 * show a second, large empty dropzone alongside its preview — the preview itself becomes the
 * drop target ('replace-overlay'). Only a slot with no value yet shows the full empty-state
 * dropzone ('empty-dropzone'). Shared by every upload-slot caller instead of each re-deriving it.
 */
export function resolveUploadSlotPresentation(hasExistingValue: boolean): UploadSlotPresentation {
  return hasExistingValue ? 'replace-overlay' : 'empty-dropzone'
}

export type UploadDropzoneLayout = 'roomy' | 'compact' | 'inline'

/** Below this available block-size (height, px), the vertical icon/text/button stack no longer
 * fits without clipping — a flat slot (e.g. a 5.4:1 banner tile) can be well under 90px tall.
 * Mirrored by the `@container (max-height: ...)` rule in UploadDropzone.module.css, which is the
 * actual runtime mechanism (CSS container queries, not a JS-measured ResizeObserver) — this
 * constant/function documents and tests the threshold the CSS implements. */
export const INLINE_LAYOUT_MAX_HEIGHT_PX = 110

/**
 * Pure decision table (Live-UAT follow-up 2026-10-12: empty dropzone content got clipped in
 * flat/short slots — aspect-ratio sized the box smaller than the vertical icon+text+button
 * stack needs). Below the inline threshold, layout switches to a single compact row regardless
 * of the caller's requested density; otherwise the caller's own roomy/compact choice stands.
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

export const UploadDropzone = forwardRef<UploadDropzoneHandle, UploadDropzoneProps>(function UploadDropzone({
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
  // D-17: drag&drop is now always active (see 180-12 Task 1's dead-branch removal); kept in the
  // public API as a legitimate future extension point, only the `false`-handling code path was removed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowDrop = true,
  disabled = false,
  density = 'roomy',
  promptLabel = DEFAULT_PROMPT_LABEL,
  dropHintLabel,
  multiFileOnSingleSlotWarning = DEFAULT_MULTI_FILE_ON_SINGLE_SLOT_WARNING,
  className,
  children,
  overlayHintLabel,
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

  return (
    <div
      className={classNames(
        styles.dropzone,
        hasOverlayContent ? styles.dropzoneOverlay : (density === 'compact' ? styles.dropzoneCompact : styles.dropzoneRoomy),
        isDragActive ? styles.dropzoneDragging : null,
        disabled ? styles.dropzoneDisabled : null,
        className,
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={promptLabel}
      onClick={onDropzoneClick}
      onKeyDown={onDropzoneKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        aria-label="Dateien"
        disabled={disabled}
        className={styles.hiddenFileInput}
        onClick={(event) => event.stopPropagation()}
        onChange={onInputChange}
      />
      {hasOverlayContent ? (
        <>
          {children}
          {isDragActive && overlayHintLabel ? (
            <p className={styles.dropzoneOverlayHint}>{overlayHintLabel}</p>
          ) : null}
        </>
      ) : (
        <>
          <UploadCloud size={22} aria-hidden="true" className={styles.icon} />
          <div className={styles.copy}>
            <p className={styles.promptLabel}>{promptLabel}</p>
            {dropHintLabel ? <p className={styles.dropHintLabel}>{dropHintLabel}</p> : null}
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
        <p className={styles.singleSlotWarning} role="status">
          {multiFileOnSingleSlotWarning}
        </p>
      ) : null}
    </div>
  )
})
