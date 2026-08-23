// @vitest-environment jsdom
//
// Plan 138-06 (UADM-01, D-11/D-12/D-13): UserGroupRightsTab wird zur kanonischen,
// mehrgruppen-fähigen, kategorisierten Effective-Rights-Inspektionsfläche, gespeist vom
// echten Phase-137-Resolver (getEffectiveRights) statt der alten Zwei-Boolean-Heuristik
// (getAdminUserGroupRights).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AdminGroupMembershipSummary, AdminUserGroupMembershipsResponse } from '@/types/admin-users'
import type { EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'

const mockGetAdminUserGroupMemberships = vi.fn()
const mockGetEffectiveRights = vi.fn()
const mockListRoleCapabilities = vi.fn()
const mockListOverrideHistory = vi.fn()
const mockMutateCapabilityOverride = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserGroupMemberships: (...args: unknown[]) => mockGetAdminUserGroupMemberships(...args),
  getEffectiveRights: (...args: unknown[]) => mockGetEffectiveRights(...args),
  listRoleCapabilities: (...args: unknown[]) => mockListRoleCapabilities(...args),
  listOverrideHistory: (...args: unknown[]) => mockListOverrideHistory(...args),
  mutateCapabilityOverride: (...args: unknown[]) => mockMutateCapabilityOverride(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { UserGroupRightsTab } from './UserGroupRightsTab'

beforeEach(() => {
  // Default: leere Historie -- CapabilityHistoryPanel wird bei jeder aufgeklappten Zeile
  // gemountet und ruft listOverrideHistory selbstständig auf (D-13b, Plan 138-08).
  mockListOverrideHistory.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeMembership(overrides: Partial<AdminGroupMembershipSummary> = {}): AdminGroupMembershipSummary {
  return {
    fansub_group_id: 1,
    fansub_group_name: 'Sakura-Fansub',
    member_status: 'active',
    roles: ['co_leader'],
    joined_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMembershipsResponse(
  memberships: AdminGroupMembershipSummary[],
): AdminUserGroupMembershipsResponse {
  return { memberships }
}

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group.edit',
    allowed: true,
    provenance: 'group_role',
    decisive: true,
    non_deniable: false,
    granting_roles: ['co_leader'],
    user_allow: false,
    user_deny: false,
    specialized_grants: [],
    decisive_source: 'group_role',
    reason_code: 'group_role_grant',
    ...overrides,
  }
}

function makeMatrix(): RoleCapabilityMatrix {
  return {
    roles: [{ role_code: 'co_leader', label_de: 'Co-Leitung', actions: [] }],
    all_actions: [
      { code: 'fansub_group.edit', label_de: 'Gruppendaten bearbeiten', category: 'gruppe', sort_order: 10 },
      {
        code: 'fansub_group.members.manage',
        label_de: 'Mitglieder verwalten',
        category: 'gruppe',
        sort_order: 20,
      },
      { code: 'release.edit', label_de: 'Release bearbeiten', category: 'release', sort_order: 30 },
    ],
  }
}

describe('UserGroupRightsTab', () => {
  it('zeigt bei null Gruppenmitgliedschaften den Top-Level-EmptyState', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(makeMembershipsResponse([]))
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Keine Gruppenmitgliedschaften.')).not.toBeNull()
    })
    expect(mockGetEffectiveRights).not.toHaveBeenCalled()
  })

  it('zeigt bei einer Mitgliedschaft eine Gruppensektion mit dem vollständigen, kategorisierten Katalog', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(
      makeMembershipsResponse([makeMembership()]),
    )
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())
    mockGetEffectiveRights.mockResolvedValueOnce([
      makeState({ action_code: 'fansub_group.edit' }),
      makeState({
        action_code: 'fansub_group.members.manage',
        allowed: false,
        decisive_source: 'no_grant',
        granting_roles: [],
      }),
      makeState({ action_code: 'release.edit' }),
    ])

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Sakura-Fansub')).not.toBeNull()
    })
    expect(mockGetEffectiveRights).toHaveBeenCalledWith(1, 1)
    expect(mockGetEffectiveRights).toHaveBeenCalledTimes(1)

    // Kategorien real (nicht flach) -- gruppe + release als Accordion-Titel
    expect(screen.getByText('Gruppe')).not.toBeNull()
    expect(screen.getByText('Release')).not.toBeNull()

    // Zeilen: Capability / Effektiv / Quelle
    expect(screen.getByText('Gruppendaten bearbeiten')).not.toBeNull()
    expect(screen.getByText('Mitglieder verwalten')).not.toBeNull()
    expect(screen.getByText('Release bearbeiten')).not.toBeNull()
    expect(screen.getAllByText('Erlaubt').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Nicht erlaubt')).not.toBeNull()
  })

  it('zeigt bei decisive_source user_deny die menschliche Abweichungs-Beschriftung statt des Rohwerts', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(
      makeMembershipsResponse([makeMembership()]),
    )
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())
    mockGetEffectiveRights.mockResolvedValueOnce([
      makeState({
        action_code: 'fansub_group.edit',
        allowed: false,
        decisive_source: 'user_deny',
        user_deny: true,
        granting_roles: ['co_leader'],
      }),
    ])

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('persönliche Abweichung (entzogen)')).not.toBeNull()
    })
    expect(screen.queryByText('user_deny')).toBeNull()
  })

  it('verbindet mehrere granting_roles im gesperrten D-13-Format "RoleA + RoleB"', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(
      makeMembershipsResponse([makeMembership({ roles: ['co_leader', 'encoder'] })]),
    )
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())
    mockGetEffectiveRights.mockResolvedValueOnce([
      makeState({
        action_code: 'release.edit',
        allowed: true,
        decisive_source: 'group_role',
        granting_roles: ['Co-Leitung', 'Encoder'],
      }),
    ])

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Co-Leitung + Encoder')).not.toBeNull()
    })
  })

  it('deckt beim Aufklappen einer Zeile die vollständige Provenienz auf, auch bei leeren Arrays', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(
      makeMembershipsResponse([makeMembership()]),
    )
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())
    mockGetEffectiveRights.mockResolvedValueOnce([
      makeState({
        action_code: 'fansub_group.edit',
        non_deniable: true,
        reason_code: 'platform_admin_bypass',
        granting_roles: [],
        specialized_grants: [],
      }),
    ])

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Gruppendaten bearbeiten')).not.toBeNull()
    })

    const row = screen.getByText('Gruppendaten bearbeiten').closest('tr') as HTMLElement
    expect(() => fireEvent.click(row)).not.toThrow()

    await waitFor(() => {
      expect(screen.getByText('platform_admin_bypass')).not.toBeNull()
    })
    expect(screen.getByText(/Nicht entziehbar/)).not.toBeNull()
  })

  it('rendert zwei unabhängige Gruppensektionen ohne Vermischung der Capabilities (D-11)', async () => {
    mockGetAdminUserGroupMemberships.mockResolvedValueOnce(
      makeMembershipsResponse([
        makeMembership({ fansub_group_id: 1, fansub_group_name: 'Sakura-Fansub' }),
        makeMembership({ fansub_group_id: 2, fansub_group_name: 'New-Subs' }),
      ]),
    )
    mockListRoleCapabilities.mockResolvedValueOnce(makeMatrix())
    mockGetEffectiveRights.mockImplementation((fansubGroupId: number) => {
      if (fansubGroupId === 1) {
        return Promise.resolve([makeState({ action_code: 'fansub_group.edit' })])
      }
      return Promise.resolve([makeState({ action_code: 'release.edit' })])
    })

    render(<UserGroupRightsTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Sakura-Fansub')).not.toBeNull()
      expect(screen.getByText('New-Subs')).not.toBeNull()
    })
    expect(mockGetEffectiveRights).toHaveBeenCalledWith(1, 1)
    expect(mockGetEffectiveRights).toHaveBeenCalledWith(2, 1)

    const sakuraSection = screen.getByText('Sakura-Fansub').closest('[data-group-section]')
    const newSubsSection = screen.getByText('New-Subs').closest('[data-group-section]')
    expect(sakuraSection).not.toBeNull()
    expect(newSubsSection).not.toBeNull()

    expect(within(sakuraSection as HTMLElement).getByText('Gruppendaten bearbeiten')).not.toBeNull()
    expect(within(sakuraSection as HTMLElement).queryByText('Release bearbeiten')).toBeNull()
    expect(within(newSubsSection as HTMLElement).getByText('Release bearbeiten')).not.toBeNull()
    expect(within(newSubsSection as HTMLElement).queryByText('Gruppendaten bearbeiten')).toBeNull()
  })
})
