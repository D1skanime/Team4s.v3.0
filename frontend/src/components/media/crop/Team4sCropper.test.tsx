// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('react-easy-crop', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  function MockCropper({
    onCropComplete,
  }: {
    onCropComplete?: (_area: unknown, areaPixels: { x: number; y: number; width: number; height: number }) => void
  }) {
    React.useEffect(() => {
      onCropComplete?.({ x: 10, y: 20, width: 40, height: 60 }, { x: 30, y: 40, width: 120, height: 120 })
      // Keep the mock stable: the real cropper reports changes from user interaction.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <div data-testid="react-easy-crop" />
  }

  return {
    default: MockCropper,
  }
})

vi.mock('lucide-react', () => ({
  X: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
}))

import { Team4sCropper } from './Team4sCropper'

const drawImageMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:crop-source'),
    revokeObjectURL: vi.fn(),
  })

  vi.stubGlobal('Image', class {
    crossOrigin = ''
    naturalWidth = 300
    naturalHeight = 200
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      window.setTimeout(() => this.onload?.(), 0)
    }
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      drawImage: drawImageMock,
      restore: vi.fn(),
    })),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: vi.fn((callback: (blob: Blob | null) => void, mimeType: string) => callback(new Blob(['crop'], { type: mimeType }))),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Team4sCropper', () => {
  it('renders a dialog and cancels on Escape', () => {
    const onCancel = vi.fn()

    render(
      <Team4sCropper
        file={new File(['source'], 'source.png', { type: 'image/png' })}
        title="Logo zuschneiden"
        cropAriaLabel="Logo-Ausschnitt wählen"
        output={{ width: 512, height: 512, mimeType: 'image/png', filename: 'logo.png' }}
        onCancel={onCancel}
        onApply={vi.fn()}
      />,
    )

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Logo zuschneiden' }), { key: 'Escape' })

    expect(screen.getByTestId('react-easy-crop')).not.toBeNull()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('exports the selected pixels as the configured file', async () => {
    const onApply = vi.fn()

    render(
      <Team4sCropper
        file={new File(['source'], 'source.png', { type: 'image/png' })}
        title="Avatar zuschneiden"
        cropAriaLabel="Avatar-Ausschnitt wählen"
        output={{ width: 512, height: 512, mimeType: 'image/png', filename: 'avatar.png' }}
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    const croppedFile = onApply.mock.calls[0][0] as File
    expect(croppedFile).toMatchObject({ name: 'avatar.png', type: 'image/png' })
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 30, 40, 120, 120, 0, 0, 512, 512)
  })
})
