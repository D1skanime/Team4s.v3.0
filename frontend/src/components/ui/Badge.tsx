import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={classNames(
        styles.badge,
        variant === 'neutral' && styles.badgeNeutral,
        variant === 'success' && styles.badgeSuccess,
        variant === 'warning' && styles.badgeWarning,
        variant === 'danger' && styles.badgeDanger,
        variant === 'info' && styles.badgeInfo,
        variant === 'muted' && styles.badgeMuted,
        className,
      )}
    >
      {children}
    </span>
  )
}
