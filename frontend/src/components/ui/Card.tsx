import type { HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

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
      {title ? <h3 className={styles.cardTitle}>{title}</h3> : null}
      {description ? <p className={styles.cardDescription}>{description}</p> : null}
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
