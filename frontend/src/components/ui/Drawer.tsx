'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from './Button'
import { classNames } from './classNames'
import styles from './ui.module.css'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  variant?: 'side' | 'responsiveSheet'
}

export function Drawer({ open, onClose, title, description, children, footer, variant = 'side' }: DrawerProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className={classNames(styles.drawerWrap, variant === 'responsiveSheet' && styles.drawerWrapSheet)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ui-drawer-title"
    >
      <div className={styles.overlay} aria-hidden="true" />
      <button type="button" className={styles.overlayClose} aria-label="Drawer schließen" onClick={onClose} />
      <aside className={classNames(styles.drawerPanel, variant === 'responsiveSheet' && styles.drawerPanelSheet)}>
        <div className={styles.drawerHeader}>
          <div>
            <h3 className={styles.dialogTitle} id="ui-drawer-title">{title}</h3>
            {description ? <p className={styles.dialogDescription}>{description}</p> : null}
          </div>
          <button type="button" className={styles.closeButton} aria-label="Schließen" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
        <div className={styles.drawerFooter}>
          {footer ?? <Button variant="secondary" onClick={onClose}>Fertig</Button>}
        </div>
      </aside>
    </div>
  )
}
