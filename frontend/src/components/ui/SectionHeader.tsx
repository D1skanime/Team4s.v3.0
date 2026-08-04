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
}

export function SectionHeader({
  eyebrow,
  title,
  level = 2,
  description,
  actions,
  underline,
}: SectionHeaderProps) {
  const Heading = level === 3 ? 'h3' : 'h2'

  return (
    <div className={underline ? `${styles.sectionHeader} ${styles.sectionHeaderUnderline}` : styles.sectionHeader}>
      <div className={styles.sectionHeaderContent}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <Heading className={styles.sectionTitle}>{title}</Heading>
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  )
}
