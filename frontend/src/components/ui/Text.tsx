import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Text.module.css'

export type TextVariant = 'body' | 'soft' | 'meta' | 'small' | 'eyebrow'

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant
}

const VARIANT_CLASS: Record<TextVariant, string> = {
  body: styles.textBody,
  soft: styles.textSoft,
  meta: styles.textMeta,
  small: styles.textSmall,
  eyebrow: styles.textEyebrow,
}

/**
 * Typografie-Grundbaustein für Fließ-/Metatext mit fünf Tonalitätsstufen -- `eyebrow` für kurze,
 * großgeschriebene Überzeilen oberhalb eines Titels. Rendert bewusst KEINEN margin-Reset --
 * Aufrufer (z. B. PageHeader/SectionHeader/DialogHeader/Card) setzen ihr eigenes margin, das je
 * Kontext unterschiedlich ausfällt. Jede Variante nutzt ein `var(--text-*-size/-color,
 * <Fallback>)`-Muster: Aufrufer können Größe/Farbe per eigener CSS-Klasse auf demselben Element
 * überschreiben, ohne von der CSS-Modul-Bündelreihenfolge abhängig zu sein.
 */
export function Text({ variant = 'body', className, ...rest }: TextProps) {
  return <p className={classNames(VARIANT_CLASS[variant], className)} {...rest} />
}
