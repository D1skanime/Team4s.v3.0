import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Heading.module.css'

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantisches Tag (h1-h4) -- bestimmt die Dokumentstruktur/Barrierefreiheits-Hierarchie. */
  level: HeadingLevel
  /** Visuelle Größenstufe, unabhängig vom Tag wählbar (Standard: identisch zu `level`).
   *  Ermöglicht z. B. ein semantisches h3, das visuell wie ein H2 aussieht (SectionHeader
   *  rendert wahlweise h2/h3, bleibt aber immer in der H3-Größenstufe). */
  size?: HeadingLevel
}

const TAG_BY_LEVEL: Record<HeadingLevel, 'h1' | 'h2' | 'h3' | 'h4'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
}

const SIZE_CLASS_BY_LEVEL: Record<HeadingLevel, string> = {
  1: styles.headingSize1,
  2: styles.headingSize2,
  3: styles.headingSize3,
  4: styles.headingSize4,
}

/**
 * Typografie-Grundbaustein für Überschriften: trennt bewusst das semantische Tag (`level`,
 * für die Dokumentstruktur) von der visuellen Größe (`size`, Standard = `level`). Ohne diese
 * Trennung könnte SectionHeader (das wahlweise ein h2 oder h3 rendert, aber IMMER in derselben
 * visuellen H3-Größe) seinen bestehenden `level`-Prop-Vertrag nicht beibehalten. Liefert
 * standardmäßig `color: var(--text-strong)` -- die vier bestehenden Konsumenten (PageHeader/
 * SectionHeader/DialogHeader/Card) benötigen dadurch keine eigene Farbdeklaration mehr. Kontexte
 * mit abweichendem Hintergrund (z. B. ein dunkler Hero-Scrim) überschreiben die Farbe gezielt
 * per eigener CSS-Klasse auf demselben Element, genau wie bei einer Heading-Größenstufe
 * (UAT-Runde 5, 2026-10-30).
 */
export function Heading({ level, size, className, ...rest }: HeadingProps) {
  const Tag = TAG_BY_LEVEL[level]
  const visualSize = size ?? level

  return <Tag className={classNames(styles.heading, SIZE_CLASS_BY_LEVEL[visualSize], className)} {...rest} />
}
