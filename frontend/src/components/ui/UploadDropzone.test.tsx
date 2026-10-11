// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { UploadDropzone, sliceToSingleFileIfNeeded } from './UploadDropzone'

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

  it('calls onFilesSelected with the dropped files when allowDrop is not false', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} />)
    const file = makeFile('drop.png')

    fireEvent.drop(screen.getByRole('button', { name: PROMPT }), {
      dataTransfer: { files: [file] },
    })

    expect(onFilesSelected).toHaveBeenCalledWith([file])
  })

  it('does not call onFilesSelected on drop when allowDrop is false', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} allowDrop={false} />)
    const file = makeFile('drop.png')

    fireEvent.drop(screen.getByRole('button', { name: PROMPT }), {
      dataTransfer: { files: [file] },
    })

    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('never applies the drag-active styling when allowDrop is false', () => {
    const onFilesSelected = vi.fn()
    render(<UploadDropzone onFilesSelected={onFilesSelected} allowDrop={false} />)
    const dropzone = screen.getByRole('button', { name: PROMPT })

    fireEvent.dragEnter(dropzone)
    fireEvent.dragOver(dropzone)

    expect(dropzone.className).not.toMatch(/dropzoneDragging/)
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
})
