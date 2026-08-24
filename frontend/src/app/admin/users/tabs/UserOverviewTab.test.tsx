// @vitest-environment jsdom
//
// Plan 138-15 (D-05, locked): UserOverviewTab darf keine großen bare
// Statistik-Kacheln mehr rendern ("18 effektive Rechte", "13 Beiträge") --
// stattdessen kompakte Pro-Gruppen-Zusammenfassungen ("New-Subs — Rolle:
// Co-Leitung / ✓ Gruppe bearbeiten ... / Keine persönlichen
// Rechteabweichungen · Keine offenen Claims").
//
// Plan 139-07 (F-01/UADM-06): GroupRightsSummarySection ruft die neue gebündelte
// getAdminUserRightsSummary EINMAL auf statt getAdminUserGroupMemberships +
// Promise.all(getEffectiveRights pro Gruppe) -- dieselben gerenderten Strings (Phase 138
// D-05 Parität) müssen mit der neuen, bereits vorberechneten Datenquelle erhalten bleiben.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type {
  AdminUserGroupRightsSummaryItem,
  AdminUserOverviewResponse,
  AdminUserRightsSummaryPage,
} from '@/types/admin-users'

const mockGetAdminUserOverview = vi.fn()
const mockGetAdminUserRightsSummary = vi.fn()
const mockGetEffectiveRights = vi.fn()
const mockUpdateAdminUserStatus = vi.fn()

vi.mock('@/lib/api', () => ({
  getAdminUserOverview: (...args: unknown[]) => mockGetAdminUserOverview(...args),
  getAdminUserRightsSummary: (...args: unknown[]) => mockGetAdminUserRightsSummary(...args),
  getEffectiveRights: (...args: unknown[]) => mockGetEffectiveRights(...args),
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

function makeSummaryItem(
  overrides: Partial<AdminUserGroupRightsSummaryItem> = {},
): AdminUserGroupRightsSummaryItem {
  return {
    fansub_group_id: 1,
    fansub_group_name: 'New-Subs',
    role_label: 'Co-Leitung',
    headline_states: [{ action_code: 'fansub_group.edit', label: 'Gruppe bearbeiten', allowed: true }],
    has_deviation: false,
    open_claims_count: 0,
    ...overrides,
  }
}

function makeSummaryResponse(
  items: AdminUserGroupRightsSummaryItem[],
): AdminUserRightsSummaryPage {
  return { data: items, meta: { total: items.length, limit: 25, offset: 0 } }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserOverviewTab (D-05)', () => {
  it('rendert keine bare Statistik-Kacheln mehr (kein "Globale Rollen"/"Mediauploads"-Zahlengitter)', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview())
    mockGetAdminUserRightsSummary.mockResolvedValue(makeSummaryResponse([makeSummaryItem()]))

    render(<UserOverviewTab userId={1} />)

    await screen.findByText('New-Subs')

    expect(screen.queryByText('Mediauploads')).toBeNull()
    expect(screen.queryByText('Release-Arbeitsflächen')).toBeNull()
  })

  it('rendert eine kompakte Pro-Gruppen-Zeile mit Rolle, Capability-Checks und Abweichungs-/Claims-Zusammenfassung', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview({ open_claims_count: 0 }))
    mockGetAdminUserRightsSummary.mockResolvedValue(makeSummaryResponse([makeSummaryItem()]))

    render(<UserOverviewTab userId={1} />)

    await screen.findByText('New-Subs')

    expect(screen.getByText(/Rolle: Co-Leitung/)).not.toBeNull()
    expect(screen.getByText(/✓ Gruppe bearbeiten/)).not.toBeNull()
    expect(screen.getByText(/Keine persönlichen Rechteabweichungen/)).not.toBeNull()
    expect(screen.getByText(/Keine offenen Claims/)).not.toBeNull()
  })

  it('zeigt eine Abweichungsmarkierung, wenn ein persönlicher Override existiert', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview({ open_claims_count: 2 }))
    mockGetAdminUserRightsSummary.mockResolvedValue(
      makeSummaryResponse([
        makeSummaryItem({
          has_deviation: true,
          open_claims_count: 2,
          headline_states: [{ action_code: 'fansub_group.edit', label: 'Gruppe bearbeiten', allowed: false }],
        }),
      ]),
    )

    render(<UserOverviewTab userId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Persönliche Rechteabweichungen vorhanden/)).not.toBeNull()
    })
    expect(screen.getByText(/2 offene Claims/)).not.toBeNull()
  })

  it('ruft die gebündelte Rechte-Übersicht genau einmal auf und niemals getEffectiveRights (F-01 Overview-Tab-Fan-out-Regressionsschutz)', async () => {
    mockGetAdminUserOverview.mockResolvedValue(makeOverview())
    mockGetAdminUserRightsSummary.mockResolvedValue(
      makeSummaryResponse([
        makeSummaryItem({ fansub_group_id: 1, fansub_group_name: 'New-Subs' }),
        makeSummaryItem({ fansub_group_id: 2, fansub_group_name: 'Sakura-Fansub' }),
      ]),
    )

    render(<UserOverviewTab userId={1} />)

    await screen.findByText('New-Subs')
    await screen.findByText('Sakura-Fansub')

    expect(mockGetAdminUserRightsSummary).toHaveBeenCalledTimes(1)
    expect(mockGetEffectiveRights).not.toHaveBeenCalled()
  })
})
