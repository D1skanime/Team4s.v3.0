// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AdminAnimePersistedAssets } from '@/types/admin'

import { useAnimeEditAssetCropFlow } from './useAnimeEditAssetCropFlow'

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

const fetchMock = vi.fn()

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
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
      <span data-testid="can-open-cover">{String(flow.canOpenAssetCrop('cover'))}</span>
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

  it('canOpenAssetCrop is true for a same-origin rehosted-upload path', () => {
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: { url: '/media/anime/1/cover/original.jpg', ownership: 'manual' },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={vi.fn()} />)

    expect(screen.getByTestId('can-open-cover').textContent).toBe('true')
  })

  it('canOpenAssetCrop is true for the Jellyfin-image-proxy path too (relative, same-origin)', () => {
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: {
        url: '/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin',
        ownership: 'provider',
        provider: 'jellyfin',
      },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={vi.fn()} />)

    expect(screen.getByTestId('can-open-cover').textContent).toBe('true')
  })

  it('canOpenAssetCrop is false for an absolute backend-origin URL (CORS risk) -- button stays hidden', () => {
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: {
        url: 'http://192.168.235.196:18092/api/v1/media/image?item_id=x&kind=primary&provider=jellyfin',
        ownership: 'provider',
        provider: 'jellyfin',
      },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={vi.fn()} />)

    expect(screen.getByTestId('can-open-cover').textContent).toBe('false')
  })

  it('fetches the relative Jellyfin-image-proxy URL same-origin via plain fetch() and opens the crop dialog', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    fetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) })
    vi.stubGlobal('fetch', fetchMock)
    const rawUrl = '/api/v1/media/image?item_id=68546f5d1871ad1c42d8d674376e83e6&kind=primary&provider=jellyfin'
    const persistedAssets: AdminAnimePersistedAssets = {
      cover: { url: rawUrl, ownership: 'provider', provider: 'jellyfin' },
      backgrounds: [],
    }
    render(<Harness persistedAssets={persistedAssets} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover-Ausschnitt oeffnen' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Cover zuschneiden' })).not.toBeNull())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(rawUrl)
  })

  it('reports a fetch failure via onError instead of opening a broken dialog', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502 })
    vi.stubGlobal('fetch', fetchMock)
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
    vi.stubGlobal('fetch', fetchMock)
    render(<Harness persistedAssets={emptyPersistedAssets()} onError={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cover-Ausschnitt oeffnen' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
