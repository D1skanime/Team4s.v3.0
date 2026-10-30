import type { ReactNode } from 'react'

import { Button } from './Button'
import { Heading } from './Heading'
import { Text } from './Text'
import { classNames } from './classNames'
import styles from './MetricList.module.css'

export interface MetricListItem {
  label: string
  value: ReactNode
  onActivate?: () => void
  activateLabel?: string
}

export interface MetricListProps {
  items: MetricListItem[]
  ariaLabel: string
  className?: string
  variant?: 'default' | 'inline'
}

/**
 * Liste von Kennzahlen (Bezeichnung + Wert), wahlweise untereinander-nebeneinander ("default")
 * oder als kompakte, durch Punkte getrennte Reihe ("inline"). Eine Kennzahl kann klickbar sein
 * (z. B. um zu einem passenden Abschnitt der Seite zu springen).
 */
export function MetricList({ items, ariaLabel, className, variant = 'default' }: MetricListProps) {
  if (items.length === 0) return null

  return (
    <dl className={classNames(styles.metricList, variant === 'inline' && styles.metricListInline, className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.label} className={styles.metricItem}>
          {variant === 'inline' ? (
            <>
              <dt className={styles.metricInlineLabel}><Text variant="small">{item.label}</Text></dt>
              <dd className={styles.metricInlineValue}>
                {item.onActivate ? (
                  <Button type="button" variant="text" className={styles.metricInlineValueButton} onClick={item.onActivate} aria-label={item.activateLabel}>
                    {item.value}<span aria-hidden="true"> {item.label}</span>
                  </Button>
                ) : (
                  <Text variant="meta" className={styles.metricInlineValueText}>{item.value}<span aria-hidden="true"> {item.label}</span></Text>
                )}
              </dd>
            </>
          ) : (
            <>
              <dt><Text variant="small" className={styles.metricLabel}>{item.label}</Text></dt>
              <dd>
                {item.onActivate ? (
                  <Button type="button" variant="text" className={styles.metricValueButton} onClick={item.onActivate} aria-label={item.activateLabel}>
                    {item.value}
                  </Button>
                ) : (
                  <Heading level={4} size="hero" className={styles.metricValue}>{item.value}</Heading>
                )}
              </dd>
            </>
          )}
        </div>
      ))}
    </dl>
  )
}
