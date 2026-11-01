// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('rendert eine role="status"-Wurzel mit vorlesbarem Standardtext', () => {
    render(<Spinner />)

    expect(screen.getByRole('status')).not.toBeNull()
    expect(screen.getByText('Wird geladen…')).not.toBeNull()
  })

  it('verbirgt den rotierenden Ring vor Screenreadern', () => {
    const { container } = render(<Spinner />)

    const ring = container.querySelector('[aria-hidden="true"]')
    expect(ring).not.toBeNull()
  })

  it('unterstützt ein eigenes Label', () => {
    render(<Spinner label="Daten werden synchronisiert" />)

    expect(screen.getByText('Daten werden synchronisiert')).not.toBeNull()
  })

  it('skaliert über die size-Prop (sm/md/lg)', () => {
    const { container: sm } = render(<Spinner size="sm" />)
    const { container: lg } = render(<Spinner size="lg" />)

    expect(sm.querySelector('[aria-hidden="true"]')?.className).toMatch(/spinnerSm/)
    expect(lg.querySelector('[aria-hidden="true"]')?.className).toMatch(/spinnerLg/)
  })
})
