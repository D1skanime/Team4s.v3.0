// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock nur die API-Schicht; die reinen Ableitungs-Helfer (Navigation, Pfad, Flags)
// laufen bewusst echt, damit der Kompositions-/Degradations-Vertrag geprueft wird.
const mocks = vi.hoisted(() => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('api')
      this.name = 'ApiError'
    }
  },
  getPublicFansubProjectPage: vi.fn(),
  getPublicFansubProfileBySlug: vi.fn(),
  getGroupAssets: vi.fn(),
  getGroupReleases: vi.fn(),
  getGroupReleaseListCursor: vi.fn(),
  getGroupReleaseDetail: vi.fn(),
  getGroupDetail: vi.fn(),
}))

vi.mock('@/lib/publicApiUrl', () => ({ resolvePublicApiUrl: (value: string) => value }))
vi.mock('@/lib/api', () => ({
  ApiError: mocks.ApiError,
  getPublicFansubProjectPage: mocks.getPublicFansubProjectPage,
  getPublicFansubProfileBySlug: mocks.getPublicFansubProfileBySlug,
  getGroupAssets: mocks.getGroupAssets,
  getGroupReleases: mocks.getGroupReleases,
  getGroupReleaseListCursor: mocks.getGroupReleaseListCursor,
  getGroupReleaseDetail: mocks.getGroupReleaseDetail,
  getGroupDetail: mocks.getGroupDetail,
}))

import { loadPublicFansubProjectPageData } from './projectPageData'

const ANIME_ID = 13
const GROUP_ID = 1

function buildFansub() {
  return { id: GROUP_ID, slug: 'c-subs', name: 'C-Subs', logo_url: null }
}

function buildGroup() {
  return {
    fansub: buildFansub(),
    story: null,
    stats: { project_contributor_count: 1 },
  }
}

function buildAnime() {
  return { id: ANIME_ID, title: "Viper's Creed", banner_url: null, cover_image: null }
}

function buildProfile() {
  return {
    group: buildFansub(),
    stories: [],
    projects: [{ id: ANIME_ID, anime_slug: 'vipers-creed', title: "Viper's Creed", type: 'tv', status: 'completed' }],
    history: [],
    media: [],
    community_links: [],
  }
}

function buildBundle(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      group: buildGroup(),
      anime: buildAnime(),
      contributors: {
        team_members: [
          { member_id: 1, member_display_name: 'Mia', member_slug: null, member_avatar_url: null, role_labels: ['Karaoke'] },
        ],
        external_contributors: [],
      },
      themes: { themes: [{ id: 1, type: 'OP', title: 'Opening', assets: [], start_time: null, end_time: null }] },
      release_media: { items: [{ id: 1, thumbnail_url: null, caption: null, media_type: 'image' }] },
      project_note: { id: 1, title: 'Notiz', body_html: '<p>Projektnotiz</p>', body_text: 'Projektnotiz' },
      anime_fansubs: [],
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getPublicFansubProjectPage.mockResolvedValue(buildBundle())
  mocks.getPublicFansubProfileBySlug.mockResolvedValue({ data: buildProfile() })
  mocks.getGroupAssets.mockResolvedValue({
    data: { hero: { backdrop_url: null, banner_url: null, poster_url: null }, episodes: [] },
  })
  mocks.getGroupReleases.mockResolvedValue({ data: { episodes: [], other_groups: [] } })
  mocks.getGroupReleaseListCursor.mockResolvedValue({ items: [], next_cursor: null, has_more: false })
  mocks.getGroupReleaseDetail.mockResolvedValue(null)
})

describe('loadPublicFansubProjectPageData bundle composition', () => {
  it('Test A: happy path derives the shell + flags from one bundle call', async () => {
    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID })

    expect(mocks.getPublicFansubProjectPage).toHaveBeenCalledTimes(1)
    expect(mocks.getPublicFansubProjectPage).toHaveBeenCalledWith(ANIME_ID, GROUP_ID)
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return

    expect(result.data.hasTeamContent).toBe(true)
    expect(result.data.hasThemes).toBe(true)
    expect(result.data.hasMedia).toBe(true)
    expect(result.data.storyAvailable).toBe(true)
    expect(result.data.projectNotesHtml).toBe('<p>Projektnotiz</p>')
    expect(result.data.canonicalProjectPath).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed')
    expect(result.data.contributorsData.team_members).toHaveLength(1)
  })

  it('Test B: bundle 404 maps to not-found', async () => {
    mocks.getPublicFansubProjectPage.mockRejectedValue(new mocks.ApiError(404))

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID })

    expect(result).toEqual({ status: 'not-found' })
  })

  it('Test C: hard bundle error maps to error', async () => {
    mocks.getPublicFansubProjectPage.mockRejectedValue(new Error('boom'))

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID })

    expect(result.status).toBe('error')
    if (result.status !== 'error') return
    expect(result.animeID).toBe(ANIME_ID)
    expect(result.groupID).toBe(GROUP_ID)
  })

  it('Test D: partial degradation (themes/release_media null) keeps flags false without crashing', async () => {
    mocks.getPublicFansubProjectPage.mockResolvedValue(buildBundle({ themes: null, release_media: null }))

    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID })

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.data.hasThemes).toBe(false)
    expect(result.data.hasMedia).toBe(false)
    expect(result.data.themesData).toEqual({ themes: [] })
    expect(result.data.releaseMediaData).toEqual({ items: [] })
  })

  it('Test E: preloadedProfile is used without a second profile fetch', async () => {
    const result = await loadPublicFansubProjectPageData({
      animeID: ANIME_ID,
      groupID: GROUP_ID,
      preloadedProfile: buildProfile(),
    })

    expect(mocks.getPublicFansubProfileBySlug).not.toHaveBeenCalled()
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.data.canonicalProjectPath).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed')
    expect(result.data.fansubProjectNavigation).toEqual({ previous: null, next: null })
  })

  it('Test F: without preloadedProfile the ID route fetches the profile exactly once', async () => {
    const result = await loadPublicFansubProjectPageData({ animeID: ANIME_ID, groupID: GROUP_ID })

    expect(mocks.getPublicFansubProfileBySlug).toHaveBeenCalledTimes(1)
    expect(mocks.getPublicFansubProfileBySlug).toHaveBeenCalledWith('c-subs')
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.data.canonicalProjectPath).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed')
  })
})
