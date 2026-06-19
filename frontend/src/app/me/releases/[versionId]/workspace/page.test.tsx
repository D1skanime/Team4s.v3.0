// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getEpisodeVersionEditorContextMock = vi.fn()
const getOwnProfileMock = vi.fn()
const getReleaseVersionCapabilitiesMock = vi.fn()
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => ({ versionId: '42' }),
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
  getEpisodeVersionEditorContext: (...args: unknown[]) => getEpisodeVersionEditorContextMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  getReleaseVersionCapabilities: (...args: unknown[]) => getReleaseVersionCapabilitiesMock(...args),
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

import { MeReleaseWorkspacePage } from './page'

function mockWorkspaceData(capabilityOverrides: Partial<{
  can_view_media: boolean
  can_upload_media: boolean
  can_update_media: boolean
  can_delete_media: boolean
  can_edit_notes: boolean
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
      ...capabilityOverrides,
    },
  })
  getOwnProfileMock.mockResolvedValue({
    data: { member_id: 77 },
  })
}

beforeEach(() => {
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
    expect(screen.getByText('Episode 01 · Team 4S · v1')).toBeTruthy()
    expect(screen.getByTestId('media-section').textContent).toContain('Media 42')
  })

  it('passes the own member id to the notes tab', async () => {
    render(<MeReleaseWorkspacePage />)

    const notesTab = await screen.findByRole('tab', { name: 'Notizen' })
    fireEvent.click(notesTab)

    expect(screen.getByTestId('notes-tab').textContent).toContain('Notes 42 member 77')
  })
})
