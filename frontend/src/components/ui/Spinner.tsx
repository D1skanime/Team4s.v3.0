import { classNames } from './classNames'
import styles from './Spinner.module.css'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  /** Vorlesbarer Text für Screenreader; die Ladeanimation selbst ist rein dekorativ (aria-hidden). */
  label?: string
  className?: string
}

/**
 * Grundbaustein für einen rotierenden Lade-Kreisel. Konsolidiert die vormals doppelt gepflegten
 * `ui-spin`-Keyframe-Rezepte aus `Button.module.css` (`.buttonSpinner`) und
 * `LoadingState.module.css` (`.stateSpinner`) in einen einzigen, wiederverwendbaren Baustein.
 * Die Ringfarbe folgt `currentColor` des umgebenden Elements, damit jeder Verwender seine eigene
 * Akzentfarbe setzen kann, ohne eine eigene Rotationsanimation zu definieren.
 */
export function Spinner({ size = 'md', label = 'Wird geladen…', className }: SpinnerProps) {
  return (
    <span
      className={classNames(styles.spinnerWrap, className)}
      role="status"
    >
      <span
        aria-hidden="true"
        className={classNames(
          styles.spinner,
          size === 'sm' && styles.spinnerSm,
          size === 'lg' && styles.spinnerLg,
        )}
      />
      <span className="visually-hidden">{label}</span>
    </span>
  )
}
