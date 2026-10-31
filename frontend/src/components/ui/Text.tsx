import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Text.module.css'

export type TextVariant = 'body' | 'soft' | 'meta' | 'small' | 'eyebrow'
export type TextTone = 'default' | 'onScrim'

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant
  /** 'onScrim' hält den Text auf einem dunklen Hintergrund (z. B. ein Foto-Banner mit Scrim)
   *  lesbar, unabhängig von der gewählten `variant` (WCAG-kontrastgeprüft). */
  tone?: TextTone
}

const VARIANT_CLASS: Record<TextVariant, string> = {
  body: styles.textBody,
  soft: styles.textSoft,
  meta: styles.textMeta,
  small: styles.textSmall,
  eyebrow: styles.textEyebrow,
}

const TONE_CLASS: Record<TextTone, string | undefined> = {
  default: undefined,
  onScrim: styles.textToneOnScrim,
}

/**
 * Typografie-Grundbaustein für Fließ-/Metatext mit fünf Tonalitätsstufen -- `eyebrow` für kurze,
 * großgeschriebene Überzeilen oberhalb eines Titels. Rendert bewusst KEINEN margin-Reset --
 * Aufrufer (z. B. PageHeader/SectionHeader/DialogHeader/Card) setzen ihr eigenes margin, das je
 * Kontext unterschiedlich ausfällt. Jede Variante nutzt ein `var(--text-*-size/-color,
 * <Fallback>)`-Muster als EIGENEN, internen Mechanismus; `tone="onScrim"` ist die offizielle Prop
 * für den einzigen bislang benötigten Farb-Sonderfall (dunkler Hintergrund).
 */
export function Text({ variant = 'body', tone = 'default', className, ...rest }: TextProps) {
  return <p className={classNames(VARIANT_CLASS[variant], TONE_CLASS[tone], className)} {...rest} />
}
