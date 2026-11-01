import type { ReactNode } from 'react'

import { classNames } from './classNames'
import { VisuallyHidden } from './VisuallyHidden'
import styles from './Label.module.css'

export interface LabelProps {
  htmlFor?: string
  id?: string
  /** Markiert das zugehörige Feld als Pflichtfeld: sichtbares `*` (dekorativ, `aria-hidden`)
   *  plus ein zusätzlicher, nur für Screenreader vorhandener Hinweistext -- ein Screenreader
   *  hört dadurch "(Pflichtfeld)" statt nur eines stummen Sternchens. */
  required?: boolean
  children: ReactNode
  className?: string
}

/**
 * Grundbaustein für Feldbeschriftungen mit optionaler Pflicht-Markierung. Wird von FormField
 * intern genutzt, steht aber zusätzlich eigenständig für Fälle ohne FormField zur Verfügung
 * (z. B. eine Switch- oder Checkbox-Gruppe, die aktuell keine standardisierte Beschriftung hat) --
 * vor einem neuen, handgebauten `<label>` immer zuerst prüfen, ob dieser Baustein wiederverwendbar
 * ist.
 */
export function Label({ htmlFor, id, required = false, children, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} id={id} className={classNames(styles.label, className)}>
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className={styles.labelRequired}> *</span>
          <VisuallyHidden> (Pflichtfeld)</VisuallyHidden>
        </>
      ) : null}
    </label>
  )
}
