// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GroupScopeToggle, HintTypeToggle } from './ProposalForm.toggles'

afterEach(() => {
  cleanup()
})

describe('HintTypeToggle', () => {
  it('rendert ein Radiogroup mit den zwei verbindlichen D-06-Labeln und beiden Optionen unselektiert', () => {
    render(<HintTypeToggle value="" onSelect={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Hinweisart' })).toBeTruthy()
    const korrektur = screen.getByRole('radio', { name: 'Korrektur-Hinweis' })
    const mitgliedschaft = screen.getByRole('radio', { name: 'Anfrage für Mitgliedschaft' })
    expect(korrektur.getAttribute('aria-checked')).toBe('false')
    expect(mitgliedschaft.getAttribute('aria-checked')).toBe('false')
  })

  it('ruft onSelect mit dem Code der angeklickten Option auf', () => {
    const onSelect = vi.fn()
    render(<HintTypeToggle value="" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Anfrage für Mitgliedschaft' }))
    expect(onSelect).toHaveBeenCalledWith('membership_request')
  })

  it('markiert die per value übergebene Option als aria-checked=true und zeigt das Check-Icon', () => {
    render(<HintTypeToggle value="correction" onSelect={vi.fn()} />)

    const korrektur = screen.getByRole('radio', { name: 'Korrektur-Hinweis' })
    expect(korrektur.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Anfrage für Mitgliedschaft' }).getAttribute('aria-checked')).toBe('false')
  })
})

describe('GroupScopeToggle', () => {
  it('rendert ein Radiogroup mit den zwei verbindlichen D-02-Labeln', () => {
    render(<GroupScopeToggle value="own" onSelect={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Gruppen-Bereich' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Eigene Gruppe' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Andere Gruppe' }).getAttribute('aria-checked')).toBe('false')
  })

  it('ruft onSelect mit dem Wert der angeklickten Option auf', () => {
    const onSelect = vi.fn()
    render(<GroupScopeToggle value="own" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Andere Gruppe' }))
    expect(onSelect).toHaveBeenCalledWith('foreign')
  })
})
