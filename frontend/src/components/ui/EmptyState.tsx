import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type EmptyStateVariant = 'default' | 'withAction' | 'compact' | 'inline'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: EmptyStateVariant
}

export function EmptyState({ title, description, action, variant = 'default' }: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <p className={styles.stateInline}>
        {title}
        {description ? ` – ${description}` : null}
      </p>
    )
  }

  return (
    <div className={classNames(styles.stateCard, styles.stateNeutral, variant === 'compact' && styles.stateCompact)}>
      <div className={styles.stateIcon} aria-hidden="true">
        <Inbox size={20} strokeWidth={2} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      {description ? <p className={styles.stateDescription}>{description}</p> : null}
      {variant === 'withAction' || action ? action : null}
    </div>
  )
}
