// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const api = vi.hoisted(() => ({
  uploadReleaseVersionMedia: vi.fn(),
  patchReleaseVersionMediaItem: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { ReleaseVersionMediaUploadDrawer } from './ReleaseVersionMediaUploadDrawer'

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

function renderDrawer(overrides: Partial<Parameters<typeof ReleaseVersionMediaUploadDrawer>[0]> = {}) {
  const onClose = vi.fn()
  const onUploadComplete = vi.fn()
  render(
    <ReleaseVersionMediaUploadDrawer
      open
      onClose={onClose}
      versionId={42}
      uploadCategory="screenshot"
      canChooseFiles
      canShowPreviewToggle
      onUploadComplete={onUploadComplete}
      {...overrides}
    />,
  )
  return { onClose, onUploadComplete }
}

describe('ReleaseVersionMediaUploadDrawer', () => {
  it('merges a second file selection into the existing queued files instead of replacing them', () => {
    renderDrawer()

    const firstBatch = ['eins.png', 'zwei.png'].map((name) => new File(['x'], name, { type: 'image/png' }))
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: firstBatch } })
    expect(screen.getAllByText(/\.png$/).length).toBeGreaterThanOrEqual(2)

    const secondBatch = [new File(['x'], 'drei.png', { type: 'image/png' })]
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: secondBatch } })

    expect(screen.getByText('eins.png')).not.toBeNull()
    expect(screen.getByText('zwei.png')).not.toBeNull()
    expect(screen.getByText('drei.png')).not.toBeNull()
  })

  it('disables the "Upload starten" button before any file has been selected', () => {
    renderDrawer()

    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', true)
  })
})
