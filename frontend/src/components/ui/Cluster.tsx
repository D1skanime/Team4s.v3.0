import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Cluster.module.css'

/** Zweck-Benennung von Clusters Abstandsmaß -- KEINE rohe Space-Skalenstufe mehr,
 *  sondern ein benannter Einsatzzweck pro tatsächlicher Aufrufstellen-Rolle:
 *  - `'badgeRow'`: dichte, rein lesbare Abzeichen-/Chip-/Tag-/Logo-Reihe ohne Interaktion.
 *  - `'interactiveChipRow'`: Reihe klickbarer Filter-/Auswahl-Chips (z. B. Fansub-Gruppen-
 *    Umschalter).
 *  - `'contentPair'`: zwei unterschiedliche, gleichrangige Inhaltsblöcke nebeneinander (z. B.
 *    Avatar-Gruppe neben Textspalte).
 *  - `'actionRow'`: Aktionslink-Reihe, meist durch eine Trennlinie vom Inhalt oben abgesetzt.
 *  - `'labelWithTrailingMeta'`: eine Hauptbeschriftung links, eine an das Zeilenende gedrückte
 *    Zusatzinfo rechts (z. B. die Episodenkarten-Kopfzeile: Titel-Block + Versionszähler-Badge).
 *    Bewusst NICHT `'contentPair'` wiederverwendet, obwohl beide zwei Bloecke nebeneinander
 *    setzen: `'contentPair'` beschreibt zwei GLEICHRANGIGE Bloecke (var(--space-4)), hier ist der
 *    zweite Block eine untergeordnete Zusatzinfo bei engerem Soll-Abstand (var(--space-3)).
 *  - `'mediaCaption'`: ein Vorschaubild neben seiner Bildunterschrift (z. B. die
 *    Randnavigations-Vorschaukarte: Cover-Thumbnail + Titel/Typ-Textblock).
 *  Cluster deklariert diese Enum bewusst eigenständig statt sie aus './Stack' zu importieren --
 *  Cluster ist ein eigenständiger Grundbaustein und darf laut Katalog-Taxonomie
 *  (catalogTaxonomy.test.ts) keinen anderen, selbst katalogisierten Grundbaustein importieren,
 *  auch keinen reinen Typ-Import (die Prüfung durchsucht ausschließlich den Quelltext nach
 *  `from './X'`). */
export type ClusterGapPurpose =
  | 'badgeRow'
  | 'interactiveChipRow'
  | 'contentPair'
  | 'actionRow'
  | 'labelWithTrailingMeta'
  | 'mediaCaption'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf die rohe `--space-N`-Grundskala (siehe `ClusterGapPurpose`-Dokumentation oben). */
const GAP_PURPOSE_TOKENS: Record<ClusterGapPurpose, string> = {
  badgeRow: 'var(--space-badge-row)',
  interactiveChipRow: 'var(--space-interactive-chip-row)',
  contentPair: 'var(--space-content-pair)',
  actionRow: 'var(--space-action-row)',
  labelWithTrailingMeta: 'var(--space-label-with-trailing-meta)',
  mediaCaption: 'var(--space-media-caption)',
}

type ClusterJustify = 'start' | 'center' | 'end' | 'between'

const JUSTIFY_KEYWORDS: Record<ClusterJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als benannter Zweck (Standard 'badgeRow' = var(--space-badge-row)). */
  gap?: ClusterGapPurpose
  /** Querachsen-Ausrichtung der Kinder (Standard 'center'). */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  /** Hauptachsen-Verteilung der Kinder (Standard 'start'). */
  justify?: ClusterJustify
  /** Umbruch bei fehlendem Platz (Standard true). */
  wrap?: boolean
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Horizontale Anordnung mehrerer Kinder mit Umbruch und token-basiertem Abstand -- der generische
 * Grundbaustein für jede Chip-/Badge-/Logo-Reihe dieser Codebasis. Setzt bewusst KEINE Fläche/
 * Farbe/Rundung selbst (siehe Stack.tsx für dieselbe Begründung).
 */
export function Cluster({
  gap = 'badgeRow',
  align = 'center',
  justify = 'start',
  wrap = true,
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: ClusterProps) {
  return (
    <Component
      {...props}
      style={{
        ...style,
        '--cluster-gap': GAP_PURPOSE_TOKENS[gap],
        '--cluster-align': align,
        '--cluster-justify': JUSTIFY_KEYWORDS[justify],
        '--cluster-wrap': wrap ? 'wrap' : 'nowrap',
      } as CSSProperties}
      className={classNames(styles.cluster, className)}
    >
      {children}
    </Component>
  )
}
