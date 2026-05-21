import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type EmptyStateVariant = 'default' | 'withAction' | 'compact'

export interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  variant?: EmptyStateVariant
}

export function EmptyState({ title, description, action, variant = 'default' }: EmptyStateProps) {
  return (
    <div className={classNames(styles.stateCard, styles.stateNeutral, variant === 'compact' && styles.stateCompact)}>
      <div className={styles.stateIcon} aria-hidden="true">
        <Inbox size={20} strokeWidth={2} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {variant === 'withAction' || action ? action : null}
    </div>
  )
}
