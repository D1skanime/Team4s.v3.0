'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface AccordionItemDef {
  id: string
  title: string
  children: ReactNode
}

export interface AccordionProps {
  items: AccordionItemDef[]
  /** Modus: 'multi' (Standard) = mehrere Items gleichzeitig offen; 'single' = nur ein Item offen */
  mode?: 'multi' | 'single'
  className?: string
}

export function Accordion({ items, mode = 'multi', className }: AccordionProps) {
  const baseId = useId()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (mode === 'single') {
          next.clear()
        }
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={classNames(styles.accordionRoot, className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        const headerId = `${baseId}-${item.id}-header`
        const panelId = `${baseId}-${item.id}-panel`

        return (
          <div key={item.id} className={styles.accordionItem}>
            <button
              type="button"
              id={headerId}
              className={classNames(
                styles.accordionHeader,
                isOpen && styles.accordionHeaderOpen,
              )}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
            >
              <span>{item.title}</span>
              <span
                className={classNames(
                  styles.accordionChevron,
                  isOpen && styles.accordionChevronOpen,
                )}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className={styles.accordionPanel}
              >
                {item.children}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
