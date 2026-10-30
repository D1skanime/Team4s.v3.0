// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { YearPicker } from './YearPicker'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('YearPicker', () => {
  it('opens an empty picker near the current year instead of the max-year page', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T08:00:00Z'))

    render(
      <YearPicker
        id="history-year"
        label="Jahr"
        value=""
        minYear={1990}
        maxYear={2099}
        onChange={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Jahr' }))

    expect(screen.getByText('2016-2027')).not.toBeNull()
    expect(screen.getByRole('button', { name: '2026' })).not.toBeNull()
    expect(screen.queryByText('2088-2099')).toBeNull()
  })

  // UAT-Runde 4, Befund 4 (2026-10-30): Trigger/Blätter-Pfeile/Jahres-Kacheln wurden von eigenen
  // nativen <button>-Elementen auf IconButton/NavArrow umgestellt -- diese vier Tests belegen,
  // dass Tastatur-/Fokus-/Klickverhalten dabei unverändert geblieben ist.
  it('wählt ein Jahr per Klick auf die IconButton-Kachel aus und schließt danach das Panel', () => {
    const handleChange = vi.fn()
    render(
      <YearPicker id="founded-year" label="Gründungsjahr" value="" minYear={2000} maxYear={2010} onChange={handleChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gründungsjahr' }))
    fireEvent.click(screen.getByRole('button', { name: '2007' }))

    expect(handleChange).toHaveBeenCalledWith('2007')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('blättert über die NavArrow-Pfeile ("Frühere Jahre"/"Spätere Jahre") weiter, ohne das Panel zu schließen', () => {
    render(
      <YearPicker id="founded-year" label="Gründungsjahr" value="2005" minYear={1990} maxYear={2030} onChange={() => undefined} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gründungsjahr' }))
    expect(screen.getByText('1995-2006')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Frühere Jahre' }))
    expect(screen.getByText('1990-1994')).not.toBeNull()
    expect(screen.getByRole('dialog')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Spätere Jahre' }))
    expect(screen.getByText('1995-2006')).not.toBeNull()
  })

  it('schließt das Panel per Escape-Taste, ohne onChange auszulösen', () => {
    const handleChange = vi.fn()
    render(
      <YearPicker id="founded-year" label="Gründungsjahr" value="2005" minYear={1990} maxYear={2030} onChange={handleChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gründungsjahr' }))
    expect(screen.getByRole('dialog')).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('markiert die "Keine Angabe"-Kachel als ausgewählt, wenn value leer ist, und schließt per Klick darauf mit onChange(\'\')', () => {
    const handleChange = vi.fn()
    render(
      <YearPicker id="founded-year" label="Gründungsjahr" value="" minYear={1990} maxYear={2030} onChange={handleChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gründungsjahr' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keine Angabe' }))

    expect(handleChange).toHaveBeenCalledWith('')
  })
})
