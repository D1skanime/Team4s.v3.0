import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Stack.module.css'

/** Zweck-Benennung von Stacks Abstandsmaß (Befund 24) -- KEINE rohe Space-Skalenstufe mehr,
 *  sondern ein benannter Einsatzzweck, der intern über ein eigenes Zweck-Token in
 *  `src/styles/tokens/layout.css` auf die unveränderte `--space-N`-Grundskala verweist:
 *  - `'section'`: trennt voneinander unabhängige Inhaltsblöcke (z. B. Merklisten-Knopf,
 *    Trennlinie und Genre-Abschnitt im Anime-Kopf; einzelne Episodenzeilen in der Episodenliste).
 *  - `'tight'`: fasst eng zusammengehörige Inhalte dicht zusammen (ein Eyebrow-Label mit seiner
 *    Chip-Reihe, oder die Metadatenzeilen EINER Release-Zeile). */
export type StackGapPurpose = 'section' | 'tight'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf `var(--space-N)` (siehe `StackGapPurpose`-Dokumentation oben). */
const GAP_PURPOSE_TOKENS: Record<StackGapPurpose, string> = {
  section: 'var(--space-section)',
  tight: 'var(--space-tight)',
}

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als benannter Zweck (Standard 'section' = var(--space-section)). */
  gap?: StackGapPurpose
  /** Querachsen-Ausrichtung der Kinder (Standard 'stretch'). */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Vertikale Anordnung mehrerer Kinder mit festem, token-basiertem Abstand -- der generische
 * Layout-Grundbaustein für jede Kopf-zu-Fuß-Anordnung dieser Codebasis (z. B. Titelzeile über
 * Beschreibung über Kennzahlen). Setzt bewusst KEINE Fläche/Farbe/Rundung selbst -- diese kommen
 * aus den umschließenden Card-/MediaFrame-Varianten, niemals aus Stack selbst (siehe CLAUDE.md
 * "Frontend-UI": Rundungen/Flächen bleiben bei den dafür vorgesehenen Bausteinen).
 */
export function Stack({
  gap = 'section',
  align = 'stretch',
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: StackProps) {
  return (
    <Component
      {...props}
      style={{ ...style, '--stack-gap': GAP_PURPOSE_TOKENS[gap], '--stack-align': align } as CSSProperties}
      className={classNames(styles.stack, className)}
    >
      {children}
    </Component>
  )
}
