import type { ReactNode } from 'react'

import ownStyles from './PageHeader.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

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
