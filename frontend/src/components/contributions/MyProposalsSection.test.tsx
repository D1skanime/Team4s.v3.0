// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
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
// ausschließlich die Trigger-Button-Gating-Regression (A6), ein Shallow-Stub reicht.
vi.mock('./ProposalForm', () => ({
  ProposalForm: () => <div data-testid="proposal-form-stub" />,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSection(ownGroups: MembershipEntry[], proposals: MeAnimeContribution[] = []) {
  roleCatalogMocks.useRoleCatalog.mockImplementation((context: string) => ({
    roles: context === 'fansub_group'
      ? [{ code: 'fansub_lead', label_de: 'Fansub-Leitung', assignable: true }]
      : [{ code: 'translator', label_de: 'Übersetzung', assignable: true }],
    error: null,
  }))

  return render(<MyProposalsSection proposals={proposals} ownGroups={ownGroups} onReload={vi.fn()} />)
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
