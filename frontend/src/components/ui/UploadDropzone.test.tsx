// @vitest-environment jsdom

import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  UploadDropzone,
  resolveUploadSlotPresentation,
  sliceToSingleFileIfNeeded,
  type UploadDropzoneHandle,
} from './UploadDropzone'

const PROMPT = 'Dateien hier hineinziehen oder zum Auswählen klicken.'

afterEach(() => {
  cleanup()
})

function makeFile(name = 'bild.png'): File {
  return new File(['x'], name, { type: 'image/png' })
}

describe('sliceToSingleFileIfNeeded', () => {
  it('keeps only the first file and flags droppedExtra when multiple is false and two files arrive', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    expect(sliceToSingleFileIfNeeded([fileA, fileB], false)).toEqual({
      selected: [fileA],
      droppedExtra: true,
    })
  })

  it('keeps all files and never flags droppedExtra when multiple is true', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    expect(sliceToSingleFileIfNeeded([fileA, fileB], true)).toEqual({
      selected: [fileA, fileB],
      droppedExtra: false,
    })
  })

  it('never flags droppedExtra for a single file regardless of multiple', () => {
    const fileA = makeFile('a.png')
    expect(sliceToSingleFileIfNeeded([fileA], false)).toEqual({ selected: [fileA], droppedExtra: false })
  })
})

describe('resolveUploadSlotPresentation', () => {
  it('shows the full empty-state dropzone when the slot has no existing value', () => {
    expect(resolveUploadSlotPresentation(false)).toBe('empty-dropzone')
  })

  it('shows the preview-as-drop-target overlay once the slot already has a value', () => {
    expect(resolveUploadSlotPresentation(true)).toBe('replace-overlay')
  })
})

describe('UploadDropzone', () => {
  it('opens the native file picker when clicked', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} />)
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')

    fireEvent.click(screen.getByRole('button', { name: PROMPT }))

    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('opens the native file picker on Enter and on Space', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} />)
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const dropzone = screen.getByRole('button', { name: PROMPT })

    fireEvent.keyDown(dropzone, { key: 'Enter' })
    fireEvent.keyDown(dropzone, { key: ' ' })

    expect(clickSpy).toHaveBeenCalledTimes(2)
    clickSpy.mockRestore()
  })

  it('calls onFilesSelected with the dropped files (drag&drop is always active per D-17)', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} />)
    const file = makeFile('drop.png')

    fireEvent.drop(screen.getByRole('button', { name: PROMPT }), {
      dataTransfer: { files: [file] },
    })

    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })

  it('forwards only the first file and renders the locked warning when multiple is false and two files are dropped', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} multiple={false} />)
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')

    fireEvent.drop(screen.getByRole('button', { name: PROMPT }), {
      dataTransfer: { files: [fileA, fileB] },
    })

    expect(onFilesSelected).toHaveBeenCalledWith([fileA])
    expect(screen.getByText(/Nur die erste Datei wurde übernommen/)).not.toBeNull()
  })

  it('renders disabled state and ignores click, drop, and keyboard', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} disabled />)
    const dropzone = screen.getByRole('button', { name: PROMPT })

    expect(dropzone.getAttribute('tabindex')).toBe('-1')
    expect(dropzone.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(dropzone)
    fireEvent.keyDown(dropzone, { key: 'Enter' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile('x.png')] } })

    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('exposes an imperative open() handle so an external button can trigger the same file picker', () => {
    const ref = createRef<UploadDropzoneHandle>()
    render(<UploadDropzone ref={ref} onFilesSelected={vi.fn()} />)
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    ref.current?.open()

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('does not open the file picker via the imperative handle while disabled', () => {
    const ref = createRef<UploadDropzoneHandle>()
    render(<UploadDropzone ref={ref} onFilesSelected={vi.fn()} disabled />)
    const input = screen.getByLabelText('Dateien') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    ref.current?.open()

    expect(clickSpy).not.toHaveBeenCalled()
  })

  describe('preview-as-drop-target mode (children)', () => {
    it('renders the children instead of the default icon/prompt/button chrome', () => {
      render(
        <UploadDropzone onFilesSelected={vi.fn()} promptLabel="Banner ersetzen">
          <img alt="Aktuelles Banner" src="blob:fake" />
        </UploadDropzone>,
      )

      expect(screen.getByAltText('Aktuelles Banner')).not.toBeNull()
      expect(screen.queryByRole('button', { name: 'Dateien auswählen' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Banner ersetzen' })).not.toBeNull()
    })

    it('accepts a dropped replacement file the same way as the default chrome', () => {
      const onFilesSelected = vi.fn()
      render(
        <UploadDropzone onFilesSelected={onFilesSelected} multiple={false} promptLabel="Banner ersetzen">
          <img alt="Aktuelles Banner" src="blob:fake" />
        </UploadDropzone>,
      )
      const file = makeFile('neues-banner.png')

      fireEvent.drop(screen.getByRole('button', { name: 'Banner ersetzen' }), {
        dataTransfer: { files: [file] },
      })

      expect(onFilesSelected).toHaveBeenCalledWith([file])
    })

    it('shows the overlay hint only while a file is dragged over, not before or after', () => {
      render(
        <UploadDropzone onFilesSelected={vi.fn()} promptLabel="Banner ersetzen" overlayHintLabel="Zum Ersetzen loslassen">
          <img alt="Aktuelles Banner" src="blob:fake" />
        </UploadDropzone>,
      )
      const dropzone = screen.getByRole('button', { name: 'Banner ersetzen' })

      expect(screen.queryByText('Zum Ersetzen loslassen')).toBeNull()

      fireEvent.dragEnter(dropzone, { dataTransfer: { files: [] } })
      expect(screen.getByText('Zum Ersetzen loslassen')).not.toBeNull()

      fireEvent.dragLeave(dropzone)
      expect(screen.queryByText('Zum Ersetzen loslassen')).toBeNull()
    })

    it('still opens the file picker via the imperative handle when wrapping a preview', () => {
      const ref = createRef<UploadDropzoneHandle>()
      render(
        <UploadDropzone ref={ref} onFilesSelected={vi.fn()} promptLabel="Banner ersetzen">
          <img alt="Aktuelles Banner" src="blob:fake" />
        </UploadDropzone>,
      )
      const input = screen.getByLabelText('Dateien') as HTMLInputElement
      const clickSpy = vi.spyOn(input, 'click')

      ref.current?.open()

      expect(clickSpy).toHaveBeenCalledTimes(1)
    })
  })
})
