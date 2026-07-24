// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  clearAuthSession,
  persistAuthSession,
  replaceReleaseCrew,
} from './api'

function makeResponse(body: unknown, init: { ok: boolean; status: number }) {
  return {
    ok: init.ok,
    status: init.status,
    json: vi.fn().mockResolvedValue(body),
    clone() {
      return makeResponse(body, init)
    },
  }
}

function seedSession() {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: 'phase-108-access',
    access_token_expires_at: nowSeconds + 3600,
    access_token_expires_in: 3600,
    refresh_token: 'phase-108-refresh',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    app_user_id: 11,
    display_name: 'Phase Admin',
    session_id: 'session-11',
  })
}

afterEach(() => {
  clearAuthSession()
  vi.unstubAllGlobals()
})

describe('Phase 108 release crew client contract', () => {
  it('sends one exact complete-set PUT and parses the stored independent snapshot', async () => {
    seedSession()
    const responseBody = {
      data: [
        { member_id: 1, role_codes: ['translator', 'qc'] },
        { member_id: 3, role_codes: ['editor'] },
      ],
      meta: { snapshot_mode: 'independent' },
    }
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(responseBody, { ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      replaceReleaseCrew(176, 9, {
        rows: [
          { member_id: 1, role_codes: ['translator', 'qc'] },
          { member_id: 3, role_codes: ['editor'] },
        ],
      }),
    ).resolves.toEqual(responseBody)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/release-versions/176/contributions/effective?fansub_group_id=9'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          rows: [
            { member_id: 1, role_codes: ['translator', 'qc'] },
            { member_id: 3, role_codes: ['editor'] },
          ],
        }),
      }),
    )
  })

  it('surfaces the parsed non-2xx API error', async () => {
    seedSession()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeResponse(
          { error: { message: 'Release-Besetzung nicht gefunden', code: 'not_found' } },
          { ok: false, status: 404 },
        ),
      ),
    )

    await expect(replaceReleaseCrew(176, 9, { rows: [] })).rejects.toMatchObject<Partial<ApiError>>({
      status: 404,
      message: 'Release-Besetzung nicht gefunden',
      code: 'not_found',
    })
  })
})
