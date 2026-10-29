import type { HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import { Heading } from './Heading'
import { Text } from './Text'
import styles from './Card.module.css'

type CardVariant = 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat' | 'nested' | 'nestedFlat'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  title?: string
  description?: string
  header?: ReactNode
  footer?: ReactNode
}

export function Card({
  variant = 'default',
  title,
  description,
  header,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  const cardHeader = header ?? (title || description ? (
    <div>
      {title ? <Heading level={3} size={3} className={styles.cardTitle}>{title}</Heading> : null}
      {description ? <Text variant="soft" className={styles.cardDescription}>{description}</Text> : null}
    </div>
  ) : null)

  return (
    <section
      {...props}
      className={classNames(
        styles.card,
        variant === 'elevated' && styles.cardElevated,
        variant === 'interactive' && styles.cardInteractive,
        variant === 'compact' && styles.cardCompact,
        variant === 'section' && styles.cardSection,
        variant === 'flat' && styles.cardFlat,
        variant === 'nested' && styles.cardNested,
        variant === 'nestedFlat' && styles.cardNestedFlat,
        className,
      )}
    >
      {cardHeader ? <div className={styles.cardHeader}>{cardHeader}</div> : null}
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </section>
  )
}
