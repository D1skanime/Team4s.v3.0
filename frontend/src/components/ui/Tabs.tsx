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
  /**
   * Kontrollierter Modus (z. B. für URL-Sync, siehe UserDetailPageClient.tsx D-03):
   * wenn gesetzt, bestimmt der Aufrufer den aktiven Tab komplett selbst.
   * Ohne `activeId` verhält sich `Tabs` wie zuvor unkontrolliert (interner State).
   */
  activeId?: string
  onActiveIdChange?: (id: string) => void
  /**
   * Menge bereits besuchter Tab-IDs, die im DOM gemountet bleiben sollen (nur per
   * `hidden` visuell versteckt statt unmontiert) — mirrort `Accordion`s
   * `keepMountedIds`-Konvention. Ohne diese Prop wird ausschließlich der aktive
   * Tab gerendert (bisheriges Verhalten, jeder Tab-Wechsel unmontiert/montiert neu).
   * Nötig, wenn Tab-Inhalte einen eigenen Datenabruf besitzen und ein Re-Fetch
   * beim Zurückwechseln vermieden werden soll (D-03, 138-15-PLAN.md).
   */
  keepMountedIds?: Set<string>
}

export function Tabs({
  items,
  defaultTabId,
  activeId: controlledActiveId,
  onActiveIdChange,
  keepMountedIds,
}: TabsProps) {
  const baseId = useId()
  const [internalActiveId, setInternalActiveId] = useState(defaultTabId ?? items[0]?.id)
  const isControlled = controlledActiveId !== undefined
  const activeId = isControlled ? controlledActiveId : internalActiveId
  const active = items.find((item) => item.id === activeId) ?? items[0]

  if (!active) {
    return null
  }

  function selectTab(id: string) {
    if (!isControlled) {
      setInternalActiveId(id)
    }
    onActiveIdChange?.(id)
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
            onClick={() => selectTab(item.id)}
          >
            {item.label}
            {item.badge ? <span className={styles.tabBadge}>{item.badge}</span> : null}
          </button>
        ))}
      </div>
      {keepMountedIds
        ? items
            .filter((item) => item.id === active.id || keepMountedIds.has(item.id))
            .map((item) => (
              <div
                key={item.id}
                className={styles.tabPanel}
                role="tabpanel"
                id={`${baseId}-${item.id}-panel`}
                aria-labelledby={`${baseId}-${item.id}-tab`}
                hidden={item.id !== active.id}
              >
                {item.content}
              </div>
            ))
        : (
          <div
            className={styles.tabPanel}
            role="tabpanel"
            id={`${baseId}-${active.id}-panel`}
            aria-labelledby={`${baseId}-${active.id}-tab`}
          >
            {active.content}
          </div>
        )}
    </div>
  )
}
