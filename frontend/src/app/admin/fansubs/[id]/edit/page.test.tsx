// @vitest-environment jsdom

import { act, createElement, type ImgHTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { UseReleaseVersionMediaResult } from '@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt = '', unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    return createElement('img', { alt, ...props })
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '88' }),
}))

const mockedUseReleaseVersionMedia = vi.fn<(versionId: number | null) => UseReleaseVersionMediaResult>()
const mockedUseAuthSession = vi.hoisted(() => vi.fn(() => ({ hasAccessToken: true, isClientInitialized: true })))
const mediaUploadProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const appMembersSectionProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const animeProjectSectionProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const apiMocks = vi.hoisted(() => ({
  createFansubAlias: vi.fn(),
  createFansubLink: vi.fn(),
  deleteAdminReleaseThemeAsset: vi.fn(),
  deleteFansubAlias: vi.fn(),
  deleteFansubGroup: vi.fn(),
  deleteFansubLink: vi.fn(),
  getAdminAnimeThemeSegments: vi.fn(),
  getAdminAnimeThemes: vi.fn(),
  getAdminFansubAnime: vi.fn(),
  getAdminFansubAnimeReleases: vi.fn(),
  getAdminRelease: vi.fn(),
  getAdminReleaseThemeAssets: vi.fn(),
  getCurrentUser: vi.fn(),
  getFansubAliases: vi.fn(),
  getFansubByID: vi.fn(),
  getFansubList: vi.fn(),
  resolveApiUrl: vi.fn((value: string) => value),
  updateFansubGroup: vi.fn(),
  updateFansubLink: vi.fn(),
  uploadAdminReleaseThemeAssetForRelease: vi.fn(),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => mockedUseAuthSession(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  ...apiMocks,
}))

vi.mock('@/components/admin/MediaUpload', () => ({
  buildFansubLogoFallback: () => ({ initials: 'SG', background: '#111827', color: '#ffffff' }),
  buildMediaPreviewURL: (value: { publicURL?: string | null } | null) => value?.publicURL ?? '',
  MediaUpload: (props: Record<string, unknown>) => {
    mediaUploadProps.push(props)
    return <div data-testid={`media-upload-${String(props.type)}`} />
  },
}))

vi.mock('./FansubAppMembersSection', () => ({
  FansubAppMembersSection: (props: Record<string, unknown>) => {
    appMembersSectionProps.push(props)
    return <div data-testid="app-members-section" />
  },
}))

vi.mock('./AnimeProjectNotesSection', () => ({
  AnimeProjectNotesSection: (props: Record<string, unknown>) => {
    animeProjectSectionProps.push(props)
    return <div data-testid="anime-project-notes-section" />
  },
}))

vi.mock('./NotesTab', () => ({
  NotesTab: () => <div data-testid="notes-tab" />,
}))

vi.mock('@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia', () => ({
  useReleaseVersionMedia: (versionId: number | null) => mockedUseReleaseVersionMedia(versionId),
}))

import { ReleaseVersionMediaDrawerSummary } from './ReleaseVersionMediaDrawerSummary'
import AdminFansubEditPage from './page'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  mediaUploadProps.length = 0
  appMembersSectionProps.length = 0
  animeProjectSectionProps.length = 0
  mockedUseAuthSession.mockReturnValue({ hasAccessToken: true, isClientInitialized: true })
  apiMocks.getFansubByID.mockResolvedValue({
    data: {
      id: 88,
      name: 'SubGroup',
      slug: 'subgroup',
      status: 'active',
      group_type: 'group',
      country: null,
      founded_year: null,
      dissolved_year: null,
      logo_url: null,
      banner_url: null,
      logo_id: null,
      banner_id: null,
      website_url: null,
      discord_url: null,
      irc_url: null,
      links: [],
      updated_at: '2026-05-20T00:00:00Z',
    },
  })
  apiMocks.getFansubAliases.mockResolvedValue({ data: [] })
  apiMocks.getCurrentUser.mockResolvedValue({ data: { is_platform_admin: true } })
  apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [] })
  apiMocks.getAdminAnimeThemes.mockResolvedValue({ data: [] })
  apiMocks.getAdminAnimeThemeSegments.mockResolvedValue({ data: [] })
  apiMocks.getAdminReleaseThemeAssets.mockResolvedValue({ data: [] })
  mockedUseReleaseVersionMedia.mockReturnValue(makeMediaState())
})

function makeMediaState(): UseReleaseVersionMediaResult {
  return {
    items: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    uploadItems: [],
    startUpload: vi.fn().mockResolvedValue(undefined),
    retryUpload: vi.fn().mockResolvedValue(undefined),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    deleteError: null,
    reorderError: null,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('ReleaseVersionMediaDrawerSummary', () => {
  it('renders the Media verwalten CTA with the release-version editor link', () => {
    mockedUseReleaseVersionMedia.mockReturnValue(makeMediaState())

    render(
      <ReleaseVersionMediaDrawerSummary
        versionId={1}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    const link = screen.getByRole('link', { name: 'Media verwalten' })
    expect(link.getAttribute('href')).toContain('/admin/episode-versions/1/edit')
  })

  it('does not render upload controls inside the drawer summary', () => {
    mockedUseReleaseVersionMedia.mockReturnValue(makeMediaState())

    const { container } = render(
      <ReleaseVersionMediaDrawerSummary
        versionId={1}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(screen.queryByText(/hochladen|Datei auswählen/i)).toBeNull()
  })

  it('treats a null media payload like an empty drawer summary instead of crashing', () => {
    mockedUseReleaseVersionMedia.mockReturnValue({
      ...makeMediaState(),
      items: null as unknown as UseReleaseVersionMediaResult['items'],
    })

    render(
      <ReleaseVersionMediaDrawerSummary
        versionId={41}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    expect(screen.getByRole('link', { name: 'Media verwalten' })).not.toBeNull()
    expect(screen.getByText(/Release-Screenshot:/i)).not.toBeNull()
  })
})

describe('AdminFansubEditPage token-free wiring', () => {
  it('passes no token-shaped prop into MediaUpload from the media tab', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: 'Medien' }))

    await waitFor(() => expect(mediaUploadProps.length).toBeGreaterThanOrEqual(2))
    expect(mediaUploadProps.every((props) => !Object.prototype.hasOwnProperty.call(props, 'authToken'))).toBe(true)
    expect(mediaUploadProps.slice(-2).map((props) => props.disabled)).toEqual([false, false])
  })

  it('passes token-free access state into child sections', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: 'App-Mitglieder' }))
    expect(await screen.findByTestId('app-members-section')).not.toBeNull()

    expect(appMembersSectionProps.at(-1)).toMatchObject({ fansubId: 88, hasAccessToken: true })
    expect(Object.prototype.hasOwnProperty.call(appMembersSectionProps.at(-1), 'authToken')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Anime-Einblicke' }))
    expect(await screen.findByTestId('anime-project-notes-section')).not.toBeNull()

    expect(animeProjectSectionProps.at(-1)).toMatchObject({ fansubId: 88, hasAccessToken: true })
    expect(Object.prototype.hasOwnProperty.call(animeProjectSectionProps.at(-1), 'authToken')).toBe(false)
  })

  it('uses release_version_id for drawer media instead of release_id', async () => {
    const release = {
      release_id: 62,
      release_version_id: 6201,
      anime_id: 13,
      anime_title: '11eyes',
      fansub_group_id: 94,
      fansub_name: 'Bloody-Shadow',
      episode_id: 249,
      episode_number: '1',
      episode_title: 'Erste Folge',
      source: null,
      version_count: 1,
      has_theme_assets: false,
      duration_seconds: null,
      created_at: '2026-05-25T00:00:00Z',
    }

    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [{ id: 13, title: '11eyes', type: 'tv', header_image: null, cover_image: null }],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({ data: [release] })
    apiMocks.getAdminRelease.mockResolvedValue({ data: release })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: 'Anime & Veröffentlichungen' }))
    fireEvent.click(await screen.findByRole('button', { name: '11eyes ausklappen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Editieren' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Media' }))

    await waitFor(() => expect(mockedUseReleaseVersionMedia).toHaveBeenCalledWith(6201))
    expect(mockedUseReleaseVersionMedia).not.toHaveBeenCalledWith(62)
    expect(screen.getByRole('link', { name: 'Media verwalten' }).getAttribute('href')).toContain(
      '/admin/episode-versions/6201/edit',
    )
  })

  it('ignores stale release drawer detail responses after another release is opened', async () => {
    const firstRelease = {
      release_id: 62,
      release_version_id: 6201,
      anime_id: 13,
      anime_title: '11eyes',
      fansub_group_id: 94,
      fansub_name: 'Bloody-Shadow',
      episode_id: 249,
      episode_number: '1',
      episode_title: 'Erste Folge',
      source: null,
      version_count: 1,
      has_theme_assets: false,
      duration_seconds: null,
      created_at: '2026-05-25T00:00:00Z',
    }
    const secondRelease = {
      ...firstRelease,
      release_id: 63,
      release_version_id: 6301,
      episode_id: 250,
      episode_number: '2',
      episode_title: 'Zweite Folge',
    }
    const staleFirstResponse = deferred<{ data: typeof firstRelease }>()

    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [{ id: 13, title: '11eyes', type: 'tv', header_image: null, cover_image: null }],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({ data: [firstRelease, secondRelease] })
    apiMocks.getAdminRelease.mockImplementation((releaseID: number) => {
      if (releaseID === firstRelease.release_id) return staleFirstResponse.promise
      return Promise.resolve({
        data: {
          ...secondRelease,
          episode_title: 'Aktuelle Drawer-Details',
        },
      })
    })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: 'Anime & Veröffentlichungen' }))
    fireEvent.click(await screen.findByRole('button', { name: '11eyes ausklappen' }))

    const editButtons = await screen.findAllByRole('button', { name: 'Editieren' })
    fireEvent.click(editButtons[0])
    await waitFor(() => expect(apiMocks.getAdminRelease).toHaveBeenCalledWith(firstRelease.release_id))

    fireEvent.click(editButtons[1])
    await screen.findByText('Aktuelle Drawer-Details')

    await act(async () => {
      staleFirstResponse.resolve({
        data: {
          ...firstRelease,
          episode_title: 'Veraltete Drawer-Details',
        },
      })
      await staleFirstResponse.promise
    })

    expect(screen.queryByText('Veraltete Drawer-Details')).toBeNull()
    expect(screen.getByText('Aktuelle Drawer-Details')).not.toBeNull()
  })
})
