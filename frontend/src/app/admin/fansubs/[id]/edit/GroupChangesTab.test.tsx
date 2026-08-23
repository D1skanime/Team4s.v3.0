// @vitest-environment jsdom
//
// Plan 138-16 (D-06): GroupChangesTab ist die gruppen-gescopte Wiederverwendung von Plan
// 138-05s zentralem `listChanges`-Endpunkt (Filterparameter real `gruppe`, nicht
// `fansub_group_id` — siehe GroupChangesTab.tsx-Dateikommentar und SUMMARY.md-Abweichung) und
// Plan 138-11s `translateChangeEntry`. Diese Tests sichern: (1) das gruppen-gescopte
// listChanges-Filterargument, (2) die gerenderte deutsche Satzform pro Eintrag, (3) den
// funktionierenden Link zur zentralen /admin/changes-Fläche mit demselben Gruppenfilter.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: false,
    displayName: 'Test User',
    isClientInitialized: true,
  }),
}))

const mockListChanges = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
  listChanges: (...args: unknown[]) => mockListChanges(...args),
}))

import { GroupChangesTab } from './GroupChangesTab'

const activationEntry = {
  event_id: 1,
  event_type: 'member_claim.activated',
  target_type: 'member',
  target_id: 99,
  action: 'member.activate',
  outcome: 'allowed',
  occurred_at: '2026-08-23T10:00:00Z',
  actor_app_user_id: 7,
  scope_type: 'group',
  scope_id: 5,
  payload: {},
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockListChanges.mockReset()
})

describe('GroupChangesTab — gruppen-gescopte Filterung', () => {
  it('ruft listChanges mit dem Gruppenfilter dieser Seite auf (nicht global)', async () => {
    mockListChanges.mockResolvedValue({ data: [], meta: { total: 0, limit: 25, offset: 0 } })

    render(<GroupChangesTab fansubId={5} />)

    await screen.findByText('Keine Änderungen für diese Gruppe')
    expect(mockListChanges).toHaveBeenCalledWith(
      expect.objectContaining({ gruppe: 5, limit: 25, offset: 0 }),
    )
  })
})

describe('GroupChangesTab — Übersetzung pro Eintrag', () => {
  it('rendert translateChangeEntrys deutschen Satz pro Eintrag', async () => {
    mockListChanges.mockResolvedValue({ data: [activationEntry], meta: { total: 1, limit: 25, offset: 0 } })

    render(<GroupChangesTab fansubId={5} />)

    expect(await screen.findByText('Admin hat Mitglied #99 als aktives Mitglied übernommen.')).not.toBeNull()
  })
})

describe('GroupChangesTab — Link zur zentralen Fläche', () => {
  it('rendert einen funktionierenden Link zu /admin/changes?gruppe={fansubId}', async () => {
    mockListChanges.mockResolvedValue({ data: [], meta: { total: 0, limit: 25, offset: 0 } })

    render(<GroupChangesTab fansubId={5} />)

    const link = await screen.findByRole('link', { name: 'Alle Änderungen ansehen' })
    expect(link.getAttribute('href')).toBe('/admin/changes?gruppe=5')
  })
})
