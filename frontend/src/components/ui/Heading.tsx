import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Heading.module.css'

export type HeadingLevel = 1 | 2 | 3 | 4
export type HeadingVisualSize = HeadingLevel | 'hero'
export type HeadingTone = 'default' | 'accent' | 'onScrim'

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantisches Tag (h1-h4) -- bestimmt die Dokumentstruktur/Barrierefreiheits-Hierarchie. */
  level: HeadingLevel
  /** Visuelle Größenstufe, unabhängig vom Tag wählbar (Standard: identisch zu `level`).
   *  Ermöglicht z. B. ein semantisches h3, das visuell wie ein H2 aussieht. `'hero'` liegt
   *  zwischen H1 und H2 und ist für prominente, aber kompakte Titel gedacht (z. B. ein
   *  Profil-/Gruppen-Titel in einer Kopfzeile, die nicht die volle Seitenüberschrift sein soll). */
  size?: HeadingVisualSize
  /** 'accent' färbt die Überschrift in der Akzentfarbe (--accent-deep) statt der Standardfarbe
   *  --text-strong, z. B. für eine hervorgehobene Kennzahl. 'onScrim' hält sie auf einem dunklen
   *  Hintergrund (z. B. ein Foto-Banner mit Scrim) lesbar (--scrim-text, WCAG-kontrastgeprüft). */
  tone?: HeadingTone
}

const TAG_BY_LEVEL: Record<HeadingLevel, 'h1' | 'h2' | 'h3' | 'h4'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
}

const SIZE_CLASS_BY_VISUAL_SIZE: Record<HeadingVisualSize, string> = {
  hero: styles.headingSizeHero,
  1: styles.headingSize1,
  2: styles.headingSize2,
  3: styles.headingSize3,
  4: styles.headingSize4,
}

const TONE_CLASS_BY_TONE: Record<HeadingTone, string | undefined> = {
  default: undefined,
  accent: styles.headingToneAccent,
  onScrim: styles.headingToneOnScrim,
}

/**
 * Typografie-Grundbaustein für Überschriften: trennt bewusst das semantische Tag (`level`,
 * für die Dokumentstruktur) von der visuellen Größe (`size`, Standard = `level`). Liefert
 * standardmäßig `color: var(--text-strong)`, mit `tone="accent"` offiziell wählbar `--accent-deep`
 * (z. B. für eine hervorgehobene Kennzahl) -- kein Aufrufer muss die Farbe mehr per eigener
 * CSS-Klasse von außen überschreiben.
 */
export function Heading({ level, size, tone = 'default', className, ...rest }: HeadingProps) {
  const Tag = TAG_BY_LEVEL[level]
  const visualSize = size ?? level

  return <Tag className={classNames(styles.heading, SIZE_CLASS_BY_VISUAL_SIZE[visualSize], TONE_CLASS_BY_TONE[tone], className)} {...rest} />
}
