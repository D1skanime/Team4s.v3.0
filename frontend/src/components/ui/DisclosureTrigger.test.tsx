// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DisclosureTrigger } from './DisclosureTrigger'

describe('DisclosureTrigger', () => {
  it('rendert aria-expanded entsprechend der open-Prop und reicht aria-controls/id unverändert durch', () => {
    render(
      <DisclosureTrigger
        id="demo-header"
        title="Übersetzung"
        open={false}
        aria-controls="demo-panel"
        onClick={() => {}}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Übersetzung' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBe('demo-panel')
    expect(trigger.id).toBe('demo-header')
  })

  it('aria-expanded folgt der open-Prop, nicht einem internen Zustand', () => {
    const { rerender } = render(<DisclosureTrigger title="Übersetzung" open={false} onClick={() => {}} />)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')

    rerender(<DisclosureTrigger title="Übersetzung" open onClick={() => {}} />)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('löst onClick per Maus- UND per Tastatur-Aktivierung aus (natives button-Verhalten)', () => {
    const handleClick = vi.fn()
    render(<DisclosureTrigger title="Übersetzung" open={false} onClick={handleClick} />)

    const trigger = screen.getByRole('button', { name: 'Übersetzung' })
    fireEvent.click(trigger)
    expect(handleClick).toHaveBeenCalledTimes(1)

    trigger.focus()
    expect(document.activeElement).toBe(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(trigger) // jsdom löst Enter auf einem <button> nicht automatisch als Klick aus
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('akzeptiert beliebigen ReactNode-Inhalt als Titel, nicht nur Text', () => {
    render(
      <DisclosureTrigger
        title={
          <span>
            Übersetzung <strong data-testid="extra-markup">Aktiv</strong>
          </span>
        }
        open={false}
        onClick={() => {}}
      />,
    )

    expect(screen.getByTestId('extra-markup')).not.toBeNull()
    expect(screen.getByRole('button').textContent).toBe('Übersetzung Aktiv')
  })
})
