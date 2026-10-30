import type { ElementType, HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './VisuallyHidden.module.css'

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /** Welches HTML-Element gerendert wird (Standard: `span`). */
  as?: ElementType
}

/** CSS-Klasse für Fälle, in denen kein eigenes Element gerendert werden kann (z. B. ein
 *  natives `<input>`, das selbst unsichtbar, aber weiterhin fokussierbar bleiben muss). */
export const visuallyHiddenClassName = styles.visuallyHidden

/**
 * Versteckt Inhalt optisch, hält ihn aber für Screenreader und Tastaturfokus erreichbar.
 * Ersetzt die mehrfach im Repo kopierte „nur für Screenreader"-CSS-Kombination aus Position,
 * Clip und Größe.
 */
export function VisuallyHidden({ as: Tag = 'span', className, ...rest }: VisuallyHiddenProps) {
  return <Tag className={classNames(styles.visuallyHidden, className)} {...rest} />
}
