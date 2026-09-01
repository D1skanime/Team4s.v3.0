// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getAnimeFansubProjectTimelineMock = vi.fn()
const getEpisodeVersionEditorContextMock = vi.fn()
const getMyProjectDetailMock = vi.fn()
const getOwnProfileMock = vi.fn()
const getReleaseVersionCapabilitiesMock = vi.fn()
const updateEpisodeVersionMock = vi.fn()
const segmenteTabMock = vi.fn()
const searchParamsMock = vi.hoisted(() => vi.fn())
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => ({ versionId: '42' }),
  useSearchParams: () => searchParamsMock(),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getAnimeFansubProjectTimeline: (...args: unknown[]) => getAnimeFansubProjectTimelineMock(...args),
  getEpisodeVersionEditorContext: (...args: unknown[]) => getEpisodeVersionEditorContextMock(...args),
  getMyProjectDetail: (...args: unknown[]) => getMyProjectDetailMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getReleaseVersionCapabilities: (...args: unknown[]) => getReleaseVersionCapabilitiesMock(...args),
  updateEpisodeVersion: (...args: unknown[]) => updateEpisodeVersionMock(...args),
  getAuthSessionSnapshot: () => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: 'Mika',
  }),
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
}))

vi.mock('@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection', () => ({
  ReleaseVersionMediaSection: ({ versionId }: { versionId: number }) => (
    <div data-testid="media-section">Media {versionId}</div>
  ),
}))

vi.mock('@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab', () => ({
  ReleaseVersionNotesTab: ({
    versionId,
    memberIdFilter,
  }: {
    versionId: number
    memberIdFilter?: number | null
  }) => (
    <div data-testid="notes-tab">
      Notes {versionId} member {memberIdFilter}
    </div>
  ),
}))

vi.mock('@/app/admin/episode-versions/[versionId]/edit/SegmenteTab', () => ({
  SegmenteTab: (props: Record<string, unknown>) => {
    segmenteTabMock(props)
    return <div data-testid="segments-tab">Segmente</div>
  },
}))

import MeReleaseWorkspacePage from './page'

function mockWorkspaceData(capabilityOverrides: Partial<{
  can_view_media: boolean
  can_upload_media: boolean
  can_update_media: boolean
  can_delete_media: boolean
  can_edit_notes: boolean
  can_manage_segments: boolean
  can_edit_metadata: boolean
}> = {}) {
  getEpisodeVersionEditorContextMock.mockResolvedValue({
    data: {
      anime_title: 'Naruto',
      anime_folder_path: null,
      selected_groups: [{ id: 1, name: 'Team 4S', slug: 'team-4s', logo_url: null }],
      version: {
        id: 42,
        anime_id: 10,
        episode_number: 1,
        title: 'Der Anfang',
        release_version: 'v1',
        media_provider: '',
        media_item_id: '',
        created_at: '2026-06-11T00:00:00Z',
        updated_at: '2026-06-11T00:00:00Z',
      },
    },
  })
  getReleaseVersionCapabilitiesMock.mockResolvedValue({
    data: {
      can_view_media: true,
      can_upload_media: true,
      can_update_media: true,
      can_delete_media: false,
      can_edit_notes: true,
      can_manage_segments: false,
      ...capabilityOverrides,
    },
  })
  getOwnProfileMock.mockResolvedValue({
    data: { member_id: 77 },
  })
  getAnimeFansubProjectTimelineMock.mockResolvedValue({
    animeId: 10,
    fansubGroupId: 1,
    productionStartedOn: '2026-01-01',
    productionCompletedOn: '2026-12-31',
  })
  getMyProjectDetailMock.mockResolvedValue({
    data: {
      anime_id: 10,
      anime_title: 'Naruto',
      fansub_group_id: 1,
      fansub_group_name: 'Team 4S',
      backdrop_url: null,
      role_codes: ['translator'],
      role_labels: ['Übersetzung'],
      release_versions: [
        {
          release_version_id: 41,
          episode_number: '0',
          episode_title: 'Prolog',
          episode_sort_index: 0,
          version: 'v1',
          title: null,
          role_codes: ['translator'],
          role_labels: ['Übersetzung'],
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
        },
        {
          release_version_id: 42,
          episode_number: '1',
          episode_title: 'Der Anfang',
          episode_sort_index: 1,
          version: 'v1',
          title: null,
          role_codes: ['translator'],
          role_labels: ['Übersetzung'],
          has_own_contribution: true,
          has_own_notes: true,
          has_own_media: true,
        },
        {
          release_version_id: 43,
          episode_number: '2',
          episode_title: 'Die Prüfung',
          episode_sort_index: 2,
          version: 'v1',
          title: null,
          role_codes: ['translator'],
          role_labels: ['Übersetzung'],
          has_own_contribution: true,
          has_own_notes: false,
          has_own_media: false,
        },
      ],
    },
  })
}

beforeEach(() => {
  searchParamsMock.mockReturnValue(new URLSearchParams('return_to=/me/projects/10/group/1'))
  useAuthSessionMock.mockReturnValue({
    hasAccessToken: false,
    hasRefreshToken: true,
    isClientInitialized: true,
  })
  mockWorkspaceData()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MeReleaseWorkspacePage', () => {
  it('loads the member workspace through the refresh-session gate', async () => {
    render(<MeReleaseWorkspacePage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto' })).toBeTruthy())
    expect(getEpisodeVersionEditorContextMock).toHaveBeenCalledWith(42)
    expect(screen.getByText('Der Anfang · Team 4S · v1')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zurück zum Projekt' }).getAttribute('href')).toBe('/me/projects/10/group/1')
    expect(screen.getByTestId('media-section').textContent).toContain('Media 42')
  })

  it('opens segments directly from a release-specific dashboard link', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('tab=segments&return_to=/me/projects/10/group/1'))
    mockWorkspaceData({ can_manage_segments: true })

    render(<MeReleaseWorkspacePage />)

    expect(await screen.findByRole('tab', { name: 'Segmente', selected: true })).toBeTruthy()
    expect(screen.getByTestId('segments-tab')).toBeTruthy()
  })

  it('passes the own member id to the notes tab', async () => {
    render(<MeReleaseWorkspacePage />)

    const notesTab = await screen.findByRole('tab', { name: 'Notizen' })
    fireEvent.click(notesTab)

    expect(screen.getByTestId('notes-tab').textContent).toContain('Notes 42 member 77')
  })

  it('shows editable release basis data only with the metadata capability', async () => {
    mockWorkspaceData({ can_edit_metadata: true })
    updateEpisodeVersionMock.mockResolvedValue({
      data: {
        ...(await getEpisodeVersionEditorContextMock()).data.version,
        title: 'Mein Release',
      },
    })

    render(<MeReleaseWorkspacePage />)

    expect(await screen.findByRole('tab', { name: 'Basisdaten', selected: true })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Release-Name'), { target: { value: 'Mein Release' } })
    fireEvent.click(screen.getByRole('button', { name: 'Basisdaten speichern' }))

    await waitFor(() => expect(updateEpisodeVersionMock).toHaveBeenCalledWith(42, expect.objectContaining({ title: 'Mein Release' })))
    expect(await screen.findByText('Basisdaten gespeichert.')).toBeTruthy()
  })

  it('hides basis data without the metadata capability', async () => {
    render(<MeReleaseWorkspacePage />)

    await screen.findByRole('heading', { name: 'Naruto' })
    expect(screen.queryByRole('tab', { name: 'Basisdaten' })).toBeNull()
  })

  it('hides the project return action when the workspace was opened without a project return path', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams())

    render(<MeReleaseWorkspacePage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto' })).toBeTruthy())
    expect(screen.queryByRole('link', { name: 'Zurück zum Projekt' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Naruto' })).toBeNull()
  })

  it('renders the existing segment editor with the canonical release context when permitted', async () => {
    mockWorkspaceData({ can_manage_segments: true })

    render(<MeReleaseWorkspacePage />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Segmente' }))
    expect(screen.getByTestId('segments-tab')).toBeTruthy()
    expect(segmenteTabMock).toHaveBeenCalledWith({
      animeId: 10,
      groupId: 1,
      version: 'v1',
      episodeNumber: 1,
      durationSeconds: undefined,
      releaseVariantId: 42,
    })
  })

  it('never mounts segment controls without can_manage_segments', async () => {
    render(<MeReleaseWorkspacePage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Naruto' })).toBeTruthy())
    expect(screen.queryByRole('tab', { name: 'Segmente' })).toBeNull()
    expect(segmenteTabMock).not.toHaveBeenCalled()
  })

  it('allows segment-only workspace access and selects segments by default', async () => {
    mockWorkspaceData({
      can_view_media: false,
      can_upload_media: false,
      can_update_media: false,
      can_delete_media: false,
      can_edit_notes: false,
      can_manage_segments: true,
    })

    render(<MeReleaseWorkspacePage />)

    expect(await screen.findByRole('tab', { name: 'Segmente', selected: true })).toBeTruthy()
    expect(screen.getByTestId('segments-tab')).toBeTruthy()
    expect(screen.queryByText('Kein Zugriff auf diesen Projektbereich')).toBeNull()
  })

  it('shows project-scoped previous and next releases in stable project order', async () => {
    render(<MeReleaseWorkspacePage />)

    const previous = await screen.findByRole('link', { name: 'Vorheriger Release: Prolog' })
    const next = screen.getByRole('link', { name: 'Nächster Release: Die Prüfung' })

    expect(getMyProjectDetailMock).toHaveBeenCalledWith(10, 1)
    expect(previous.getAttribute('href')).toBe(
      '/me/releases/41/workspace?return_to=%2Fme%2Fprojects%2F10%2Fgroup%2F1',
    )
    expect(next.getAttribute('href')).toBe(
      '/me/releases/43/workspace?return_to=%2Fme%2Fprojects%2F10%2Fgroup%2F1',
    )
  })

  it('shows only the available neighbor at a project endpoint', async () => {
    getEpisodeVersionEditorContextMock.mockResolvedValue({
      ...(await getEpisodeVersionEditorContextMock()),
      data: {
        ...(await getEpisodeVersionEditorContextMock()).data,
        version: {
          ...(await getEpisodeVersionEditorContextMock()).data.version,
          id: 41,
        },
      },
    })

    render(<MeReleaseWorkspacePage />)

    expect(await screen.findByRole('link', { name: 'Nächster Release: Der Anfang' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Vorheriger Release:/ })).toBeNull()
  })

  it('renders no cross-project neighbors when the current release is absent', async () => {
    getMyProjectDetailMock.mockResolvedValue({
      data: {
        ...(await getMyProjectDetailMock()).data,
        release_versions: [],
      },
    })

    render(<MeReleaseWorkspacePage />)

    await waitFor(() => expect(getMyProjectDetailMock).toHaveBeenCalledWith(10, 1))
    expect(screen.queryByRole('navigation', { name: 'Vorheriger und nächster Release' })).toBeNull()
  })

  it('keeps workspace tools usable when adjacent navigation fails', async () => {
    getMyProjectDetailMock.mockRejectedValue(new Error('Projektliste nicht erreichbar'))

    render(<MeReleaseWorkspacePage />)

    expect(await screen.findByText('Release-Navigation konnte nicht geladen werden.')).toBeTruthy()
    expect(screen.getByTestId('media-section')).toBeTruthy()
  })
})
