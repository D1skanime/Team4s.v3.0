'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from './Button'
import styles from './ui.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
      <div className={styles.overlay} aria-hidden="true" />
      <button type="button" className={styles.overlayClose} aria-label="Modal schließen" onClick={onClose} />
      <div className={styles.modalPanel}>
        <div className={styles.dialogHeader}>
          <div>
            <h3 className={styles.dialogTitle} id="ui-modal-title">{title}</h3>
            {description ? <p className={styles.dialogDescription}>{description}</p> : null}
          </div>
          <button type="button" className={styles.closeButton} aria-label="Schließen" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.dialogFooter}>
          {footer ?? <Button variant="secondary" onClick={onClose}>Schließen</Button>}
        </div>
      </div>
    </div>
  )
}
