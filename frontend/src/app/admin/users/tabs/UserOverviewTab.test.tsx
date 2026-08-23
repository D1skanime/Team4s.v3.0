// @vitest-environment jsdom
//
// Plan 138-15 (D-05, locked): UserOverviewTab darf keine großen bare
// Statistik-Kacheln mehr rendern ("18 effektive Rechte", "13 Beiträge") --
// stattdessen kompakte Pro-Gruppen-Zusammenfassungen ("New-Subs — Rolle:
// Co-Leitung / ✓ Gruppe bearbeiten ... / Keine persönlichen
// Rechteabweichungen · Keine offenen Claims").

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { AdminGroupMembershipSummary, AdminUserOverviewResponse } from '@/types/admin-users'
import type { EffectiveRightState, RoleCapabilityMatrix } from '@/types/admin-capability'

const mockGetAdminUserOverview = vi.fn()
const mockGetAdminUserGroupMemberships = vi.fn()
const mockGetEffectiveRights = vi.fn()
const mockListRoleCapabilities = vi.fn()
const mockUpdateAdminUserStatus = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserOverview: (...args: unknown[]) => mockGetAdminUserOverview(...args),
  getAdminUserGroupMemberships: (...args: unknown[]) => mockGetAdminUserGroupMemberships(...args),
  getEffectiveRights: (...args: unknown[]) => mockGetEffectiveRights(...args),
  listRoleCapabilities: (...args: unknown[]) => mockListRoleCapabilities(...args),
  updateAdminUserStatus: (...args: unknown[]) => mockUpdateAdminUserStatus(...args),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

import { UserOverviewTab } from './UserOverviewTab'

function makeOverview(overrides: Partial<AdminUserOverviewResponse> = {}): AdminUserOverviewResponse {
  return {
    id: 1,
    email: 'aki@example.com',
    display_name: 'Aki',
    status: 'active',
    global_roles: ['platform_admin'],
    group_membership_count: 1,
    leader_context_count: 0,
    open_claims_count: 0,
    open_contributions_count: 2,
    total_contributions_count: 15,
    media_upload_count: 7,
    release_scope_count: 4,
    conflict_details: [],
    last_login_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

function makeMembership(overrides: Partial<AdminGroupMembershipSummary> = {}): AdminGroupMembershipSummary {
  return {
    fansub_group_id: 1,
    fansub_group_name: 'New-Subs',
    member_status: 'active',
    roles: ['co_leader'],
    joined_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
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
    roles: [
      { role_code: 'co_leader', label_de: 'Co-Leitung', actions: [], assignable: true, role_kind: 'fansub_group_role', contexts: ['fansub_group'] },
    ],
    all_actions: [
      { code: 'fansub_group.edit', label_de: 'Gruppe bearbeiten', category: 'gruppe', sort_order: 1 },
    ],
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserOverviewTab (D-05)', () => {
  it('rendert keine bare Statistik-Kacheln mehr (kein "Globale Rollen"/"Mediauploads"-Zahlengitter)', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview())
    mockGetAdminUserGroupMemberships.mockResolvedValue({ memberships: [makeMembership()] })
    mockGetEffectiveRights.mockResolvedValue([makeState()])
    mockListRoleCapabilities.mockResolvedValue(makeMatrix())

    render(<UserOverviewTab userId={1} />)

    await screen.findByText('New-Subs')

    expect(screen.queryByText('Mediauploads')).toBeNull()
    expect(screen.queryByText('Release-Arbeitsflächen')).toBeNull()
  })

  it('rendert eine kompakte Pro-Gruppen-Zeile mit Rolle, Capability-Checks und Abweichungs-/Claims-Zusammenfassung', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview({ open_claims_count: 0 }))
    mockGetAdminUserGroupMemberships.mockResolvedValue({ memberships: [makeMembership()] })
    mockGetEffectiveRights.mockResolvedValue([makeState()])
    mockListRoleCapabilities.mockResolvedValue(makeMatrix())

    render(<UserOverviewTab userId={1} />)

    await screen.findByText('New-Subs')

    expect(screen.getByText(/Rolle: Co-Leitung/)).not.toBeNull()
    expect(screen.getByText(/✓ Gruppe bearbeiten/)).not.toBeNull()
    expect(screen.getByText(/Keine persönlichen Rechteabweichungen/)).not.toBeNull()
    expect(screen.getByText(/Keine offenen Claims/)).not.toBeNull()
  })

  it('zeigt eine Abweichungsmarkierung, wenn ein persönlicher Override existiert', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview({ open_claims_count: 2 }))
    mockGetAdminUserGroupMemberships.mockResolvedValue({ memberships: [makeMembership()] })
    mockGetEffectiveRights.mockResolvedValue([makeState({ user_deny: true, allowed: false })])
    mockListRoleCapabilities.mockResolvedValue(makeMatrix())

    render(<UserOverviewTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Persönliche Rechteabweichungen vorhanden/)).not.toBeNull()
    })
    expect(screen.getByText(/2 offene Claims/)).not.toBeNull()
  })
})
