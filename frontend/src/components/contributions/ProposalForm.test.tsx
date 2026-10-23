// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MembershipEntry } from '@/types/contributions'

import { ProposalForm } from './ProposalForm'

const apiMocks = vi.hoisted(() => ({
  getAdminFansubAnime: vi.fn(),
  createContributionProposal: vi.fn(),
  createFansubGroupHint: vi.fn(),
  getFansubList: vi.fn(),
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
  createFansubGroupHint: apiMocks.createFansubGroupHint,
  getAdminFansubAnime: apiMocks.getAdminFansubAnime,
  getFansubList: apiMocks.getFansubList,
}))

const ROLE_DEFINITIONS = [
  { code: 'translator', label_de: 'Übersetzung' },
  { code: 'editor', label_de: 'Editing' },
  { code: 'timer', label_de: 'Timing' },
]

const FANSUB_GROUP_ROLES = [
  { code: 'fansub_lead', label_de: 'Fansub-Leitung' },
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
      fansubGroupRoles={props?.fansubGroupRoles ?? FANSUB_GROUP_ROLES}
    />,
  )
}

function chooseKorrekturHintType() {
  fireEvent.click(screen.getByRole('radio', { name: 'Korrektur-Hinweis' }))
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
}

async function chooseGroupAndAnime(groupNamePattern: RegExp = /Testgruppe/, expectedFansubGroupId = 10) {
  apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [{ id: 3, title: 'Naruto' }] })

  fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))
  fireEvent.click(screen.getByRole('option', { name: groupNamePattern }))

  await waitFor(() => {
    expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(expectedFansubGroupId)
  })
  await waitFor(() => {
    expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(false)
  })

  fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
  fireEvent.click(screen.getByRole('option', { name: /Naruto/ }))
}

async function waitForFinalSubmitButton() {
  const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
  await waitFor(() => {
    expect(button.disabled).toBe(false)
  })
  return button
}

describe('ProposalForm — Hinweisart-Schritt (D-06, neu in Plan 191-07)', () => {
  it('startet als 4-Schritte-Assistent mit der Hinweisart-Wahl als erstem Schritt', () => {
    renderForm()

    expect(screen.getAllByText('Schritt 1 von 4')).toHaveLength(1)
    expect(screen.getByText('Hinweisart')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Hinweisart' })).toBeTruthy()
  })

  it('blockiert "Weiter" ohne gewählte Hinweisart mit einer Inline-Fehlermeldung', () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('Bitte wähle eine Hinweisart aus.')).toBeTruthy()
    expect(screen.getAllByText('Schritt 1 von 4')).toHaveLength(1)
  })

  it('zeigt bei Korrektur-Hinweis den Schritt-Titel "Gruppe & Projekt", bei Mitgliedschaftsanfrage nur "Gruppe"', () => {
    renderForm()
    chooseKorrekturHintType()
    expect(screen.getByText('Gruppe & Projekt')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Anfrage für Mitgliedschaft' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('Gruppe')).toBeTruthy()
    expect(screen.queryByText('Gruppe & Projekt')).toBeNull()
  })
})

describe('ProposalForm — Korrektur-Hinweis an die eigene Gruppe (Regressionsschutz, unveränderter Bestandspfad)', () => {
  it('aktualisiert Fortschritt und Button-Beschriftung bei Vor- und Zurück-Navigation', () => {
    renderForm()
    chooseKorrekturHintType()

    expect(screen.getAllByText('Schritt 2 von 4')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(screen.getAllByText('Schritt 1 von 4')).toHaveLength(1)
  })

  it('rendert ausschließlich die übergebenen eigenen Gruppen im Custom-Select', () => {
    renderForm([
      ...OWN_GROUPS,
      { fansub_group_member_id: 2, fansub_group_id: 20, group_name: 'Zweite Gruppe' },
    ])
    chooseKorrekturHintType()

    fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))

    expect(screen.getByRole('option', { name: /Testgruppe/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Zweite Gruppe/ })).toBeTruthy()
  })

  it('aktiviert die Projekt-Auswahl erst nach Gruppenwahl und zeigt den Kontext-Chip mit "Eigene Gruppe"-Badge', async () => {
    renderForm()
    chooseKorrekturHintType()

    expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(true)

    await chooseGroupAndAnime()

    const breadcrumb = screen.getByLabelText('Ausgewählter Kontext')
    expect(breadcrumb.textContent).toContain('Testgruppe')
    expect(breadcrumb.textContent).toContain('Naruto')
    expect(breadcrumb.textContent).toContain('Eigene Gruppe')
  })

  it('zeigt Rollen als Single-Choice-Chips mit eindeutigem aktivem Zustand', async () => {
    renderForm()
    chooseKorrekturHintType()
    await chooseGroupAndAnime()
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

  it('wechselt nach der Rollenauswahl zur Texteingabe ohne direkt zu senden', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    renderForm()
    chooseKorrekturHintType()

    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getAllByText('Schritt 4 von 4')).toHaveLength(1)
    expect(screen.getByLabelText('Hinweis für den Gruppenleader')).toBeTruthy()
    expect(apiMocks.createContributionProposal).not.toHaveBeenCalled()
  })

  it('zeigt Hinweistext, 90-Tage-Regel und begrenzt den Zeichenzähler auf 280', async () => {
    renderForm()
    chooseKorrekturHintType()
    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    const note = screen.getByLabelText('Hinweis für den Gruppenleader') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'x'.repeat(300) } })

    expect(note.value).toHaveLength(280)
    expect(screen.getByText('280/280')).toBeTruthy()
    expect(screen.getByText(/Keine Reaktion nach 90 Tagen/)).toBeTruthy()
    expect(screen.getByLabelText('Von Jahr auswählen')).toBeTruthy()
    expect(screen.getByLabelText('Bis Jahr auswählen')).toBeTruthy()
  })

  it('erkennt einen widersprüchlichen Jahresbereich ohne Layout-Schrittwechsel', async () => {
    renderForm()
    chooseKorrekturHintType()
    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    fireEvent.click(screen.getByLabelText('Von Jahr auswählen'))
    fireEvent.click(screen.getByRole('button', { name: 'Früher' }))
    fireEvent.click(screen.getByRole('button', { name: '2013' }))

    fireEvent.click(screen.getByLabelText('Bis Jahr auswählen'))
    fireEvent.click(screen.getByRole('button', { name: 'Früher' }))
    fireEvent.click(screen.getByRole('button', { name: '2012' }))

    expect(screen.getByText('Das Bis-Jahr darf nicht vor dem Von-Jahr liegen.')).toBeTruthy()
    expect(screen.getAllByText('Schritt 4 von 4')).toHaveLength(1)
  })

  it('zeigt nach dem Senden eine Bestätigung mit Zusammenfassung und schließt erst über Fertig, Payload bleibt byte-identisch', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    renderForm(OWN_GROUPS, { onClose, onSuccess })
    chooseKorrekturHintType()

    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

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
    expect(apiMocks.createFansubGroupHint).not.toHaveBeenCalled()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Hinweis gesendet')).toBeTruthy()
    expect(screen.getByText('Testgruppe')).toBeTruthy()
    expect(screen.getByText('Naruto')).toBeTruthy()
    expect(screen.getByText('Übersetzung')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('zeigt rollenbezogene Konfliktmeldungen aus dem API-Fehler', async () => {
    const { ApiError } = await import('@/lib/api')
    apiMocks.createContributionProposal.mockRejectedValue(
      new ApiError(409, 'Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.'),
    )
    renderForm()
    chooseKorrekturHintType()

    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Für diese Rolle existiert in diesem Projekt bereits ein Hinweis oder Beitrag.',
    )
  })

  // quick-260707-kut: App-Mitglieder (fansub_group_member_id: 0, kein hist-Anker) muessen
  // den Wizard vollstaendig durchlaufen koennen. Regressionstest fuer den Submit-Guard in
  // submitProposal() (vormals Zeile 174), der faelschlich auf selectedGroupMemberId (fuer
  // App-Mitglieder falsy=0) statt auf selectedGroupId (an fansub_group_id gebunden) prüfte.
  it('erlaubt App-Mitgliedern ohne hist-Anker (fansub_group_member_id: 0) den vollstaendigen Wizard-Durchlauf', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const appMemberGroups: MembershipEntry[] = [
      { fansub_group_member_id: 0, fansub_group_id: 5, group_name: 'App-Only-Gruppe' },
    ]
    renderForm(appMemberGroups)
    chooseKorrekturHintType()

    expect((screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }) as HTMLButtonElement).disabled).toBe(false)

    await chooseGroupAndAnime(/App-Only-Gruppe/, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.queryByText('Bitte wähle eine Gruppe aus.')).toBeNull()
    expect(screen.getAllByText('Schritt 3 von 4')).toHaveLength(1)

    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

    await waitFor(() => {
      expect(apiMocks.createContributionProposal).toHaveBeenCalledWith({
        fansub_group_id: 5,
        anime_id: 3,
        fansub_group_member_id: 0,
        role_codes: ['translator'],
        note: null,
        started_year: null,
        ended_year: null,
      })
    })

    expect(screen.getByText('Hinweis gesendet')).toBeTruthy()
  })
})

describe('ProposalForm — A6: Mitgliedschaftsanfrage ohne jede eigene Gruppe (191-UI-SPEC.md Contract A6)', () => {
  // Bewusst NUR ein Smoke-Test auf Wizard-Ebene (kein mehrstufiger Klick-Durchlauf durch
  // Gruppensuche/Rollenfeld/Submit) -- die eigentliche Verhaltens-/Payload-Logik für die
  // Mitgliedschaftsanfrage ist bereits vollständig auf Pure-Function-/Hook-Ebene bewiesen
  // (ProposalForm.useSubmit.test.ts), die Feld-Sichtbarkeit pro Hinweisart auf
  // Step-Komponenten-Ebene (ProposalForm.steps.test.tsx/ProposalForm.extraSteps.test.tsx) —
  // kein Render-/Klick-Simulationstest des gesamten Wizards laut Checker-Vorgabe.
  it('lässt den Wizard trotz ownGroups=[] bis zur Hinweisart-Wahl vollständig bedienbar starten', () => {
    renderForm([])

    expect((screen.getByRole('button', { name: 'Weiter' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(/verifizierte Mitgliedschaft/)).toBeNull()
  })
})
