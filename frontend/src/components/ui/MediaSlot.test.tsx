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

  it('renders actions as their own row below the slot, never overlapping the preview', () => {
    const onFilesSelected = vi.fn()
    render(
      <MediaSlot
        aspectRatio={1}
        shape="round"
        label="Logo"
        hasValue
        onFilesSelected={onFilesSelected}
        previewContent={<img alt="Logo Vorschau" src="x" />}
        actions={<button type="button">Löschen</button>}
      />,
    )
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    const deleteButton = screen.getByRole('button', { name: 'Löschen' })
    const slot = screen.getByRole('button', { name: 'Logo ersetzen' })

    expect(slot.contains(deleteButton)).toBe(false)
    fireEvent.click(deleteButton)

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

  it('renders a plain, non-interactive preview with no dropzone when onFilesSelected is omitted', () => {
    render(
      <MediaSlot
        aspectRatio={16 / 9}
        label="Background 1"
        hasValue
        previewContent={<img alt="Background Vorschau" src="x" />}
        actions={<button type="button">Entfernen</button>}
      />,
    )

    expect(screen.getByAltText('Background Vorschau')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /ersetzen/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /hochladen/i })).toBeNull()
    expect(screen.queryByLabelText('Dateien')).toBeNull()
    expect(screen.getByRole('button', { name: 'Entfernen' })).not.toBeNull()
  })

  it('exposes a safe, always-defined open() handle in static mode instead of leaving ref.current unset', () => {
    const ref = createRef<UploadDropzoneHandle>()
    render(
      <MediaSlot
        ref={ref}
        aspectRatio={16 / 9}
        label="Background 1"
        hasValue
        previewContent={<img alt="Background Vorschau" src="x" />}
      />,
    )

    expect(ref.current).not.toBeNull()
    expect(() => ref.current?.open()).not.toThrow()
  })

  it('shows staticEmptyContent instead of a dropzone when empty and onFilesSelected is omitted', () => {
    render(
      <MediaSlot
        aspectRatio={16 / 9}
        label="Background"
        hasValue={false}
        staticEmptyContent={<span>Kein Hintergrund</span>}
      />,
    )

    expect(screen.getByText('Kein Hintergrund')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
