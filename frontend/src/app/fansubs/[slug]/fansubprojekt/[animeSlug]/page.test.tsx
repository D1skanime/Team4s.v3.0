import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveProject: vi.fn(),
  getProfile: vi.fn(),
  loadPageData: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error { constructor(public status: number) { super('api') } },
  resolveFansubProject: mocks.resolveProject,
  getPublicFansubProfileBySlug: mocks.getProfile,
}))
vi.mock('@/app/anime/[id]/group/[groupId]/projectPageData', () => ({
  loadPublicFansubProjectPageData: mocks.loadPageData,
}))
vi.mock('@/app/anime/[id]/group/[groupId]/ProjectPage', () => ({
  ProjectPage: (props: Record<string, unknown>) => props,
}))

import { ApiError } from '@/lib/api'
import { buildPublicFansubProjectPath } from '@/lib/fansubProjectRoutes'

import PrettyFansubProjectPage from './page'

describe('PrettyFansubProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns notFound on a 404 from resolveFansubProject and never loads page data', async () => {
    mocks.resolveProject.mockRejectedValueOnce(new ApiError(404, 'not found'))

    await expect(
      PrettyFansubProjectPage({ params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed' }) }),
    ).rejects.toThrow('NOT_FOUND')

    expect(mocks.loadPageData).not.toHaveBeenCalled()
    expect(mocks.getProfile).not.toHaveBeenCalled()
  })

  it('feeds resolver-derived canonicalProjectPath/navigation into loadPublicFansubProjectPageData and renders ProjectPage with the loader result', async () => {
    mocks.resolveProject.mockResolvedValueOnce({
      data: {
        group_id: 4,
        anime_id: 9,
        anime_slug: 'vipers-creed',
        projects: [
          { id: 9, title: "Viper's Creed", anime_slug: 'vipers-creed' },
          { id: 11, title: 'Another Project', anime_slug: 'another-project' },
        ],
      },
    })
    const pageData = { marker: 'loaded-data' }
    mocks.loadPageData.mockResolvedValueOnce({ status: 'ok', data: pageData })

    const result = await PrettyFansubProjectPage({
      params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed' }),
    })

    const expectedCanonicalPath = buildPublicFansubProjectPath('c-subs', 'vipers-creed')
    expect(mocks.loadPageData).toHaveBeenCalledWith({
      animeID: 9,
      groupID: 4,
      precomputed: expect.objectContaining({ canonicalProjectPath: expectedCanonicalPath }),
    })
    expect(mocks.getProfile).not.toHaveBeenCalled()
    expect((result as { props: { data: unknown } }).props.data).toBe(pageData)
  })

  it('never invokes getPublicFansubProfileBySlug from this route regardless of outcome', async () => {
    mocks.resolveProject.mockResolvedValueOnce({
      data: { group_id: 4, anime_id: 9, anime_slug: 'vipers-creed', projects: [] },
    })
    mocks.loadPageData.mockResolvedValueOnce({ status: 'not-found' })

    await expect(
      PrettyFansubProjectPage({ params: Promise.resolve({ slug: 'c-subs', animeSlug: 'vipers-creed' }) }),
    ).rejects.toThrow('NOT_FOUND')

    expect(mocks.getProfile).not.toHaveBeenCalled()
  })
})
