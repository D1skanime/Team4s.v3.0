import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveProject: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
  parseSearchParams: vi.fn((_params?: Record<string, string | string[] | undefined>): { initialKaraSegmentID: number | null; autoplayInitialKara: boolean } => ({ initialKaraSegmentID: null, autoplayInitialKara: false })),
}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error { constructor(public status: number) { super('api') } },
  resolveFansubProject: mocks.resolveProject,
}))
vi.mock('@/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData', () => ({
  parseReleaseDetailSearchParams: mocks.parseSearchParams,
  ReleaseDetailPageContent: (props: Record<string, unknown>) => props,
}))

import PrettyReleaseDetailPage from './page'

describe('PrettyReleaseDetailPage', () => {
  it('resolves slugs to the numeric release ownership context', async () => {
    mocks.resolveProject.mockResolvedValue({ data: { group_id: 4, anime_id: 9, anime_slug: 'vipers-creed', projects: [] } })
    const result = await PrettyReleaseDetailPage({ params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' }) })
    expect(result.props).toMatchObject({ animeID: 9, groupID: 4, releaseVersionID: 88, canonicalProjectPath: '/fansubs/c-subs/fansubprojekt/vipers-creed' })
  })

  it('forwards Kara deep-link state to the canonical release composer', async () => {
    mocks.resolveProject.mockResolvedValue({ data: { group_id: 4, anime_id: 9, anime_slug: 'vipers-creed', projects: [] } })
    mocks.parseSearchParams.mockReturnValueOnce({ initialKaraSegmentID: 7, autoplayInitialKara: true })

    const searchParams = { kara: '7', autoplay: '1' }
    const result = await PrettyReleaseDetailPage({
      params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' }),
      searchParams: Promise.resolve(searchParams),
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
    const { ApiError } = await import('@/lib/api')
    // The resolver's own ResolveProject query matches groupSlug AND animeSlug in one WHERE
    // clause -- a mismatched animeSlug can never come back as a resolution with the WRONG
    // anime_slug the way the old profile.projects.find() pattern could; it 404s instead.
    mocks.resolveProject.mockRejectedValue(new ApiError(404, 'not found'))
    await expect(PrettyReleaseDetailPage({ params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed', releaseVersionId: '88' }) })).rejects.toThrow('NOT_FOUND')
  })
})
