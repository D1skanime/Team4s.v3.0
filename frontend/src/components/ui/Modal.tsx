'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent, ReactNode } from 'react'

import { Button } from './Button'
import styles from './ui.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** 'md' (Standard) oder 'lg' fuer breite Inhalte wie Bild-Lightboxen. */
  size?: 'md' | 'lg'
  /**
   * Optionale zusaetzliche Klasse fuer das Panel-Element eines einzelnen Modal-Callers
   * (additiv, kein Default -- jeder bestehende Aufrufer laesst dieses Feld weg und ist
   * dadurch byte-identisch zu vorher). Siehe RoleCapabilityImpactPreviewModal.module.css's
   * .narrowHeightFix fuer das erste/einzige Beispiel (Plan 138-18, GAP-02).
   */
  panelClassName?: string
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false
    if (element.hasAttribute('disabled')) return false
    return true
  })
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  panelClassName,
}: ModalProps) {
  const titleID = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTarget = closeButtonRef.current ?? panelRef.current
    window.setTimeout(() => focusTarget?.focus(), 0)

    return () => {
      previouslyFocusedRef.current?.focus()
      previouslyFocusedRef.current = null
    }
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) return

    const focusable = getFocusableElements(panelRef.current)
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }

    const activeElement = document.activeElement
    const currentIndex = focusable.findIndex((element) => element === activeElement)
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1

    event.preventDefault()
    focusable[nextIndex]?.focus()
  }

  if (!open) {
    return null
  }

  const modal = (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby={titleID} onKeyDown={handleKeyDown}>
      <div className={styles.overlay} aria-hidden="true" />
      <button type="button" className={styles.overlayClose} aria-label="Modal schließen" onClick={onClose} />
      <div
        className={[styles.modalPanel, size === 'lg' ? styles.modalPanelLg : null, panelClassName]
          .filter(Boolean)
          .join(' ')}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className={styles.dialogHeader}>
          <div>
            <h3 className={styles.dialogTitle} id={titleID}>{title}</h3>
            {description ? <p className={styles.dialogDescription}>{description}</p> : null}
          </div>
          <button type="button" ref={closeButtonRef} className={styles.closeButton} aria-label="Schließen" onClick={onClose}>
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

  // Portal an document.body -> Modal entkommt allen isolation/z-index-Kontexten (z. B. Section-Backdrop)
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
