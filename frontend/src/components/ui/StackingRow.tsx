'use client'

import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './StackingRow.module.css'

/** Zweck-Benennung von StackingRows Abstandsmaß -- eigenständig deklariert statt aus Cluster/
 *  Stack importiert (gleiche Katalog-Taxonomie-Begründung wie bei Cluster: StackingRow ist ein
 *  eigenständiger Grundbaustein und darf laut `catalogTaxonomy.test.ts` keinen anderen, selbst
 *  katalogisierten Grundbaustein importieren, auch keinen reinen Typ-Import):
 *  - `'labelWithTrailingMeta'`: Hauptbeschriftung links, an das Zeilenende gedrückte Zusatzinfo
 *    rechts (z. B. eine Episodenkarten-Kopfzeile: Titel-Block + Versionszähler).
 *  - `'independentBlocks'`: trennt die Teile im gestapelten Zustand als voneinander unabhängige,
 *    gleichrangige Blöcke -- derselbe Zweck-Name und dasselbe Zweck-Token wie Stacks/Clusters
 *    gleichnamiger Zweck. */
export type StackingRowGapPurpose = 'labelWithTrailingMeta' | 'independentBlocks'

const GAP_PURPOSE_TOKENS: Record<StackingRowGapPurpose, string> = {
  labelWithTrailingMeta: 'var(--space-label-with-trailing-meta)',
  independentBlocks: 'var(--space-independent-blocks)',
}

export interface StackingRowProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Teilen in der Zeilen-Anordnung (Standard 'labelWithTrailingMeta'). */
  gap?: StackingRowGapPurpose
  /** Abstand zwischen den Teilen im gestapelten Zustand -- ohne Angabe 'independentBlocks'. */
  gapStacked?: StackingRowGapPurpose
  /** Zu rendernde Element-Art für Außen- UND Innenelement gleichermaßen (Standard 'div') --
   *  beide Ebenen tragen immer denselben Tag, damit z. B. `as="span"` (Einsatz innerhalb eines
   *  bereits bestehenden Inline-Elements wie `DisclosureTrigger`s Titel-Slot) niemals ein
   *  ungültiges Block-Element in einem Inline-Element verschachtelt. */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Zeile mit genau einem Zweck: ordnet ihre Teile nebeneinander an (Hauptbeschriftung links
 * wachsend, zweites Teil rechtsbündig) und stapelt sie stattdessen untereinander, sobald ihr
 * EIGENER verfügbarer Platz dafür nicht reicht -- über eine `@container`-Abfrage auf den
 * Baustein selbst, nicht über die Bildschirmbreite. Kein reiner Mobil-Baustein: Seiten
 * verwenden ihn überall gleich, er entscheidet selbst anhand seines tatsächlich verfügbaren
 * Platzes, unabhängig davon, wie schmal dieser Platz durch umgebende Layout-Entscheidungen
 * (z. B. eine verschachtelte Flex-Breitenaufteilung) tatsächlich wird. Setzt bewusst KEINE
 * Fläche/Farbe/Rundung selbst (siehe Stack.tsx/Cluster.tsx für dieselbe Begründung).
 *
 * Zweistufiges Rendering wie bei `Cluster`s `collapseBelow`/`SplitLayout` (siehe dort für die
 * ausführliche Begründung): ein Element darf laut CSS-Spezifikation nicht gleichzeitig der
 * eigene `@container`-Namensgeber UND das von dessen Abfrage umgeordnete Element sein -- ein
 * äußeres Element trägt deshalb nur `container: stacking-row / inline-size`, die eigentliche
 * Zeilen-/Stapel-Anordnung lebt in einem inneren Kind-Element.
 */
export function StackingRow({
  gap = 'labelWithTrailingMeta',
  gapStacked = 'independentBlocks',
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: StackingRowProps) {
  const mergedStyle = {
    ...style,
    '--stacking-row-gap': GAP_PURPOSE_TOKENS[gap],
    '--stacking-row-gap-stacked': GAP_PURPOSE_TOKENS[gapStacked],
  } as CSSProperties

  return (
    <Component {...props} style={mergedStyle} className={classNames(styles.stackingRowQueryContainer, className)}>
      <Component className={styles.stackingRow}>{children}</Component>
    </Component>
  )
}
