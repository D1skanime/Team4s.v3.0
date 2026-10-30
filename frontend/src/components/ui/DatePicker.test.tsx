// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DatePicker } from './DatePicker'

afterEach(() => {
  cleanup()
})

// UAT-Runde 5 (2026-10-30, Offener Befund zu UAT-Runde 4, Befund 4): Trigger/Leeren/Blätter-
// Pfeile/Titel-Umschalter/Tages-/Monats-/Jahres-Kacheln/Fußzeilen-Aktionen wurden von eigenen
// nativen <button>-Elementen auf IconButton/NavArrow/Button umgestellt -- diese Tests belegen,
// dass Tastatur-/Fokus-/Klickverhalten dabei unverändert geblieben ist.
describe('DatePicker', () => {
  it('öffnet das Panel in der Jahres-Ansicht und wählt per Klick auf eine Jahres-Kachel ein Jahr aus', () => {
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="" minYear={2000} maxYear={2010} onChange={() => undefined} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichungsdatum auswählen' }))
    expect(screen.getByRole('dialog')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '2007' }))
    expect(screen.getByRole('button', { name: 'Jan' })).not.toBeNull()
  })

  it('wählt per Klick auf eine Tages-Kachel ein Datum aus und schließt danach das Panel', () => {
    const handleChange = vi.fn()
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="2026-07-15" minYear={2020} maxYear={2030} onChange={handleChange} />,
    )

    // Das Panel öffnet immer in der Jahres-Ansicht -- erst über Jahr- und Monats-Kachel geht es
    // weiter zur Tages-Ansicht.
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichungsdatum auswählen' }))
    fireEvent.click(screen.getByRole('button', { name: '2026' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jul' }))
    fireEvent.click(screen.getByRole('button', { name: '20' }))

    expect(handleChange).toHaveBeenCalledWith('2026-07-20')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('blättert über die NavArrow-Pfeile ("Zurück"/"Weiter") durch die Jahres-Seiten, ohne das Panel zu schließen', () => {
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="2026-07-15" minYear={1990} maxYear={2030} onChange={() => undefined} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichungsdatum auswählen' }))
    expect(screen.getByText('2016 - 2027')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(screen.getByText('2004 - 2015')).not.toBeNull()
    expect(screen.getByRole('dialog')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('2016 - 2027')).not.toBeNull()
  })

  it('schließt das Panel per Escape-Taste, ohne onChange auszulösen', () => {
    const handleChange = vi.fn()
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="2026-07-15" minYear={2020} maxYear={2030} onChange={handleChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichungsdatum auswählen' }))
    expect(screen.getByRole('dialog')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('leert den Wert per Klick auf das Leeren-Symbol in der Feldzeile', () => {
    const handleChange = vi.fn()
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="2026-07-15" minYear={2020} maxYear={2030} onChange={handleChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Datum leeren' }))

    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('deaktiviert das Leeren-Symbol, wenn kein Wert gesetzt ist', () => {
    render(
      <DatePicker id="release-date" label="Veröffentlichungsdatum" value="" minYear={2020} maxYear={2030} onChange={() => undefined} />,
    )

    expect(screen.getByRole('button', { name: 'Datum leeren' })).toHaveProperty('disabled', true)
  })
})
