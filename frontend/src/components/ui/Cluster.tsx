import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Cluster.module.css'

/* Space-Token-Werte identisch zu Stacks SpaceToken -- bewusst als eigener, inline wiederholter
   Literal-Typ statt eines Imports aus './Stack': Cluster ist ein eigenständiger Grundbaustein und
   darf laut Katalog-Taxonomie (catalogTaxonomy.test.ts) keinen anderen, selbst katalogisierten
   Grundbaustein importieren -- auch kein reiner Typ-Import würde das unterscheiden, da die
   Prüfung ausschließlich den Quelltext nach `from './X'` durchsucht. */
type SpaceToken = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

type ClusterJustify = 'start' | 'center' | 'end' | 'between'

const JUSTIFY_KEYWORDS: Record<ClusterJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als Space-Token (Standard '2' = var(--space-2)). */
  gap?: SpaceToken
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
  gap = '2',
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
        '--cluster-gap': `var(--space-${gap})`,
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
