// @vitest-environment jsdom
//
// Teststil gemaess CLAUDE.md "Teststil"-Regel: Verhaltens-Assertions ueber die
// exportierten reinen Funktionen (isOpenHint/hintTypeBadgeLabel/roleLineForHint),
// NICHT ueber eine volle render+fireEvent+screen Klick-Simulation wie im
// Donor-Testfile ContributionsReviewSection.test.tsx (191-08-PLAN.md Task 1 nennt
// diesen Donor-Teststil explizit als Negativ-Beispiel). Die Kapabilitaets-Gates
// (null-Rendering bei fehlender/fehlender Berechtigung) sind die einzige Stelle,
// an der tatsaechlich gerendert wird - als isolierter render-and-assert-null
// Check, keine Interaktionssimulation.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const listGroupHints = vi.fn()
const confirmGroupHint = vi.fn()
const rejectGroupHint = vi.fn()

vi.mock('@/lib/api', () => ({
  listGroupHints: (...args: unknown[]) => listGroupHints(...args),
  confirmGroupHint: (...args: unknown[]) => confirmGroupHint(...args),
  rejectGroupHint: (...args: unknown[]) => rejectGroupHint(...args),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(status: number, message: string, _retryAfterSeconds: number | null = null, code: string | null = null) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

import {
  FansubGroupHintsReviewSection,
  hintTypeBadgeLabel,
  isOpenHint,
  roleLineForHint,
} from './FansubGroupHintsReviewSection'
import type { FansubGroupHint } from '@/types/fansub-group-hints'
import type { FansubGroupCapabilities } from '@/types/fansub-capabilities'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const fullCapabilities: FansubGroupCapabilities = {
  can_edit_group: true,
  can_edit_group_general: false,
  can_edit_technical_links: false,
  can_edit_founding_history: false,
  can_update_group_links: false,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_manage_historical_members: true,
  can_manage_historical_roles: true,
  can_link_historical_members: true,
  can_edit_notes: true,
  can_edit_project_timeline: false,
  can_edit_project_notes: false,
  can_view_invitations: true,
  can_create_invitation: true,
  can_cancel_invitation: true,
  can_view_releases: true,
  can_view_release_media: true,
  can_upload_release_media: true,
  can_edit_release_notes: true,
  can_view_group_media: true,
  can_upload_group_media: true,
  can_update_group_media: true,
  can_update_own_group_media: true,
  can_delete_own_group_media: true,
  can_delete_group_media: true,
  can_reorder_group_media: true,
}

function makeHint(overrides: Partial<FansubGroupHint> = {}): FansubGroupHint {
  return {
    id: 1,
    sender_app_user_id: 10,
    sender_display_name: 'Timer-Max',
    sender_own_group_name: null,
    target_fansub_group_id: 5,
    target_fansub_group_name: 'RedHeartFansub',
    hint_type: 'correction',
    related_anime_id: 42,
    related_anime_title: 'Beispiel-Anime',
    requested_role_code: null,
    requested_role_label: null,
    note: 'War bei Episode 3 als Timer dabei.',
    status: 'open',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: '2026-10-20T12:00:00Z',
    ...overrides,
  }
}

describe('isOpenHint', () => {
  it('ist offen bei status="open"', () => {
    expect(isOpenHint('open')).toBe(true)
  })

  it('ist nicht offen bei status="acknowledged"', () => {
    expect(isOpenHint('acknowledged')).toBe(false)
  })

  it('ist nicht offen bei status="rejected"', () => {
    expect(isOpenHint('rejected')).toBe(false)
  })
})

describe('hintTypeBadgeLabel', () => {
  it('liefert "Korrektur-Hinweis" fuer hint_type="correction"', () => {
    expect(hintTypeBadgeLabel('correction')).toBe('Korrektur-Hinweis')
  })

  it('liefert "Anfrage für Mitgliedschaft" fuer hint_type="membership_request"', () => {
    expect(hintTypeBadgeLabel('membership_request')).toBe('Anfrage für Mitgliedschaft')
  })
})

describe('roleLineForHint', () => {
  it('liefert null fuer einen Korrektur-Hinweis (kein Rollenfeld fuer diesen Typ)', () => {
    expect(roleLineForHint(makeHint({ hint_type: 'correction', requested_role_label: null }))).toBeNull()
  })

  it('liefert "Gewünschte Rolle: {label}" wenn eine Rolle angefragt wurde', () => {
    expect(
      roleLineForHint(
        makeHint({
          hint_type: 'membership_request',
          requested_role_code: 'translator',
          requested_role_label: 'Übersetzer',
        }),
      ),
    ).toBe('Gewünschte Rolle: Übersetzer')
  })

  it('liefert "Keine bestimmte Rolle angegeben" bei Mitgliedschaftsanfrage ohne Rolle', () => {
    expect(
      roleLineForHint(
        makeHint({ hint_type: 'membership_request', requested_role_code: null, requested_role_label: null }),
      ),
    ).toBe('Keine bestimmte Rolle angegeben')
  })
})

describe('FansubGroupHintsReviewSection Kapabilitaets-Gate', () => {
  it('rendert null wenn capabilities null ist', () => {
    const { container } = render(
      <FansubGroupHintsReviewSection fansubId={5} capabilities={null} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('rendert null wenn can_manage_members falsy ist', () => {
    const { container } = render(
      <FansubGroupHintsReviewSection
        fansubId={5}
        capabilities={{ ...fullCapabilities, can_manage_members: false }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('laedt Hinweise und zeigt den Abschnitt wenn can_manage_members true ist', async () => {
    listGroupHints.mockResolvedValue({ data: [makeHint()] })

    render(<FansubGroupHintsReviewSection fansubId={5} capabilities={fullCapabilities} />)

    expect(await screen.findByText(/Eingehende Hinweise \(1\)/)).toBeTruthy()
    expect(screen.getByText('Timer-Max')).toBeTruthy()
    expect(screen.getByText('Korrektur-Hinweis')).toBeTruthy()
  })

  it('zeigt die Mitglied-bei-Zeile nur wenn sender_own_group_name vorhanden ist', async () => {
    listGroupHints.mockResolvedValue({
      data: [makeHint({ sender_own_group_name: 'NewSubs' })],
    })

    render(<FansubGroupHintsReviewSection fansubId={5} capabilities={fullCapabilities} />)

    expect(await screen.findByText('Mitglied bei: NewSubs')).toBeTruthy()
  })

  it('zeigt die Fehlermeldung bei Ladefehler', async () => {
    // Keine Error-Instanz (z. B. ein roher String) -> readErrorMessage greift auf
    // den uebergebenen Fallback-Text zurueck, identisch zum Donor-Verhalten.
    listGroupHints.mockRejectedValue('network down')

    render(<FansubGroupHintsReviewSection fansubId={5} capabilities={fullCapabilities} />)

    expect(
      await screen.findByText('Hinweise konnten nicht geladen werden. Seite neu laden.'),
    ).toBeTruthy()
  })

  it('entfernt den Hinweis aus der Liste nach erfolgreicher Bestaetigung', async () => {
    listGroupHints.mockResolvedValue({ data: [makeHint()] })
    confirmGroupHint.mockResolvedValue({ message: 'ok' })

    render(<FansubGroupHintsReviewSection fansubId={5} capabilities={fullCapabilities} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Hinweis bestätigen' }))

    await screen.findByText('Keine offenen Hinweise')
    expect(confirmGroupHint).toHaveBeenCalledWith(5, 1)
  })

  it('das Abbrechen-Icon der Ablehnungs-Expansion hat aria-label="Ablehnung abbrechen"', async () => {
    listGroupHints.mockResolvedValue({ data: [makeHint()] })

    render(<FansubGroupHintsReviewSection fansubId={5} capabilities={fullCapabilities} />)

    // Namens-Suche per Regex statt exaktem String: der Button traegt sowohl den
    // sichtbaren Text "Hinweis ablehnen" als auch (ueber das Icon) das aria-label
    // "Ablehnung abbrechen" - beides fliesst in den berechneten Accessible Name ein.
    fireEvent.click(await screen.findByRole('button', { name: /Hinweis ablehnen/ }))

    expect(await screen.findByLabelText('Ablehnung abbrechen')).toBeTruthy()
  })
})
