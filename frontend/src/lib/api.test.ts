// Wave-0-Testgerüst für api.ts — rejectAnimeContributionWithReason (Phase 76, K/D-09)
// Dieser Test ist ROT — rejectAnimeContributionWithReason wird in Plan 02 implementiert.
// Import schlägt fehl oder die Funktion ist undefined bis Plan 02 die Funktion ergänzt.

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBrowserApiBaseUrl } from './publicApiUrl'

// Import schlägt fehl bis Plan 02 die Funktion in api.ts ergänzt
import {
  ApiError,
  getGroupReleaseListCursor,
  getMyAnimeContributions,
  getOwnProfile,
  rejectAnimeContributionWithReason,
  resolveApiUrl,
} from './api'

describe('resolveApiUrl', () => {
  it('normalisiert alte lokale API-Media-URLs auf den aktuellen Browser-Pfad', () => {
    const browserApiBaseUrl = getBrowserApiBaseUrl()
    const expectedUrl = (path: string) => browserApiBaseUrl ? `${browserApiBaseUrl}${path}` : path

    expect(resolveApiUrl('http://localhost:8092/api/v1/media/files/logo.png')).toBe(expectedUrl('/api/v1/media/files/logo.png'))
    expect(resolveApiUrl('http://127.0.0.1:8092/media/groups/88/logo.png')).toBe(expectedUrl('/media/groups/88/logo.png'))
  })

  it('lässt externe absolute URLs unverändert', () => {
    expect(resolveApiUrl('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png')
  })
})

describe('getGroupReleaseListCursor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendet Release-Datum-Sortierung und Featured-Ausschluss', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [],
      next_cursor: null,
      has_more: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await getGroupReleaseListCursor(1, 2, {
      limit: 5,
      sort: 'release_date',
      exclude_release_version_id: 42,
    })

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toContain('/api/v1/anime/1/group/2/release-list?')
    expect(calledUrl).toContain('limit=5')
    expect(calledUrl).toContain('sort=release_date')
    expect(calledUrl).toContain('exclude_release_version_id=42')
  })
})

describe('getMyAnimeContributions MEMBER_PROFILE_REQUIRED classification (Phase 104-04, Task 2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('klassifiziert eine 403-MEMBER_PROFILE_REQUIRED-Antwort exakt über ApiError.code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'kein verifizierter Member-Account verknüpft', code: 'MEMBER_PROFILE_REQUIRED' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getMyAnimeContributions()).rejects.toMatchObject({
      status: 403,
      code: 'MEMBER_PROFILE_REQUIRED',
    })
  })

  it('lässt eine unverwandte 403-Antwort ohne MEMBER_PROFILE_REQUIRED-Code unklassifiziert und sichtbar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'keine Berechtigung' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getMyAnimeContributions()).rejects.toMatchObject({
      status: 403,
      code: null,
    })
  })

  it('lässt einen echten 500-Serverfehler unklassifiziert und retry-fähig sichtbar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'interner serverfehler' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    let caught: unknown
    try {
      await getMyAnimeContributions()
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(500)
    expect((caught as ApiError).code).toBeNull()
  })
})

describe('getOwnProfile MEMBER_PROFILE_REQUIRED code passthrough', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reicht den MEMBER_PROFILE_REQUIRED-Code aus der Fehler-Envelope unverändert durch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'kein verifizierter Member-Account verknüpft', code: 'MEMBER_PROFILE_REQUIRED' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getOwnProfile()).rejects.toMatchObject({
      status: 403,
      code: 'MEMBER_PROFILE_REQUIRED',
    })
  })
})

describe('rejectAnimeContributionWithReason', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendet POST mit member_reason im Body', async () => {
    // Erwartet: rejectAnimeContributionWithReason ruft fetch mit
    // URL matching /reject und body: JSON.stringify({ member_reason }) auf
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    // Test schlägt fehl weil rejectAnimeContributionWithReason in Plan 02 erst implementiert wird
    await rejectAnimeContributionWithReason(42, 'Das war ich wirklich nicht')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toMatch(/\/me\/anime-contributions\/42\/reject/)
    expect(calledInit.method).toBe('POST')
    expect(calledInit.body).toBe(
      JSON.stringify({ member_reason: 'Das war ich wirklich nicht' })
    )
  })
})
