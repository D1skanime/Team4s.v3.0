import type { ReactNode } from 'react'

import styles from './ui.module.css'

export interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  /** Wein-Unterstrich (dev-ui Header-Linie) unter dem Header. */
  underline?: boolean
}

export function SectionHeader({ eyebrow, title, description, actions, underline }: SectionHeaderProps) {
  return (
    <div className={underline ? `${styles.sectionHeader} ${styles.sectionHeaderUnderline}` : styles.sectionHeader}>
      <div className={styles.sectionHeaderContent}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  )
}
