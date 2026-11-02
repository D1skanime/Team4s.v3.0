import { classNames } from './classNames'
import styles from './Spinner.module.css'

export type SpinnerSize = 'sm' | 'md' | 'lg'
/** 'default' folgt currentColor des umgebenden Elements (Standard). 'accent' färbt den Kreisel
 *  fest in der Akzentfarbe (--accent-primary), unabhängig von einem umgebenden Farb-Wrapper --
 *  z. B. LoadingStates Lade-Kreisel, der vorher einen eigenen <span>-Farb-Wrapper dafür brauchte. */
export type SpinnerTone = 'default' | 'accent'

export interface SpinnerProps {
  size?: SpinnerSize
  tone?: SpinnerTone
  /** Vorlesbarer Text für Screenreader; die Ladeanimation selbst ist rein dekorativ (aria-hidden). */
  label?: string
  className?: string
}

/**
 * Grundbaustein für einen rotierenden Lade-Kreisel. Konsolidiert die vormals doppelt gepflegten
 * `ui-spin`-Keyframe-Rezepte aus `Button.module.css` (`.buttonSpinner`) und
 * `LoadingState.module.css` (`.stateSpinner`) in einen einzigen, wiederverwendbaren Baustein.
 * Die Ringfarbe folgt standardmäßig `currentColor` des umgebenden Elements, damit jeder Verwender
 * seine eigene Akzentfarbe setzen kann, ohne eine eigene Rotationsanimation zu definieren --
 * `tone="accent"` erzwingt stattdessen eine feste Akzentfarbe, ohne dass der Aufrufer dafür einen
 * eigenen Farb-Wrapper bauen muss.
 */
export function Spinner({ size = 'md', tone = 'default', label = 'Wird geladen…', className }: SpinnerProps) {
  return (
    <span
      className={classNames(styles.spinnerWrap, tone === 'accent' && styles.spinnerToneAccent, className)}
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
