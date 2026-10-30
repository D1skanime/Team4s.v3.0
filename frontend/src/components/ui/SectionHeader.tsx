import type { ReactNode } from 'react'

import { Heading } from './Heading'
import { Text } from './Text'
import styles from './SectionHeader.module.css'

export interface SectionHeaderProps {
  eyebrow?: string
  title: string
  /** Semantisches Überschriften-Level. Standard ist das Section-Level h2. */
  level?: 2 | 3
  description?: string
  actions?: ReactNode
  /** Wein-Unterstrich (dev-ui Header-Linie) unter dem Header. */
  underline?: boolean
  /** Optionales Icon, das direkt vor dem Titel in dessen eigener Zeile gerendert wird. */
  icon?: ReactNode
  /** Optionaler Zähler, der direkt nach dem Titel in dessen eigener Zeile gerendert wird (bricht nie um). */
  counter?: ReactNode
  /** Optionale Klasse für das Heading-Element, wenn eine Sektion eine abweichende Größe braucht. */
  titleClassName?: string
}

export function SectionHeader({
  eyebrow,
  title,
  level = 2,
  description,
  actions,
  underline,
  icon,
  counter,
  titleClassName,
}: SectionHeaderProps) {
  const hasTitleRow = Boolean(icon || counter)

  return (
    <div className={underline ? `${styles.sectionHeader} ${styles.sectionHeaderUnderline}` : styles.sectionHeader}>
      <div className={styles.sectionHeaderContent}>
        {eyebrow ? <Text variant="eyebrow" className={styles.eyebrow}>{eyebrow}</Text> : null}
        {hasTitleRow ? (
          <div className={styles.sectionHeaderTitleRow}>
            {icon ? <span className={styles.sectionHeaderIcon}>{icon}</span> : null}
            <Heading level={level} size={3} className={`${styles.sectionTitle} ${titleClassName ?? ''}`.trim()}>{title}</Heading>
            {counter ? <span className={styles.sectionHeaderCounter}>{counter}</span> : null}
          </div>
        ) : (
          <Heading level={level} size={3} className={`${styles.sectionTitle} ${titleClassName ?? ''}`.trim()}>{title}</Heading>
        )}
        {description ? <Text variant="soft" className={styles.sectionDescription}>{description}</Text> : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  )
}
