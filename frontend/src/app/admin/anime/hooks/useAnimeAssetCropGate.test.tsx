// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { AdminAnimeAssetKind } from '@/types/admin'

import { useAnimeAssetCropGate } from './useAnimeAssetCropGate'

vi.mock('@/components/media/crop/Team4sCropper', () => ({
  Team4sCropper: ({
    title,
    output,
    onApply,
    onCancel,
  }: {
    title: string
    output: { filename: string; mimeType?: string }
    onApply: (file: File) => Promise<void> | void
    onCancel: () => void
  }) => (
    <div role="dialog" aria-label={title}>
      <button type="button" onClick={() => void onApply(new File(['cropped'], output.filename, { type: output.mimeType }))}>
        Ausschnitt übernehmen
      </button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

function Harness({ onFilesReady }: { onFilesReady: (kind: AdminAnimeAssetKind, files: File[]) => void }) {
  const gate = useAnimeAssetCropGate({ onFilesReady })
  const coverFile = new File(['x'], 'cover.png', { type: 'image/png' })
  const bannerFile = new File(['x'], 'banner.png', { type: 'image/png' })
  const logoFile = new File(['x'], 'logo.png', { type: 'image/png' })

  return (
    <div>
      <button type="button" onClick={() => gate.handleFilesSelected('cover', [coverFile])}>
        Cover auswählen
      </button>
      <button type="button" onClick={() => gate.handleFilesSelected('banner', [bannerFile])}>
        Banner auswählen
      </button>
      <button type="button" onClick={() => gate.handleFilesSelected('logo', [logoFile])}>
        Logo auswählen
      </button>
      <button type="button" onClick={() => gate.openCropForExistingFile('cover', coverFile)}>
        Vorhandenes Cover erneut zuschneiden
      </button>
      {gate.cropDialog}
    </div>
  )
}

describe('useAnimeAssetCropGate', () => {
  it('opens the crop dialog for a selected cover instead of forwarding directly', () => {
    const onFilesReady = vi.fn()
    render(<Harness onFilesReady={onFilesReady} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover auswählen' }))

    expect(screen.getByRole('dialog', { name: 'Cover zuschneiden' })).not.toBeNull()
    expect(onFilesReady).not.toHaveBeenCalled()
  })

  it('forwards the cropped file to onFilesReady on apply, not the original selection', () => {
    const onFilesReady = vi.fn()
    render(<Harness onFilesReady={onFilesReady} />)

    fireEvent.click(screen.getByRole('button', { name: 'Banner auswählen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt übernehmen' }))

    expect(onFilesReady).toHaveBeenCalledTimes(1)
    const [kind, files] = onFilesReady.mock.calls[0]
    expect(kind).toBe('banner')
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('banner-banner.jpg')
  })

  it('discards the selection on cancel without ever calling onFilesReady', () => {
    const onFilesReady = vi.fn()
    render(<Harness onFilesReady={onFilesReady} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover auswählen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onFilesReady).not.toHaveBeenCalled()
  })

  it('forwards logo selections unchanged -- no crop step for kinds without a crop config', () => {
    const onFilesReady = vi.fn()
    render(<Harness onFilesReady={onFilesReady} />)

    fireEvent.click(screen.getByRole('button', { name: 'Logo auswählen' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onFilesReady).toHaveBeenCalledTimes(1)
    expect(onFilesReady.mock.calls[0][0]).toBe('logo')
  })

  it('opens the crop dialog for an existing file via openCropForExistingFile (re-edit path)', () => {
    const onFilesReady = vi.fn()
    render(<Harness onFilesReady={onFilesReady} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vorhandenes Cover erneut zuschneiden' }))

    expect(screen.getByRole('dialog', { name: 'Cover zuschneiden' })).not.toBeNull()
  })
})
