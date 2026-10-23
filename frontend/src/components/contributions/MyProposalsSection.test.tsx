// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'

import { MyProposalsSection } from './MyProposalsSection'

const roleCatalogMocks = vi.hoisted(() => ({
  useRoleCatalog: vi.fn(),
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: roleCatalogMocks.useRoleCatalog,
}))

// ProposalForm selbst ist bereits durch ProposalForm.test.tsx/.useSubmit.test.ts/
// .steps.test.tsx/.extraSteps.test.tsx/.toggles.test.tsx abgedeckt -- hier interessiert
// die Trigger-Button-Gating-Regression (A6) UND (D-17, Plan 191-20) die an ProposalForm
// uebergebenen onSuccess/onClose-Callbacks, deshalb faengt der Mock die Props ab statt
// sie zu verschlucken.
const proposalFormMock = vi.hoisted(() => vi.fn())

vi.mock('./ProposalForm', () => ({
  ProposalForm: (props: unknown) => {
    proposalFormMock(props)
    return <div data-testid="proposal-form-stub" />
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSection(
  ownGroups: MembershipEntry[],
  proposals: MeAnimeContribution[] = [],
  onReload: () => void = vi.fn(),
) {
  roleCatalogMocks.useRoleCatalog.mockImplementation(() => ({
    roles: [{ code: 'translator', label_de: 'Übersetzung', assignable: true }],
    error: null,
  }))

  return render(<MyProposalsSection proposals={proposals} ownGroups={ownGroups} onReload={onReload} />)
}

describe('MyProposalsSection — A6-Regression (191-UI-SPEC.md Contract A6)', () => {
  it('ist der "Hinweis senden"-Button auch bei ownGroups=[] aktiviert (nicht mehr an ownGroups.length>0 gebunden)', () => {
    renderSection([])

    const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('zeigt keinen "Verifizierte Gruppenmitgliedschaft erforderlich"-Warnhinweis mehr', () => {
    renderSection([])

    expect(screen.queryByText('Verifizierte Gruppenmitgliedschaft erforderlich.')).toBeNull()
  })

  it('bleibt bei vorhandenen eigenen Gruppen unveraendert aktiviert', () => {
    renderSection([{ fansub_group_member_id: 1, fansub_group_id: 10, group_name: 'Testgruppe' }])

    const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})

// D-17 (Plan 191-20): ProposalForm zeigt die Erfolgsansicht selbst ueber internen
// submittedSummary-State -- vorher loeste handleFormSuccess hier onReload() aus, was auf der
// Seite einen isLoading-Zustand setzt, der MyProposalsSection (inkl. offenem Formular)
// durch einen Lade-Screen ersetzt, bevor der Nutzer die Erfolgsansicht je sieht. Reload darf
// deshalb nur noch an einen aktiven "Fertig"-Klick (onClose) gekoppelt sein.
describe('MyProposalsSection — Erfolgsansicht bleibt sichtbar (D-17)', () => {
  it('onSuccess ist ein No-op -- onReload wird NICHT aufgerufen', () => {
    const onReload = vi.fn()
    renderSection([], [], onReload)
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis senden' }))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as {
      onSuccess: () => void
      onClose: () => void
    }
    act(() => lastCallProps.onSuccess())

    expect(onReload).not.toHaveBeenCalled()
    expect(screen.getByTestId('proposal-form-stub')).toBeTruthy()
  })

  it('onClose schliesst das Formular UND ruft onReload genau einmal auf', () => {
    const onReload = vi.fn()
    renderSection([], [], onReload)
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis senden' }))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as {
      onSuccess: () => void
      onClose: () => void
    }
    act(() => lastCallProps.onClose())

    expect(onReload).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('proposal-form-stub')).toBeNull()
  })
})
