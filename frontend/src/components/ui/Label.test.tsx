// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Label } from './Label'

afterEach(() => {
  cleanup()
})

describe('Label', () => {
  it('rendert htmlFor/id und den Kindtext korrekt', () => {
    render(<Label htmlFor="feld-1" id="label-1">Anzeigename</Label>)

    const label = screen.getByText('Anzeigename').closest('label')
    expect(label).not.toBeNull()
    expect(label?.getAttribute('for')).toBe('feld-1')
    expect(label?.getAttribute('id')).toBe('label-1')
  })

  it('zeigt ohne required kein Sternchen und keinen Pflichtfeld-Hinweis', () => {
    render(<Label htmlFor="feld-1">Anzeigename</Label>)

    expect(screen.queryByText('*', { exact: false })).toBeNull()
    expect(screen.queryByText('(Pflichtfeld)')).toBeNull()
  })

  it('zeigt bei required ein sichtbares, aria-hidden Sternchen UND einen separaten, nur für Screenreader vorhandenen Pflichtfeld-Hinweis', () => {
    const { container } = render(<Label htmlFor="feld-1" required>Anzeigename</Label>)

    const asterisk = screen.getByText('*', { exact: false })
    expect(asterisk.getAttribute('aria-hidden')).toBe('true')

    const hiddenHint = screen.getByText('(Pflichtfeld)')
    expect(hiddenHint.className).toMatch(/visuallyHidden/)
    // Der Pflichtfeld-Hinweis ist ein EIGENES Element, nicht nur Teil des aria-hidden-Sternchens --
    // sonst wäre er für Screenreader ebenfalls unterdrückt.
    expect(hiddenHint).not.toBe(asterisk)
    expect(container.querySelectorAll('label').length).toBe(1)
  })
})
