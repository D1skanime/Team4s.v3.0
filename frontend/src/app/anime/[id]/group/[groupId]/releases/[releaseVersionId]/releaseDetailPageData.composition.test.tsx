// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) { super('api') }
  },
  getAnimeByID: vi.fn(),
  getAnimeBackdrops: vi.fn(),
  getGroupDetail: vi.fn(),
  getGroupReleaseDetail: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/navigation/Breadcrumbs', () => ({ Breadcrumbs: () => null }))
vi.mock('@/lib/publicApiUrl', () => ({ resolvePublicApiUrl: (value: string) => value }))
vi.mock('@/lib/api', () => ({
  ApiError: mocks.ApiError,
  getAnimeByID: mocks.getAnimeByID,
  getAnimeBackdrops: mocks.getAnimeBackdrops,
  getGroupDetail: mocks.getGroupDetail,
  getGroupReleaseDetail: mocks.getGroupReleaseDetail,
}))
vi.mock('./ReleaseDetailHero', () => ({
  ReleaseDetailHero: ({ next, animeID, groupID, canonicalProjectPath, atmosphereUrl }: {
    next: { release_version_id: number } | null
    animeID: number
    groupID: number
    canonicalProjectPath?: string | null
    atmosphereUrl?: string | null
  }) => (
    <section
      data-testid="release-hero"
      data-next-release-id={next?.release_version_id ?? ''}
      data-anime-id={animeID}
      data-group-id={groupID}
      data-canonical-project-path={canonicalProjectPath ?? ''}
      data-atmosphere-url={atmosphereUrl ?? ''}
    >Hero</section>
  ),
}))
vi.mock('./ThemeTimeline', () => ({
  ThemeTimeline: ({ segments }: { segments: unknown[] }) => segments.length > 0
    ? <section data-testid="release-karas"><h2>Karas</h2></section>
    : null,
}))
vi.mock('./ReleaseGallery', () => ({
  ReleaseGallery: ({ initialImages, atmosphereUrl }: { initialImages: unknown[]; atmosphereUrl?: string | null }) => initialImages.length > 0
    ? <section data-testid="release-images" data-atmosphere-url={atmosphereUrl ?? ''}><h2>Bilder aus dem Release</h2></section>
    : null,
}))
vi.mock('./ReleaseNotesList', () => ({
  ReleaseNotesList: ({ initialNotes }: { initialNotes: unknown[] }) => initialNotes.length > 0
    ? <section data-testid="release-notes"><h2>Stimmen aus dem Team</h2></section>
    : null,
}))
vi.mock('./ContributorsRow', () => ({
  ContributorsRow: ({ contributors }: { contributors: unknown[] }) => contributors.length > 0
    ? <section data-testid="release-contributors"><h2>An diesem Release beteiligt</h2></section>
    : null,
}))
vi.mock('./ReleaseEpisodePlayer', () => ({
  ReleaseEpisodePlayer: ({ releaseVersionID }: { releaseVersionID: number }) => releaseVersionID > 0
    ? <section data-testid="release-episode"><h2>Vollständige Episode</h2></section>
    : null,
}))
vi.mock('./ReleaseNavigation', () => ({
  ReleaseNavigation: ({ previous, next }: { previous: unknown; next: unknown }) => previous || next
    ? <nav data-testid="release-navigation">AdjacentNavigation</nav>
    : null,
}))

import { ReleaseDetailPageContent } from './releaseDetailPageData'

const fullDetail = {
  title: 'Moonlight',
  episode_number: '01',
  duration_seconds: 1_440,
  images: [{ id: 1 }],
  image_category_totals: {},
  groups: [{ fansub_group_id: 4, name: 'C-Subs' }],
  notes: [{ id: 2 }],
  notes_count: 1,
  segments: [{ theme_segment_id: 7 }],
  contributors: [{ fansub_group_id: 4, member_id: 9, name: 'Mia', role_label: 'Karaoke' }],
  preview_image: { id: 1, thumbnail_url: '/release-preview-thumb.jpg', original_url: '/release-preview.jpg' },
  previous: { release_version_id: 11 },
  next: { release_version_id: 13 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAnimeByID.mockResolvedValue({ data: { title: 'Vipers Creed', banner_url: null } })
  mocks.getGroupDetail.mockResolvedValue({ data: { fansub: { name: 'C-Subs' } } })
  mocks.getAnimeBackdrops.mockResolvedValue({ data: { logo_url: null, backdrops: [], banner_url: null } })
  mocks.getGroupReleaseDetail.mockResolvedValue(fullDetail)
})

async function renderComposer() {
  const result = await ReleaseDetailPageContent({
    animeID: 9,
    groupID: 4,
    releaseVersionID: 12,
    canonicalProjectPath: '/fansubs/c-subs/fansubprojekt/vipers-creed',
  })
  return render(result)
}

describe('ReleaseDetailPageContent Phase 105 composition', () => {
  it('renders the release story in the current editorial order without jump navigation', async () => {
    await renderComposer()

    const orderedSections = [
      screen.getByTestId('release-hero'),
      screen.getByTestId('release-notes'),
      screen.getByTestId('release-karas'),
      screen.getByTestId('release-images'),
      screen.getByTestId('release-contributors'),
      screen.getByTestId('release-episode'),
      screen.getByTestId('release-navigation'),
    ]

    for (let index = 1; index < orderedSections.length; index += 1) {
      expect(
        orderedSections[index - 1].compareDocumentPosition(orderedSections[index])
          & Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0)
    }

    expect(screen.queryByRole('navigation', { name: 'Release-Inhalte' })).toBeNull()
    expect(screen.queryByTestId('release-anchors')).toBeNull()
    expect(screen.getByTestId('release-hero').getAttribute('data-next-release-id')).toBe('13')
    expect(screen.getByTestId('release-hero').getAttribute('data-anime-id')).toBe('9')
    expect(screen.getByTestId('release-hero').getAttribute('data-group-id')).toBe('4')
    expect(screen.getByTestId('release-hero').getAttribute('data-canonical-project-path')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed')
    expect(screen.getByTestId('release-hero').getAttribute('data-atmosphere-url')).toBe('/release-preview-thumb.jpg')
    expect(screen.getByTestId('release-images').getAttribute('data-atmosphere-url')).toBe('/release-preview-thumb.jpg')
  })

  it('uses the Anime logo as atmosphere only when no release preview exists', async () => {
    mocks.getGroupReleaseDetail.mockResolvedValue({ ...fullDetail, preview_image: null })
    mocks.getAnimeBackdrops.mockResolvedValue({ data: { logo_url: '/anime-logo.png', backdrops: ['/anime-backdrop.jpg'], banner_url: '/anime-banner.jpg' } })

    await renderComposer()

    expect(screen.getByTestId('release-hero').getAttribute('data-atmosphere-url')).toBe('/anime-logo.png')
    expect(screen.getByTestId('release-images').getAttribute('data-atmosphere-url')).toBe('/anime-logo.png')
  })

  it('omits empty child sections completely without headings, dividers, or reserved sections', async () => {
    mocks.getGroupReleaseDetail.mockResolvedValue({
      ...fullDetail,
      images: [],
      image_category_totals: {},
      notes: [],
      notes_count: 0,
      segments: [],
      contributors: [],
      previous: null,
      next: null,
    })

    await renderComposer()

    expect(screen.queryByRole('heading', { name: 'Karas' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Bilder aus dem Release' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Stimmen aus dem Team' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'An diesem Release beteiligt' })).toBeNull()
    expect(screen.queryByTestId('release-karas')).toBeNull()
    expect(screen.queryByTestId('release-images')).toBeNull()
    expect(screen.queryByTestId('release-notes')).toBeNull()
    expect(screen.queryByTestId('release-contributors')).toBeNull()
    expect(screen.queryByTestId('release-navigation')).toBeNull()
  })

  it('keeps an existing release reachable when optional project metadata is unavailable', async () => {
    mocks.getGroupDetail.mockRejectedValue(new mocks.ApiError(404))

    await renderComposer()

    expect(mocks.getGroupReleaseDetail).toHaveBeenCalledWith(9, 4, 12)
    expect(mocks.notFound).not.toHaveBeenCalled()
    expect(screen.getByTestId('release-hero')).toBeTruthy()
  })

  it('uses the canonical release detail as the not-found authority', async () => {
    mocks.getGroupReleaseDetail.mockRejectedValue(new mocks.ApiError(404))

    await ReleaseDetailPageContent({ animeID: 9, groupID: 4, releaseVersionID: 999 })

    expect(mocks.notFound).toHaveBeenCalledOnce()
    expect(mocks.getAnimeByID).not.toHaveBeenCalled()
    expect(mocks.getGroupDetail).not.toHaveBeenCalled()
  })
})
