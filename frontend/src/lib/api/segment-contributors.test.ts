import { afterEach, describe, expect, it, vi } from 'vitest'

import { getThemeSegmentContributorCandidates, setThemeSegmentContributors } from './segment-contributors'

describe('segment-contributors api module', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('parses the candidate list on a successful GET', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          data: [
            {
              member_id: 7,
              name: 'Karaoke Karl',
              avatar_url: null,
              role_label: 'Quality Checker',
              role_codes: ['quality_checker'],
              member_slug: 'karaoke-karl',
              selected: true,
            },
          ],
          origin_release_version_id: 42,
        }),
      }),
    )

    const result = await getThemeSegmentContributorCandidates(1, 9)

    expect(result.origin_release_version_id).toBe(42)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ member_id: 7, selected: true })
  })

  it('returns the reloaded segment and contributors on a successful PUT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          data: { id: 9, anime_id: 1, theme_id: 1, theme_title: null, theme_type_name: 'OP1' },
          contributors: [
            {
              member_id: 7,
              name: 'Karaoke Karl',
              avatar_url: null,
              role_label: 'Quality Checker',
              role_codes: ['quality_checker'],
              member_slug: 'karaoke-karl',
              selected: true,
            },
          ],
        }),
      }),
    )

    const result = await setThemeSegmentContributors(1, 9, [7])

    expect(result.data).toMatchObject({ id: 9 })
    expect(result.contributors).toHaveLength(1)
  })

  it('throws an ApiError carrying code "segment_has_no_origin" on a 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Segment hat keine Origin-Release-Version',
            code: 'segment_has_no_origin',
          },
        }),
      }),
    )

    await expect(setThemeSegmentContributors(1, 9, [7])).rejects.toMatchObject({
      status: 409,
      code: 'segment_has_no_origin',
    })
  })

  it('throws an ApiError carrying code "member_not_origin_contributor" on a 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'mindestens ein member_id ist kein Beitragender der Origin-Release-Version',
            code: 'member_not_origin_contributor',
          },
        }),
      }),
    )

    await expect(setThemeSegmentContributors(1, 9, [999])).rejects.toMatchObject({
      status: 409,
      code: 'member_not_origin_contributor',
    })
  })

  it('falls back to a usable ApiError when the failure response has no parseable body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }),
    )

    await expect(getThemeSegmentContributorCandidates(1, 9)).rejects.toMatchObject({
      status: 500,
      message: 'API request failed: 500',
      code: null,
    })
  })
})
