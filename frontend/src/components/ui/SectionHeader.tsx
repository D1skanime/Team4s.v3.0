import type { ReactNode } from 'react'

import styles from './ui.module.css'

export interface SectionHeaderProps {
  eyebrow?: string
  title: string
  /** Semantic heading level. Defaults to the section-level h2. */
  level?: 2 | 3
  description?: string
  actions?: ReactNode
  /** Wein-Unterstrich (dev-ui Header-Linie) unter dem Header. */
  underline?: boolean
  /** Optional icon rendered directly before the title, inside the title's own row. */
  icon?: ReactNode
  /** Optional counter rendered directly after the title, inside the title's own row (never wraps). */
  counter?: ReactNode
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
}: SectionHeaderProps) {
  const Heading = level === 3 ? 'h3' : 'h2'
  const hasTitleRow = Boolean(icon || counter)

  return (
    <div className={underline ? `${styles.sectionHeader} ${styles.sectionHeaderUnderline}` : styles.sectionHeader}>
      <div className={styles.sectionHeaderContent}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        {hasTitleRow ? (
          <div className={styles.sectionHeaderTitleRow}>
            {icon ? <span className={styles.sectionHeaderIcon}>{icon}</span> : null}
            <Heading className={styles.sectionTitle}>{title}</Heading>
            {counter ? <span className={styles.sectionHeaderCounter}>{counter}</span> : null}
          </div>
        ) : (
          <Heading className={styles.sectionTitle}>{title}</Heading>
        )}
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  )
}
