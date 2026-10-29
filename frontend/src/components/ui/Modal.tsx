'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent, ReactNode } from 'react'

import { Button } from './Button'
import { DialogHeader } from './DialogHeader'
import { IconButton } from './IconButton'
import ownStyles from './Modal.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** 'md' (Standard) oder 'lg' für breite Inhalte wie Bild-Lightboxen. */
  size?: 'md' | 'lg'
  /**
   * Optionale zusätzliche Klasse für das Panel-Element eines einzelnen Modal-Callers
   * (additiv, kein Default -- jeder bestehende Aufrufer lässt dieses Feld weg und ist
   * dadurch byte-identisch zu vorher). Siehe RoleCapabilityImpactPreviewModal.module.css's
   * .narrowHeightFix für das erste/einzige Beispiel.
   */
  panelClassName?: string
  /**
   * 'default' (Standard) oder 'stage' für eine chrome-unterdrückende Variante ohne
   * Header, ohne Footer und ohne Backdrop-Click-Close -- für den dunklen Bild-Viewer-Stage.
   * Additiv: jeder bestehende Aufrufer lässt dieses Feld weg und rendert dadurch
   * byte-identisch zu vorher.
   */
  variant?: 'default' | 'stage'
  /**
   * Wenn gesetzt und der Rückgabewert `true` ist, überspringt Modal das eigene `onClose` für
   * diesen Escape-Tastendruck (z. B. um zuerst nur ein internes Panel zu schließen). Additiv --
   * jeder bestehende Aufrufer lässt dieses Feld weg und schließt per Escape weiterhin genauso
   * wie heute.
   */
  onEscapeKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean
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
  variant = 'default',
  onEscapeKeyDown,
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
      if (onEscapeKeyDown?.(event)) return
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
    <div
      className={[styles.modalWrap, variant === 'stage' ? styles.modalWrapStage : null]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleID}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.overlay} aria-hidden="true" />
      {variant !== 'stage' ? (
        // Reiner Maus-Komfort-Layer (Klick auf den abgedunkelten Hintergrund schliesst das Modal).
        // Kein <button>, um den components/ui-Guard (Befund 8b) nicht zu verletzen -- Escape und
        // der IconButton-basierte Schliessen-Knopf bleiben die tastaturzugaenglichen Wege.
        <div role="presentation" aria-hidden="true" className={styles.overlayClose} onClick={onClose} />
      ) : null}
      <div
        className={[
          styles.modalPanel,
          size === 'lg' ? styles.modalPanelLg : null,
          variant === 'stage' ? styles.modalPanelStage : null,
          panelClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        ref={panelRef}
        tabIndex={-1}
      >
        {variant === 'stage' ? (
          <>
            <span id={titleID} className="visually-hidden">{title}</span>
            <IconButton
              ref={closeButtonRef}
              icon={<X size={18} />}
              aria-label="Schließen"
              variant="floating"
              onClick={onClose}
            />
          </>
        ) : (
          <DialogHeader
            title={title}
            description={description}
            onClose={onClose}
            titleId={titleID}
            closeButtonRef={closeButtonRef}
            variant="default"
            className={styles.dialogHeader}
          />
        )}
        <div className={[styles.modalBody, variant === 'stage' ? styles.modalBodyStage : null].filter(Boolean).join(' ')}>{children}</div>
        {variant !== 'stage' ? (
          <div className={styles.dialogFooter}>
            {footer ?? <Button variant="secondary" onClick={onClose}>Schließen</Button>}
          </div>
        ) : null}
      </div>
    </div>
  )

  // Portal an document.body -> Modal entkommt allen isolation/z-index-Kontexten (z. B. Section-Backdrop)
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}
