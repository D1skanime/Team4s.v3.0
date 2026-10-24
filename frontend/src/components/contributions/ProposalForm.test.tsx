// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MembershipEntry } from '@/types/contributions'

import { ProposalForm } from './ProposalForm'

const apiMocks = vi.hoisted(() => ({
  getAdminFansubAnime: vi.fn(),
  getPublicFansubProfileBySlug: vi.fn(),
  createContributionProposal: vi.fn(),
  createFansubGroupHint: vi.fn(),
  getFansubList: vi.fn(),
  getGroupReleaseListCursor: vi.fn(),
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
  getPublicFansubProfileBySlug: apiMocks.getPublicFansubProfileBySlug,
  getFansubList: apiMocks.getFansubList,
  getGroupReleaseListCursor: apiMocks.getGroupReleaseListCursor,
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

// Default: keine Releases vorhanden -- die Release-Auswahl bleibt in den meisten Tests
// unangetastet bei "Ganzes Projekt" (D-29), einzelne Tests ueberschreiben das gezielt.
apiMocks.getGroupReleaseListCursor.mockResolvedValue({ items: [] })

function renderForm(ownGroups = OWN_GROUPS, props?: Partial<Parameters<typeof ProposalForm>[0]>) {
  return render(
    <ProposalForm
      onSuccess={props?.onSuccess ?? vi.fn()}
      onClose={props?.onClose ?? vi.fn()}
      ownGroups={ownGroups}
      roleDefinitions={props?.roleDefinitions ?? ROLE_DEFINITIONS}
      prefill={props?.prefill}
    />,
  )
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

  // Die Projektwahl loest D-29/D-34s Release-Ladung aus (useProposalFormReleaseOptions) --
  // ohne dieses Warten wuerde die danach aufgeloeste Mock-Promise ausserhalb von act()
  // aktualisieren und Tests mit act()-Warnungen verschmutzen.
  await waitFor(() => {
    expect((screen.getByLabelText('Release (optional)') as HTMLSelectElement).disabled).toBe(false)
  })
}

async function waitForFinalSubmitButton() {
  const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
  await waitFor(() => {
    expect(button.disabled).toBe(false)
  })
  return button
}

describe('ProposalForm — Drei-Schritte-Assistent (D-09: keine Hinweisart-Wahl mehr)', () => {
  it('startet als 3-Schritte-Assistent mit "Gruppe & Projekt" als erstem Schritt', () => {
    renderForm()

    expect(screen.getAllByText('Schritt 1 von 3')).toHaveLength(1)
    expect(screen.getByText('Gruppe & Projekt')).toBeTruthy()
    expect(screen.queryByRole('radiogroup', { name: 'Hinweisart' })).toBeNull()
  })

  it('aktualisiert Fortschritt und Button-Beschriftung bei Vor- und Zurück-Navigation', () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getAllByText('Schritt 2 von 3')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(screen.getAllByText('Schritt 1 von 3')).toHaveLength(1)
  })

  it('rendert ausschließlich die übergebenen eigenen Gruppen im Custom-Select', () => {
    renderForm([
      ...OWN_GROUPS,
      { fansub_group_member_id: 2, fansub_group_id: 20, group_name: 'Zweite Gruppe' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))

    expect(screen.getByRole('option', { name: /Testgruppe/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Zweite Gruppe/ })).toBeTruthy()
  })

  it('aktiviert die Projekt-Auswahl erst nach Gruppenwahl und zeigt den Kontext-Chip mit "Eigene Gruppe"-Badge', async () => {
    renderForm()

    expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(true)

    await chooseGroupAndAnime()

    const breadcrumb = screen.getByLabelText('Ausgewählter Kontext')
    expect(breadcrumb.textContent).toContain('Testgruppe')
    expect(breadcrumb.textContent).toContain('Naruto')
    expect(breadcrumb.textContent).toContain('Eigene Gruppe')
  })

  it('zeigt Rollen als Single-Choice-Chips mit eindeutigem aktivem Zustand', async () => {
    renderForm()
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

    await chooseGroupAndAnime()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getAllByText('Schritt 3 von 3')).toHaveLength(1)
    expect(screen.getByLabelText('Hinweis für den Gruppenleader')).toBeTruthy()
    expect(apiMocks.createContributionProposal).not.toHaveBeenCalled()
  })

  it('zeigt Hinweistext, 90-Tage-Regel und begrenzt den Zeichenzähler auf 280', async () => {
    renderForm()
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
    expect(screen.getAllByText('Schritt 3 von 3')).toHaveLength(1)
  })

  it('zeigt nach dem Senden eine Bestätigung mit Zusammenfassung und schließt erst über Fertig, Payload bleibt byte-identisch', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    renderForm(OWN_GROUPS, { onClose, onSuccess })

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
        release_version_id: null,
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
  // submitProposal(), der faelschlich auf selectedGroupMemberId (fuer App-Mitglieder
  // falsy=0) statt auf selectedGroupId (an fansub_group_id gebunden) prüfte.
  it('erlaubt App-Mitgliedern ohne hist-Anker (fansub_group_member_id: 0) den vollstaendigen Wizard-Durchlauf', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const appMemberGroups: MembershipEntry[] = [
      { fansub_group_member_id: 0, fansub_group_id: 5, group_name: 'App-Only-Gruppe' },
    ]
    renderForm(appMemberGroups)

    expect((screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }) as HTMLButtonElement).disabled).toBe(false)

    await chooseGroupAndAnime(/App-Only-Gruppe/, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.queryByText('Bitte wähle eine Gruppe aus.')).toBeNull()
    expect(screen.getAllByText('Schritt 2 von 3')).toHaveLength(1)

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
        release_version_id: null,
      })
    })

    expect(screen.getByText('Hinweis gesendet')).toBeTruthy()
  })

  it('lässt den Wizard trotz ownGroups=[] bis zur Gruppenwahl vollständig bedienbar starten', () => {
    renderForm([])

    expect((screen.getByRole('button', { name: 'Weiter' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(/verifizierte Mitgliedschaft/)).toBeNull()
  })
})

// D-29/D-34 (Plan 191-34): die in Plan 191-33 gebaute Release-Auswahl wird hier tatsaechlich
// in den Wizard verdrahtet -- Default "Ganzes Projekt", Reset bei Projektwechsel, und beide
// Submit-Pfade (own via release_version_id, foreign via related_release_version_id) tragen
// die getroffene Auswahl.
describe('ProposalForm — Release-Auswahl in Schritt 1 (D-29/D-34)', () => {
  it('zeigt nach Gruppen-/Projektwahl die Release-Auswahl mit "Ganzes Projekt" als Default', async () => {
    apiMocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [{ id: 152, episode_number: 12, episode_number_label: '12', title: 'Foo', version_label: 'v2' }],
    })
    renderForm()

    await chooseGroupAndAnime()

    const select = await screen.findByLabelText('Release (optional)') as HTMLSelectElement
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Episode 12/ })).toBeTruthy()
    })
    expect(select.value).toBe('')
  })

  it('sendet release_version_id auf dem Eigengruppen-Pfad, wenn ein Release gewaehlt wurde', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    apiMocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [{ id: 152, episode_number: 12, episode_number_label: '12', title: 'Foo', version_label: 'v2' }],
    })
    renderForm()

    await chooseGroupAndAnime()
    await screen.findByLabelText('Release (optional)')
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Episode 12/ })).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText('Release (optional)'), { target: { value: '152' } })

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

    await waitFor(() => {
      expect(apiMocks.createContributionProposal).toHaveBeenCalledWith(
        expect.objectContaining({ release_version_id: 152 }),
      )
    })
  })

  it('setzt die Release-Auswahl zurueck auf "Ganzes Projekt", wenn das Projekt gewechselt wird', async () => {
    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [{ id: 3, title: 'Naruto' }, { id: 4, title: 'Bleach' }],
    })
    apiMocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [{ id: 152, episode_number: 12, episode_number_label: '12', title: 'Foo', version_label: 'v2' }],
    })
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' }))
    fireEvent.click(screen.getByRole('option', { name: /Testgruppe/ }))
    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
    fireEvent.click(screen.getByRole('option', { name: /Naruto/ }))

    await screen.findByLabelText('Release (optional)')
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Episode 12/ })).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText('Release (optional)'), { target: { value: '152' } })
    expect((screen.getByLabelText('Release (optional)') as HTMLSelectElement).value).toBe('152')

    apiMocks.getGroupReleaseListCursor.mockResolvedValue({ items: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
    fireEvent.click(screen.getByRole('option', { name: /Bleach/ }))

    await waitFor(() => {
      expect((screen.getByLabelText('Release (optional)') as HTMLSelectElement).value).toBe('')
    })
  })

  it('sendet related_release_version_id auf dem Fremdgruppen-Pfad, wenn ein Release gewaehlt wurde', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    apiMocks.getFansubList.mockResolvedValue({
      data: [{ id: 99, slug: 'redheart-subs', name: 'RedHeartFansub' }],
    })
    apiMocks.getPublicFansubProfileBySlug.mockResolvedValue({
      data: { projects: [{ id: 7, title: 'Demon Slayer' }] },
    })
    apiMocks.getGroupReleaseListCursor.mockResolvedValue({
      items: [{ id: 300, episode_number: 1, episode_number_label: '1', title: null, version_label: null }],
    })
    renderForm()

    fireEvent.click(screen.getByRole('radio', { name: 'Andere Gruppe' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Andere Gruppe suchen' }), {
      target: { value: 'redheart' },
    })
    fireEvent.click(await screen.findByRole('button', { name: /RedHeartFansub/ }))

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
    fireEvent.click(screen.getByRole('option', { name: /Demon Slayer/ }))

    await screen.findByLabelText('Release (optional)')
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Episode 1/ })).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText('Release (optional)'), { target: { value: '300' } })

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

    await waitFor(() => {
      expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith(
        expect.objectContaining({ related_release_version_id: 300 }),
      )
    })
  })
})

// D-10 (Live-UAT-Bugfix): Schritt 2 lud die Projektliste bisher bei JEDER Gruppenwahl ueber den
// admin-gescopten, mitgliedschaftspflichtigen Endpunkt -- bei "Andere Gruppe" hat der Absender
// nie eine solche Mitgliedschaft, der Aufruf schlug deshalb live reproduzierbar immer mit 403
// fehl. Diese Tests beweisen, dass "Andere Gruppe" stattdessen die oeffentliche Profil-Quelle
// nutzt (kein Mitgliedschafts-Check), waehrend "Eigene Gruppe" unveraendert den Admin-Endpunkt
// ruft.
describe('ProposalForm — Projektliste-Quelle nach groupScope (D-10)', () => {
  const FOREIGN_GROUP = { id: 99, slug: 'redheart-subs', name: 'RedHeartFansub' }

  async function pickForeignGroupViaSearch() {
    apiMocks.getFansubList.mockResolvedValue({ data: [FOREIGN_GROUP] })

    fireEvent.click(screen.getByRole('radio', { name: 'Andere Gruppe' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Andere Gruppe suchen' }), {
      target: { value: 'redheart' },
    })

    const resultButton = await screen.findByRole('button', { name: /RedHeartFansub/ })
    fireEvent.click(resultButton)
  }

  it('ruft bei "Andere Gruppe" getPublicFansubProfileBySlug statt getAdminFansubAnime auf', async () => {
    apiMocks.getPublicFansubProfileBySlug.mockResolvedValue({
      data: { projects: [{ id: 7, title: 'Demon Slayer' }] },
    })
    renderForm()

    await pickForeignGroupViaSearch()

    await waitFor(() => {
      expect(apiMocks.getPublicFansubProfileBySlug).toHaveBeenCalledWith('redheart-subs')
    })
    expect(apiMocks.getAdminFansubAnime).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }))
    expect(screen.getByRole('option', { name: /Demon Slayer/ })).toBeTruthy()
  })

  it('zeigt die "Keine Anime/Projekte"-Leermeldung, wenn die fremde Gruppe keine oeffentlichen Projekte hat', async () => {
    apiMocks.getPublicFansubProfileBySlug.mockResolvedValue({ data: { projects: [] } })
    renderForm()

    await pickForeignGroupViaSearch()

    await waitFor(() => {
      expect(apiMocks.getPublicFansubProfileBySlug).toHaveBeenCalledWith('redheart-subs')
    })
    expect(
      (screen.getByRole('button', { name: 'Bei welchem Anime/Projekt dieser Gruppe?' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('bleibt bei "Eigene Gruppe" unveraendert auf getAdminFansubAnime, ruft getPublicFansubProfileBySlug nicht auf', async () => {
    renderForm()
    await chooseGroupAndAnime()

    expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(10)
    expect(apiMocks.getPublicFansubProfileBySlug).not.toHaveBeenCalled()
  })
})

// D-12 (Plan 191-18 Vorbereitung): ein zweiter Formular-Einstiegspunkt (Fehler-melden-Link
// auf oeffentlichen Projekt-/Release-Seiten) kennt Zielgruppe und Projekt bereits aus dem
// Seitenkontext und uebergibt sie ueber die neue prefill-Prop -- der Wizard muss das
// synchron aus der Prop aufloesen, OHNE die Gruppensuche/Projekt-Lade-Maschinerie der
// interaktiven Auswahl zu beruehren (Regressionsschutz: der D-10-403-Bug darf hierueber
// nicht erneut eingefuehrt werden, weil dieser Einstiegspunkt keinen Slug hat).
describe('ProposalForm — vorausgewaehlter Einstieg (prefill-Prop, D-12-Vorbereitung)', () => {
  const PREFILL_FOREIGN = {
    fansubGroupId: 77,
    fansubGroupName: 'StrawhatSubs',
    animeId: 42,
    animeTitle: 'One Piece',
  }

  it('startet direkt bei Schritt 2 (Rolle), zeigt 2 Fortschritts-Segmente und die Kontext-Zeile', () => {
    renderForm(OWN_GROUPS, { prefill: PREFILL_FOREIGN })

    expect(screen.getAllByText('Schritt 1 von 2')).toHaveLength(1)
    expect(screen.getByText('Rolle')).toBeTruthy()
    expect(screen.queryByText('Gruppe & Projekt')).toBeNull()
    expect(
      screen.getByText('Du meldest einen Fehler zu One Piece bei StrawhatSubs.'),
    ).toBeTruthy()
  })

  it('zeigt auf der ersten sichtbaren Stufe (Schritt 2) keinen "Zurück"-Button', () => {
    renderForm(OWN_GROUPS, { prefill: PREFILL_FOREIGN })

    expect(screen.queryByRole('button', { name: 'Zurück' })).toBeNull()
  })

  it('loest Zielgruppe/Projekt synchron ohne Netzwerk-Aufruf auf und sendet mit den vorausgewaehlten IDs', async () => {
    apiMocks.createFansubGroupHint.mockResolvedValue({ data: {} })
    renderForm(OWN_GROUPS, { prefill: PREFILL_FOREIGN })

    fireEvent.click(screen.getByRole('radio', { name: 'Übersetzung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(await waitForFinalSubmitButton())

    await waitFor(() => {
      expect(apiMocks.createFansubGroupHint).toHaveBeenCalledWith(
        expect.objectContaining({
          target_fansub_group_id: 77,
          related_anime_id: 42,
        }),
      )
    })
    expect(apiMocks.getPublicFansubProfileBySlug).not.toHaveBeenCalled()
    expect(apiMocks.getAdminFansubAnime).not.toHaveBeenCalled()
  })

  it('erkennt eine vorausgewaehlte eigene Gruppe als "own" und sendet ueber createContributionProposal', async () => {
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const prefillOwn = { fansubGroupId: 10, fansubGroupName: 'Testgruppe', animeId: 3, animeTitle: 'Naruto' }
    renderForm(OWN_GROUPS, { prefill: prefillOwn })

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
        release_version_id: null,
      })
    })
    expect(apiMocks.createFansubGroupHint).not.toHaveBeenCalled()
    expect(apiMocks.getAdminFansubAnime).not.toHaveBeenCalled()
  })
})
