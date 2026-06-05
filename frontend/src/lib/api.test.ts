// Wave-0-Testgerüst für api.ts — rejectAnimeContributionWithReason (Phase 76, K/D-09)
// Dieser Test ist ROT — rejectAnimeContributionWithReason wird in Plan 02 implementiert.
// Import schlägt fehl oder die Funktion ist undefined bis Plan 02 die Funktion ergänzt.

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

// Import schlägt fehl bis Plan 02 die Funktion in api.ts ergänzt
import { rejectAnimeContributionWithReason } from './api'

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
