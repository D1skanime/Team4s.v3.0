// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { Drawer } from './Drawer'

/** Simuliert einen per Portal gerenderten Nachkommen wie den YearPicker-Kalender. */
function PortaledButton({ label }: { label: string }) {
  return createPortal(<button type="button">{label}</button>, document.body)
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

  it('lässt Tab-Fokus in per Portal gerenderten Nachkommen unangetastet (z. B. YearPicker-Kalender)', () => {
    render(
      <Drawer open onClose={vi.fn()} title="Testdrawer">
        <PortaledButton label="Kalendertag" />
      </Drawer>,
    )

    const dialog = screen.getByRole('dialog')
    const portaledButton = screen.getByRole('button', { name: 'Kalendertag' })

    portaledButton.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })

    expect(document.activeElement).toBe(portaledButton)
  })
})
