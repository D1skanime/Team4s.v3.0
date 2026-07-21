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
}

export function HeroMetrics({ items, ariaLabel, className }: HeroMetricsProps) {
  if (items.length === 0) return null

  return (
    <dl className={classNames(styles.heroMetrics, className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.label} className={styles.heroMetricItem}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
