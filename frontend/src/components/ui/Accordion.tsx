'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { classNames } from './classNames'
import { DisclosureTrigger } from './DisclosureTrigger'
import styles from './Accordion.module.css'

export interface AccordionItemDef {
  id: string
  title: ReactNode
  children: ReactNode
}

export interface AccordionProps {
  items: AccordionItemDef[]
  /** Modus: 'multi' (Standard) = mehrere Items gleichzeitig offen; 'single' = nur ein Item offen */
  mode?: 'multi' | 'single'
  className?: string
  /**
   * Controlled-Modus: offene Item-IDs werden vom Parent gehalten.
   * Muss zusammen mit onOpenChange genutzt werden. Bleibt der Open-Zustand so
   * über Re-Mounts/Daten-Refreshes hinweg stabil (z.B. nach einer Mutation).
   */
  openIds?: Set<string>
  /** Controlled-Modus: Callback bei Toggle; erhält die neue Menge offener IDs. */
  onOpenChange?: (next: Set<string>) => void
  /** Unkontrollierter Modus: welche Items beim ersten Rendern bereits offen sind. Wird
   *  ignoriert, sobald `openIds` gesetzt ist. */
  defaultOpenIds?: Set<string>
  /**
   * Optional: IDs, deren Panel-Inhalt auch im geschlossenen Zustand im DOM
   * gemountet bleibt (nur visuell via `hidden` versteckt statt unmounted).
   * Nützlich für lazy-geladene Inhalte, die beim Wiederöffnen nicht erneut
   * fetchen sollen (z.B. einmal aktivierte Tab-Komponenten).
   */
  keepMountedIds?: Set<string>
}

export function Accordion({
  items,
  mode = 'multi',
  className,
  openIds: controlledOpenIds,
  onOpenChange,
  defaultOpenIds,
  keepMountedIds,
}: AccordionProps) {
  const baseId = useId()
  const isControlled = controlledOpenIds !== undefined
  const [internalOpenIds, setInternalOpenIds] = useState<Set<string>>(() => new Set(defaultOpenIds))
  const openIds = isControlled ? controlledOpenIds : internalOpenIds

  function toggle(id: string) {
    const next = new Set(openIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (mode === 'single') {
        next.clear()
      }
      next.add(id)
    }
    if (isControlled) {
      onOpenChange?.(next)
    } else {
      setInternalOpenIds(next)
    }
  }

  return (
    <div className={classNames(styles.accordionRoot, 'accordionRoot', className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        const isMounted = isOpen || keepMountedIds?.has(item.id) === true
        const headerId = `${baseId}-${item.id}-header`
        const panelId = `${baseId}-${item.id}-panel`

        return (
          <div key={item.id} className={styles.accordionItem}>
            <DisclosureTrigger
              id={headerId}
              title={item.title}
              open={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
            />

            {isMounted ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className={styles.accordionPanel}
                hidden={!isOpen}
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
