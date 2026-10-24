// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// D-12/191-18: ReportHintEntryPoint ist der zweite, kontextuelle Einstiegspunkt in dasselbe
// ProposalForm -- diese Tests pruefen das Sichtbarkeits-Gate (D-12 D2: kein Rendern fuer
// anonyme/uneligible Besucher, kein Fehlertext, kein Platzhalter) und die korrekte
// Vorauswahl-Weitergabe an ProposalForm bei Klick.

const useAuthSessionMock = vi.hoisted(() => vi.fn())
const getOwnProfileMock = vi.hoisted(() => vi.fn())
const getMyMembershipsMock = vi.hoisted(() => vi.fn())
const proposalFormMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getMyMemberships: (...args: unknown[]) => getMyMembershipsMock(...args),
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({
    roles: [
      { code: 'translator', label_de: 'Übersetzung', contexts: ['anime_contribution'], sort_order: 5, assignable: true },
      { code: 'timer', label_de: 'Timing', contexts: ['anime_contribution'], sort_order: 10, assignable: true },
    ],
    error: null,
  }),
}))

vi.mock('./ProposalForm', () => ({
  ProposalForm: (props: unknown) => {
    proposalFormMock(props)
    return <div data-testid="proposal-form-mock" />
  },
}))

import { ReportHintEntryPoint } from './ReportHintEntryPoint'

function mockAuthSession({
  initialized = true,
  access = false,
  refresh = false,
}: { initialized?: boolean; access?: boolean; refresh?: boolean } = {}) {
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: access,
    hasRefreshToken: refresh,
    displayName: access || refresh ? 'Member' : '',
    isClientInitialized: initialized,
  })
}

function makeProfileResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      member_id: 4,
      has_member_profile: true,
      has_project_assignments: true,
      ...overrides,
    },
  }
}

const PREFILL_PROPS = {
  fansubGroupId: 7,
  fansubGroupName: 'NewSubs',
  animeId: 42,
  animeTitle: 'Beispiel-Anime',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReportHintEntryPoint (D-12, Sichtbarkeits-Gate)', () => {
  it('rendert nichts, solange die Auth-Initialisierung noch laeuft', () => {
    mockAuthSession({ initialized: false })

    const { container } = render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    expect(container.firstChild).toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('rendert nichts fuer eine nicht angemeldete Sitzung, ohne das eigene Profil abzufragen', () => {
    mockAuthSession({ initialized: true, access: false, refresh: false })

    const { container } = render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    expect(container.firstChild).toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('rendert nichts fuer eine angemeldete Sitzung ohne Mitgliedsprofil+Projekt-Zuordnung', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({ has_project_assignments: false }))

    const { container } = render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    await waitFor(() => expect(getOwnProfileMock).toHaveBeenCalled())
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('rendert nichts, wenn die Eligibility-Pruefung mit einem Netzwerkfehler fehlschlaegt (T-191-25)', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockRejectedValue(new Error('network down'))

    const { container } = render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    await waitFor(() => expect(getOwnProfileMock).toHaveBeenCalled())
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('zeigt genau einen "Fehler melden"-Textlink fuer eine berechtigte Sitzung', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    await screen.findByRole('button', { name: 'Fehler melden' })
    expect(screen.getAllByRole('button', { name: 'Fehler melden' })).toHaveLength(1)
  })

  it('oeffnet ProposalForm bei Klick mit der korrekten Vorauswahl und den eigenen Gruppen', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    getMyMembershipsMock.mockResolvedValue({
      data: [{ fansub_group_member_id: 1, fansub_group_id: 7, group_name: 'NewSubs' }],
    })

    render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    const button = await screen.findByRole('button', { name: 'Fehler melden' })
    fireEvent.click(button)

    await waitFor(() => screen.getByTestId('proposal-form-mock'))

    expect(proposalFormMock).toHaveBeenCalled()
    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as Record<string, unknown>
    expect(lastCallProps.prefill).toEqual({
      fansubGroupId: 7,
      fansubGroupName: 'NewSubs',
      animeId: 42,
      animeTitle: 'Beispiel-Anime',
    })
    expect(lastCallProps.ownGroups).toEqual([
      { fansub_group_member_id: 1, fansub_group_id: 7, group_name: 'NewSubs' },
    ])
    expect(lastCallProps.roleDefinitions).toEqual([
      { code: 'translator', label_de: 'Übersetzung' },
      { code: 'timer', label_de: 'Timing' },
    ])
  })

  // D-30 (Plan 191-35): die zwei neuen Release-Props sind end-to-end optional -- ohne sie
  // (Projektseiten-Aufrufer, HeroSection.tsx) darf prefill sie nicht erfinden (kein
  // Koerzieren zu null), MIT ihnen (Release-Seiten-Aufrufer, ReleaseDetailHero.tsx) muessen
  // sie unveraendert im prefill-Objekt landen.
  it('uebergibt relatedReleaseVersionId/relatedReleaseLabel unveraendert an ProposalForms prefill, wenn gesetzt', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    getMyMembershipsMock.mockResolvedValue({ data: [] })

    render(
      <ReportHintEntryPoint
        {...PREFILL_PROPS}
        relatedReleaseVersionId={152}
        relatedReleaseLabel="Episode 12 — Foo · v2"
      />,
    )

    const button = await screen.findByRole('button', { name: 'Fehler melden' })
    fireEvent.click(button)

    await waitFor(() => screen.getByTestId('proposal-form-mock'))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as Record<string, unknown>
    expect(lastCallProps.prefill).toEqual({
      ...PREFILL_PROPS,
      relatedReleaseVersionId: 152,
      relatedReleaseLabel: 'Episode 12 — Foo · v2',
    })
  })

  it('laesst relatedReleaseVersionId/relatedReleaseLabel im prefill weg, wenn der Aufrufer sie nicht uebergibt (Rueckwaertskompatibilitaet, z. B. HeroSection.tsx)', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    getMyMembershipsMock.mockResolvedValue({ data: [] })

    render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    const button = await screen.findByRole('button', { name: 'Fehler melden' })
    fireEvent.click(button)

    await waitFor(() => screen.getByTestId('proposal-form-mock'))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as Record<string, unknown>
    expect(lastCallProps.prefill).toEqual({
      ...PREFILL_PROPS,
      relatedReleaseVersionId: undefined,
      relatedReleaseLabel: undefined,
    })
  })

  // D-17 (Plan 191-20): ProposalForm zeigt die Erfolgsansicht selbst ueber internen
  // submittedSummary-State -- der Aufrufer darf das Formular deshalb NICHT beim Erfolg
  // (onSuccess) schliessen, sonst sieht der Nutzer die Erfolgsansicht nie. Nur ein aktiver
  // Klick auf "Fertig" (onClose) darf das Formular unmounten.
  it('onSuccess ist ein No-op -- das Formular bleibt nach einem erfolgreichen Submit gemountet (D-17)', async () => {
    mockAuthSession({ initialized: true, access: true })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    getMyMembershipsMock.mockResolvedValue({ data: [] })

    render(<ReportHintEntryPoint {...PREFILL_PROPS} />)

    const button = await screen.findByRole('button', { name: 'Fehler melden' })
    fireEvent.click(button)

    await waitFor(() => screen.getByTestId('proposal-form-mock'))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as {
      onSuccess: () => void
      onClose: () => void
    }

    act(() => lastCallProps.onSuccess())
    expect(screen.getByTestId('proposal-form-mock')).toBeTruthy()

    act(() => lastCallProps.onClose())
    expect(screen.queryByTestId('proposal-form-mock')).toBeNull()
  })
})
