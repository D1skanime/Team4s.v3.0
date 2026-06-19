// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { Modal } from './Modal'

afterEach(() => {
  cleanup()
})

describe('Modal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Testmodal">
        <button type="button">Inhalt</button>
      </Modal>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wraps focus from the last focusable element to the first', () => {
    render(
      <Modal
        open
        onClose={vi.fn()}
        title="Testmodal"
        footer={<button type="button">Letzter Fokus</button>}
      >
        <button type="button">Zwischenfokus</button>
      </Modal>,
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
          <Modal open={open} onClose={() => setOpen(false)} title="Testmodal">
            <button type="button">Inhalt</button>
          </Modal>
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
})
