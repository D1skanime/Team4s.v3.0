import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './Text.module.css'

export type TextVariant = 'body' | 'soft' | 'meta' | 'small' | 'eyebrow'
export type TextTone = 'default' | 'onScrim' | 'error'
export type TextAs = 'p' | 'span'

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  /** 'onScrim' hält den Text auf einem dunklen Hintergrund (z. B. ein Foto-Banner mit Scrim)
   *  lesbar, unabhängig von der gewählten `variant` (WCAG-kontrastgeprüft). 'error' färbt in
   *  einem kontrastgeprüften Fehler-Rotton gegen den Kartenhintergrund -- für Formular-/Upload-
   *  Fehlertext statt einer eigenen, lokalen color-Regel am Aufrufer. */
  tone?: TextTone
  /** 'p' (Standard) für einen eigenständigen Absatz-Block. 'span' für eine reine Inline-Ausgabe
   *  ohne eigenen Block-Umbruch/-Außenabstand -- z. B. MetricLists Bezeichnung/Wert innerhalb von
   *  `<dt>`/`<dd>`, wo ein `<p>` unerwünschten Absatz-Außenabstand einbringen und den
   *  kompakten, nebeneinander ausgerichteten Beschriftung-Wert-Zeilen im Weg stehen würde. */
  as?: TextAs
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
  error: styles.textToneError,
}

/**
 * Typografie-Grundbaustein für Fließ-/Metatext mit fünf Tonalitätsstufen -- `eyebrow` für kurze,
 * großgeschriebene Überzeilen oberhalb eines Titels. Rendert standardmäßig als `<p>` und bewusst
 * OHNE eigenen margin-Reset -- Aufrufer (z. B. PageHeader/SectionHeader/DialogHeader/Card) setzen
 * ihr eigenes margin, das je Kontext unterschiedlich ausfällt. `as="span"` wechselt auf eine reine
 * Inline-Ausgabe für Kontexte, die kein eigenständiges `<p>` vertragen (z. B. innerhalb von
 * `<dt>`/`<dd>`, siehe MetricList). Jede Variante nutzt ein `var(--text-*-size/-color,
 * <Fallback>)`-Muster als EIGENEN, internen Mechanismus; `tone="onScrim"` ist die offizielle Prop
 * für den einzigen bislang benötigten Farb-Sonderfall (dunkler Hintergrund).
 */
export function Text({ variant = 'body', tone = 'default', as = 'p', className, ...rest }: TextProps) {
  const Tag = as
  return <Tag className={classNames(VARIANT_CLASS[variant], TONE_CLASS[tone], className)} {...rest} />
}
