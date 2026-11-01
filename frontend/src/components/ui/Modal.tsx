'use client'

import { X } from 'lucide-react'
import { useId } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'

import { mergeCssModules } from '@/lib/mergeCssModules'

import { Button } from './Button'
import { DialogHeader } from './DialogHeader'
import { IconButton } from './IconButton'
import { VisuallyHidden } from './VisuallyHidden'
import { renderInBodyPortal, useOverlaySurface } from './useOverlaySurface'
import ownStyles from './Modal.module.css'
import sharedStyles from './ui.module.css'

const styles = mergeCssModules(ownStyles, sharedStyles)

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
  /**
   * Fokussiert nach dem Oeffnen dieses Element statt des Schliessen-Buttons (z. B. fuer
   * ConfirmDialogs Abbrechen-Button im Footer). Additiv -- jeder bestehende Aufrufer laesst
   * dieses Feld weg und erhaelt dadurch weiterhin den bisherigen Standard-Fokus auf das
   * Schliessen-Kreuz.
   */
  initialFocusRef?: RefObject<HTMLElement | null>
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
  initialFocusRef,
}: ModalProps) {
  const titleID = useId()
  const { panelRef, closeButtonRef, handleKeyDown } = useOverlaySurface({
    open,
    onClose,
    onEscapeKeyDown,
    initialFocusRef,
  })

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
        // Reiner Maus-Komfort-Layer (Klick auf den abgedunkelten Hintergrund schließt das Modal).
        // Kein <button>, um das Lint-Verbot für native Buttons in components/ui nicht zu verletzen -- Escape und
        // der IconButton-basierte Schließen-Knopf bleiben die tastaturzugänglichen Wege.
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
            <VisuallyHidden id={titleID}>{title}</VisuallyHidden>
            <IconButton
              ref={closeButtonRef}
              icon={<X size={18} />}
              aria-label="Schließen"
              variant="onImage"
              floating
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

  return renderInBodyPortal(modal)
}
