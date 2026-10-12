// @vitest-environment jsdom

import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MediaSlot } from './MediaSlot'
import type { UploadDropzoneHandle } from './UploadDropzone'

afterEach(() => {
  cleanup()
})

describe('MediaSlot', () => {
  it('shows the empty-state dropzone chrome (no preview) when hasValue is false', () => {
    render(<MediaSlot aspectRatio={1} label="Logo" hasValue={false} onFilesSelected={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Logo hierher ziehen oder klicken zum Hochladen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Dateien auswählen' })).not.toBeNull()
  })

  it('shows only the preview as the drop target when hasValue is true -- no second dropzone chrome', () => {
    render(
      <MediaSlot aspectRatio={1} label="Logo" hasValue onFilesSelected={vi.fn()} previewContent={<img alt="Logo Vorschau" src="x" />} />,
    )

    expect(screen.getByAltText('Logo Vorschau')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Logo hierher ziehen oder klicken zum Hochladen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dateien auswählen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Logo ersetzen' })).not.toBeNull()
  })

  it('accepts a dropped replacement file on the preview itself', () => {
    const onFilesSelected = vi.fn()
    render(
      <MediaSlot aspectRatio={1} label="Logo" hasValue onFilesSelected={onFilesSelected} previewContent={<img alt="Logo Vorschau" src="x" />} />,
    )
    const file = new File(['x'], 'neu.png', { type: 'image/png' })

    fireEvent.drop(screen.getByRole('button', { name: 'Logo ersetzen' }), { dataTransfer: { files: [file] } })

    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })

  it('shows the overlay hint only while dragging over an existing preview', () => {
    render(
      <MediaSlot
        aspectRatio={1}
        label="Logo"
        hasValue
        onFilesSelected={vi.fn()}
        previewContent={<img alt="Logo Vorschau" src="x" />}
        replaceOverlayHintLabel="Zum Ersetzen loslassen"
      />,
    )
    const slot = screen.getByRole('button', { name: 'Logo ersetzen' })

    expect(screen.queryByText('Zum Ersetzen loslassen')).toBeNull()
    fireEvent.dragEnter(slot, { dataTransfer: { files: [] } })
    expect(screen.getByText('Zum Ersetzen loslassen')).not.toBeNull()
  })

  it('exposes the imperative open() handle regardless of hasValue', () => {
    const ref = createRef<UploadDropzoneHandle>()
    render(<MediaSlot ref={ref} aspectRatio={1} label="Banner" hasValue={false} onFilesSelected={vi.fn()} />)
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    ref.current?.open()

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('stops a click inside cornerActions from also opening the file picker', () => {
    const onFilesSelected = vi.fn()
    render(
      <MediaSlot
        aspectRatio={1}
        label="Banner"
        hasValue
        onFilesSelected={onFilesSelected}
        previewContent={<img alt="Banner Vorschau" src="x" />}
        cornerActions={<button type="button">Löschen</button>}
      />,
    )
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('renders a corner badge alongside the slot without blocking the drop target', () => {
    const onFilesSelected = vi.fn()
    render(
      <MediaSlot
        aspectRatio={1}
        label="Cover"
        hasValue
        onFilesSelected={onFilesSelected}
        previewContent={<img alt="Cover Vorschau" src="x" />}
        cornerBadge={<span>Jellyfin</span>}
      />,
    )

    expect(screen.getByText('Jellyfin')).not.toBeNull()
    const file = new File(['x'], 'neu.png', { type: 'image/png' })
    fireEvent.drop(screen.getByRole('button', { name: 'Cover ersetzen' }), { dataTransfer: { files: [file] } })
    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })
})
