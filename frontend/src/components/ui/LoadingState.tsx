import { mergeCssModules } from '@/lib/mergeCssModules'

import { Card } from './Card'
import { Heading } from './Heading'
import { Spinner } from './Spinner'
import { Text } from './Text'
import ownStyles from './LoadingState.module.css'
import sharedStyles from './ui.module.css'

const styles = mergeCssModules(ownStyles, sharedStyles)

export interface LoadingStateProps {
  title?: string
  description?: string
  /** Dezenter Infinite-Scroll-Ladeindikator statt eines großen Zustands-Blocks. */
  compact?: boolean
  className?: string
}

export function LoadingState({
  title = 'Inhalt wird vorbereitet',
  description = 'Bitte einen Moment warten.',
  compact = false,
  className,
}: LoadingStateProps) {
  return (
    <Card variant={compact ? 'compact' : 'flat'} className={className} role="status" aria-live="polite">
      <Spinner size="md" tone="accent" />
      <Heading level={3} size={3} className={styles.stateTitle}>{title}</Heading>
      {description ? <Text variant="soft" className={styles.stateDescription}>{description}</Text> : null}
    </Card>
  )
}
