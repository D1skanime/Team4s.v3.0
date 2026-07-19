import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
  parseSearchParams: vi.fn(() => ({ initialKaraSegmentID: null, autoplayInitialKara: false })),
}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error { constructor(public status: number) { super('api') } },
  getPublicFansubProfileBySlug: mocks.getProfile,
}))
vi.mock('@/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData', () => ({
  parseReleaseDetailSearchParams: mocks.parseSearchParams,
  ReleaseDetailPageContent: (props: Record<string, unknown>) => props,
}))

import PrettyReleaseDetailPage from './page'

describe('PrettyReleaseDetailPage', () => {
  it('resolves slugs to the numeric release ownership context', async () => {
    mocks.getProfile.mockResolvedValue({ data: { group: { id: 4, slug: 'c-subs' }, projects: [{ id: 9, anime_slug: 'vipers-creed' }] } })
    const result = await PrettyReleaseDetailPage({ params: { slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' } })
    expect(result.props).toMatchObject({ animeID: 9, groupID: 4, releaseVersionID: 88, canonicalProjectPath: '/fansubs/c-subs/fansubprojekt/vipers-creed' })
  })

  it('forwards Kara deep-link state to the canonical release composer', async () => {
    mocks.getProfile.mockResolvedValue({ data: { group: { id: 4, slug: 'c-subs' }, projects: [{ id: 9, anime_slug: 'vipers-creed' }] } })
    mocks.parseSearchParams.mockReturnValueOnce({ initialKaraSegmentID: 7, autoplayInitialKara: true })

    const searchParams = { kara: '7', autoplay: '1' }
    const result = await PrettyReleaseDetailPage({
      params: { slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' },
      searchParams,
    })

    expect(mocks.parseSearchParams).toHaveBeenCalledWith(searchParams)
    expect(result.props).toMatchObject({
      animeID: 9,
      groupID: 4,
      releaseVersionID: 88,
      canonicalProjectPath: '/fansubs/c-subs/fansubprojekt/vipers-creed',
      initialKaraSegmentID: 7,
      autoplayInitialKara: true,
    })
  })

  it('rejects a mismatched project slug before rendering release detail', async () => {
    mocks.getProfile.mockResolvedValue({ data: { group: { id: 4, slug: 'c-subs' }, projects: [{ id: 9, anime_slug: 'other' }] } })
    await expect(PrettyReleaseDetailPage({ params: { slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' } })).rejects.toThrow('NOT_FOUND')
  })
})
