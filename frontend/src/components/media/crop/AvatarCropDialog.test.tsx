// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const cropperPropsMock = vi.hoisted(() => vi.fn())

vi.mock('./Team4sCropper', () => ({
  Team4sCropper: (props: {
    title: string
    cropAriaLabel: string
    output: { filename: string; mimeType?: string }
    file: File
    onApply: (file: File) => void
    onCancel: () => void
  }) => {
    cropperPropsMock(props)
    return (
      <div role="dialog" aria-label={props.title}>
        <span>{props.cropAriaLabel}</span>
        <button type="button" onClick={() => props.onApply(new File(['cropped'], props.output.filename, { type: props.output.mimeType }))}>
          Ausschnitt übernehmen
        </button>
        <button type="button" onClick={props.onCancel}>Abbrechen</button>
      </div>
    )
  },
}))

import { AvatarCropDialog } from './AvatarCropDialog'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AvatarCropDialog', () => {
  it('configures the shared cropper for circular avatar output', () => {
    render(<AvatarCropDialog file={new File(['avatar'], 'avatar.webp', { type: 'image/webp' })} onCancel={vi.fn()} onApply={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Avatar zuschneiden' })).not.toBeNull()
    expect(cropperPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      cropAriaLabel: 'Avatar-Ausschnitt wählen',
      shape: 'circle',
      aspectRatio: 1,
      output: expect.objectContaining({
        filename: 'avatar-avatar.png',
        mimeType: 'image/png',
      }),
    }))
  })

  it('preserves the source file when applying the cropped avatar', () => {
    const sourceFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const onApply = vi.fn()

    render(<AvatarCropDialog file={sourceFile} onCancel={vi.fn()} onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt übernehmen' }))

    expect(onApply).toHaveBeenCalledWith({
      sourceFile,
      croppedFile: expect.any(File),
    })
    expect(onApply.mock.calls[0][0].croppedFile).toMatchObject({
      name: 'avatar-avatar.png',
      type: 'image/png',
    })
  })
})
