'use client'

import { forwardRef, type ReactNode } from 'react'

import { classNames } from './classNames'
import { UploadDropzone, resolveUploadSlotPresentation, type UploadDropzoneHandle } from './UploadDropzone'
import styles from './MediaSlot.module.css'

export interface MediaSlotProps {
  /** width / height, e.g. 1 for a square avatar/logo, 2/3 for a portrait cover, 16/9 for a
   * banner/background/video tile. Drives the slot's own box via CSS `aspect-ratio`. */
  aspectRatio: number
  shape?: 'rect' | 'round'
  /** Short noun for this slot (e.g. "Logo", "Banner", "Cover") -- derives the default
   * prompt/aria-label text for both the empty and replace-overlay states. */
  label: string
  /** Whether this slot already has a value -- decides empty-dropzone vs. replace-overlay via
   * the shared `resolveUploadSlotPresentation` pure function (never a second, oversized dropzone
   * rendered alongside an existing preview). */
  hasValue: boolean
  /** Rendered only while `hasValue` is true (the actual image/video preview). */
  previewContent?: ReactNode
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  /** Overrides the default "`label` hierher ziehen oder klicken zum Hochladen" empty-state text. */
  emptyPromptLabel?: string
  /** Overrides the default "`label` ersetzen" accessible name while a value already exists. */
  replaceAriaLabel?: string
  replaceOverlayHintLabel?: string
  /** Non-overlapping corner overlay (edit/replace/remove icon buttons) on top of the slot --
   * clicks inside it never trigger the dropzone's own click-to-pick (stopPropagation). */
  cornerActions?: ReactNode
  /** Small pill overlay (e.g. a provider-source badge), opposite corner from `cornerActions`. */
  cornerBadge?: ReactNode
  className?: string
}

/**
 * Shared single-image/video upload slot (Live-UAT follow-up 2026-10-12): a slot that already has
 * a value shows no second, large empty dropzone next to its preview -- the preview itself becomes
 * the drop target. An empty slot shows a compact dropzone shaped like the eventual preview
 * (aspectRatio/shape), never a generic oversized box. Used by the Fansub Logo/Banner upload, the
 * Anime asset board, and the profile avatar/background cards so every single-slot upload looks
 * and behaves the same way.
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
  cornerActions,
  cornerBadge,
  className,
}, ref) {
  const presentation = resolveUploadSlotPresentation(hasValue)
  const promptLabel = presentation === 'replace-overlay'
    ? (replaceAriaLabel ?? `${label} ersetzen`)
    : (emptyPromptLabel ?? `${label} hierher ziehen oder klicken zum Hochladen`)

  return (
    <div
      className={classNames(styles.mediaSlot, shape === 'round' ? styles.mediaSlotRound : null, className)}
      style={{ aspectRatio }}
    >
      <UploadDropzone
        ref={ref}
        onFilesSelected={onFilesSelected}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        density="compact"
        promptLabel={promptLabel}
        overlayHintLabel={presentation === 'replace-overlay' ? replaceOverlayHintLabel : undefined}
        className={classNames(styles.mediaSlotDropzone, shape === 'round' ? styles.mediaSlotRoundDropzone : null)}
      >
        {presentation === 'replace-overlay' ? previewContent : null}
      </UploadDropzone>
      {cornerActions ? (
        <div className={styles.mediaSlotCornerActions} onClick={(event) => event.stopPropagation()}>
          {cornerActions}
        </div>
      ) : null}
      {cornerBadge ? <div className={styles.mediaSlotCornerBadge}>{cornerBadge}</div> : null}
    </div>
  )
})
