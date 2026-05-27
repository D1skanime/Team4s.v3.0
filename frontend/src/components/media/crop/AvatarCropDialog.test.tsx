// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        {...props}
        onLoad={(event) => {
          Object.defineProperty(event.currentTarget, 'naturalWidth', { value: 800, configurable: true })
          Object.defineProperty(event.currentTarget, 'naturalHeight', { value: 600, configurable: true })
          onLoad?.(event)
        }}
      />
    )
  },
}))

vi.mock('lucide-react', () => ({
  X: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
}))

import { AvatarCropDialog } from './AvatarCropDialog'

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:avatar-source'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AvatarCropDialog', () => {
  it('renders circular crop controls and closes on Escape', async () => {
    const onCancel = vi.fn()

    render(<AvatarCropDialog file={new File(['avatar'], 'avatar.png', { type: 'image/png' })} onCancel={onCancel} onApply={vi.fn()} />)

    const viewport = await screen.findByLabelText('Avatar-Ausschnitt wählen')
    fireEvent.load(screen.getByAltText('Avatar Zuschnitt'))
    expect(screen.getByRole('dialog', { name: 'Avatar zuschneiden' })).not.toBeNull()
    expect(screen.getByLabelText('Runde Avatar-Vorschau')).not.toBeNull()

    fireEvent.keyDown(viewport, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('supports pointer drag and keyboard crop movement without leaving the dialog', async () => {
    const onCancel = vi.fn()

    render(<AvatarCropDialog file={new File(['avatar'], 'avatar.png', { type: 'image/png' })} onCancel={onCancel} onApply={vi.fn()} />)

    const viewport = await screen.findByLabelText('Avatar-Ausschnitt wählen')
    fireEvent.load(screen.getByAltText('Avatar Zuschnitt'))

    Object.defineProperty(viewport, 'setPointerCapture', { value: vi.fn(), configurable: true })
    Object.defineProperty(viewport, 'releasePointerCapture', { value: vi.fn(), configurable: true })

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 30, clientY: 24 })
    fireEvent.pointerUp(viewport, { pointerId: 1 })
    fireEvent.keyDown(viewport, { key: 'ArrowRight' })
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Avatar zuschneiden' }), { key: 'Tab' })

    await waitFor(() => expect(viewport).toBeTruthy())
    expect(onCancel).not.toHaveBeenCalled()
  })
})

