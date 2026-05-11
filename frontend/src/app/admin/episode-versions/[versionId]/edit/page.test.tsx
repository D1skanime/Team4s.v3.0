// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const useSearchParamsMock = vi.fn(() => ({
  get: (_key: string) => null as string | null,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

const useEpisodeVersionEditorMock = vi.fn()
const useReleaseVersionMediaMock = vi.fn<() => UseReleaseVersionMediaResult>()

vi.mock('./useEpisodeVersionEditor', () => ({
  useEpisodeVersionEditor: () => useEpisodeVersionEditorMock(),
}))

vi.mock('./useReleaseVersionMedia', () => ({
  useReleaseVersionMedia: () => useReleaseVersionMediaMock(),
}))

import { EpisodeVersionEditorPage } from './EpisodeVersionEditorPage'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeEditorState() {
  return {
    contextData: {
      version: {
        id: 42,
        anime_id: 1,
        episode_number: 1,
        release_version: 'v1',
        duration_seconds: null,
      },
      selected_groups: [{ id: 10, name: 'SubGroup' }],
      anime_title: 'Test Anime',
      anime_folder_path: 'C:/anime/Test Anime',
    },
    formState: {
      title: '',
      mediaProvider: '',
      mediaItemID: '',
      videoQuality: '',
      subtitleType: '',
      releaseDate: '',
      streamURL: '',
      durationSeconds: '',
    },
    setFormState: vi.fn(),
    selectedGroups: [{ id: 10, name: 'SubGroup', slug: 'subgroup', logo_url: null }],
    folderPath: 'C:/anime/Test Anime',
    availableFiles: [],
    selectedFile: null,
    showFilePanel: false,
    setShowFilePanel: vi.fn(),
    advancedMode: false,
    setAdvancedMode: vi.fn(),
    groupQuery: '',
    setGroupQuery: vi.fn(),
    groupResults: [],
    isLoading: false,
    isSaving: false,
    isDeleting: false,
    isScanning: false,
    isSearching: false,
    errorMessage: null,
    successMessage: null,
    searchMessage: null,
    hasUnsavedChanges: false,
    handleScanFolder: vi.fn(),
    applyFile: vi.fn(),
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    handleSave: vi.fn(),
    handleDelete: vi.fn(),
  }
}

function makeMediaState(error: string | null = null): UseReleaseVersionMediaResult {
  return {
    items: [],
    isLoading: false,
    error,
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

describe('EpisodeVersionEditorPage media tab', () => {
  it('renders the Media / Assets tab button', () => {
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState())
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState())

    render(<EpisodeVersionEditorPage />)

    expect(screen.getByRole('button', { name: 'Media / Assets' })).not.toBeNull()
  })

  it('shows the context card with fansub and release version on the media tab', () => {
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState())
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState())

    render(<EpisodeVersionEditorPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Media / Assets' }))

    expect(screen.getByText('SubGroup')).not.toBeNull()
    expect(screen.getByText('v1')).not.toBeNull()
  })

  it('keeps the editor shell visible when the media section reports an API error', () => {
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState())
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState('API Fehler'))

    render(<EpisodeVersionEditorPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Media / Assets' }))

    expect(screen.getByText(/API Fehler/i)).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Informationen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Segmente' })).not.toBeNull()
  })
})
