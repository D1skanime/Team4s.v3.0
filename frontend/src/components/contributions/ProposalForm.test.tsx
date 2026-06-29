// @vitest-environment jsdom

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

function renderForm(ownGroups = OWN_GROUPS, props?: Partial<Parameters<typeof ProposalForm>[0]>) {
  return render(
    <ProposalForm
      onSuccess={props?.onSuccess ?? vi.fn()}
      onClose={props?.onClose ?? vi.fn()}
      ownGroups={ownGroups}
      roleDefinitions={props?.roleDefinitions ?? ROLE_DEFINITIONS}
    />,
  )
}

async function chooseGroupAndAnime() {
  apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [{ id: 3, title: 'Naruto' }] })

  fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))
  fireEvent.click(screen.getByRole('option', { name: /Testgruppe/ }))

  await waitFor(() => {
    expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(10)
  })
  await waitFor(() => {
    expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(false)
  })

  fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
  fireEvent.click(screen.getByRole('option', { name: /Naruto/ }))
}

describe('ProposalForm', () => {
  it('startet als 3-Schritte-Assistent ohne eigenen Kontext-Auswahlschritt', () => {
    renderForm()

    expect(screen.getAllByText('Schritt 1 von 3').length).toBeGreaterThan(0)
    expect(screen.getByText('Gruppe & Projekt')).toBeTruthy()
    expect(screen.queryByText('Worum geht es?')).toBeNull()
    expect(screen.queryByText('Projekt insgesamt')).toBeNull()
    expect(screen.queryByText('Bestimmte Folge / Release-Version')).toBeNull()
  })

  it('aktualisiert Fortschritt und Button-Beschriftung bei Vor- und Zurück-Navigation', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getAllByText('Schritt 2 von 3').length).toBeGreaterThan(0)
    expect(screen.getByText('Rolle')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getAllByText('Schritt 3 von 3').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Hinweis senden' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(screen.getAllByText('Schritt 2 von 3').length).toBeGreaterThan(0)
  })

  it('rendert ausschließlich die übergebenen eigenen Gruppen im Custom-Select', () => {
    renderForm([
      ...OWN_GROUPS,
      { fansub_group_member_id: 2, fansub_group_id: 20, group_name: 'Zweite Gruppe' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))

    expect(screen.getByRole('option', { name: /Testgruppe/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Zweite Gruppe/ })).toBeTruthy()
    expect(screen.queryByText('Fremde Gruppe')).toBeNull()
  })

  it('aktiviert die Projekt-Auswahl erst nach Gruppenwahl und zeigt den Kontext-Chip', async () => {
    renderForm()

    expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(true)

    await chooseGroupAndAnime()

    const breadcrumb = screen.getByLabelText('Ausgewählter Kontext')
    expect(breadcrumb.textContent).toContain('Testgruppe')
    expect(breadcrumb.textContent).toContain('Naruto')
  })

  it('zeigt Rollen als Single-Choice-Chips mit eindeutigem aktivem Zustand', () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    const translation = screen.getByRole('radio', { name: 'Übersetzung' })
    const editing = screen.getByRole('radio', { name: 'Editing' })

    fireEvent.click(translation)
    expect(translation.getAttribute('aria-checked')).toBe('true')
    expect(editing.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(editing)
    expect(translation.getAttribute('aria-checked')).toBe('false')
    expect(editing.getAttribute('aria-checked')).toBe('true')
  })

  it('zeigt Hinweistext, 90-Tage-Regel und begrenzt den Zeichenzähler auf 280', () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    const note = screen.getByLabelText('Hinweis für den Gruppenleader') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'x'.repeat(300) } })

    expect(note.value).toHaveLength(280)
    expect(screen.getByText('280/280')).toBeTruthy()
    expect(screen.getByText(/Keine Reaktion nach 90 Tagen/)).toBeTruthy()
    expect(screen.getByLabelText('Von Jahr auswählen')).toBeTruthy()
    expect(screen.getByLabelText('Bis Jahr auswählen')).toBeTruthy()
  })

  it('zeigt nach dem Senden eine Bestätigung mit Zusammenfassung und schließt erst über Fertig', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    renderForm(OWN_GROUPS, { onClose, onSuccess })

    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis senden' }))

    await waitFor(() => {
      expect(apiMocks.createContributionProposal).toHaveBeenCalledWith({
        fansub_group_id: 10,
        anime_id: 3,
        fansub_group_member_id: 1,
        role_codes: ['translator'],
        note: null,
        started_year: null,
        ended_year: null,
      })
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Hinweis gesendet')).toBeTruthy()
    expect(screen.getByText('Testgruppe')).toBeTruthy()
    expect(screen.getByText('Naruto')).toBeTruthy()
    expect(screen.getByText('Übersetzung')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('zeigt einen sichtbaren Blocked-State ohne verifizierte Gruppe', () => {
    renderForm([])

    expect(screen.getByText(/verifizierte Mitgliedschaft/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Weiter' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
