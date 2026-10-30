import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Text.module.css'

export type TextVariant = 'body' | 'soft' | 'meta' | 'small'

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant
}

const VARIANT_CLASS: Record<TextVariant, string> = {
  body: styles.textBody,
  soft: styles.textSoft,
  meta: styles.textMeta,
  small: styles.textSmall,
}

/**
 * Typografie-Grundbaustein für Fließ-/Metatext mit vier Tonalitätsstufen. Rendert bewusst
 * KEINEN margin-Reset -- Aufrufer (z. B. PageHeader/SectionHeader/DialogHeader/Card) setzen ihr
 * eigenes margin, das je Kontext unterschiedlich ausfällt. Jede Variante nutzt ein
 * `var(--text-*-size/-color, <Fallback>)`-Muster: Aufrufer können Größe/Farbe per eigener
 * CSS-Klasse auf demselben Element überschreiben, ohne von der CSS-Modul-Bündelreihenfolge
 * abhängig zu sein (identisches Muster wie Badge/--hero-metrics-* aus der vorangegangenen
 * UAT-Runde).
 */
export function Text({ variant = 'body', className, ...rest }: TextProps) {
  return <p className={classNames(VARIANT_CLASS[variant], className)} {...rest} />
}
