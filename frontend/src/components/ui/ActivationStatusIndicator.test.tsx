// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { ActivationStatusIndicator } from './ActivationStatusIndicator'

afterEach(() => {
  cleanup()
})

describe('ActivationStatusIndicator', () => {
  it('rendert "Gespeichert und aktiv." mit Erfolgs-Badge, wenn der Rollen-Matrix-Cache-Reload erfolgreich war', () => {
    render(<ActivationStatusIndicator path="role_matrix" cacheReloadSucceeded />)

    // screen.getByText throws if the exact copy is not found — presence is the assertion.
    expect(screen.getByText('Gespeichert und aktiv.').tagName).toBe('SPAN')
  })

  it('rendert die exakte Fehler-Copy mit Danger-Badge und Retry-Button, wenn der Rollen-Matrix-Cache-Reload fehlgeschlagen ist', () => {
    const onRetry = vi.fn()
    render(
      <ActivationStatusIndicator path="role_matrix" cacheReloadSucceeded={false} onRetry={onRetry} />,
    )

    expect(
      screen.getByText(
        'Gespeichert, aber nicht aktiv: Der Rechte-Cache konnte nicht aktualisiert werden. Erneut versuchen oder Administrator informieren.',
      ).tagName,
    ).toBe('SPAN')

    const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' })
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('rendert keinen Retry-Button, wenn kein onRetry übergeben wird', () => {
    render(<ActivationStatusIndicator path="role_matrix" cacheReloadSucceeded={false} />)

    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull()
  })

  it('rendert "Gespeichert und sofort aktiv." mit Erfolgs-Badge für den Override-Pfad im aktiven Zustand', () => {
    render(<ActivationStatusIndicator path="override" activationStatus="active" />)

    expect(screen.getByText('Gespeichert und sofort aktiv.').tagName).toBe('SPAN')
  })

  it('rendert die "Status wird geprüft" Copy mit Warning-Badge für den Override-Pfad im pending-Zustand', () => {
    render(<ActivationStatusIndicator path="override" activationStatus="pending" />)

    expect(
      screen.getByText('Status wird geprüft — bitte Seite neu laden, um den aktuellen Stand zu sehen.').tagName,
    ).toBe('SPAN')
  })

  it('rendert nichts für den Override-Pfad im (heute unerreichbaren) failed-Zustand', () => {
    const { container } = render(<ActivationStatusIndicator path="override" activationStatus="failed" />)

    expect(container.innerHTML).toBe('')
  })
})
