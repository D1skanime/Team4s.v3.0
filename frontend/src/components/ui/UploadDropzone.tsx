'use client'

import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

import { Button } from './Button'
import { Input } from './Input'
import { classNames } from './classNames'
import styles from './UploadDropzone.module.css'

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

export function UploadDropzone({
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
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [showSingleSlotWarning, setShowSingleSlotWarning] = useState(false)

  function openFilePicker() {
    if (disabled) return
    inputRef.current?.click()
  }

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

  return (
    <div
      className={classNames(
        styles.dropzone,
        density === 'compact' ? styles.dropzoneCompact : styles.dropzoneRoomy,
        isDragActive ? styles.dropzoneDragging : null,
        disabled ? styles.dropzoneDisabled : null,
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
        onClick={(event) => {
          event.stopPropagation()
          openFilePicker()
        }}
      >
        Dateien auswählen
      </Button>
      {showSingleSlotWarning ? (
        <p className={styles.singleSlotWarning} role="status">
          {multiFileOnSingleSlotWarning}
        </p>
      ) : null}
    </div>
  )
}
