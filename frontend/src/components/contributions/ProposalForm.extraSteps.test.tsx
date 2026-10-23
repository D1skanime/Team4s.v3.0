// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Step0HintType, StepRoleOptional } from './ProposalForm.extraSteps'

afterEach(() => {
  cleanup()
})

describe('Step0HintType', () => {
  it('rendert das HintTypeToggle unter einem "Worum geht es?"-FormField ohne Fehlermeldung', () => {
    render(<Step0HintType hintType="" hintTypeError={null} onSelect={vi.fn()} />)

    expect(screen.getByText('Worum geht es?')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Hinweisart' })).toBeTruthy()
    expect(screen.queryByText('Bitte wähle eine Hinweisart aus.')).toBeNull()
  })

  it('zeigt die übergebene hintTypeError-Meldung an (mirrors roleError-Muster)', () => {
    render(<Step0HintType hintType="" hintTypeError="Bitte wähle eine Hinweisart aus." onSelect={vi.fn()} />)

    expect(screen.getByText('Bitte wähle eine Hinweisart aus.')).toBeTruthy()
  })

  it('ruft onSelect mit dem gewählten Hinweisart-Code auf', () => {
    const onSelect = vi.fn()
    render(<Step0HintType hintType="" hintTypeError={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Korrektur-Hinweis' }))
    expect(onSelect).toHaveBeenCalledWith('correction')
  })
})

describe('StepRoleOptional', () => {
  const ROLES = [
    { code: 'fansub_lead', label_de: 'Fansub-Leitung' },
    { code: 'timer', label_de: 'Timing' },
  ]

  it('zeigt "Keine bestimmte Rolle" als Default-Option vor allen uebergebenen Rollen', () => {
    render(<StepRoleOptional roles={ROLES} requestedRoleCode="" onSelectRequestedRole={vi.fn()} />)

    const select = screen.getByLabelText('Gewünschte Rolle (optional)') as HTMLSelectElement
    expect(select.options[0].value).toBe('')
    expect(select.options[0].textContent).toBe('Keine bestimmte Rolle')
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Keine bestimmte Rolle',
      'Fansub-Leitung',
      'Timing',
    ])
  })

  it('zeigt den D-07-Hinweistext "keine automatische Zuweisung"', () => {
    render(<StepRoleOptional roles={ROLES} requestedRoleCode="" onSelectRequestedRole={vi.fn()} />)

    expect(screen.getByText('Nur eine Angabe für die Gruppe — keine automatische Zuweisung.')).toBeTruthy()
  })

  it('ruft onSelectRequestedRole mit dem gewählten Rollencode auf', () => {
    const onSelectRequestedRole = vi.fn()
    render(<StepRoleOptional roles={ROLES} requestedRoleCode="" onSelectRequestedRole={onSelectRequestedRole} />)

    fireEvent.change(screen.getByLabelText('Gewünschte Rolle (optional)'), { target: { value: 'fansub_lead' } })
    expect(onSelectRequestedRole).toHaveBeenCalledWith('fansub_lead')
  })
})
