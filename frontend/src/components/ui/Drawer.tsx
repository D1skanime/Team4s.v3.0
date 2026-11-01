'use client'

import type { ReactNode } from 'react'

import { mergeCssModules } from '@/lib/mergeCssModules'

import { Button } from './Button'
import { classNames } from './classNames'
import { DialogHeader } from './DialogHeader'
import ownStyles from './Drawer.module.css'
import sharedStyles from './ui.module.css'

const styles = mergeCssModules(ownStyles, sharedStyles)

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  variant?: 'side' | 'responsiveSheet'
  size?: 'md' | 'lg'
}

export function Drawer({ open, onClose, title, description, children, footer, variant = 'side', size = 'md' }: DrawerProps) {
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
      {/* Reiner Maus-Komfort-Layer (Klick auf den abgedunkelten Hintergrund schließt den Drawer).
          Kein <button>, um das Lint-Verbot für native Buttons in components/ui nicht zu verletzen -- Escape (über
          den umschließenden Dialog) und der IconButton-basierte Schließen-Knopf bleiben die
          tastaturzugänglichen Wege. */}
      <div role="presentation" aria-hidden="true" className={styles.overlayClose} onClick={onClose} />
      <aside
        className={classNames(
          styles.drawerPanel,
          variant === 'responsiveSheet' && styles.drawerPanelSheet,
          size === 'lg' && styles.drawerPanelLg,
        )}
      >
        <DialogHeader
          title={title}
          description={description}
          onClose={onClose}
          titleId="ui-drawer-title"
          variant="default"
          className={styles.drawerHeader}
        />
        <div className={styles.drawerBody}>{children}</div>
        <div className={styles.drawerFooter}>
          {footer ?? <Button variant="secondary" onClick={onClose}>Fertig</Button>}
        </div>
      </aside>
    </div>
  )
}
