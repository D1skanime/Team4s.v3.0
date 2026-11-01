// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { Drawer } from './Drawer'

/**
 * Simuliert ein YearPicker-artiges Popover: ein Auslöser mit aria-expanded/aria-controls im
 * Panel, dessen Inhalt per Portal außerhalb des Panel-DOM-Teilbaums in document.body liegt.
 */
function PortaledPopover() {
  return (
    <>
      <button type="button" aria-expanded="true" aria-controls="kalender-panel">Auslöser</button>
      {createPortal(
        <div id="kalender-panel">
          <button type="button">Tag 1</button>
          <button type="button">Tag 2</button>
        </div>,
        document.body,
      )}
    </>
  )
}

afterEach(() => {
  cleanup()
})

describe('Drawer', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Testdrawer">
        <button type="button">Inhalt</button>
      </Drawer>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wraps focus from the last focusable element to the first', () => {
    render(
      <Drawer
        open
        onClose={vi.fn()}
        title="Testdrawer"
        footer={<button type="button">Letzter Fokus</button>}
      >
        <button type="button">Zwischenfokus</button>
      </Drawer>,
    )

    const dialog = screen.getByRole('dialog')
    const firstFocusable = screen.getByRole('button', { name: 'Schließen' })
    const lastFocusable = screen.getByRole('button', { name: 'Letzter Fokus' })

    lastFocusable.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })

    expect(document.activeElement).toBe(firstFocusable)
  })

  it('returns focus to the opener after close', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Öffnen</button>
          <Drawer open={open} onClose={() => setOpen(false)} title="Testdrawer">
            <button type="button">Inhalt</button>
          </Drawer>
        </>
      )
    }

    render(<Harness />)

    const opener = screen.getByRole('button', { name: 'Öffnen' })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getAllByRole('button', { name: 'Schließen' })[0])

    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('bezieht ein per aria-expanded/aria-controls geöffnetes Popover (z. B. YearPicker-Kalender) in den Fokus-Zyklus ein', () => {
    render(
      <Drawer
        open
        onClose={vi.fn()}
        title="Testdrawer"
        footer={<button type="button">Letzter Fokus</button>}
      >
        <PortaledPopover />
      </Drawer>,
    )

    const dialog = screen.getByRole('dialog')
    const trigger = screen.getByRole('button', { name: 'Auslöser' })
    const day1 = screen.getByRole('button', { name: 'Tag 1' })
    const day2 = screen.getByRole('button', { name: 'Tag 2' })
    const footerButton = screen.getByRole('button', { name: 'Letzter Fokus' })

    // Vom Auslöser aus geht Tab in das geöffnete Popover hinein, nicht daran vorbei.
    trigger.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(day1)

    // Innerhalb des Popovers zykelt der Trap normal weiter (kein Browser-Tab-Entkommen).
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(day2)

    // Vom letzten Popover-Element geht Tab weiter in den Rest des Panels, nicht hinter den Dialog.
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(footerButton)

    // Shift+Tab vom ersten Popover-Element geht zurück zum Auslöser.
    day1.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(trigger)
  })
})
