// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RoleDefinitionOption } from '@/types/admin-capability'
import type { HistFansubGroupMember } from '@/types/fansub'

import type { GroupMembersTabActions } from './GroupMembersTab'

const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class extends Error {
    status: number
    code?: string
    constructor(status: number, message = 'API request failed') {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  listGroupMembers: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        fansub_group_id: 10,
        member_id: 100,
        display_name: 'Sora',
        joined_date: null,
        left_date: null,
        app_user_id: null,
        app_username: null,
        active_app_member_id: null,
        status: 'historical',
        visibility: 'internal',
        confirmed_by_app_user_id: null,
        confirmed_by_display_name: null,
        confirmed_at: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }),
  listMemberRoles: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        fansub_group_member_id: 1,
        member_display_name: 'Sora',
        role_code: 'founder',
        role_label: null,
        started_date: '2020-01-01',
        ended_date: null,
        note: null,
        status: 'historical',
        created_at: '2020-01-01T00:00:00Z',
      },
    ],
  }),
  listClaimInvitations: vi.fn().mockResolvedValue([]),
  listPendingMemberClaims: vi.fn().mockResolvedValue([]),
  listMemberRequests: vi.fn().mockResolvedValue([]),
  createGroupMember: vi.fn(),
  createMemberRole: vi.fn(),
  deleteGroupMember: vi.fn(),
  deleteMemberRole: vi.fn(),
  updateGroupMember: vi.fn(),
  updateMemberRole: vi.fn(),
  approveMemberRequest: vi.fn(),
  cancelClaimInvitation: vi.fn(),
  generateClaimInvitation: vi.fn(),
  rejectMemberClaim: vi.fn(),
  rejectMemberRequest: vi.fn(),
  verifyMemberClaim: vi.fn(),
  activateClaimedMember: vi.fn(),
}))

import { findDuplicateMemberMatches, useGroupMembersTab } from './useGroupMembersTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function buildMember(overrides: Partial<HistFansubGroupMember> = {}): HistFansubGroupMember {
  return {
    id: 1,
    fansub_group_id: 10,
    member_id: 100,
    display_name: 'Sora',
    joined_date: null,
    left_date: null,
    app_user_id: null,
    app_username: null,
    active_app_member_id: null,
    status: 'historical',
    visibility: 'internal',
    confirmed_by_app_user_id: null,
    confirmed_by_display_name: null,
    confirmed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useGroupMembersTab roleSummary', () => {
  it('resolves an open historical role label via labelForRole(historyRoleOptions, code)', async () => {
    const historyRoleOptions: RoleDefinitionOption[] = [
      { code: 'founder', label_de: 'Gründer/in', sort_order: 1 } as RoleDefinitionOption,
    ]
    let capturedActions: GroupMembersTabActions | null = null
    const onActionsChange = (actions: GroupMembersTabActions | null) => {
      capturedActions = actions
    }

    const { result } = renderHook(() =>
      useGroupMembersTab({ fansubId: 10, historyRoleOptions, onActionsChange }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(capturedActions).not.toBeNull())

    const option = capturedActions!.historicalIdentityOptions.find((o) => o.displayName === 'Sora')
    expect(option?.roleSummary).toBe('Gründer/in')
  })
})

describe('findDuplicateMemberMatches', () => {
  it('finds a case-insensitive, trimmed exact match', () => {
    const members = [buildMember({ id: 1, display_name: 'sora' }), buildMember({ id: 2, display_name: '  Sora  ' })]
    const matches = findDuplicateMemberMatches(members, 'Sora')
    expect(matches).toHaveLength(2)
    expect(matches.map((m) => m.member.id).sort()).toEqual([1, 2])
  })

  it('flags active/linked members via active_app_member_id or app_user_id', () => {
    const linked = buildMember({ id: 1, display_name: 'Sora', active_app_member_id: 5 })
    const unlinked = buildMember({ id: 2, display_name: 'Riko' })
    expect(findDuplicateMemberMatches([linked], 'Sora')[0].isActiveLinked).toBe(true)
    expect(findDuplicateMemberMatches([unlinked], 'Riko')[0].isActiveLinked).toBe(false)
  })

  it('sorts the active/linked match first regardless of input order', () => {
    const historical = buildMember({ id: 1, display_name: 'Sora' })
    const linked = buildMember({ id: 2, display_name: 'Sora', app_user_id: 42 })
    const matches = findDuplicateMemberMatches([historical, linked], 'Sora')
    expect(matches[0].member.id).toBe(2)
    expect(matches[0].isActiveLinked).toBe(true)
    expect(matches[1].member.id).toBe(1)
    expect(matches[1].isActiveLinked).toBe(false)
  })

  it('returns an empty array for an empty or whitespace-only display name', () => {
    const members = [buildMember({ display_name: 'Sora' })]
    expect(findDuplicateMemberMatches(members, '')).toEqual([])
    expect(findDuplicateMemberMatches(members, '   ')).toEqual([])
  })

  it('returns an empty array when no name matches', () => {
    const members = [buildMember({ display_name: 'Sora' })]
    expect(findDuplicateMemberMatches(members, 'Riko')).toEqual([])
  })
})
