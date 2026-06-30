// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { Accordion } from './Accordion'

const demoItems = [
  { id: 'item-1', title: 'Übersetzung', children: <p>Inhalte für Übersetzung</p> },
  { id: 'item-2', title: 'Bearbeitung', children: <p>Inhalte für Bearbeitung</p> },
  { id: 'item-3', title: 'Qualitätssicherung', children: <p>Inhalte für Qualitätssicherung</p> },
]

describe('Accordion', () => {
  it('rendert Header-Buttons mit aria-expanded entsprechend dem offenen Zustand', () => {
    render(<Accordion items={demoItems} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    // Standardmäßig alle geschlossen
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-expanded')).toBe('false')
    })
  })

  it('Klick auf Header toggelt aria-expanded und zeigt/versteckt den Body', () => {
    render(<Accordion items={demoItems} />)
    const firstHeader = screen.getByRole('button', { name: /Übersetzung/i })

    // Ausgangszustand: geschlossen
    expect(firstHeader.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Inhalte für Übersetzung')).toBeNull()

    // Öffnen
    fireEvent.click(firstHeader)
    expect(firstHeader.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Inhalte für Übersetzung')).toBeTruthy()

    // Schließen
    fireEvent.click(firstHeader)
    expect(firstHeader.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Inhalte für Übersetzung')).toBeNull()
  })

  it('mehrere Items sind unabhängig auf-/zuklappbar (multi-open Modus)', () => {
    render(<Accordion items={demoItems} />)
    const firstHeader = screen.getByRole('button', { name: /Übersetzung/i })
    const secondHeader = screen.getByRole('button', { name: /Bearbeitung/i })

    fireEvent.click(firstHeader)
    fireEvent.click(secondHeader)

    expect(firstHeader.getAttribute('aria-expanded')).toBe('true')
    expect(secondHeader.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Inhalte für Übersetzung')).toBeTruthy()
    expect(screen.getByText('Inhalte für Bearbeitung')).toBeTruthy()
  })

  it('Header-Touch-Ziel >= 44px (CSS-Klasse accordionHeader vorhanden)', () => {
    render(<Accordion items={demoItems} />)
    const firstHeader = screen.getByRole('button', { name: /Übersetzung/i })
    // Prüfen dass die CSS-Klasse gesetzt ist (min-height >= 44px ist in ui.module.css definiert)
    expect(firstHeader.className).toMatch(/accordionHeader/)
  })
})
