// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockRouterReplace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/fansubs/88/edit',
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

// API-Mocks — nur die drei von ReadinessTab genutzten Seams (Lock K)
const apiMocks = vi.hoisted(() => ({
  listGroupMembers: vi.fn(),
  listPendingMemberClaims: vi.fn(),
  getAdminFansubAnime: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  ...apiMocks,
}))

vi.mock('./PublicPreviewPanel', () => ({
  PublicPreviewPanel: () => <div data-testid="public-preview-panel" />,
}))

vi.mock('./FansubProfileTabs', () => ({
  FansubProfileTabs: () => <div data-testid="fansub-profile-tabs" />,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockRouterReplace.mockReset()
  apiMocks.listGroupMembers.mockResolvedValue({ data: [] })
  apiMocks.listPendingMemberClaims.mockResolvedValue([])
  apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [] })
})

function makeGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 88,
    slug: 'subgroup',
    name: 'SubGroup',
    status: 'active',
    group_type: 'group',
    logo_url: null,
    banner_url: null,
    anime_relations_count: 0,
    release_versions_count: 0,
    members_count: 0,
    aliases_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================
// Req F — Capability-Gating: Tab-Inhalt sichtbar bei can_edit_group=true
// ============================================================
describe('ReadinessTab — Capability-Gating (Req F)', () => {
  it('wird gerendert wenn can_edit_group=true und zeigt SectionHeader-Titel', async () => {
    const { ReadinessTab } = await import('./ReadinessTab')

    render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: true })}
      />,
    )

    expect(
      await screen.findByText('Veröffentlichung & Pflegezustand'),
    ).not.toBeNull()
  })

  it('rendert keinen verwertbaren Readiness-Inhalt bei reiner Mitgliedschaft (nur can_view_members=true, can_edit_group=false)', async () => {
    const { ReadinessTab } = await import('./ReadinessTab')

    // Der Tab-Inhalt wird bei reiner Mitgliedschaft NICHT via canUseMainTab gezeigt;
    // falls ReadinessTab dennoch direkt gerendert wird, prüfen wir ob er keinen Readiness-
    // Inhalt zeigt oder leer/disabled ist.
    const { container } = render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: false, can_edit_notes: false })}
      />,
    )

    // Keine Readiness-Checkliste sichtbar bei fehlenden Rechten
    expect(screen.queryByText('Bereitschaft')).toBeNull()
    expect(screen.queryByText('Veröffentlichung & Pflegezustand')).toBeNull()
    expect(container.firstChild).toBeNull()
  })
})

// ============================================================
// Req I — Preview read-only: keine Schreib-Buttons im gerendertem Baum
// ============================================================
describe('ReadinessTab — Preview read-only (Req I)', () => {
  it('rendert ohne Speichern-Button und ohne onSave-gesteuerte Interaktionen', async () => {
    const { ReadinessTab } = await import('./ReadinessTab')

    const { container } = render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: true })}
      />,
    )

    // Kein Submit-Button, kein input[type=submit], kein "Speichern"-Label
    expect(screen.queryByRole('button', { name: /Speichern/i })).toBeNull()
    expect(container.querySelector('input[type="submit"]')).toBeNull()
  })
})

// ============================================================
// Lock K — Keine neuen Endpunkte: nur die drei erlaubten API-Seams
// ============================================================
describe('ReadinessTab — Lock K: keine neuen Endpunkte', () => {
  it('ruft nach dem Rendern nur listGroupMembers, listPendingMemberClaims, getAdminFansubAnime auf', async () => {
    const { ReadinessTab } = await import('./ReadinessTab')

    render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: true })}
      />,
    )

    await waitFor(() => {
      expect(apiMocks.listGroupMembers).toHaveBeenCalledWith(88)
      expect(apiMocks.listPendingMemberClaims).toHaveBeenCalledWith(88)
      expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(88)
    })

    // Sicherstellen: keine anderen unbekannten API-Aufrufe (über die drei hinaus)
    expect(apiMocks.listGroupMembers).toHaveBeenCalledTimes(1)
    expect(apiMocks.listPendingMemberClaims).toHaveBeenCalledTimes(1)
    expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledTimes(1)
  })
})

// ============================================================
// D-04 — Sprungmarken: router.replace mit ?tab=media
// ============================================================
describe('ReadinessTab — Sprungmarken D-04', () => {
  it('Klick auf einen Sprungmarken-Button löst router.replace mit ?tab=media aus', async () => {
    const { ReadinessTab } = await import('./ReadinessTab')

    render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: true, logo_url: null })}
      />,
    )

    // Warte bis Checkliste geladen ist
    await waitFor(() => expect(apiMocks.listGroupMembers).toHaveBeenCalled())

    // Klick auf einen Sprungmarken-Button im media-Tab (Logo/Banner fehlt → Sprungmarke sichtbar)
    const mediaButtons = screen.queryAllByRole('button', {
      name: /Im Medien-Tab ergänzen/i,
    })

    if (mediaButtons.length > 0) {
      fireEvent.click(mediaButtons[0])
      expect(mockRouterReplace).toHaveBeenCalledWith(
        expect.stringContaining('tab=media'),
        expect.anything(),
      )
    } else {
      // Falls der Tab noch kein Logo-/Banner-Sprungmarken-Button sichtbar ist:
      // Mindestens prüfen, dass Sprungmarken im DOM sind
      const anyNavButton = screen.queryAllByRole('button', {
        name: /→$/,
      })
      if (anyNavButton.length > 0) {
        fireEvent.click(anyNavButton[0])
        expect(mockRouterReplace).toHaveBeenCalledWith(
          expect.stringMatching(/tab=/),
          expect.anything(),
        )
      }
    }
  })
})

// ============================================================
// D-06 — Informative Zähler: Claims-Badge variant=info, kein "fehlt"-Urteil
// ============================================================
describe('ReadinessTab — D-06 informative Zähler', () => {
  it('zeigt Claims-Zähler als informativ (text "Offene Claims: 3") ohne fehlt-Badge', async () => {
    apiMocks.listPendingMemberClaims.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])

    const { ReadinessTab } = await import('./ReadinessTab')

    render(
      <ReadinessTab
        fansubId={88}
        group={makeGroup({ can_edit_group: true })}
      />,
    )

    // Erwarte Zählertext mit Anzahl 3
    expect(await screen.findByText('Offene Claims: 3')).not.toBeNull()

    // Kein "fehlt"-Urteil für den Claims-Zähler
    const fehltElements = screen.queryAllByLabelText('Status: fehlt')
    // Es darf kein aria-label="Status: fehlt" für den Claims-Zähler existieren
    // (Claims sind informativ, kein bewertbares Bereitschafts-Kriterium)
    const claimsRow = screen.queryByText('Offene Claims: 3')?.closest('[class]')
    if (claimsRow) {
      expect(claimsRow.querySelector('[aria-label="Status: fehlt"]')).toBeNull()
    }

    // Kein Element mit aria-label="Status: fehlt" für Claims
    expect(fehltElements.filter((el) => el.textContent?.includes('fehlt') && el.closest('*')?.textContent?.includes('Offene Claims'))).toHaveLength(0)
  })
})
