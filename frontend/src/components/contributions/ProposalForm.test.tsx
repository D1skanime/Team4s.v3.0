// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MembershipEntry } from '@/types/contributions'

import { ProposalForm } from './ProposalForm'

const apiMocks = vi.hoisted(() => ({
  getAdminFansubAnime: vi.fn(),
  createContributionProposal: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  createContributionProposal: apiMocks.createContributionProposal,
  getAdminFansubAnime: apiMocks.getAdminFansubAnime,
}))

const ROLE_DEFINITIONS = [
  { code: 'translator', label_de: 'Übersetzung' },
  { code: 'editor', label_de: 'Editing' },
  { code: 'timer', label_de: 'Timing' },
]

const OWN_GROUPS: MembershipEntry[] = [
  { fansub_group_member_id: 1, fansub_group_id: 10, group_name: 'Testgruppe' },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderForm(ownGroups = OWN_GROUPS) {
  return renderToStaticMarkup(
    <ProposalForm
      onSuccess={vi.fn()}
      onClose={vi.fn()}
      ownGroups={ownGroups}
      roleDefinitions={ROLE_DEFINITIONS}
    />,
  )
}

describe('ProposalForm', () => {
  it('zeigt den 90-Tage-Hinweis ohne Interaktion', () => {
    expect(renderForm()).toContain('90 Tagen')
  })

  it('enthält die gruppengebundene Anime-Auswahl mit Kontext', () => {
    const markup = renderForm()

    expect(markup).toContain('Bei welchem Anime/Projekt dieser Gruppe?')
    expect(markup).toContain('Erst Gruppe auswählen')
    expect(markup).toContain('Hinweis geht zur Prüfung an die zuständige Gruppe')
    expect(markup).toContain('Worum geht es?')
    expect(markup).toContain('Projekt insgesamt')
    expect(markup).toContain('Bestimmte Folgen / Release-Version')
    expect(markup).toContain('Bald verfügbar')
    expect(markup).toContain('Hinweis senden')
    expect(markup).toContain('nicht als öffentlicher Profiltext angezeigt')
  })

  it('zeigt Rollenoptionen aus den roleDefinitions', () => {
    const markup = renderForm()

    expect(markup).toContain('Übersetzung')
    expect(markup).toContain('Editing')
  })

  it('nutzt YearPicker statt raw number inputs für Jahresfelder', () => {
    const markup = renderForm()

    expect(markup).toContain('aria-label="Von Jahr auswählen"')
    expect(markup).toContain('aria-label="Bis Jahr auswählen"')
    expect(markup).not.toContain('type="number"')
  })

  it('zeigt einen sichtbaren Blocked-State ohne verifizierte Gruppe', () => {
    const markup = renderForm([])

    expect(markup).toContain('verifizierte Mitgliedschaft')
    expect(markup).toContain('Keine verifizierte Gruppe verfügbar')
  })

  it('zeigt nach Gruppen- und Projektwahl einen Kontext-Breadcrumb', async () => {
    apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [{ id: 3, title: 'Naruto' }] })

    render(
      <ProposalForm
        onSuccess={vi.fn()}
        onClose={vi.fn()}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Welche Gruppe soll prüfen/), { target: { value: '1' } })

    await waitFor(() => {
      expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(10)
    })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Naruto' })).not.toBeNull()
    })

    fireEvent.change(screen.getByLabelText(/Bei welchem Anime\/Projekt/), { target: { value: '3' } })

    const breadcrumb = screen.getByLabelText('Ausgewählter Kontext')
    expect(breadcrumb.textContent).toContain('Testgruppe')
    expect(breadcrumb.textContent).toContain('Naruto')
  })
})
