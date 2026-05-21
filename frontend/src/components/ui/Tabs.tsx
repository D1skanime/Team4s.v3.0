'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface TabItem {
  id: string
  label: string
  badge?: ReactNode
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  defaultTabId?: string
}

export function Tabs({ items, defaultTabId }: TabsProps) {
  const baseId = useId()
  const [activeId, setActiveId] = useState(defaultTabId ?? items[0]?.id)
  const active = items.find((item) => item.id === activeId) ?? items[0]

  if (!active) {
    return null
  }

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist" aria-label="Inhaltsreiter">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-${item.id}-tab`}
            className={classNames(styles.tabButton, item.id === active.id && styles.tabButtonActive)}
            aria-selected={item.id === active.id}
            aria-controls={`${baseId}-${item.id}-panel`}
            onClick={() => setActiveId(item.id)}
          >
            {item.label}
            {item.badge ? <span className={styles.tabBadge}>{item.badge}</span> : null}
          </button>
        ))}
      </div>
      <div
        className={styles.tabPanel}
        role="tabpanel"
        id={`${baseId}-${active.id}-panel`}
        aria-labelledby={`${baseId}-${active.id}-tab`}
      >
        {active.content}
      </div>
    </div>
  )
}
