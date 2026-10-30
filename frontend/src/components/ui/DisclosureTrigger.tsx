'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import { DisclosureIndicator } from './DisclosureIndicator'
import styles from './DisclosureTrigger.module.css'

export interface DisclosureTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'title'> {
  /** Sichtbarer Titel der Kopfzeile. Beliebiger Inhalt, nicht nur Text (z. B. inkl. Badge).
   *  Überschreibt bewusst das native HTML-`title`-Attribut (Tooltip-Text) -- diese Prop meint
   *  den sichtbaren Kopfzeilen-Inhalt, keinen Tooltip. */
  title: ReactNode
  open: boolean
}

/**
 * Vollbreite, aufklappbare Kopfzeile: Titel + Öffner-Symbol (`DisclosureIndicator`). Der
 * Aufrufer bleibt für `aria-controls`/`id`/`onClick` verantwortlich (wie bei jedem anderen
 * nativen `<button>`) -- nur `aria-expanded` setzt dieser Baustein selbst, aus `open` abgeleitet,
 * damit es nie mit dem sichtbaren Öffner-Symbol auseinanderlaufen kann.
 *
 * Grundbaustein für `Accordion` und künftige aufklappbare Kopfzeilen außerhalb eines Akkordeons
 * (UAT-Runde 4, Befund 6, 2026-10-30) -- vorher baute `Accordion` seinen eigenen, undokumentiert
 * wiederholbaren nativen `<button>` direkt selbst. Das native `<button>` bleibt HIER die
 * technisch zutreffende Basis (ein vollbreites Flex-Layout aus Titel + Öffner-Symbol mit eigenem
 * ARIA-Widget-Vertrag passt weder zu `Button`s Text-Button-Form noch zu `IconButton`s
 * Icon-only-Form), ist jetzt aber an genau EINER Stelle dokumentiert statt in jedem Aufrufer
 * einzeln neu zu rechtfertigen.
 */
export function DisclosureTrigger({ title, open, className, ...rest }: DisclosureTriggerProps) {
  return (
    <button
      type="button"
      {...rest}
      className={classNames(styles.disclosureTrigger, open && styles.disclosureTriggerOpen, className)}
      aria-expanded={open}
    >
      <span className={styles.disclosureTriggerTitle}>{title}</span>
      <DisclosureIndicator open={open} size="sm" variant="plain" />
    </button>
  )
}
