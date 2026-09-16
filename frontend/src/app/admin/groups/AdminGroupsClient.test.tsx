// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'

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
import { getFansubList, listChanges, listClaims, listFansubAppMembers } from '@/lib/api'
import type { AdminChangesListResponse, AdminClaimsListResponse } from '@/types/admin-users'
import type { FansubAppMemberListResponse } from '@/types/fansub'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function membersResponse(userLabel: string): FansubAppMemberListResponse {
  return {
    data: [
      {
        id: 1,
        fansub_group_id: 5,
        app_user_id: 42,
        status: 'active',
        roles: ['co_leader'],
        media_permissions: { can_upload: false, can_delete_own: false, can_delete_all: false, can_reorder: false },
        created_at: '2026-08-20T10:00:00Z',
        updated_at: '2026-08-20T10:00:00Z',
        app_user: { id: 42, keycloak_subject: 'sub-42', email: 'd1sk@example.com', display_name: userLabel, status: 'active', created_at: '', updated_at: '', global_roles: [], last_login_at: null },
        member: { member_id: 3, fansub_name: userLabel },
      },
    ],
  }
}

function claimsResponse(nickname: string): AdminClaimsListResponse {
  return {
    data: [
      {
        claim_id: 9,
        app_user_id: 42,
        app_user_email: 'd1sk@example.com',
        app_user_display_name: nickname,
        member_id: 3,
        member_nickname: nickname,
        claim_status: 'pending',
        claim_type: 'claim',
        fansub_group_id: 5,
        fansub_group_name: 'New-Subs',
        is_active_member: true,
        note: '',
        created_at: '2026-08-24T10:00:00Z',
        verified_at: null,
      },
    ],
    meta: { total: 1, limit: 100, offset: 0 },
  }
}

function changesResponse(actor: string): AdminChangesListResponse {
  return {
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
        actor_display_name: actor,
        target_display_name: 'D1sk',
      },
    ],
    meta: { total: 1, limit: 25, offset: 0 },
  }
}

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

  it('schreibt die Gruppenauswahl in die URL statt /admin/fansubs zu Ã¶ffnen', async () => {
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

  it('rendert deutsche Gruppentexte ohne Ersatzzeichen', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=changes'))

    const { container } = render(<AdminGroupsClient />)

    expect(await screen.findByRole('link', { name: 'Änderungen im Kontext öffnen' })).not.toBeNull()
    expect(container.textContent).not.toContain('�')
  })

describe('AdminGroupsClient — Anfrageparitaet und veraltete Antworten pro Summary-Komponente', () => {
  it('GroupMembersSummary: gleiche Gruppe loest keine, ein Gruppenwechsel genau eine neue Anfrage aus; eine verspaetete alte Antwort wird nie angewandt', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=users'))
    const group5Members = deferred<FansubAppMemberListResponse>()
    const group5Claims = deferred<AdminClaimsListResponse>()
    vi.mocked(listFansubAppMembers).mockReturnValueOnce(group5Members.promise)
    vi.mocked(listClaims).mockReturnValueOnce(group5Claims.promise)

    const { rerender } = render(<AdminGroupsClient />)
    await waitFor(() => expect(listFansubAppMembers).toHaveBeenCalledTimes(1))
    expect(listClaims).toHaveBeenCalledTimes(1)

    // Re-render mit UNVERAENDERTER Gruppe darf keine zusaetzliche Anfrage ausloesen.
    rerender(<AdminGroupsClient />)
    expect(listFansubAppMembers).toHaveBeenCalledTimes(1)
    expect(listClaims).toHaveBeenCalledTimes(1)

    // Gruppenwechsel VOR Aufloesung der Gruppe-5-Antwort ansetzen.
    const group7Members = deferred<FansubAppMemberListResponse>()
    const group7Claims = deferred<AdminClaimsListResponse>()
    vi.mocked(listFansubAppMembers).mockReturnValueOnce(group7Members.promise)
    vi.mocked(listClaims).mockReturnValueOnce(group7Claims.promise)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=7&tab=users'))
    rerender(<AdminGroupsClient />)
    await waitFor(() => expect(listFansubAppMembers).toHaveBeenCalledTimes(2))
    expect(listClaims).toHaveBeenCalledTimes(2)

    // Verspaetete Gruppe-5-Antwort darf nach dem Wechsel nicht mehr angewandt werden.
    group5Members.resolve(membersResponse('VeraltetGruppe5'))
    group5Claims.resolve(claimsResponse('VeraltetGruppe5'))
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryByRole('button', { name: 'VeraltetGruppe5' })).toBeNull()

    group7Members.resolve(membersResponse('AktuellGruppe7'))
    group7Claims.resolve(claimsResponse('AktuellGruppe7'))
    expect(await screen.findByRole('button', { name: 'AktuellGruppe7' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'VeraltetGruppe5' })).toBeNull()
  })

  it('GroupRolesSummary: gleiche Gruppe loest keine, ein Gruppenwechsel genau eine neue Anfrage aus; eine verspaetete alte Antwort wird nie angewandt', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=roles'))
    const group5 = deferred<FansubAppMemberListResponse>()
    vi.mocked(listFansubAppMembers).mockReturnValueOnce(group5.promise)

    const { rerender } = render(<AdminGroupsClient />)
    await waitFor(() => expect(listFansubAppMembers).toHaveBeenCalledTimes(1))

    rerender(<AdminGroupsClient />)
    expect(listFansubAppMembers).toHaveBeenCalledTimes(1)

    const group7 = deferred<FansubAppMemberListResponse>()
    vi.mocked(listFansubAppMembers).mockReturnValueOnce(group7.promise)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=7&tab=roles'))
    rerender(<AdminGroupsClient />)
    await waitFor(() => expect(listFansubAppMembers).toHaveBeenCalledTimes(2))

    group5.resolve(membersResponse('VeraltetRolleGruppe5'))
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryByRole('button', { name: 'VeraltetRolleGruppe5' })).toBeNull()

    group7.resolve(membersResponse('AktuellRolleGruppe7'))
    expect(await screen.findByRole('button', { name: 'AktuellRolleGruppe7' })).not.toBeNull()
  })

  it('GroupClaimsSummary: gleiche Gruppe loest keine, ein Gruppenwechsel genau eine neue Anfrage aus; eine verspaetete alte Antwort wird nie angewandt', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=claims'))
    const group5 = deferred<AdminClaimsListResponse>()
    vi.mocked(listClaims).mockReturnValueOnce(group5.promise)

    const { rerender } = render(<AdminGroupsClient />)
    await waitFor(() => expect(listClaims).toHaveBeenCalledTimes(1))

    rerender(<AdminGroupsClient />)
    expect(listClaims).toHaveBeenCalledTimes(1)

    const group7 = deferred<AdminClaimsListResponse>()
    vi.mocked(listClaims).mockReturnValueOnce(group7.promise)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=7&tab=claims'))
    rerender(<AdminGroupsClient />)
    await waitFor(() => expect(listClaims).toHaveBeenCalledTimes(2))

    group5.resolve(claimsResponse('VeraltetClaimGruppe5'))
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryAllByText('VeraltetClaimGruppe5')).toHaveLength(0)

    group7.resolve(claimsResponse('AktuellClaimGruppe7'))
    await waitFor(() => expect(screen.queryAllByText('AktuellClaimGruppe7').length).toBeGreaterThan(0))
  })

  it('GroupChangesSummary: gleiche Gruppe loest keine, ein Gruppenwechsel genau eine neue Anfrage aus; eine verspaetete alte Antwort wird nie angewandt', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=changes'))
    const group5 = deferred<AdminChangesListResponse>()
    vi.mocked(listChanges).mockReturnValueOnce(group5.promise)

    const { rerender } = render(<AdminGroupsClient />)
    await waitFor(() => expect(listChanges).toHaveBeenCalledTimes(1))

    rerender(<AdminGroupsClient />)
    expect(listChanges).toHaveBeenCalledTimes(1)

    const group7 = deferred<AdminChangesListResponse>()
    vi.mocked(listChanges).mockReturnValueOnce(group7.promise)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=7&tab=changes'))
    rerender(<AdminGroupsClient />)
    await waitFor(() => expect(listChanges).toHaveBeenCalledTimes(2))

    group5.resolve(changesResponse('VeraltetActorGruppe5'))
    await Promise.resolve()
    await Promise.resolve()
    expect(screen.queryByText(/VeraltetActorGruppe5/)).toBeNull()

    group7.resolve(changesResponse('AktuellActorGruppe7'))
    expect(await screen.findByText(/AktuellActorGruppe7/)).not.toBeNull()
  })

  it('StrictMode verursacht keine Anfragen ueber Reacts Dev-Doppelaufruf hinaus', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('group=5&tab=users'))

    render(
      <StrictMode>
        <AdminGroupsClient />
      </StrictMode>,
    )

    expect(await screen.findByRole('button', { name: 'D1sk' })).not.toBeNull()
    expect(vi.mocked(listFansubAppMembers).mock.calls.length).toBe(2)
    expect(vi.mocked(listClaims).mock.calls.length).toBe(2)
    expect(vi.mocked(getFansubList).mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
