// @vitest-environment jsdom
//
// D-04: User→Rolle-Querverlinkung ("Was darf diese Rolle?") auf
// UserGroupRightsTab. Eine granted_role ist nur linkbar, wenn ihr role_code
// in listRoleCapabilities()'s RoleEntry[] auflösbar ist (Plan 111-04).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { AdminUserGroupRightsResponse } from '@/types/admin-users'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'

const mockGetAdminUserGroupRights = vi.fn()
const mockListRoleCapabilities = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserGroupRights: (...args: unknown[]) => mockGetAdminUserGroupRights(...args),
  listRoleCapabilities: (...args: unknown[]) => mockListRoleCapabilities(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { UserGroupRightsTab } from './UserGroupRightsTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeGroupRightsResponse(role: string): AdminUserGroupRightsResponse {
  return {
    group_rights: [
      {
        fansub_group_id: 1,
        fansub_group_name: 'Sakura-Fansub',
        granted_roles: [role],
        can_view_members: true,
        can_edit_content: true,
      },
    ],
  }
}

function makeMatrix(roleCodes: string[]): RoleCapabilityMatrix {
  return {
    roles: roleCodes.map((code) => ({
      role_code: code,
      label_de: code,
      actions: [],
    })),
    all_actions: [],
  }
}

describe('UserGroupRightsTab', () => {
  it('resolvable role link', async () => {
    mockGetAdminUserGroupRights.mockResolvedValueOnce(makeGroupRightsResponse('fansub_lead'))
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix(['fansub_lead']))

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('fansub_lead')).not.toBeNull()
    })

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /fansub_lead/i })
      expect(link.getAttribute('href')).toBe('/admin/role-capabilities?role=fansub_lead')
    })
  })

  it('unresolvable role no link', async () => {
    mockGetAdminUserGroupRights.mockResolvedValueOnce(makeGroupRightsResponse('ghost_role'))
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix(['fansub_lead']))

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('ghost_role')).not.toBeNull()
    })

    expect(screen.queryByRole('link', { name: /Was darf diese Rolle\?/i })).toBeNull()
    expect(screen.queryByText('Was darf diese Rolle?')).toBeNull()
  })
})
