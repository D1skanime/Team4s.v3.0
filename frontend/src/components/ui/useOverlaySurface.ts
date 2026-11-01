'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'

/**
 * Gemeinsamer Fokus-/Escape-/Tab-Zyklus-Kern fuer modale Overlay-Flaechen (Modal, Drawer).
 * Kapselt drei zusammengehoerige Barrierefreiheits-Pflichten eines Dialog-artigen Overlays:
 * Beim Oeffnen wird der Fokus in das Panel verschoben und beim Schliessen wieder an das
 * zuvor fokussierte Element zurueckgegeben; Tab/Shift+Tab zykelt innerhalb des Panels statt
 * den Fokus in die dahinterliegende Seite entkommen zu lassen; Escape loest `onClose` aus,
 * sofern kein uebergeordneter Konsument (`onEscapeKeyDown`) das fuer diesen Tastendruck
 * unterdrueckt. Jedes neue modale Overlay sollte diesen Hook wiederverwenden, statt eine
 * eigene Fokus-/Escape-Logik nachzubauen.
 */
export interface UseOverlaySurfaceOptions {
  open: boolean
  onClose: () => void
  onEscapeKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean
  /**
   * Fokussiert nach dem Oeffnen dieses Element statt des Standard-Ziels
   * (`closeButtonRef` bzw. ersatzweise das Panel selbst). Wird z. B. von ConfirmDialog
   * genutzt, um statt des Schliessen-Kreuzes den Abbrechen-Button im Footer zu fokussieren.
   */
  initialFocusRef?: RefObject<HTMLElement>
}

export interface UseOverlaySurfaceResult {
  panelRef: RefObject<HTMLDivElement>
  closeButtonRef: RefObject<HTMLButtonElement>
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
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

export function useOverlaySurface({
  open,
  onClose,
  onEscapeKeyDown,
  initialFocusRef,
}: UseOverlaySurfaceOptions): UseOverlaySurfaceResult {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTarget = initialFocusRef?.current ?? closeButtonRef.current ?? panelRef.current
    const focusTimeoutId = window.setTimeout(() => focusTarget?.focus(), 0)

    return () => {
      window.clearTimeout(focusTimeoutId)
      previouslyFocusedRef.current?.focus()
      previouslyFocusedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialFocusRef ist ein Ref-Objekt, dessen Identitaet sich nicht aendert
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (onEscapeKeyDown?.(event)) return
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) return

    const activeElement = document.activeElement
    // Per Portal gerenderte Nachkommen (z. B. der YearPicker-Kalender) liegen im DOM
    // ausserhalb des Panels, obwohl sie logisch zum Dialog gehoeren. Greift der Trap hier
    // trotzdem zu, reisst er den Fokus aus dem Portal-Inhalt -- also nur zykeln, wenn der
    // Fokus tatsaechlich im Panel selbst sitzt.
    if (!activeElement || !panelRef.current.contains(activeElement)) return

    const focusable = getFocusableElements(panelRef.current)
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }

    const currentIndex = focusable.findIndex((element) => element === activeElement)
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1

    event.preventDefault()
    focusable[nextIndex]?.focus()
  }

  return { panelRef, closeButtonRef, handleKeyDown }
}

/**
 * Rendert den uebergebenen Overlay-Baum per Portal direkt unter `document.body`, damit das
 * Overlay allen `isolation`/`z-index`-Kontexten eines umschliessenden Elements entkommt
 * (z. B. Section-Backdrops). Faellt serverseitig (kein `document`) auf direktes Rendering
 * zurueck.
 */
export function renderInBodyPortal(node: ReactNode): ReactNode {
  return typeof document !== 'undefined' ? createPortal(node, document.body) : node
}
