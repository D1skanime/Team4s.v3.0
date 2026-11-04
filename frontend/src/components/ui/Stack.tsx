import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Stack.module.css'

/** Zweck-Benennung von Stacks Abstandsmaß -- KEINE rohe Space-Skalenstufe mehr,
 *  sondern ein benannter Einsatzzweck, der intern über ein eigenes Zweck-Token in
 *  `src/styles/tokens/layout.css` auf die unveränderte `--space-N`-Grundskala verweist. Die
 *  beiden Namen beschreiben die tatsächliche STRUKTUR der gestapelten Kinder, nicht eine Größe
 *  (Befund D, Runde 3 -- die vormalige Benennung enthielt ein Größenwort und einen mit
 *  Seitenabschnitts-Abstand verwechselbaren Namen, obwohl beide Zwecke rein INNERHALB eines
 *  Bausteins gelten):
 *  - `'independentBlocks'`: trennt voneinander unabhängige, gleichrangige Inhaltsblöcke INNERHALB
 *    eines Bausteins (z. B. Merklisten-Knopf, Trennlinie und Genre-Abschnitt im Anime-Kopf;
 *    einzelne Episodenzeilen in der Episodenliste). Niemals Abstand zwischen Seitenabschnitten --
 *    das bleibt Aufgabe der Seite selbst, nie dieses Grundbausteins.
 *  - `'relatedContent'`: fasst eng zusammengehörige Inhalte dicht zusammen, die gemeinsam EINE
 *    Einheit beschreiben (ein Eyebrow-Label mit seiner Chip-Reihe, oder die Metadatenzeilen EINER
 *    Release-Zeile). */
export type StackGapPurpose = 'independentBlocks' | 'relatedContent'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf die rohe `--space-N`-Grundskala (siehe `StackGapPurpose`-Dokumentation oben). */
const GAP_PURPOSE_TOKENS: Record<StackGapPurpose, string> = {
  independentBlocks: 'var(--space-independent-blocks)',
  relatedContent: 'var(--space-related-content)',
}

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als benannter Zweck (Standard 'independentBlocks' =
   *  var(--space-independent-blocks)). */
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
  gap = 'independentBlocks',
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
