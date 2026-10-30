// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('setzt aria-valuenow auf den (begrenzten) Prozentwert', () => {
    render(<ProgressBar label="Wird hochgeladen" value={45} />)
    const bar = screen.getByRole('progressbar', { name: 'Wird hochgeladen' })
    expect(bar.getAttribute('aria-valuenow')).toBe('45')
  })

  it('begrenzt den Wert auf 0-100', () => {
    render(<ProgressBar label="Test" value={150} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('setzt im unbestimmten Zustand kein aria-valuenow', () => {
    render(<ProgressBar label="Wird verarbeitet" indeterminate />)
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false)
  })
})
