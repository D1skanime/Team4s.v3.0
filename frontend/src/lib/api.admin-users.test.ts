// @vitest-environment jsdom
//
// Wave-0 RED-Tests: listAdminUsersPage / getAdminUserOverview existieren noch nicht in api.ts.
// Importfehler auf diese Funktionen sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-03 die API-Helper implementiert.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AdminUserListParams, AdminUserOverviewResponse } from '@/types/admin-users'

// RED: Diese Importe schlagen fehl, weil listAdminUsersPage und getAdminUserOverview
// noch nicht in @/lib/api exportiert werden.
import {
  listAdminUsersPage,
  getAdminUserOverview,
  ApiError,
} from '@/lib/api'

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve(new Response('{}', { status: 200 })),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('listAdminUsersPage', () => {
  it('listAdminUsersPage_serializes_all_params', async () => {
    // Prüft, dass alle AdminUserListParams-Felder korrekt als URL-Query-String serialisiert werden.
    const params: AdminUserListParams = {
      q: 'tester',
      status: 'active',
      global_role: 'platform_admin',
      has_conflicts: true,
      sort: 'last_activity_desc',
      limit: 25,
      offset: 50,
    }

    const mockResponse = {
      data: [],
      meta: { total: 0, limit: 25, offset: 50 },
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    await listAdminUsersPage(params)

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('q=tester')
    expect(calledUrl).toContain('status=active')
    expect(calledUrl).toContain('global_role=platform_admin')
    expect(calledUrl).toContain('has_conflicts=true')
    expect(calledUrl).toContain('sort=last_activity_desc')
    expect(calledUrl).toContain('limit=25')
    expect(calledUrl).toContain('offset=50')
  })

  it('listAdminUsersPage_throws_ApiError_on_non200', async () => {
    // Prüft, dass ein HTTP-403 als ApiError geworfen wird.
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { message: 'keine berechtigung' } }),
        { status: 403 },
      ),
    )

    await expect(listAdminUsersPage({})).rejects.toBeInstanceOf(ApiError)
  })
})

describe('getAdminUserOverview', () => {
  it('getAdminUserOverview_returns_typed_response', async () => {
    // Prüft, dass getAdminUserOverview einen AdminUserOverviewResponse zurückgibt
    // und dabei keine TypeScript-Fehler auslöst.
    const mockOverview: AdminUserOverviewResponse = {
      id: 42,
      email: 'test@example.com',
      display_name: 'Testnutzer',
      status: 'active',
      global_roles: ['platform_admin'],
      group_membership_count: 2,
      leader_context_count: 1,
      open_claims_count: 0,
      open_contributions_count: 3,
      total_contributions_count: 10,
      media_upload_count: 5,
      release_scope_count: 2,
      conflict_details: [],
      last_login_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    }

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockOverview), { status: 200 }),
    )

    const result = await getAdminUserOverview(42)

    // TypeScript-Kompilierung prüft die Typ-Konformität zur Compile-Zeit.
    // Zur Laufzeit prüfen wir mindestens einen Schlüssel.
    expect(result.id).toBe(42)
    expect(result.email).toBe('test@example.com')
    expect(Array.isArray(result.conflict_details)).toBe(true)
  })
})
