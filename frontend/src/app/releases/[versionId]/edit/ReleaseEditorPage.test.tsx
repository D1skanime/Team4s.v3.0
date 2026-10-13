// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getEpisodeVersionEditorContextMock = vi.fn()
const getFansubListMock = vi.fn()
const scanEpisodeVersionFolderMock = vi.fn()
const updateEpisodeVersionMock = vi.fn()
const deleteEpisodeVersionMock = vi.fn()
const getCurrentUserMock = vi.fn()
const getOwnProfileMock = vi.fn()
const getReleaseVersionCapabilitiesMock = vi.fn()
const getAnimeFansubProjectTimelineMock = vi.fn()
const getMyProjectDetailMock = vi.fn()
const getGroupedEpisodesMock = vi.fn()

const routeMock = vi.hoisted(() => ({ versionId: '42' }))
const searchParamsMock = vi.hoisted(() => vi.fn())
const routerReplaceMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => routeMock,
  useSearchParams: () => searchParamsMock(),
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
  usePathname: () => '/releases/42/edit',
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({ hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getEpisodeVersionEditorContext: (...args: unknown[]) => getEpisodeVersionEditorContextMock(...args),
  getFansubList: (...args: unknown[]) => getFansubListMock(...args),
  scanEpisodeVersionFolder: (...args: unknown[]) => scanEpisodeVersionFolderMock(...args),
  updateEpisodeVersion: (...args: unknown[]) => updateEpisodeVersionMock(...args),
  deleteEpisodeVersion: (...args: unknown[]) => deleteEpisodeVersionMock(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getReleaseVersionCapabilities: (...args: unknown[]) => getReleaseVersionCapabilitiesMock(...args),
  getAnimeFansubProjectTimeline: (...args: unknown[]) => getAnimeFansubProjectTimelineMock(...args),
  getMyProjectDetail: (...args: unknown[]) => getMyProjectDetailMock(...args),
  getGroupedEpisodes: (...args: unknown[]) => getGroupedEpisodesMock(...args),
}))

// Bereits eigenstaendig getestete, geteilte Tab-Inhalte (Plan 03/04/06) werden an dieser
// Kompositions-Nahtstelle gefaked -- die 5 Verhaltens-Faelle dieses Tests pruefen die
// Tab-Sichtbarkeits-Matrix (D-02) und die Navigationskontext-Auswahl (D-03), nicht die internen
// Inhalte dieser bereits anderswo verifizierten Komponenten.
vi.mock('@/components/releaseEditor/ReleaseVersionMediaSection', () => ({
  ReleaseVersionMediaSection: () => <div data-testid="media-tab-content" />,
}))
vi.mock('@/components/releaseEditor/ReleaseVersionNotesTab', () => ({
  ReleaseVersionNotesTab: () => <div data-testid="notes-tab-content" />,
}))
vi.mock('@/components/releaseEditor/SegmenteTab', () => ({
  SegmenteTab: () => <div data-testid="segments-tab-content" />,
}))
vi.mock('./ReleaseEditorMetadataTab', () => ({
  ReleaseEditorMetadataTab: () => <div data-testid="metadata-tab-content" />,
}))
vi.mock('./ReleaseEditorFilesTab', () => ({
  ReleaseEditorFilesTab: () => <div data-testid="files-tab-content" />,
}))

import { ReleaseEditorPage } from './ReleaseEditorPage'

function buildContext() {
  return {
    data: {
      anime_title: 'Naruto',
      date_neighbors: [],
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
  }
}

function mockCapabilities(overrides: Partial<{
  can_view_media: boolean
  can_upload_media: boolean
  can_update_media: boolean
  can_delete_media: boolean
  can_edit_notes: boolean
  can_manage_segments: boolean
  can_edit_metadata: boolean
}> = {}) {
  getReleaseVersionCapabilitiesMock.mockResolvedValue({
    data: {
      can_view_media: false,
      can_upload_media: false,
      can_update_media: false,
      can_delete_media: false,
      can_edit_notes: false,
      can_manage_segments: false,
      can_edit_metadata: false,
      ...overrides,
    },
  })
}

beforeEach(() => {
  routeMock.versionId = '42'
  searchParamsMock.mockReturnValue(new URLSearchParams())
  getEpisodeVersionEditorContextMock.mockResolvedValue(buildContext())
  getFansubListMock.mockResolvedValue({ data: [] })
  getOwnProfileMock.mockResolvedValue({ data: { member_id: 7 } })
  getCurrentUserMock.mockResolvedValue({ data: { is_platform_admin: false } })
  mockCapabilities()
  getAnimeFansubProjectTimelineMock.mockResolvedValue(null)
  getMyProjectDetailMock.mockResolvedValue({
    data: {
      anime_id: 10,
      anime_title: 'Naruto',
      fansub_group_id: 1,
      fansub_group_name: 'Team 4S',
      backdrop_url: null,
      role_codes: [],
      role_labels: [],
      release_versions: [],
    },
  })
  getGroupedEpisodesMock.mockResolvedValue({ data: { anime_id: 10, episodes: [] } })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReleaseEditorPage Tab-Sichtbarkeit (D-02)', () => {
  it('zeigt fuer Plattform-Admins alle 6 Tabs in der kanonischen Reihenfolge', async () => {
    getCurrentUserMock.mockResolvedValue({ data: { is_platform_admin: true } })

    render(<ReleaseEditorPage />)

    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(6))
    const labels = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(labels).toEqual(['Basisdaten', 'Dateien', 'Segmente', 'Bilder & Medien', 'Änderungsverlauf', 'Notizen'])
  })

  it('zeigt fuer Nicht-Admins ausschliesslich den Medien-Tab gemaess Capability-Matrix', async () => {
    mockCapabilities({ can_view_media: true })

    render(<ReleaseEditorPage />)

    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(1))
    expect(screen.getByRole('tab', { name: 'Bilder & Medien' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Dateien' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Änderungsverlauf' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Basisdaten' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Segmente' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Notizen' })).toBeNull()
  })
})

describe('ReleaseEditorPage Navigationskontext-Auswahl (D-03)', () => {
  it('waehlt bei return_to=/me/projects/5/group/3 den Projekt-Kontext (getMyProjectDetail, nie getGroupedEpisodes)', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('return_to=/me/projects/5/group/3'))

    render(<ReleaseEditorPage />)

    await waitFor(() => expect(getMyProjectDetailMock).toHaveBeenCalled())
    expect(getGroupedEpisodesMock).not.toHaveBeenCalled()
  })

  it('waehlt bei return_to=/admin/fansubs/5/edit den Episoden-Kontext (getGroupedEpisodes, nie getMyProjectDetail)', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('return_to=/admin/fansubs/5/edit'))

    render(<ReleaseEditorPage />)

    await waitFor(() => expect(getGroupedEpisodesMock).toHaveBeenCalled())
    expect(getMyProjectDetailMock).not.toHaveBeenCalled()
  })
})

describe('ReleaseEditorPage D-05 Fehlerbanner-Bypass fuer Plattform-Admins', () => {
  it('zeigt den "Member-Profil fehlt"-Banner nicht fuer einen Plattform-Admin ohne Member-Profil', async () => {
    getCurrentUserMock.mockResolvedValue({ data: { is_platform_admin: true } })
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 0 } })
    mockCapabilities({ can_edit_notes: true })

    render(<ReleaseEditorPage />)

    expect(await screen.findByRole('tab', { name: 'Notizen' })).toBeTruthy()
    expect(screen.queryByText('Member-Profil fehlt')).toBeNull()
  })
})

describe('ReleaseEditorPage D-05 Graceful-Leerzustand', () => {
  it('rendert bei fehlender Projekt-Navigationsuebereinstimmung weder eine Navigationsleiste noch einen Fehlerbanner', async () => {
    mockCapabilities({ can_view_media: true })
    searchParamsMock.mockReturnValue(new URLSearchParams('return_to=/me/projects/5/group/3'))
    getMyProjectDetailMock.mockResolvedValue({
      data: {
        anime_id: 10,
        anime_title: 'Naruto',
        fansub_group_id: 1,
        fansub_group_name: 'Team 4S',
        backdrop_url: null,
        role_codes: [],
        role_labels: [],
        release_versions: [],
      },
    })

    render(<ReleaseEditorPage />)

    expect(await screen.findByRole('tab', { name: 'Bilder & Medien' })).toBeTruthy()
    await waitFor(() => expect(getMyProjectDetailMock).toHaveBeenCalled())
    expect(screen.queryByRole('navigation', { name: 'Vorheriger und nächster Release' })).toBeNull()
    expect(screen.queryByText('Release-Navigation konnte nicht geladen werden.')).toBeNull()
    expect(screen.queryByText('Release-Version nicht verfügbar')).toBeNull()
  })
})
