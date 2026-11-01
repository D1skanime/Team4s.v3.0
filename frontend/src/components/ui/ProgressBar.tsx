import { classNames } from './classNames'
import styles from './ProgressBar.module.css'

export type ProgressBarTone = 'accent' | 'success' | 'danger'
export type ProgressBarSize = 'sm' | 'md'

export interface ProgressBarProps {
  /** Fortschritt 0-100. Wird bei `indeterminate` ignoriert. */
  value?: number
  /** Unbestimmter Fortschritt ("wird verarbeitet", ohne bekannten Prozentwert). */
  indeterminate?: boolean
  tone?: ProgressBarTone
  size?: ProgressBarSize
  /** Vorlesbare Beschriftung (z. B. "Wird hochgeladen", "Wird verarbeitet"). */
  label: string
  className?: string
}

/**
 * Fortschrittsbalken für Uploads und andere lang laufende Vorgänge, mit bestimmtem (0-100%)
 * oder unbestimmtem Zustand. Die Beschriftung ist Pflicht und wird Screenreadern über
 * `aria-label` mitgeteilt.
 */
export function ProgressBar({ value = 0, indeterminate = false, tone = 'accent', size = 'md', label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={classNames(styles.progressBar, size === 'sm' && styles.progressBarSm, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
    >
      <div
        className={classNames(
          styles.progressBarFill,
          tone === 'success' && styles.progressBarFillSuccess,
          tone === 'danger' && styles.progressBarFillDanger,
          indeterminate && styles.progressBarFillIndeterminate,
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  )
}
