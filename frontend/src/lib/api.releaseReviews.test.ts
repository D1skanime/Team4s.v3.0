// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshKeycloakToken = vi.fn()

vi.mock('@/lib/keycloakAuth', () => ({
  isKeycloakEnabled: () => true,
  logoutFromKeycloak: vi.fn(),
  refreshKeycloakToken: (...args: unknown[]) => refreshKeycloakToken(...args),
}))

import {
  ApiError,
  clearAuthSession,
  decideReleaseReview,
  getReleaseReview,
  getReleaseReviewCounts,
  getNextReleaseReview,
  listReleaseReviews,
  persistAuthSession,
} from './api'

const queueItem = {
  id: 'opaque-review-1',
  source_revision: 3,
  type: 'image' as const,
  category: 'screenshot' as const,
  status: 'pending' as const,
  fansub_group_id: 88,
  anime_id: 42,
  anime_title: 'Frieren',
  episode_id: 7,
  episode_number: '1',
  release_id: 5,
  release_version_id: 62,
  release_version: 'v1',
  submitter_app_user_id: 11,
  submitter_member_id: 12,
  submitter_display_name: 'Akari',
  submitted_at: '2026-07-23T12:00:00Z',
  last_activity_at: '2026-07-23T12:05:00Z',
  decided_at: null,
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('release review API contract', () => {
  beforeEach(() => {
    clearAuthSession()
  })

  afterEach(() => {
    clearAuthSession()
    refreshKeycloakToken.mockReset()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('serializes every bounded queue filter and preserves the typed envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      data: { items: [queueItem], next_cursor: 'cursor-2' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listReleaseReviews(88, {
      view: 'history',
      animeId: 42,
      releaseVersionId: 62,
      type: 'image',
      category: 'screenshot',
      search: '  Akari  ',
      cursor: 'cursor-1',
      limit: 50,
    })).resolves.toEqual({
      data: { items: [queueItem], next_cursor: 'cursor-2' },
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/v1/admin/fansubs/88/release-reviews?')
    expect(url).toContain('view=history')
    expect(url).toContain('anime_id=42')
    expect(url).toContain('release_version_id=62')
    expect(url).toContain('type=image')
    expect(url).toContain('category=screenshot')
    expect(url).toContain('search=Akari')
    expect(url).toContain('cursor=cursor-1')
    expect(url).toContain('limit=50')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      cache: 'no-store',
    }))
  })

  it('uses the synchronized counts, detail and next endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        data: {
          text: 1,
          image: 4,
          contribution: 0,
          image_categories: {
            screenshot: 1,
            typesetting_karaoke: 1,
            fun_outtake: 1,
            other: 1,
          },
        },
      }))
      .mockResolvedValueOnce(response({
        data: {
          ...queueItem,
          image: {
            caption: 'Typesetting',
            thumbnail_url: '/media/thumb.webp',
            original_url: '/media/original.png',
          },
          can_edit_release: false,
        },
      }))
      .mockResolvedValueOnce(response({ data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await getReleaseReviewCounts(88, { view: 'open', search: 'Frieren' })
    await getReleaseReview(88, queueItem.id)
    await expect(getNextReleaseReview(88, queueItem.id)).resolves.toEqual({ data: null })

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining('/fansubs/88/release-reviews/counts?view=open&search=Frieren'),
      expect.stringContaining('/fansubs/88/release-reviews/opaque-review-1'),
      expect.stringContaining('/fansubs/88/release-reviews/opaque-review-1/next'),
    ])
  })

  it('sends only the contracted decision fields and exposes the stable 409 code', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        data: { review_id: queueItem.id, decision: 'reject', next: null },
      }))
      .mockResolvedValueOnce(response({
        error: {
          code: 'REVIEW_ALREADY_DECIDED',
          message: 'Diese Prüfung wurde bereits von einer anderen Person entschieden.',
        },
      }, 409))
    vi.stubGlobal('fetch', fetchMock)

    await decideReleaseReview(88, queueItem.id, {
      decision: 'reject',
      expected_revision: 3,
      rejection_category: 'quality.insufficient',
      rejection_reason: 'Die Bildqualität reicht nicht aus.',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      decision: 'reject',
      expected_revision: 3,
      rejection_category: 'quality.insufficient',
      rejection_reason: 'Die Bildqualität reicht nicht aus.',
    })

    await expect(decideReleaseReview(88, queueItem.id, {
      decision: 'confirm',
      expected_revision: 3,
    })).rejects.toMatchObject({
      status: 409,
      code: 'REVIEW_ALREADY_DECIDED',
      message: 'Diese Prüfung wurde bereits von einer anderen Person entschieden.',
    } satisfies Partial<ApiError>)
  })

  it('loads the protected queue through the central refresh seam with refresh-only session', async () => {
    const now = Math.floor(Date.now() / 1000)
    persistAuthSession({
      token_type: 'Bearer',
      access_token: '',
      access_token_expires_at: 0,
      access_token_expires_in: 0,
      refresh_token: 'refresh-only-token',
      refresh_token_expires_at: now + 7200,
      refresh_token_expires_in: 7200,
      user_id: 7,
      app_user_id: 11,
      display_name: 'Review Lead',
      session_id: 'review-session',
    })
    refreshKeycloakToken.mockResolvedValue({
      accessToken: 'fresh-access-token',
      accessTokenExpiresAt: now + 3600,
      accessTokenExpiresIn: 3600,
      idToken: 'id-token',
      refreshToken: 'fresh-refresh-token',
      refreshTokenExpiresAt: now + 7200,
      refreshTokenExpiresIn: 7200,
      tokenType: 'Bearer',
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        data: {
          app_user_id: 11,
          legacy_user_id: 7,
          display_name: 'Review Lead',
          email: 'review@example.test',
          keycloak_subject: 'review-11',
          status: 'active',
          global_roles: [],
          is_platform_admin: false,
          session_id: 'review-session',
        },
      }))
      .mockResolvedValueOnce(response({ data: { items: [], next_cursor: null } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listReleaseReviews(88)).resolves.toEqual({
      data: { items: [], next_cursor: null },
    })

    expect(refreshKeycloakToken).toHaveBeenCalledWith('refresh-only-token')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fresh-access-token' }),
    }))
  })
})
