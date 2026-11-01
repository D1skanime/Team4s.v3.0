import type { ReactNode } from 'react'

import { Heading } from './Heading'
import { Text } from './Text'
import styles from './PageHeader.module.css'

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
        {eyebrow ? <Text variant="eyebrow" className={styles.eyebrow}>{eyebrow}</Text> : null}
        <Heading level={1} className={styles.pageTitle}>{title}</Heading>
        {description ? <Text variant="meta" className={styles.pageDescription}>{description}</Text> : null}
      </div>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  )
}
