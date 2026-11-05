import { Children, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

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
   *  var(--space-independent-blocks)). Der ÜBERWIEGENDE Regelfall ist ein einzelner Zweck-Wert --
   *  einheitlicher Abstand zwischen allen Kindern, wie bisher über das native CSS-`gap` gelöst.
   *  Ein ARRAY von Zweck-Werten ist der Ausnahmefall für einen bewusst NICHT-einheitlichen
   *  Kind-zu-Kind-Abstandsrhythmus (z. B. eine Info-Karte, deren Titelzeile/Badges/Beschreibung/
   *  Tags jeweils einen eigenen, fachlich begründeten Abstand zur nächsten Zeile brauchen): die
   *  Array-Länge MUSS exakt `Kinderzahl - 1` sein (ein Wert pro LÜCKE zwischen zwei
   *  aufeinanderfolgenden Kindern, nicht ein Wert pro Kind) -- eine abweichende Länge wirft beim
   *  Rendern einen Fehler, damit eine spätere Kind-Änderung nie eine stillschweigend falsche
   *  Abstandszuordnung erzeugt. */
  gap?: StackGapPurpose | StackGapPurpose[]
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
  if (Array.isArray(gap)) {
    // Rhythmus-Modus: das native CSS-`gap` kann nur EINEN einheitlichen Abstand ausdrücken, hier
    // wird es deshalb auf den literalen Wert '0' gesetzt und jede Lücke stattdessen über einen
    // schlanken, ausschließlich mit `marginTop` versehenen Wrapper vor dem jeweils folgenden Kind
    // nachgebildet -- analog zum bestehenden `--stack-gap`-Override-Hook-Muster, aber pro Lücke
    // statt global. Kein className/keine weitere Deklaration auf dem Wrapper, damit kein neues
    // Flächen-/Farb-/Rundungs-Surface entsteht (siehe Komponentendokumentation unten).
    const childArray = Children.toArray(children)
    const expectedGapCount = childArray.length - 1
    if (gap.length !== expectedGapCount) {
      throw new Error(
        `Stack: Rhythmus-Array "gap" erwartet genau ${expectedGapCount} Werte (eine Lücke pro Paar ` +
          `aufeinanderfolgender Kinder bei ${childArray.length} Kindern), erhielt aber ${gap.length}.`,
      )
    }

    return (
      <Component
        {...props}
        style={{ ...style, '--stack-gap': '0', '--stack-align': align } as CSSProperties}
        className={classNames(styles.stack, className)}
      >
        {childArray.map((child, index) =>
          index === 0 ? (
            child
          ) : (
            <div key={index} style={{ marginTop: GAP_PURPOSE_TOKENS[gap[index - 1]] }}>
              {child}
            </div>
          ),
        )}
      </Component>
    )
  }

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
