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
  getAdminUserContributions,
  getAdminUserMedia,
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

// Phase 139 Code-Review CR-01/WR-04: DatePicker.tsx's toIsoDate() emits only a bare
// "YYYY-MM-DD" string, but the backend's parseOptionalRFC3339 (admin_claims_list_handler.go)
// requires a full RFC3339 timestamp and silently drops anything else as "no filter". These
// tests pin the exact wire format getAdminUserContributions/getAdminUserMedia must produce
// from that bare-date input so a regression here is caught immediately.
describe('getAdminUserContributions date-range filters (CR-01/WR-04)', () => {
  it('getAdminUserContributions_converts_bare_DatePicker_date_to_RFC3339_day_boundaries', async () => {
    const mockPage = {
      data: [],
      meta: { total: 0, limit: 25, offset: 0 },
      filter_options: { animes: [], groups: [] },
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPage), { status: 200 }),
    )

    // "2026-08-24" is exactly what DatePicker.tsx's toIsoDate() produces -- never a full
    // RFC3339 timestamp.
    await getAdminUserContributions(1, { from: '2026-08-24', to: '2026-08-24' })

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    const query = new URL(calledUrl, 'http://localhost').searchParams
    expect(query.get('from')).toBe('2026-08-24T00:00:00Z')
    // WR-04: "to" must be end-of-day inclusive, not a naive mirror of "from"'s start-of-day
    // transform -- otherwise rows created later that same day would be excluded once CR-01
    // is fixed.
    expect(query.get('to')).toBe('2026-08-24T23:59:59.999Z')
  })
})

describe('getAdminUserMedia date-range filters (CR-01/WR-04)', () => {
  it('getAdminUserMedia_converts_bare_DatePicker_date_to_RFC3339_day_boundaries', async () => {
    const mockPage = {
      data: [],
      meta: { total: 0, limit: 25, offset: 0 },
      filter_options: { animes: [], groups: [], releases_or_episodes: [], media_types: [] },
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPage), { status: 200 }),
    )

    await getAdminUserMedia(1, { from: '2026-08-24', to: '2026-08-24' })

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    const query = new URL(calledUrl, 'http://localhost').searchParams
    expect(query.get('from')).toBe('2026-08-24T00:00:00Z')
    expect(query.get('to')).toBe('2026-08-24T23:59:59.999Z')
  })
})
