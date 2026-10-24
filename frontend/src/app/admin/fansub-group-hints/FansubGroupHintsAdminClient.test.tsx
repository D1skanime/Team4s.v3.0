// @vitest-environment jsdom
//
// 191-09: Logik-Tests statt Render-/Klick-Simulation (CLAUDE.md Teststil-Regel) — die
// fachliche Entscheidungslogik (Zeilenaktionen je Status, Reject-Payload-Form, Status-
// Label/Badge-Zuordnung, Leerzustand-Text je Filter) lebt in kleinen, benannten, exportierten
// reinen Funktionen und wird HIER direkt aufgerufen, ohne die Komponente zu mounten.
// `ClaimsClient.test.tsx` (voller render+fireEvent+screen-Click-Simulationspfad) ist bewusst
// NICHT das Vorbild — siehe 191-09-PLAN.md Objective. Mounting ist auf genau zwei isolierte
// render-and-assert-Faelle begrenzt (Seitentitel, Table-vs-Mobile-Card-Weiche).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/fansub-group-hints'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ replace: vi.fn() })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

const sampleHint = {
  id: 1,
  sender_app_user_id: 42,
  sender_display_name: 'Mira',
  sender_own_group_name: 'NewSubs',
  target_fansub_group_id: 5,
  target_fansub_group_name: 'RedHeartFansub',
  related_anime_id: 7,
  related_anime_title: 'Beispiel-Anime',
  note: null,
  status: 'open' as const,
  decided_by: null,
  decided_at: null,
  decision_note: null,
  created_at: '2026-10-20T10:00:00Z',
}

const mockListAdminFansubGroupHints = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: [], meta: { total: 0, limit: 25, offset: 0 } }),
)
const mockConfirmAdminFansubGroupHint = vi.hoisted(() => vi.fn().mockResolvedValue({ message: 'ok' }))
const mockRejectAdminFansubGroupHint = vi.hoisted(() => vi.fn().mockResolvedValue({ message: 'ok' }))

vi.mock('@/lib/api', () => ({
  listAdminFansubGroupHints: mockListAdminFansubGroupHints,
  confirmAdminFansubGroupHint: mockConfirmAdminFansubGroupHint,
  rejectAdminFansubGroupHint: mockRejectAdminFansubGroupHint,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import {
  buildRejectPayload,
  emptyStateCopy,
  FansubGroupHintsAdminClient,
  hintStatusLabel,
  hintStatusVariant,
  rowActionsForStatus,
} from './FansubGroupHintsAdminClient'

beforeEach(() => {
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  mockListAdminFansubGroupHints.mockResolvedValue({ data: [], meta: { total: 0, limit: 25, offset: 0 } })
})

describe('rowActionsForStatus (D-03: keine Aktion ausser Bestaetigen/Ablehnen, nur bei offenen Hinweisen)', () => {
  it('liefert confirm+reject fuer status=open', () => {
    expect(rowActionsForStatus('open')).toEqual(['confirm', 'reject'])
  })

  it('liefert keine Aktionen fuer status=acknowledged', () => {
    expect(rowActionsForStatus('acknowledged')).toEqual([])
  })

  it('liefert keine Aktionen fuer status=rejected', () => {
    expect(rowActionsForStatus('rejected')).toEqual([])
  })
})

describe('hintStatusLabel / hintStatusVariant', () => {
  it('uebersetzt open/acknowledged/rejected korrekt', () => {
    expect(hintStatusLabel('open')).toBe('Offen')
    expect(hintStatusLabel('acknowledged')).toBe('Bestätigt')
    expect(hintStatusLabel('rejected')).toBe('Abgelehnt')
  })

  it('ordnet die passende Badge-Variante zu', () => {
    expect(hintStatusVariant('open')).toBe('warning')
    expect(hintStatusVariant('acknowledged')).toBe('success')
    expect(hintStatusVariant('rejected')).toBe('danger')
  })
})

describe('buildRejectPayload (exakte Request-Body-Form fuer rejectAdminFansubGroupHint)', () => {
  it('trimmt eine nicht-leere Eingabe', () => {
    expect(buildRejectPayload('  Begründung  ')).toBe('Begründung')
  })

  it('normalisiert leere/nur-Leerzeichen-Eingabe zu undefined', () => {
    expect(buildRejectPayload('')).toBeUndefined()
    expect(buildRejectPayload('   ')).toBeUndefined()
  })
})

describe('emptyStateCopy (Leerzustand je Filter)', () => {
  it('liefert die kurze Kopie fuer status=open', () => {
    expect(emptyStateCopy('open')).toEqual({ title: 'Keine offenen Hinweise an Gruppen ohne Leitung.' })
  })

  it('liefert die lange Kopie ohne Filter', () => {
    const copy = emptyStateCopy(undefined)
    expect(copy.title).toBe('Keine offenen Hinweise an Gruppen ohne Leitung')
    expect(copy.description).toContain('ohne aktive Leitung')
  })
})

describe('FansubGroupHintsAdminClient — isolierte Render-Checks (kein Interaktions-Replay)', () => {
  it('rendert den unveraenderten Seitentitel <h1>Hinweise ohne Leitung</h1>', async () => {
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Hinweise ohne Leitung' })).not.toBeNull()
    })
  })

  it('rendert die Desktop-Tabelle (kein Mobile-Breakpoint) bei vorhandenen Treffern', async () => {
    mockListAdminFansubGroupHints.mockResolvedValue({
      data: [sampleHint],
      meta: { total: 1, limit: 25, offset: 0 },
    })
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByRole('table')).not.toBeNull()
    })
  })

  it('rendert die Mobile-Card-Variante statt der Tabelle unter dem 759px-Breakpoint', async () => {
    mockMatchMedia(true)
    mockListAdminFansubGroupHints.mockResolvedValue({
      data: [sampleHint],
      meta: { total: 1, limit: 25, offset: 0 },
    })
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByText('Mira')).not.toBeNull()
    })
    expect(screen.queryByRole('table')).toBeNull()
  })

  // D-34 (Plan 191-36): related_release_label (Plan 191-32) muss sowohl in der Desktop-
  // Tabelle als auch in der Mobile-Card sichtbar sein, ohne den Projekttitel zu verdraengen.
  it('zeigt das Release-Label zusaetzlich zum Projekt in der Desktop-Tabelle', async () => {
    mockListAdminFansubGroupHints.mockResolvedValue({
      data: [{ ...sampleHint, related_release_label: 'Episode 12 — Foo · v2' }],
      meta: { total: 1, limit: 25, offset: 0 },
    })
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByRole('table')).not.toBeNull()
    })
    expect(screen.getByText('Beispiel-Anime')).toBeTruthy()
    expect(screen.getByText(/Episode 12 — Foo · v2/)).toBeTruthy()
  })

  it('zeigt das Release-Label zusaetzlich zum Projekt in der Mobile-Card', async () => {
    mockMatchMedia(true)
    mockListAdminFansubGroupHints.mockResolvedValue({
      data: [{ ...sampleHint, related_release_label: 'Episode 12 — Foo · v2' }],
      meta: { total: 1, limit: 25, offset: 0 },
    })
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByText('Mira')).not.toBeNull()
    })
    expect(screen.getByText('Beispiel-Anime')).toBeTruthy()
    expect(screen.getByText(/Episode 12 — Foo · v2/)).toBeTruthy()
  })

  it('zeigt keine Release-Zeile, wenn related_release_label null ist', async () => {
    mockListAdminFansubGroupHints.mockResolvedValue({
      data: [sampleHint],
      meta: { total: 1, limit: 25, offset: 0 },
    })
    render(<FansubGroupHintsAdminClient />)
    await waitFor(() => {
      expect(screen.getByText('Beispiel-Anime')).toBeTruthy()
    })
    expect(screen.queryByText(/Episode 12/)).toBeNull()
  })
})
