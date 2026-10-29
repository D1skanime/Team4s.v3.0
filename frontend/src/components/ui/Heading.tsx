import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Heading.module.css'

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantisches Tag (h1-h4) -- bestimmt die Dokumentstruktur/Barrierefreiheits-Hierarchie. */
  level: HeadingLevel
  /** Visuelle Groessenstufe, unabhaengig vom Tag waehlbar (Standard: identisch zu `level`).
   *  Ermoeglicht z. B. ein semantisches h3, das visuell wie ein H2 aussieht (SectionHeader
   *  rendert wahlweise h2/h3, bleibt aber immer in der H3-Groessenstufe). */
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
 * Typografie-Grundbaustein fuer Ueberschriften: trennt bewusst das semantische Tag (`level`,
 * fuer die Dokumentstruktur) von der visuellen Groesse (`size`, Standard = `level`). Ohne diese
 * Trennung koennte SectionHeader (das wahlweise ein h2 oder h3 rendert, aber IMMER in derselben
 * visuellen H3-Groesse) seinen bestehenden `level`-Prop-Vertrag nicht beibehalten. Setzt bewusst
 * KEINE `color` -- die vier bestehenden Konsumenten (PageHeader/SectionHeader/DialogHeader/Card)
 * behalten ihre eigene, teils tokenisierte, teils vererbte Farbdeklaration.
 */
export function Heading({ level, size, className, ...rest }: HeadingProps) {
  const Tag = TAG_BY_LEVEL[level]
  const visualSize = size ?? level

  return <Tag className={classNames(styles.heading, SIZE_CLASS_BY_LEVEL[visualSize], className)} {...rest} />
}
