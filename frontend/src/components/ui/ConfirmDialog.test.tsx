// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'

import { useConfirmDialog } from './ConfirmDialog'

afterEach(() => {
  cleanup()
})

function Harness() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [result, setResult] = useState<'idle' | 'confirmed' | 'cancelled'>('idle')

  async function trigger() {
    const ok = await confirm({
      title: 'Testtitel',
      description: 'Testbeschreibung',
      confirmLabel: 'Löschen',
      tone: 'danger',
    })
    setResult(ok ? 'confirmed' : 'cancelled')
  }

  return (
    <>
      <button type="button" onClick={() => void trigger()}>
        Auslösen
      </button>
      <p>{result}</p>
      {confirmDialog}
    </>
  )
}

describe('useConfirmDialog', () => {
  it('shows title and description on trigger', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Auslösen' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Testtitel')).toBeTruthy()
    expect(within(dialog).getByText('Testbeschreibung')).toBeTruthy()
  })

  it('resolves to false and closes on cancel', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Auslösen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByText('cancelled')).toBeTruthy())
  })

  it('resolves to true on confirm', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Auslösen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(screen.getByText('confirmed')).toBeTruthy())
  })

  it('resolves to false on Escape', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Auslösen' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.getByText('cancelled')).toBeTruthy())
  })

  it('focuses the cancel button initially, not the close X', async () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Auslösen' }))
    const dialog = screen.getByRole('dialog')
    const cancelButton = within(dialog).getByRole('button', { name: 'Abbrechen' })

    await waitFor(() => expect(document.activeElement).toBe(cancelButton))
  })
})
