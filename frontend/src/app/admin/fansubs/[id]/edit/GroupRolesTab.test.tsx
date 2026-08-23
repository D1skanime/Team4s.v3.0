// @vitest-environment jsdom
//
// Plan 138-16 (D-06): GroupRolesTab beantwortet "wer hält welche Rolle IN DIESER GRUPPE" rein
// client-seitig aus der bereits vorhandenen, bereits autorisierten
// listFansubAppMembers(fansubId)-Antwort (kein neuer Backend-Endpunkt). Diese Tests sichern die
// beiden geplanten Behaviors: Gruppierung nach Rollencode mit klickbarer Benutzer-Navigation,
// sowie einen sauberen EmptyState statt einer kaputten leeren Tabelle bei null Mitgliedern.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { FansubAppMember } from '@/types/fansub'

const mockPush = vi.hoisted(() => vi.fn())
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: false,
    displayName: 'Test User',
    isClientInitialized: true,
  }),
}))

const catalogState = {
  roles: [
    { code: 'translator', label_de: 'Übersetzer', contexts: ['fansub_group'], sort_order: 1, assignable: true },
    { code: 'encoder', label_de: 'Encoder', contexts: ['fansub_group'], sort_order: 2, assignable: true },
  ],
  error: null as string | null,
}
vi.mock('@/providers/RoleCatalogProvider', () => ({ useRoleCatalog: () => catalogState }))

const mockListFansubAppMembers = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
  listFansubAppMembers: (...args: unknown[]) => mockListFansubAppMembers(...args),
}))

import { GroupRolesTab } from './GroupRolesTab'

function member(overrides: Partial<FansubAppMember>): FansubAppMember {
  return {
    id: 1,
    fansub_group_id: 5,
    app_user_id: 42,
    status: 'active',
    roles: [],
    media_permissions: { can_upload: false, can_delete_own: false, can_delete_all: false, can_reorder: false },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockListFansubAppMembers.mockReset()
})

describe('GroupRolesTab — Leerzustand', () => {
  it('rendert einen EmptyState statt einer kaputten Tabelle, wenn die Gruppe keine Mitglieder hat', async () => {
    mockListFansubAppMembers.mockResolvedValue({ data: [] })

    render(<GroupRolesTab fansubId={5} />)

    expect(await screen.findByText('Keine Rolleninhaber in dieser Gruppe')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('GroupRolesTab — Gruppierung nach Rollencode', () => {
  it('gruppiert die bereits geladenen Mitglieder-Rollen-Daten nach Rollencode mit klickbarer Benutzer-Navigation', async () => {
    mockListFansubAppMembers.mockResolvedValue({
      data: [
        member({ id: 1, app_user_id: 42, roles: ['translator'], member: { member_id: 1, fansub_name: 'Mira' } }),
        member({ id: 2, app_user_id: 7, roles: ['translator', 'encoder'], member: { member_id: 2, fansub_name: 'Kenji' } }),
      ],
    })

    render(<GroupRolesTab fansubId={5} />)

    expect(await screen.findAllByText('Übersetzer')).toHaveLength(2)
    expect(screen.getByText('Encoder')).not.toBeNull()

    const miraButton = screen.getByRole('button', { name: 'Mira' })
    fireEvent.click(miraButton)
    expect(mockPush).toHaveBeenCalledWith('/admin/users/42')
  })
})
