// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
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

  it('Controlled-Modus: openIds + onOpenChange steuern den Open-Zustand vom Parent', () => {
    const onOpenChange = vi.fn()
    render(
      <Accordion
        items={demoItems}
        openIds={new Set(['item-1'])}
        onOpenChange={onOpenChange}
      />
    )
    const firstHeader = screen.getByRole('button', { name: /Übersetzung/i })
    // openIds enthält item-1 → bereits offen
    expect(firstHeader.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Inhalte für Übersetzung')).toBeTruthy()

    // Klick meldet die neue Menge an den Parent (statt internen State zu ändern)
    fireEvent.click(firstHeader)
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    const nextSet = onOpenChange.mock.calls[0][0] as Set<string>
    expect(nextSet.has('item-1')).toBe(false)
  })

  it('Controlled-Modus: Open-Zustand bleibt über einen Parent-Re-Render hinweg stabil', () => {
    function Harness() {
      const [openIds, setOpenIds] = useState<Set<string>>(new Set())
      const [tick, setTick] = useState(0)
      return (
        <div>
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            Re-Render {tick}
          </button>
          <Accordion items={demoItems} openIds={openIds} onOpenChange={setOpenIds} />
        </div>
      )
    }
    render(<Harness />)
    const firstHeader = screen.getByRole('button', { name: /Übersetzung/i })
    fireEvent.click(firstHeader)
    expect(firstHeader.getAttribute('aria-expanded')).toBe('true')

    // Parent-Re-Render simulieren (wie ein Daten-Refresh)
    fireEvent.click(screen.getByRole('button', { name: /Re-Render/i }))

    // Open-Zustand muss erhalten bleiben
    expect(
      screen.getByRole('button', { name: /Übersetzung/i }).getAttribute('aria-expanded')
    ).toBe('true')
    expect(screen.getByText('Inhalte für Übersetzung')).toBeTruthy()
  })
})
