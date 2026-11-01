// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavArrow } from './NavArrow'

describe('NavArrow', () => {
  it('ruft onClick beim Klick auf', () => {
    const onClick = vi.fn()
    render(<NavArrow direction="next" label="Nächstes Bild" onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Bild' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ist deaktivierbar', () => {
    render(<NavArrow direction="next" label="Nächstes Bild" disabled onClick={() => {}} />)

    expect(screen.getByRole('button', { name: 'Nächstes Bild' })).toHaveProperty('disabled', true)
  })

  it('rendert einen Link statt eines Buttons, wenn href gesetzt ist', () => {
    render(<NavArrow direction="previous" label="Vorherige Episode" href="/episoden/41" />)

    const link = screen.getByRole('link', { name: 'Vorherige Episode' })
    expect(link.getAttribute('href')).toBe('/episoden/41')
  })
})
