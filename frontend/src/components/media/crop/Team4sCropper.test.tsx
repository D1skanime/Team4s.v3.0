// @vitest-environment jsdom

import { useState, type ReactNode } from 'react'
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

  it.each([
    { title: 'Avatar zuschneiden', shape: 'circle' as const, aspectRatio: 1 },
    { title: 'Hintergrundbild zuschneiden', shape: 'rectangle' as const, aspectRatio: 5 },
  ])('exposes $title even when its owning tab is hidden', ({ title, shape, aspectRatio }) => {
    const { unmount } = render(
      <section aria-hidden="true" style={{ opacity: 0, overflow: 'hidden', height: 1, pointerEvents: 'none' }}>
        <Team4sCropper
          file={new File(['source'], 'source.png', { type: 'image/png' })}
          title={title}
          cropAriaLabel="Bildausschnitt wählen"
          shape={shape}
          aspectRatio={aspectRatio}
          output={{ width: 512, height: 512, filename: 'crop.png' }}
          onCancel={vi.fn()}
          onApply={vi.fn()}
        />
      </section>,
    )

    const dialog = screen.getByRole('dialog', { name: title })
    expect(dialog.closest('[aria-hidden="true"]')).toBeNull()
    expect(dialog.closest('section')).toBeNull()
    unmount()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:crop-source')
  })

  it('traps keyboard focus and restores the trigger after cancelling and reopening', async () => {
    const onApply = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Banner ändern</button>
          <section aria-hidden="true">
            {open ? (
              <Team4sCropper
                file={new File(['source'], 'source.png', { type: 'image/png' })}
                title="Hintergrundbild zuschneiden"
                cropAriaLabel="Bildausschnitt wählen"
                output={{ width: 1920, height: 384, filename: 'banner.jpg', mimeType: 'image/jpeg' }}
                onCancel={() => setOpen(false)}
                onApply={onApply}
              />
            ) : null}
          </section>
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Banner ändern' })
    trigger.focus()
    fireEvent.click(trigger)
    const close = screen.getByRole('button', { name: 'Dialog schließen' })
    await waitFor(() => expect(document.activeElement).toBe(close))
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ausschnitt übernehmen' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(close, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dialog schließen' })))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onApply).not.toHaveBeenCalled()
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
