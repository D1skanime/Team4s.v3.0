// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UploadFileRow, statusBadgeVariant, statusLabel } from './UploadFileRow'

const NativeURL = URL

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, {
    createObjectURL: vi.fn(() => 'blob:test-preview'),
    revokeObjectURL: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeFile(name = 'bild.png'): File {
  return new File(['x'], name, { type: 'image/png' })
}

describe('statusBadgeVariant', () => {
  it('maps uploading and processing to warning', () => {
    expect(statusBadgeVariant('uploading')).toBe('warning')
    expect(statusBadgeVariant('processing')).toBe('warning')
  })

  it('maps ready to success', () => {
    expect(statusBadgeVariant('ready')).toBe('success')
  })

  it('maps failed to danger', () => {
    expect(statusBadgeVariant('failed')).toBe('danger')
  })

  it('maps idle to muted', () => {
    expect(statusBadgeVariant('idle')).toBe('muted')
  })
})

describe('statusLabel', () => {
  it('returns the locked German labels with real umlauts', () => {
    expect(statusLabel('idle')).toBe('Wartet')
    expect(statusLabel('uploading')).toBe('Lädt hoch …')
    expect(statusLabel('processing')).toBe('Wird verarbeitet …')
    expect(statusLabel('ready')).toBe('Hochgeladen')
    expect(statusLabel('failed')).toBe('Fehlgeschlagen')
  })
})

describe('UploadFileRow', () => {
  it('hides Titel/Beschreibung fields when showMetadataFields is false', () => {
    render(<UploadFileRow file={makeFile()} status="idle" showMetadataFields={false} />)

    expect(screen.queryByLabelText('Titel')).toBeNull()
    expect(screen.queryByLabelText('Beschreibung')).toBeNull()
  })

  it('renders Titel/Beschreibung without a required marker when metadata fields are shown and empty', () => {
    render(<UploadFileRow file={makeFile()} status="idle" title="" caption="" onChange={() => {}} />)

    const titleInput = screen.getByLabelText('Titel')
    expect(titleInput.hasAttribute('required')).toBe(false)
    expect(screen.queryByText('*')).toBeNull()
  })

  it('renders a progress element with the given value while uploading', () => {
    render(<UploadFileRow file={makeFile()} status="uploading" progress={42} showMetadataFields={false} />)

    const progressEl = screen.getByRole('progressbar')
    expect(progressEl.getAttribute('value')).toBe('42')
  })

  it('renders no progress and no retry button when ready', () => {
    render(<UploadFileRow file={makeFile()} status="ready" showMetadataFields={false} />)

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull()
  })

  it('calls onRetry exactly once when the retry button is clicked while failed', () => {
    const onRetry = vi.fn()
    render(<UploadFileRow file={makeFile()} status="failed" onRetry={onRetry} showMetadataFields={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove with no intervening confirmation dialog', () => {
    const onRemove = vi.fn()
    render(<UploadFileRow file={makeFile()} status="idle" onRemove={onRemove} showMetadataFields={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aus Auswahl entfernen' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
