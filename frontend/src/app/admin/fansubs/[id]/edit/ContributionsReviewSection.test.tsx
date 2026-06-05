// @vitest-environment jsdom
// Wave-0 RED-Test: ContributionsReviewSection existiert noch nicht — Compile-Fehler erwartet.
// Diese Tests laufen RED, bis 78-02 die Komponente implementiert.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// --- Mock-Definitionen ---

const listGroupProposals = vi.fn()
const confirmProposal = vi.fn()
const rejectProposal = vi.fn()

vi.mock('@/lib/api', () => ({
  listGroupProposals: (...args: unknown[]) => listGroupProposals(...args),
  confirmProposal: (...args: unknown[]) => confirmProposal(...args),
  rejectProposal: (...args: unknown[]) => rejectProposal(...args),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(
      status: number,
      message: string,
      retryAfterSeconds: number | null = null,
      code: string | null = null,
    ) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

// Import NACH vi.mock — Compile-Fehler hier ist das erwartete RED-Signal
import { ContributionsReviewSection } from './ContributionsReviewSection'
import type { FansubGroupCapabilities } from '@/types/fansub'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// --- Hilfsdaten ---

const fullCapabilities: FansubGroupCapabilities = {
  can_edit_group: true,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_edit_notes: true,
  can_view_invitations: true,
  can_create_invitation: true,
  can_cancel_invitation: true,
  can_view_releases: true,
  can_view_release_media: true,
  can_upload_release_media: true,
  can_edit_release_notes: true,
}

const noMembersCapabilities: FansubGroupCapabilities = {
  ...fullCapabilities,
  can_manage_members: false,
}

const sampleProposals = [
  {
    id: 1,
    fansub_group_member_id: 10,
    member_display_name: 'Akira Yamamoto',
    anime_id: 42,
    anime_title: 'Kaguya-sama',
    role_codes: ['tl', 'ts'],
    note: null,
    created_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 2,
    fansub_group_member_id: 11,
    member_display_name: 'Sora Tanaka',
    anime_id: 43,
    anime_title: 'Bocchi the Rock',
    role_codes: ['qc'],
    note: 'Bitte prüfen',
    created_at: '2026-06-02T12:00:00Z',
  },
]

// --- D-08: Capability-Gating ---

describe('ContributionsReviewSection — Capability-Gating (D-08)', () => {
  it('rendert nichts (null), wenn can_manage_members fehlt', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    const { container } = render(
      <ContributionsReviewSection fansubId={88} capabilities={noMembersCapabilities} />,
    )

    // Kein Inhalt sichtbar — null-Render
    expect(container.firstChild).toBeNull()
  })

  it('rendert die Sektion, wenn can_manage_members vorhanden ist', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Sektions-Titel aus Copywriting-Contract
    expect(await screen.findByText(/Offene Vorschläge/)).toBeTruthy()
  })
})

// --- SC1 + Lock H: Trennung von Claims — nur Proposals, keine Claim-API ---

describe('ContributionsReviewSection — SC1/Lock H: nur Proposals, keine Claims', () => {
  it('lädt Proposals über listGroupProposals, niemals eine Claim-API', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    await waitFor(() => {
      expect(listGroupProposals).toHaveBeenCalledWith(88, undefined)
    })

    // Kein verifyMemberClaim, keine rejectMemberClaim, kein listPendingMemberClaims
    // (die werden NICHT in @/lib/api gemockt — dieser Mock enthält ausschließlich Proposal-Helfer)
  })

  it('zeigt Proposal-Zeilen mit member_display_name und anime_title', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    expect(await screen.findByText('Akira Yamamoto')).toBeTruthy()
    expect(await screen.findByText('Kaguya-sama')).toBeTruthy()
    expect(await screen.findByText('Sora Tanaka')).toBeTruthy()
    expect(await screen.findByText('Bocchi the Rock')).toBeTruthy()
  })

  it('bestätigt Vorschlag über confirmProposal (fansubId, proposalId) — nie eine Claim-Mutation', async () => {
    listGroupProposals.mockResolvedValue({ data: [sampleProposals[0]] })
    confirmProposal.mockResolvedValue({})

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    fireEvent.click(await screen.findByRole('button', { name: /Vorschlag bestätigen/ }))

    await waitFor(() => {
      expect(confirmProposal).toHaveBeenCalledWith(88, 1, undefined)
    })
  })
})

// --- D-07: „Nur offene anzeigen"-Filter-Toggle ist standardmäßig aktiv ---

describe('ContributionsReviewSection — D-07: offen-Filter-Default', () => {
  it('zeigt den Filter-Toggle „Nur offene anzeigen" als Standard-Zustand', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Toggle-Label aus UI-SPEC Copywriting-Contract
    expect(await screen.findByText('Nur offene anzeigen')).toBeTruthy()
  })

  it('filtert standardmäßig auf offene Proposals (showOnlyOpen=true)', async () => {
    const proposals = [
      { ...sampleProposals[0], status: 'proposed' },
      {
        id: 3,
        fansub_group_member_id: 12,
        member_display_name: 'Erledigter Nutzer',
        anime_id: 44,
        anime_title: 'Erledigtes Anime',
        role_codes: ['tl'],
        note: null,
        created_at: '2026-05-01T00:00:00Z',
        status: 'confirmed',
      },
    ]
    listGroupProposals.mockResolvedValue({ data: proposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Offener Vorschlag sichtbar
    expect(await screen.findByText('Akira Yamamoto')).toBeTruthy()

    // Erledigter Eintrag standardmäßig ausgeblendet (Filter aktiv)
    expect(screen.queryByText('Erledigter Nutzer')).toBeNull()
  })

  it('zeigt erledigte Einträge wenn Toggle auf „Alle anzeigen" umgestellt wird', async () => {
    const proposals = [
      { ...sampleProposals[0], status: 'proposed' },
      {
        id: 3,
        fansub_group_member_id: 12,
        member_display_name: 'Erledigter Nutzer',
        anime_id: 44,
        anime_title: 'Erledigtes Anime',
        role_codes: ['tl'],
        note: null,
        created_at: '2026-05-01T00:00:00Z',
        status: 'confirmed',
      },
    ]
    listGroupProposals.mockResolvedValue({ data: proposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Toggle umschalten
    fireEvent.click(await screen.findByText('Nur offene anzeigen'))

    // Jetzt sollte „Alle anzeigen" sichtbar sein
    expect(await screen.findByText('Alle anzeigen')).toBeTruthy()

    // Erledigter Eintrag jetzt sichtbar
    expect(await screen.findByText('Erledigter Nutzer')).toBeTruthy()
  })
})

// --- SC4 / D-04: Scope auf fansubId ---

describe('ContributionsReviewSection — SC4/D-04: fansubId-Scope', () => {
  it('ruft listGroupProposals mit der korrekten fansubId auf', async () => {
    listGroupProposals.mockResolvedValue({ data: [] })

    render(<ContributionsReviewSection fansubId={99} capabilities={fullCapabilities} />)

    await waitFor(() => {
      expect(listGroupProposals).toHaveBeenCalledWith(99, undefined)
    })
    // Falsche Group-ID darf nicht aufgerufen werden
    expect(listGroupProposals).not.toHaveBeenCalledWith(88, undefined)
  })

  it('lädt Proposals neu wenn fansubId sich ändert', async () => {
    listGroupProposals.mockResolvedValue({ data: [] })

    const { rerender } = render(
      <ContributionsReviewSection fansubId={10} capabilities={fullCapabilities} />,
    )

    await waitFor(() => {
      expect(listGroupProposals).toHaveBeenCalledWith(10, undefined)
    })

    rerender(<ContributionsReviewSection fansubId={20} capabilities={fullCapabilities} />)

    await waitFor(() => {
      expect(listGroupProposals).toHaveBeenCalledWith(20, undefined)
    })
  })
})

// --- Sektions-Titel mit Zähler (Copywriting-Contract) ---

describe('ContributionsReviewSection — Sektions-Titel', () => {
  it('zeigt Sektions-Titel „Offene Vorschläge ({n})" mit korrektem Zähler', async () => {
    listGroupProposals.mockResolvedValue({ data: sampleProposals })

    render(<ContributionsReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Titel enthält „Offene Vorschläge" und eine Zahl
    expect(await screen.findByText(/Offene Vorschläge/)).toBeTruthy()
  })
})
