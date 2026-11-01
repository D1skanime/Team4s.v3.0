import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from './Card'
import { Heading } from './Heading'
import { StatusIcon } from './StatusIcon'
import { Text } from './Text'
import ownStyles from './EmptyState.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

type EmptyStateVariant = 'default' | 'withAction' | 'compact' | 'inline' | 'info'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: EmptyStateVariant
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  variant = 'default',
  icon,
  className,
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <p className={styles.stateInline}>
        {title}
        {description ? ` – ${description}` : null}
      </p>
    )
  }

  return (
    <Card variant={variant === 'compact' ? 'compact' : 'flat'} className={className}>
      <StatusIcon tone={variant === 'info' ? 'info' : 'neutral'} icon={icon ?? <Inbox size={20} strokeWidth={2} />} />
      <Heading level={3} size={3} className={styles.stateTitle}>{title}</Heading>
      {description ? <Text variant="soft" className={styles.stateDescription}>{description}</Text> : null}
      {variant === 'withAction' || action ? action : null}
    </Card>
  )
}
