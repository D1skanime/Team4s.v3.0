// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AdminAnimePersistedAssets } from '@/types/admin'

import { useAnimeEditAssetCropFlow } from './useAnimeEditAssetCropFlow'

const apiClientFetchMock = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClientFetch: (...args: unknown[]) => apiClientFetchMock(...args),
  }
})

vi.mock('@/components/media/crop/Team4sCropper', () => ({
  Team4sCropper: ({
    title,
    onApply,
    onCancel,
  }: {
    title: string
    onApply: (file: File) => Promise<void> | void
    onCancel: () => void
  }) => (
    <div role="dialog" aria-label={title}>
      <button type="button" onClick={() => void onApply(new File(['cropped'], 'cropped.jpg', { type: 'image/jpeg' }))}>
        Ausschnitt übernehmen
      </button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function emptyPersistedAssets(): AdminAnimePersistedAssets {
  return { backgrounds: [] }
}

function Harness({
  persistedAssets,
  onError,
}: {
  persistedAssets: AdminAnimePersistedAssets
  onError: (message: string) => void
}) {
  const onAssetFilesSelected = vi.fn()
  const flow = useAnimeEditAssetCropFlow({ persistedAssets, onAssetFilesSelected, onError })

  return (
    <div>
      <button type="button" onClick={() => void flow.openAssetCrop('cover')}>
        Cover-Ausschnitt oeffnen
      </button>
      <span data-testid="can-open-banner">{String(flow.canOpenAssetCrop('banner'))}</span>
      {flow.cropDialog}
    </div>
  )
}

describe('useAnimeEditAssetCropFlow', () => {
  it('canOpenAssetCrop is false when no persisted asset exists for that kind', () => {
    render(<Harness persistedAssets={emptyPersistedAssets()} onError={vi.fn()} />)

    expect(screen.getByTestId('can-open-banner').textContent).toBe('false')
  })

  it('fetches the persisted source via apiClientFetch and opens the crop dialog', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    apiClientFetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) })
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: { url: '/media/anime/1/cover/original.jpg', ownership: 'manual' },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover-Ausschnitt oeffnen' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Cover zuschneiden' })).not.toBeNull())
    expect(apiClientFetchMock).toHaveBeenCalledTimes(1)
    expect(apiClientFetchMock.mock.calls[0][0]).toContain('/media/anime/1/cover/original.jpg')
  })

  it('reports a fetch failure via onError instead of opening a broken dialog', async () => {
    apiClientFetchMock.mockResolvedValue({ ok: false, status: 502 })
    const onError = vi.fn()
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: { url: '/media/anime/1/cover/original.jpg', ownership: 'manual' },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={onError} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover-Ausschnitt oeffnen' }))

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does nothing when the kind has no persisted asset at all (no fetch, no dialog)', () => {
    render(<Harness persistedAssets={emptyPersistedAssets()} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover-Ausschnitt oeffnen' }))

    expect(apiClientFetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
