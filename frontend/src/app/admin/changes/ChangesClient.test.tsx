// @vitest-environment jsdom
//
// Plan 138-11 (D-25/D-26/D-27): ChangesClient ist die zentrale, gruppenübergreifende
// "Änderungen"-Arbeitsfläche. Diese Tests prüfen die vier locked Behaviors: den exakten
// Leerzustand, das bedingte Rendern von Vorher/Nachher-Zeilen (nur wenn beide vorhanden sind),
// den URL-Roundtrip beim Zeitraum-Filter und echte Button-basierte Navigation für Akteur/Ziel
// (D-02) statt reinem Text.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ChangesClient } from './ChangesClient'

const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/changes'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

const mockListChanges = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, limit: 25, offset: 0 },
  }),
)

vi.mock('@/lib/api', () => ({
  listChanges: mockListChanges,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

const overrideMutatedEntry = {
  event_id: 1,
  event_type: 'effective_rights.override.mutated',
  target_type: 'user_group_capability_override',
  target_id: 42,
  action: 'review.decide',
  outcome: 'allowed',
  occurred_at: '2026-08-23T10:00:00Z',
  actor_app_user_id: 7,
  scope_type: 'group',
  scope_id: 5,
  payload: { action_code: 'review.decide', kind: 'set_deny', changed: true },
}

beforeEach(() => {
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  mockListChanges.mockResolvedValue({
    data: [],
    meta: { total: 0, limit: 25, offset: 0 },
  })
})

describe('ChangesClient — Leerzustand (D-25 locked copy)', () => {
  it('rendert die exakte gelockte Kopie "Keine Änderungen gefunden." wenn keine Einträge vorliegen', async () => {
    render(<ChangesClient />)

    await waitFor(() => {
      expect(screen.getByText('Keine Änderungen gefunden.')).not.toBeNull()
    })
    expect(
      screen.getByText(
        'Für die gewählten Filter liegen keine administrativen Änderungen vor. Zeitraum oder Filter anpassen.',
      ),
    ).not.toBeNull()
  })
})

describe('ChangesClient — Vorher/Nachher (R-07 ehrliches Weglassen)', () => {
  it('rendert für effective_rights.override.mutated (kein Vorher/Nachher im Payload) keine Vorher/Nachher-Zeile', async () => {
    mockListChanges.mockResolvedValue({
      data: [overrideMutatedEntry],
      meta: { total: 1, limit: 25, offset: 0 },
    })

    render(<ChangesClient />)

    await waitFor(() => {
      expect(screen.getByText(/review\.decide/)).not.toBeNull()
    })
    expect(screen.queryByText(/Vorher:/)).toBeNull()
    expect(screen.queryByText(/Nachher:/)).toBeNull()
  })
})

describe('ChangesClient — Zeitraum-Filter URL-Roundtrip', () => {
  it('schreibt einen geänderten Zeitraum-Filter in die URL und lädt via listChanges neu', async () => {
    render(<ChangesClient />)

    await waitFor(() => {
      expect(mockListChanges).toHaveBeenCalled()
    })
    mockListChanges.mockClear()

    const fromInput = await screen.findByLabelText('Von')
    fireEvent.change(fromInput, { target: { value: '2026-08-01' } })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })
    const calledWith = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledWith).toContain('from=2026-08-01')
  })
})

describe('ChangesClient — bidirektionale Navigation (D-02)', () => {
  it('rendert Akteur- und Ziel-Zellen als klickbare Button-Navigation, nie als reinen Text', async () => {
    mockListChanges.mockResolvedValue({
      data: [overrideMutatedEntry],
      meta: { total: 1, limit: 25, offset: 0 },
    })

    render(<ChangesClient />)

    const actorButton = await screen.findByRole('button', { name: 'Benutzer #7' })
    const targetButton = await screen.findByRole('button', { name: 'Benutzer #42' })

    fireEvent.click(actorButton)
    expect(mockPush).toHaveBeenCalledWith('/admin/users/7')

    fireEvent.click(targetButton)
    expect(mockPush).toHaveBeenCalledWith('/admin/users/42')
  })
})
