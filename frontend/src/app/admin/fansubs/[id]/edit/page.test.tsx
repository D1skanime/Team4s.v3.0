// @vitest-environment jsdom

import { act, createElement, type ImgHTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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
  usePathname: () => '/admin/fansubs/88/edit',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockedUseReleaseVersionMedia = vi.fn<(versionId: number | null) => UseReleaseVersionMediaResult>()
const mockedUseAuthSession = vi.hoisted(() => vi.fn(() => ({ hasAccessToken: true, isClientInitialized: true })))
const mediaUploadProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const appMembersSectionProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const apiMocks = vi.hoisted(() => ({
  applyDefaultCrew: vi.fn().mockResolvedValue({ applied_count: 0 }),
  createFansubAlias: vi.fn(),
  createFansubLink: vi.fn(),
  deleteAdminReleaseThemeAsset: vi.fn(),
  deleteDefaultCrewEntry: vi.fn().mockResolvedValue(undefined),
  deleteFansubAlias: vi.fn(),
  deleteFansubGroup: vi.fn(),
  deleteFansubLink: vi.fn(),
  getAdminAnimeThemeSegments: vi.fn(),
  getAdminAnimeThemes: vi.fn(),
  getAdminFansubAnime: vi.fn(),
  getAdminFansubAnimeReleases: vi.fn(),
  getAdminRelease: vi.fn(),
  getAdminReleaseThemeAssets: vi.fn(),
  getAnimeCoverage: vi.fn().mockResolvedValue({ data: [] }),
  getAnimeFansubProjectNote: vi.fn().mockResolvedValue(null),
  getCurrentUser: vi.fn(),
  getFansubAliases: vi.fn(),
  getFansubByID: vi.fn(),
  getFansubGroupCapabilities: vi.fn(),
  getFansubList: vi.fn(),
  listAnimeContributions: vi.fn().mockResolvedValue({ data: [] }),
  listDefaultCrew: vi.fn().mockResolvedValue([]),
  listUnifiedGroupMembers: vi.fn().mockResolvedValue({ data: [] }),
  resolveApiUrl: vi.fn((value: string) => value),
  updateFansubGroup: vi.fn(),
  updateFansubLink: vi.fn(),
  uploadAdminReleaseThemeAssetForRelease: vi.fn(),
  upsertAnimeFansubProjectNote: vi.fn().mockResolvedValue(null),
  upsertDefaultCrewEntry: vi.fn().mockResolvedValue(undefined),
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
  AnimeProjectNotesSection: () => <div data-testid="anime-project-notes-section" />,
}))

vi.mock('./AnimeReleasesFilterBar', () => ({
  AnimeReleasesFilterBar: () => <div data-testid="anime-releases-filter-bar" />,
}))

vi.mock('./AnimeProjectNoteWorkspace', () => ({
  AnimeProjectNoteWorkspace: () => <div data-testid="anime-project-note-workspace" />,
}))

vi.mock('./CoverageMatrix', () => ({
  CoverageMatrix: () => <div data-testid="coverage-matrix" />,
}))

vi.mock('./DefaultCrewManager', () => ({
  DefaultCrewManager: () => <div data-testid="default-crew-manager" />,
}))

vi.mock('./NotesTab', () => ({
  NotesTab: () => <div data-testid="notes-tab" />,
}))

vi.mock('@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia', () => ({
  useReleaseVersionMedia: (versionId: number | null) => mockedUseReleaseVersionMedia(versionId),
}))

import { ReleaseVersionMediaDrawerSummary } from './ReleaseVersionMediaDrawerSummary'
import AdminFansubEditPage from './page'
import { MAIN_TABS, parseMainTab } from './mainTabRouting'

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
  apiMocks.getFansubGroupCapabilities.mockResolvedValue({
    data: {
      can_edit_group: true,
      can_manage_links: true,
      can_view_members: true,
      can_manage_members: true,
      can_edit_notes: true,
      can_view_invitations: true,
      can_create_invitation: true,
      can_cancel_invitation: true,
      can_view_releases: true,
      can_view_release_media: true,
      can_upload_release_media: true,
      can_edit_release_notes: true,
    },
  })
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
  it('keeps the admin breadcrumb for platform admins', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    expect(screen.getByRole('link', { name: 'Admin' }).getAttribute('href')).toBe('/admin')
    expect(screen.getByRole('link', { name: 'Fansubs' }).getAttribute('href')).toBe('/admin/fansubs')
    expect(screen.queryByRole('link', { name: 'Meine Gruppen' })).toBeNull()
  })

  it('allows a non-platform release role into the fansub edit workspace with only release tabs', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: false },
    })
    apiMocks.getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: false,
        can_manage_links: false,
        can_view_members: false,
        can_manage_members: false,
        can_edit_notes: false,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: true,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
      },
    })
    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [
        {
          id: 13,
          title: 'Naruto',
          type: 'tv',
          header_image: null,
          cover_image: null,
        },
      ],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({
      data: [
        {
          release_id: 62,
          release_version_id: 41,
          anime_id: 13,
          anime_title: 'Naruto',
          fansub_group_id: 88,
          fansub_name: 'SubGroup',
          episode_id: 249,
          episode_number: '1',
          episode_title: 'Wer ist Naruto?',
          source: null,
          version_count: 1,
          has_theme_assets: false,
          duration_seconds: null,
          created_at: '2026-05-25T00:00:00Z',
        },
      ],
    })

    render(<AdminFansubEditPage />)

    expect(await screen.findByRole('heading', { name: 'SubGroup' })).not.toBeNull()
    expect(await screen.findByRole('button', { name: 'Anime & Veröffentlichungen' })).not.toBeNull()
    expect(await screen.findByRole('heading', { name: 'Naruto' })).not.toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Naruto ausklappen' }))
    expect((await screen.findAllByRole('button', { name: 'Release 62 ausklappen' })).length).toBeGreaterThan(0)
    expect(apiMocks.getFansubGroupCapabilities).toHaveBeenCalledWith(88)
    expect(screen.queryByRole('button', { name: 'Grunddaten' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mitwirkende' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editieren' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Notizen & Medien' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Notizen' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Medien' })).toBeNull()
    expect(
      screen.queryByText('Diese Ansicht ist dem Team4s-Admin vorbehalten.'),
    ).toBeNull()
  })

  it('opens the release drawer directly on Media for non-platform users with media rights', async () => {
    const release = {
      release_id: 62,
      release_version_id: 41,
      anime_id: 13,
      anime_title: 'Naruto',
      fansub_group_id: 88,
      fansub_name: 'SubGroup',
      episode_id: 249,
      episode_number: '1',
      episode_title: 'Wer ist Naruto?',
      source: null,
      version_count: 1,
      has_theme_assets: false,
      duration_seconds: null,
      created_at: '2026-05-25T00:00:00Z',
    }

    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: false },
    })
    apiMocks.getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: false,
        can_manage_links: false,
        can_view_members: false,
        can_manage_members: false,
        can_edit_notes: false,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: true,
        can_view_release_media: true,
        can_upload_release_media: true,
        can_edit_release_notes: false,
      },
    })
    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [
        {
          id: 13,
          title: 'Naruto',
          type: 'tv',
          header_image: null,
          cover_image: null,
        },
      ],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({ data: [release] })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(await screen.findByRole('button', { name: 'Naruto ausklappen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Medien' }))

    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Media' })).not.toBeNull()
    await waitFor(() => expect(mockedUseReleaseVersionMedia).toHaveBeenCalledWith(41))
    expect(apiMocks.getAdminRelease).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Media verwalten' }).getAttribute('href')).toContain(
      '/admin/episode-versions/41/edit?tab=media',
    )
  })

  it('hides slug management from non-platform fansub leads and saves the group name without slug changes', async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { is_platform_admin: false },
    })
    apiMocks.getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: true,
        can_manage_links: false,
        can_view_members: false,
        can_manage_members: false,
        can_edit_notes: false,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: false,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
      },
    })
    apiMocks.updateFansubGroup.mockResolvedValue({ data: {} })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    expect(screen.getByRole('link', { name: 'Meine Gruppen' }).getAttribute('href')).toBe('/manage/groups')
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Fansubs' })).toBeNull()
    expect(screen.getByLabelText(/Fansubgruppen-Name/i)).not.toBeNull()
    expect(screen.queryByText('Slug')).toBeNull()

    fireEvent.change(screen.getByLabelText(/Fansubgruppen-Name/i), {
      target: { value: 'AnimeOwnage' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Speichern' })[0])

    await waitFor(() => expect(apiMocks.updateFansubGroup).toHaveBeenCalledTimes(1))
    expect(apiMocks.updateFansubGroup.mock.calls[0][1]).toMatchObject({
      name: 'AnimeOwnage',
    })
    expect(apiMocks.updateFansubGroup.mock.calls[0][1]).not.toHaveProperty('slug')
    expect(apiMocks.getFansubList).not.toHaveBeenCalled()
  })

  it('uses the shared year picker for the founding year', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    const foundedYear = screen.getByLabelText('Gründungsjahr') as HTMLButtonElement
    const currentYear = String(new Date().getFullYear())

    expect(foundedYear.tagName).toBe('BUTTON')
    expect(screen.queryByLabelText('Gründungsjahr ein Jahr vor')).toBeNull()
    expect(screen.queryByLabelText('Gründungsjahr ein Jahr zurück')).toBeNull()
    fireEvent.click(foundedYear)
    expect(screen.getByRole('button', { name: currentYear })).not.toBeNull()
    expect(screen.queryByRole('button', { name: '2100' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Keine Angabe' })).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: currentYear }))
    expect(foundedYear.textContent).toContain(currentYear)
  })

  it('disables and clears the dissolution year while the group is active', async () => {
    apiMocks.getFansubByID.mockResolvedValue({
      data: {
        id: 88,
        name: 'SubGroup',
        slug: 'subgroup',
        status: 'dissolved',
        group_type: 'group',
        country: null,
        founded_year: null,
        dissolved_year: 2020,
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

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    const dissolvedYear = screen.getByLabelText('Auflösungsjahr') as HTMLButtonElement
    expect(dissolvedYear.disabled).toBe(false)
    expect(dissolvedYear.textContent).toContain('2020')

    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: 'active' } })

    expect(dissolvedYear.disabled).toBe(true)
    expect(dissolvedYear.textContent).toContain('Keine Angabe')
  })

  it('does not show the group delete action while deletion ownership is unresolved', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    expect(screen.queryByRole('button', { name: 'Löschen' })).toBeNull()
  })

  it('renders aliases as global badge text with a separate remove action', async () => {
    apiMocks.getFansubAliases.mockResolvedValue({
      data: [
        {
          id: 17,
          fansub_group_id: 88,
          alias: 'AO',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
    })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    expect(screen.getAllByText('AO').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Alias AO entfernen' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'AO x' })).toBeNull()
  })

  it('renders branding uploads on Grunddaten and not in the media tab', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    await waitFor(() => expect(mediaUploadProps.length).toBeGreaterThanOrEqual(2))
    expect(mediaUploadProps.every((props) => !Object.prototype.hasOwnProperty.call(props, 'authToken'))).toBe(true)
    expect(mediaUploadProps.slice(-2).map((props) => props.disabled)).toEqual([false, false])
    expect(screen.getByTestId('media-upload-logo')).not.toBeNull()
    expect(screen.getByTestId('media-upload-banner')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Medien' }))

    expect(screen.queryByTestId('media-upload-logo')).toBeNull()
    expect(screen.queryByTestId('media-upload-banner')).toBeNull()
  })

  it('passes token-free access state into child sections', async () => {
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    expect(screen.queryByRole('button', { name: 'Hist. Mitglieder' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Claims' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fansub Members' }))
    expect(await screen.findByTestId('app-members-section')).not.toBeNull()

    expect(appMembersSectionProps.at(-1)).toMatchObject({ fansubId: 88, hasAccessToken: true })
    expect(Object.prototype.hasOwnProperty.call(appMembersSectionProps.at(-1), 'authToken')).toBe(false)

    // D-13: Tab 'Anime-Einblicke' existiert nicht mehr; AnimeProjectNotesSection wurde aus page.tsx entfernt
    expect(screen.queryByRole('button', { name: 'Anime-Einblicke' })).toBeNull()
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

  it('opens the project insight workspace from the anime card action', async () => {
    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [{ id: 13, title: 'Naruto', type: 'tv', header_image: null, cover_image: null }],
    })
    apiMocks.getAnimeCoverage.mockResolvedValue({
      data: [{ anime_id: 13, member_count: 0, covered_role_codes: [], has_project_note: false }],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({ data: [] })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: 'Anime & Veröffentlichungen' }))
    expect(await screen.findByRole('heading', { name: 'Naruto' })).not.toBeNull()
    expect(screen.queryByTestId('anime-project-note-workspace')).toBeNull()
    expect(screen.queryByTestId('coverage-matrix')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Einblick' }))

    expect(await screen.findByTestId('anime-project-note-workspace')).not.toBeNull()
    expect(screen.getByTestId('coverage-matrix')).not.toBeNull()
    expect(apiMocks.getAdminFansubAnimeReleases).toHaveBeenCalledWith(88, 13)
  })

  it('opens release theme assets in a closable preview modal', async () => {
    const release = {
      release_id: 62,
      release_version_id: 6201,
      anime_id: 13,
      anime_title: 'Naruto',
      fansub_group_id: 88,
      fansub_name: 'SubGroup',
      episode_id: 249,
      episode_number: '1',
      episode_title: 'Wer ist Naruto?',
      source: null,
      version_count: 1,
      has_theme_assets: true,
      duration_seconds: 240,
      created_at: '2026-05-25T00:00:00Z',
    }

    apiMocks.getAdminFansubAnime.mockResolvedValue({
      data: [{ id: 13, title: 'Naruto', type: 'tv', header_image: null, cover_image: null }],
    })
    apiMocks.getAdminFansubAnimeReleases.mockResolvedValue({ data: [release] })
    apiMocks.getAdminRelease.mockResolvedValue({ data: release })
    apiMocks.getAdminAnimeThemes.mockResolvedValue({
      data: [
        {
          id: 7,
          anime_id: 13,
          theme_type_id: 3,
          theme_type_name: 'Insert',
          title: 'Naruto Inserttheme',
          created_at: '2026-05-25T00:00:00Z',
        },
      ],
    })
    apiMocks.getAdminAnimeThemeSegments.mockResolvedValue({
      data: [
        {
          id: 70,
          theme_id: 7,
          anime_id: 13,
          theme_title: 'Naruto Inserttheme',
          theme_type_name: 'Insert',
          fansub_group_id: 88,
          version: 'SubGroup',
          start_episode: 1,
          end_episode: 1,
          start_episode_id: 249,
          end_episode_id: 249,
          start_episode_number: '1',
          end_episode_number: '1',
          start_time: '00:01:00',
          end_time: '00:02:00',
          source_type: 'release_asset',
          source_ref: null,
          source_label: null,
          playback_source_kind: 'uploaded_asset',
          playback_duration_seconds: 240,
          created_at: '2026-05-25T00:00:00Z',
        },
      ],
    })
    apiMocks.getAdminReleaseThemeAssets.mockResolvedValue({
      data: [
        {
          release_id: 62,
          theme_id: 7,
          theme_type_name: 'Insert',
          theme_title: 'Naruto Inserttheme',
          media_id: 700,
          public_url: '/api/v1/media/files/theme.mp4',
          mime_type: 'video/mp4',
          size_bytes: 1234,
          created_at: '2026-05-25T00:00:00Z',
        },
      ],
    })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    fireEvent.click(screen.getByRole('button', { name: /Anime &/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Naruto ausklappen' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Release 62 ausklappen' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: /IN Uploadet/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Aktuelles Asset ansehen' }))

    const dialog = screen.getByRole('dialog', { name: 'Theme-Video ansehen' })
    expect(within(dialog).getByText(/Episode 1: Wer ist Naruto\?/)).not.toBeNull()
    expect(dialog.querySelector('video')?.getAttribute('src')).toBe('/api/v1/media/files/theme.mp4')

    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Schließen' })[1])
    expect(screen.queryByRole('dialog', { name: 'Theme-Video ansehen' })).toBeNull()
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

describe("Tab 'Veröffentlichung' — Capability-Gating (Req F)", () => {
  it('zeigt den Veröffentlichung-Tab wenn can_edit_group=true', async () => {
    apiMocks.getCurrentUser.mockResolvedValueOnce({
      data: { is_platform_admin: false },
    })
    // Defaults: can_edit_group=true (gesetzt in beforeEach)
    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    // Tab „Veröffentlichung" soll sichtbar sein wenn can_edit_group=true
    // Läuft ROT solange MAIN_TABS noch kein readiness-Eintrag hat (Plan 03)
    expect(screen.getByRole('button', { name: 'Veröffentlichung' })).not.toBeNull()
  })

  it('zeigt den Veröffentlichung-Tab wenn can_edit_notes=true (aber can_edit_group=false)', async () => {
    apiMocks.getCurrentUser.mockResolvedValueOnce({
      data: { is_platform_admin: false },
    })
    apiMocks.getFansubGroupCapabilities.mockResolvedValueOnce({
      data: {
        can_edit_group: false,
        can_manage_links: false,
        can_view_members: false,
        can_manage_members: false,
        can_edit_notes: true,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: false,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
      },
    })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    // Läuft ROT solange MAIN_TABS noch kein readiness-Eintrag hat (Plan 03)
    expect(screen.getByRole('button', { name: 'Veröffentlichung' })).not.toBeNull()
  })

  it('versteckt den Veröffentlichung-Tab bei reiner Mitgliedschaft (can_view_members=true, can_edit_group=false, can_edit_notes=false)', async () => {
    apiMocks.getCurrentUser.mockResolvedValueOnce({
      data: { is_platform_admin: false },
    })
    apiMocks.getFansubGroupCapabilities.mockResolvedValueOnce({
      data: {
        can_edit_group: false,
        can_manage_links: false,
        can_view_members: true,
        can_manage_members: false,
        can_edit_notes: false,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: false,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
      },
    })

    render(<AdminFansubEditPage />)

    await screen.findByRole('heading', { name: 'SubGroup' })
    // Tab darf bei reiner Mitgliedschaft NICHT sichtbar sein
    // Läuft GRÜN wenn kein readiness-Eintrag in MAIN_TABS ist (korrekt für Wave-0)
    expect(screen.queryByRole('button', { name: 'Veröffentlichung' })).toBeNull()
  })
})

describe('parseMainTab und MAIN_TABS — Routing-Logik (D-13)', () => {
  it('parseMainTab("anime-projekte") === "releases" (Legacy-Redirect D-13)', () => {
    expect(parseMainTab('anime-projekte')).toBe('releases')
  })

  it('MAIN_TABS enthält keinen Eintrag mit key === "anime-projekte"', () => {
    const keys = MAIN_TABS.map((t) => t.key)
    expect(keys).not.toContain('anime-projekte')
  })

  it('parseMainTab("releases") === "releases"', () => {
    expect(parseMainTab('releases')).toBe('releases')
  })

  it('parseMainTab("basic") === "basic"', () => {
    expect(parseMainTab('basic')).toBe('basic')
  })

  it('parseMainTab("rollen") === "collaboration" (Legacy-Redirect)', () => {
    expect(parseMainTab('rollen')).toBe('collaboration')
  })

  it('parseMainTab(null) === "basic" (Fallback)', () => {
    expect(parseMainTab(null)).toBe('basic')
  })

  it('parseMainTab("unbekannt") === "basic" (Fallback auf unbekannten Wert)', () => {
    expect(parseMainTab('unbekannt')).toBe('basic')
  })
})
