// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const mockReplace = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams('group=5&tab=users')))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/admin/groups',
  useSearchParams: mockUseSearchParams,
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({
    roles: [
      { role_code: 'co_leader', code: 'co_leader', label_de: 'Co-Leitung', sort_order: 1 },
      { role_code: 'encoder', code: 'encoder', label_de: 'Encoder', sort_order: 2 },
    ],
  }),
}))

vi.mock('@/lib/roleCatalog', () => ({
  labelForRole: (_roles: unknown[], roleCode: string) => ({ co_leader: 'Co-Leitung', encoder: 'Encoder' }[roleCode] ?? roleCode),
}))

vi.mock('@/lib/api', () => ({
  getFansubList: vi.fn().mockResolvedValue({
    data: [
      { id: 5, name: 'New-Subs', slug: 'new-subs', status: 'active' },
      { id: 7, name: 'Moonlight Subs', slug: 'moonlight-subs', status: 'active' },
    ],
    meta: { total_pages: 1 },
  }),
  listFansubAppMembers: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        fansub_group_id: 5,
        app_user_id: 42,
        status: 'active',
        roles: ['co_leader', 'encoder'],
        media_permissions: { can_upload: false, can_delete_own: false, can_delete_all: false, can_reorder: false },
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:00:00Z',
        app_user: { id: 42, email: 'd1sk@example.com', display_name: 'D1sk', status: 'active', created_at: '', updated_at: '', global_roles: [], last_login_at: '2026-08-24T10:00:00Z' },
        member: { member_id: 3, fansub_name: 'D1sk' },
      },
    ],
  }),
  listClaims: vi.fn().mockResolvedValue({
    data: [
      {
        claim_id: 9,
        app_user_id: 42,
        app_user_email: 'd1sk@example.com',
        app_user_display_name: 'D1sk',
        member_id: 3,
        member_nickname: 'D1sk',
        claim_status: 'pending',
        claim_type: 'claim',
        fansub_group_id: 5,
        fansub_group_name: 'New-Subs',
        note: '',
        created_at: '2026-08-24T10:00:00Z',
        verified_at: null,
      },
    ],
    meta: { total: 1, limit: 100, offset: 0 },
  }),
  listChanges: vi.fn().mockResolvedValue({
    data: [
      {
        event_id: 1,
        event_type: 'membership',
        target_type: 'group_member',
        target_id: 3,
        action: 'Rolle vergeben',
        outcome: 'success',
        occurred_at: '2026-08-24T10:00:00Z',
        actor_app_user_id: 5,
        scope_type: 'fansub_group',
        scope_id: 5,
        payload: null,
        actor_display_name: 'Admin',
        target_display_name: 'D1sk',
      },
    ],
    meta: { total: 1, limit: 25, offset: 0 },
  }),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { AdminGroupsClient } from './AdminGroupsClient'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AdminGroupsClient', () => {
  it('zeigt die Gruppenliste und die Benutzer-Rechteperspektive statt Fansub-CRUD', async () => {
    render(<AdminGroupsClient />)

    expect((await screen.findAllByText('New-Subs')).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Benutzer' })).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'Rollen' })).not.toBeNull()
    expect(screen.queryByText('Fansub-Gruppe anlegen')).toBeNull()
    expect(await screen.findByRole('button', { name: 'D1sk' })).not.toBeNull()
  })

  it('navigiert vom Benutzer in den kanonischen Benutzer-in-Gruppe-Rechteeditor', async () => {
    render(<AdminGroupsClient />)

    const userButton = await screen.findByRole('button', { name: 'D1sk' })
    fireEvent.click(userButton)

    expect(mockPush).toHaveBeenCalledWith('/admin/users/42?tab=roles-rights&group=5')
  })

  it('schreibt die Gruppenauswahl in die URL statt /admin/fansubs zu �ffnen', async () => {
    render(<AdminGroupsClient />)

    const moonlightButton = await screen.findByRole('button', { name: 'Moonlight Subs' })
    fireEvent.click(moonlightButton)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })
    const calls = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calls).toContain('/admin/groups?group=7&tab=users')
    expect(calls).not.toContain('/admin/fansubs')
  })
})
