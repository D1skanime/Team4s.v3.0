// @vitest-environment jsdom
//
// Plan 138-16 (D-06): GroupRolesTab beantwortet "wer hält welche Rolle IN DIESER GRUPPE" rein
// client-seitig aus der bereits vorhandenen, bereits autorisierten
// listFansubAppMembers(fansubId)-Antwort (kein neuer Backend-Endpunkt). Diese Tests sichern die
// beiden geplanten Behaviors: Gruppierung nach Rollencode mit klickbarer Benutzer-Navigation,
// sowie einen sauberen EmptyState statt einer kaputten leeren Tabelle bei null Mitgliedern.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'

import type { FansubAppMember } from '@/types/fansub'

const mockPush = vi.hoisted(() => vi.fn())
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}))

const mockUseAuthSession = vi.hoisted(() => vi.fn(() => ({
  authToken: '',
  hasAccessToken: true,
  hasRefreshToken: false,
  displayName: 'Test User',
  isClientInitialized: true,
})))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  mockListFansubAppMembers.mockReset()
  mockUseAuthSession.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: false,
    displayName: 'Test User',
    isClientInitialized: true,
  })
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

describe('GroupRolesTab — Regressionen (Pattern B)', () => {
  it('behaelt eine bereits angezeigte Fehlermeldung, wenn der Zugriff waehrend der Sitzung entzogen wird', async () => {
    mockListFansubAppMembers.mockRejectedValueOnce(new Error('boom'))

    const { rerender } = render(<GroupRolesTab fansubId={5} />)
    await waitFor(() => expect(screen.getByText('Rollen konnten nicht geladen werden.')).not.toBeNull())

    mockUseAuthSession.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: false,
      displayName: 'Test User',
      isClientInitialized: true,
    })
    rerender(<GroupRolesTab fansubId={5} />)

    // Sticky-loadError-Sonderfall: die Fehlermeldung bleibt sichtbar, obwohl der Zugriff jetzt fehlt.
    expect(screen.getByText('Rollen konnten nicht geladen werden.')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('gleiche fansubId loest keine, ein Wechsel genau eine neue Anfrage aus; eine verspaetete alte Antwort wird nie angewandt', async () => {
    const first = deferred<{ data: FansubAppMember[] }>()
    mockListFansubAppMembers.mockReturnValueOnce(first.promise)

    const { rerender } = render(<GroupRolesTab fansubId={5} />)
    await waitFor(() => expect(mockListFansubAppMembers).toHaveBeenCalledTimes(1))

    rerender(<GroupRolesTab fansubId={5} />)
    expect(mockListFansubAppMembers).toHaveBeenCalledTimes(1)

    const second = deferred<{ data: FansubAppMember[] }>()
    mockListFansubAppMembers.mockReturnValueOnce(second.promise)
    rerender(<GroupRolesTab fansubId={7} />)
    await waitFor(() => expect(mockListFansubAppMembers).toHaveBeenCalledTimes(2))

    first.resolve({
      data: [member({ app_user_id: 42, roles: ['translator'], member: { member_id: 1, fansub_name: 'VeraltetFansub5' } })],
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryByRole('button', { name: 'VeraltetFansub5' })).toBeNull()

    second.resolve({
      data: [member({ app_user_id: 99, roles: ['encoder'], member: { member_id: 2, fansub_name: 'AktuellFansub7' } })],
    })
    expect(await screen.findByRole('button', { name: 'AktuellFansub7' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'VeraltetFansub5' })).toBeNull()
  })

  it('StrictMode verursacht keine Anfragen ueber Reacts Dev-Doppelaufruf hinaus', async () => {
    mockListFansubAppMembers.mockResolvedValue({
      data: [member({ app_user_id: 42, roles: ['translator'], member: { member_id: 1, fansub_name: 'Mira' } })],
    })

    render(
      <StrictMode>
        <GroupRolesTab fansubId={5} />
      </StrictMode>,
    )

    expect(await screen.findByRole('button', { name: 'Mira' })).not.toBeNull()
    expect(mockListFansubAppMembers.mock.calls.length).toBe(2)
  })
})
