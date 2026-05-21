import type { ReactNode } from 'react'

import styles from './ui.module.css'

export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderContent}>
        {breadcrumbs ? <div>{breadcrumbs}</div> : null}
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description ? <p className={styles.pageDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  )
}
