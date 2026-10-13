'use client'

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'

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
  /** Omit for a slot that can only ever be deleted, never replaced in place (e.g. one entry of
   * an existing Background/Background-Video list -- new entries are added through a separate
   * "adder" slot). Without it, the slot renders a plain, non-interactive preview box -- no
   * UploadDropzone, no click/drop-to-replace affordance -- while `actions` below still works. */
  onFilesSelected?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  /** Overrides the default "`label` hierher ziehen oder klicken zum Hochladen" empty-state text. */
  emptyPromptLabel?: string
  /** Overrides the default "`label` ersetzen" accessible name while a value already exists. */
  replaceAriaLabel?: string
  replaceOverlayHintLabel?: string
  /** Rendered as its OWN row directly below the slot (Live-UAT follow-up 2026-10-12: an overlay
   * on top of the preview got clipped by a round shape and covered the image) -- never
   * overlapping or clipped, works the same for round and rect shapes. */
  actions?: ReactNode
  /** Small pill overlay (e.g. a provider-source badge) in a corner of the slot itself. */
  cornerBadge?: ReactNode
  /** Shown in the plain preview box when `onFilesSelected` is omitted AND `hasValue` is false
   * (e.g. a dashed "+ neuer Hintergrund" adder look is instead handled by the caller passing
   * `onFilesSelected`; this is only for a genuinely empty, non-interactive static slot). */
  staticEmptyContent?: ReactNode
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
  actions,
  cornerBadge,
  staticEmptyContent,
  className,
}, ref) {
  // Static mode (no onFilesSelected) renders no UploadDropzone at all, so there is nothing for a
  // forwarded ref to attach to -- without this indirection, `ref.current` itself would silently
  // stay null and `ref.current?.open()` would be an unexplained no-op with no signal why
  // (code-review finding 2026-10-13). Exposing a handle that ALWAYS exists, with `open()` simply
  // delegating to the inner dropzone when one is rendered, makes "nothing to open in static mode"
  // an explicit, intentional no-op instead of an unguarded null dereference.
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
      <div
        className={classNames(styles.mediaSlot, shape === 'round' ? styles.mediaSlotRound : null, className)}
        style={{ aspectRatio }}
      >
        {onFilesSelected ? (
          <UploadDropzone
            ref={innerDropzoneRef}
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
        ) : (
          <div className={styles.mediaSlotStatic}>
            {hasValue ? previewContent : staticEmptyContent}
          </div>
        )}
        {cornerBadge ? <div className={styles.mediaSlotCornerBadge}>{cornerBadge}</div> : null}
      </div>
      {actions ? <div className={styles.mediaSlotActions}>{actions}</div> : null}
    </div>
  )
})
