// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar, initials } from './Avatar'

describe('initials', () => {
  it('nimmt die ersten Buchstaben der ersten beiden Wörter', () => {
    expect(initials('Mira Sato')).toBe('MS')
  })

  it('fällt bei leerem Namen auf ein Fragezeichen zurück', () => {
    expect(initials('   ')).toBe('?')
  })
})

describe('Avatar', () => {
  it('zeigt ohne Bild die Initialen und den vollen Namen für Screenreader', () => {
    render(<Avatar label="Mira Sato" />)
    expect(screen.getByText('MS')).not.toBeNull()
    expect(screen.getByText('Mira Sato')).not.toBeNull()
  })

  it('zeigt statt Initialen eine Zähler-Beschriftung, wenn count gesetzt ist', () => {
    render(<Avatar label="3 weitere Mitglieder" count={3} />)
    expect(screen.getByText('+3')).not.toBeNull()
    expect(screen.getByLabelText('3 weitere Mitglieder')).not.toBeNull()
  })

  it('rendert ein Bild, wenn src gesetzt ist', () => {
    const { container } = render(<Avatar label="Mira Sato" src="https://example.com/mira.jpg" />)
    expect(screen.queryByText('MS')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('wendet bei size="xs" die 20px-Größenklasse an (rundes Gruppen-/Identitätsbild in Chip-Größe)', () => {
    const { container } = render(<Avatar label="LazySubs" size="xs" src="https://example.com/logo.png" />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('width')).toBe('20')
    expect(img?.getAttribute('height')).toBe('20')
    expect(container.querySelector('span')?.className).toMatch(/avatarXs/)
  })

  it('setzt ohne bordered keinen Rand, mit bordered den Rand "auf dunkler Fläche"', () => {
    const { container, rerender } = render(<Avatar label="LazySubs" />)
    expect(container.querySelector('span')?.className).not.toMatch(/avatarBordered/)

    rerender(<Avatar label="LazySubs" bordered />)
    expect(container.querySelector('span')?.className).toMatch(/avatarBordered/)
  })
})
