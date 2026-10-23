// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GroupScopeToggle } from './ProposalForm.toggles'

afterEach(() => {
  cleanup()
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
