// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const api = vi.hoisted(() => ({
  uploadFansubGroupMedia: vi.fn(),
  patchFansubMediaReview: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { GroupMediaReviewUploadPanel } from './GroupMediaReviewUploadPanel'

const NativeURL = URL

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, {
    createObjectURL: vi.fn(() => 'blob:test-preview'),
    revokeObjectURL: vi.fn(),
  }))
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPanel(overrides: Partial<Parameters<typeof GroupMediaReviewUploadPanel>[0]> = {}) {
  const setUploadCategory = vi.fn()
  const onUploadComplete = vi.fn()
  render(
    <GroupMediaReviewUploadPanel
      fansubId={7}
      uploadCategory="gallery"
      setUploadCategory={setUploadCategory}
      onUploadComplete={onUploadComplete}
      {...overrides}
    />,
  )
  return { setUploadCategory, onUploadComplete }
}

describe('GroupMediaReviewUploadPanel', () => {
  it('merges a second file selection into the existing queue instead of replacing it', () => {
    renderPanel()

    const firstBatch = ['eins.png', 'zwei.png'].map((name) => new File(['x'], name, { type: 'image/png' }))
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: firstBatch } })
    expect(screen.getByText('eins.png')).not.toBeNull()
    expect(screen.getByText('zwei.png')).not.toBeNull()

    const secondBatch = [new File(['x'], 'drei.png', { type: 'image/png' })]
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: secondBatch } })

    expect(screen.getByText('eins.png')).not.toBeNull()
    expect(screen.getByText('zwei.png')).not.toBeNull()
    expect(screen.getByText('drei.png')).not.toBeNull()
  })

  it('always sends reviewStatusCode "in_review" on upload, unconditionally', async () => {
    api.uploadFansubGroupMedia.mockResolvedValue({
      results: [{ client_file_name: 'eins.png', status: 'ready', fansub_group_media_id: 101 }],
    })
    renderPanel()

    const file = new File(['x'], 'eins.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    await vi.waitFor(() => {
      expect(api.uploadFansubGroupMedia).toHaveBeenCalledTimes(1)
    })

    const callArgs = api.uploadFansubGroupMedia.mock.calls[0][0]
    expect(callArgs.reviewStatusCode).toBe('in_review')
  })

  it('shows "Erneut versuchen" only for a failed row, not for the ready row, after a mixed upload result', async () => {
    api.uploadFansubGroupMedia.mockResolvedValue({
      results: [
        { client_file_name: 'ok.png', status: 'ready', fansub_group_media_id: 202 },
        { client_file_name: 'bad.png', status: 'failed', message: 'Datei zu groß.' },
      ],
    })
    renderPanel()

    const files = ['ok.png', 'bad.png'].map((name) => new File(['x'], name, { type: 'image/png' }))
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })

    fireEvent.click(screen.getByRole('button', { name: 'Bilder hochladen' }))

    await vi.waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Erneut versuchen' }).length).toBe(1)
    })
  })
})
