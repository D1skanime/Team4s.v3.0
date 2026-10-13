// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EpisodeVersionMediaFile } from '@/types/episodeVersion'

import { ReleaseEditorFilesTab } from './ReleaseEditorFilesTab'
import type { useReleaseEditorData } from './useReleaseEditorData'

type Editor = ReturnType<typeof useReleaseEditorData>

function buildFile(overrides: Partial<EpisodeVersionMediaFile> = {}): EpisodeVersionMediaFile {
  return {
    file_name: 'episode-05.mkv',
    path: '/anime/episode-05.mkv',
    media_item_id: 'item-5',
    video_quality: '1080p',
    file_size_bytes: 1024,
    last_modified: '2026-10-01T00:00:00Z',
    detected_episode_number: 5,
    ...overrides,
  }
}

function buildEditor(overrides: Partial<Editor> = {}): Editor {
  const base: Partial<Editor> = {
    formState: {
      title: '',
      mediaProvider: '',
      mediaItemID: '',
      videoQuality: '',
      subtitleType: '',
      productionStartedOn: '',
      releaseDate: '',
      crc32: '',
      streamURL: '',
      durationSeconds: '',
    },
    setFormState: vi.fn(),
    selectedFile: null,
    availableFiles: [],
    showFilePanel: false,
    setShowFilePanel: vi.fn(),
    advancedMode: false,
    setAdvancedMode: vi.fn(),
    isScanning: false,
    handleScanFolder: vi.fn(),
    applyFile: vi.fn(),
  }
  return { ...base, ...overrides } as Editor
}

afterEach(cleanup)

describe('ReleaseEditorFilesTab', () => {
  it('calls handleScanFolder on click and shows the scanning state', () => {
    const handleScanFolder = vi.fn()
    const { rerender } = render(
      <ReleaseEditorFilesTab editor={buildEditor({ handleScanFolder })} />,
    )
    fireEvent.click(screen.getByText('Ordner synchronisieren'))
    expect(handleScanFolder).toHaveBeenCalledTimes(1)

    rerender(<ReleaseEditorFilesTab editor={buildEditor({ isScanning: true })} />)
    const scanningButton = screen.getByText('Ordner wird gelesen...').closest('button')!
    expect(scanningButton.disabled).toBe(true)
  })

  it('calls applyFile with the exact clicked file object', () => {
    const applyFile = vi.fn()
    const file = buildFile()
    render(
      <ReleaseEditorFilesTab
        editor={buildEditor({ showFilePanel: true, availableFiles: [file], applyFile })}
      />,
    )
    fireEvent.click(screen.getByText(file.file_name))
    expect(applyFile).toHaveBeenCalledWith(file)
  })

  it('calls setAdvancedMode(true) when the Advanced-Mode details is opened', () => {
    const setAdvancedMode = vi.fn()
    render(<ReleaseEditorFilesTab editor={buildEditor({ setAdvancedMode })} />)
    const details = screen.getByText('Advanced Mode: manuelle Media-Override').closest('details')!
    Object.defineProperty(details, 'open', { value: true, writable: true })
    fireEvent(details, new Event('toggle'))
    expect(setAdvancedMode).toHaveBeenCalledWith(true)
  })
})
