import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface HeroMetricItem {
  label: string
  value: ReactNode
}

export interface HeroMetricsProps {
  items: HeroMetricItem[]
  ariaLabel: string
  className?: string
  variant?: 'default' | 'inline'
}

export function HeroMetrics({ items, ariaLabel, className, variant = 'default' }: HeroMetricsProps) {
  if (items.length === 0) return null

  return (
    <dl className={classNames(styles.heroMetrics, variant === 'inline' && styles.heroMetricsInline, className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.label} className={styles.heroMetricItem}>
          {variant === 'inline' ? (
            <>
              <dt className={styles.heroMetricInlineLabel}>{item.label}</dt>
              <dd>{item.value}<span aria-hidden="true"> {item.label}</span></dd>
            </>
          ) : (
            <>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </>
          )}
        </div>
      ))}
    </dl>
  )
}
