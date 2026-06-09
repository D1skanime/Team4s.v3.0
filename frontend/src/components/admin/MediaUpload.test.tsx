// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const deleteFansubMediaMock = vi.fn()
const uploadFansubMediaMock = vi.fn()

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

vi.mock('lucide-react', () => ({
  ImagePlus: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
  Loader2: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
  Pencil: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
  RefreshCw: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
  Trash2: ({ children }: { children?: ReactNode }) => <span aria-hidden="true">{children}</span>,
}))

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
        Ausschnitt speichern
      </button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  deleteFansubMedia: (...args: unknown[]) => deleteFansubMediaMock(...args),
  resolveApiUrl: (value?: string | null) => {
    const trimmed = (value || '').trim()
    if (trimmed.startsWith('http://127.0.0.1:8092/api/')) {
      return trimmed.replace('http://127.0.0.1:8092', '')
    }
    if (trimmed.startsWith('http://localhost:8092/api/')) {
      return trimmed.replace('http://localhost:8092', '')
    }
    return trimmed
  },
  uploadFansubMedia: (...args: unknown[]) => uploadFansubMediaMock(...args),
}))

import { MediaUpload, type EditableMediaValue } from './MediaUpload'

const uploadedMedia = {
  id: 55,
  public_url: '/media/groups/17/banner.png',
  source_original_url: '/media/groups/17/banner-source.png',
  mime_type: 'image/png',
  size_bytes: 2048,
  filename: 'banner.png',
  width: 1200,
  height: 320,
}

function makeValue(overrides: Partial<EditableMediaValue> = {}): EditableMediaValue {
  return {
    id: 12,
    publicURL: '/media/groups/17/logo.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    filename: 'logo.png',
    width: 512,
    height: 512,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:media-upload-edit'),
    revokeObjectURL: vi.fn(),
  })
})

describe('MediaUpload', () => {
  it('uploads group media without forwarding token-shaped props and keeps progress visible', async () => {
    const onBusyChange = vi.fn()
    const onChange = vi.fn()
    let resolveUpload!: () => void

    uploadFansubMediaMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpload = () => resolve({
          data: {
            media: uploadedMedia,
            gif_large_warning: false,
          },
        })
      })
    })

    render(
      <MediaUpload
        type="banner"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        onBusyChange={onBusyChange}
        onChange={onChange}
      />,
    )

    const file = new File(['banner'], 'banner.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Banner Datei/i), { target: { files: [file] } })

    expect(await screen.findByRole('dialog', { name: 'Banner ausrichten' })).not.toBeNull()
    expect(uploadFansubMediaMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt speichern' }))

    await waitFor(() => expect(uploadFansubMediaMock).toHaveBeenCalledTimes(1))
    const uploadOptions = uploadFansubMediaMock.mock.calls[0][0] as {
      file: File
      onProgress?: (percent: number) => void
      [key: string]: unknown
    }
    expect(uploadOptions).toMatchObject({
      fansubID: 17,
      kind: 'banner',
      visibilityCode: 'public',
      reviewStatusCode: 'approved',
    })
    expect(uploadOptions.file).toMatchObject({
      name: 'banner.png',
      type: 'image/png',
    })
    expect(uploadOptions.sourceFile).toMatchObject({
      name: 'banner.png',
      type: 'image/png',
    })
    expect(uploadOptions).not.toHaveProperty('authToken')

    uploadOptions.onProgress?.(42)
    expect(await screen.findByText('42%')).not.toBeNull()
    expect(onBusyChange).toHaveBeenCalledWith(true)

    resolveUpload()

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        id: 55,
        publicURL: '/media/groups/17/banner.png',
        sourceOriginalURL: '/media/groups/17/banner-source.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        filename: 'banner.png',
        width: 1200,
        height: 320,
      })
    })
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))
  })

  it('uploads animated banner GIFs directly without opening the cropper', async () => {
    uploadFansubMediaMock.mockResolvedValue({
      data: {
        media: {
          ...uploadedMedia,
          filename: 'banner.gif',
          mime_type: 'image/gif',
          public_url: '/media/groups/17/banner.gif',
        },
        gif_large_warning: false,
      },
    })

    render(
      <MediaUpload
        type="banner"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        onChange={vi.fn()}
      />,
    )

    const file = new File(['gif'], 'banner.gif', { type: 'image/gif' })
    fireEvent.change(screen.getByLabelText(/Banner Datei/i), { target: { files: [file] } })

    await waitFor(() => expect(uploadFansubMediaMock).toHaveBeenCalledTimes(1))
    expect(uploadFansubMediaMock.mock.calls[0][0]).toMatchObject({ file })
    expect(screen.queryByRole('dialog', { name: 'Banner ausrichten' })).toBeNull()
  })

  it('deletes group media without a token argument', async () => {
    const onChange = vi.fn()
    deleteFansubMediaMock.mockResolvedValue(undefined)

    render(
      <MediaUpload
        type="logo"
        fansubID={17}
        groupName="Phase Fansubs"
        value={makeValue()}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Logo löschen/i }))

    await waitFor(() => expect(deleteFansubMediaMock).toHaveBeenCalledTimes(1))
    expect(deleteFansubMediaMock.mock.calls[0]).toEqual([17, 'logo'])
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('keeps disabled upload controls from starting uploads', () => {
    render(
      <MediaUpload
        type="banner"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        disabled
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Hochladen').closest('button')).toHaveProperty('disabled', true)
    const file = new File(['banner'], 'banner.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Banner Datei/i), { target: { files: [file] } })

    expect(uploadFansubMediaMock).not.toHaveBeenCalled()
  })

  it('keeps remote logo edit fetch public and unauthenticated', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['logo'], { type: 'image/png' })),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MediaUpload
        type="logo"
        fansubID={17}
        groupName="Phase Fansubs"
        value={makeValue({
          id: null,
          publicURL: 'https://cdn.example/logo.png',
          filename: null,
          mimeType: null,
          sizeBytes: null,
          width: null,
          height: null,
        })}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Logo bearbeiten/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/logo.png', { cache: 'no-store' })
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('headers')
    expect(uploadFansubMediaMock).not.toHaveBeenCalled()
  })

  it('opens the shared cropper for existing raster banners from the retained source original', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['banner'], { type: 'image/png' })),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MediaUpload
        type="banner"
        fansubID={17}
        groupName="Phase Fansubs"
        value={makeValue({
          id: null,
          publicURL: 'http://127.0.0.1:8092/api/v1/media/files/banner.png',
          sourceOriginalURL: 'http://127.0.0.1:8092/api/v1/media/files/banner-source.png',
          filename: 'banner.png',
          mimeType: 'image/png',
          sizeBytes: null,
          width: null,
          height: null,
        })}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Banner bearbeiten/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/media\/files\/banner-source\.png/), { cache: 'no-store' })
    expect(await screen.findByRole('dialog', { name: 'Banner ausrichten' })).not.toBeNull()
    expect(uploadFansubMediaMock).not.toHaveBeenCalled()
  })

  it('opens the shared cropper for raster logos before upload', async () => {
    uploadFansubMediaMock.mockResolvedValue({
      data: {
        media: {
          ...uploadedMedia,
          filename: 'logo.png',
          public_url: '/media/groups/17/logo.png',
        },
        gif_large_warning: false,
      },
    })

    render(
      <MediaUpload
        type="logo"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        onChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Logo Datei/i), {
      target: { files: [new File(['logo'], 'logo.webp', { type: 'image/webp' })] },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt speichern' }))

    await waitFor(() => expect(uploadFansubMediaMock).toHaveBeenCalledTimes(1))
    const uploadOptions = uploadFansubMediaMock.mock.calls[0][0] as { file: File; sourceFile?: File }
    expect(uploadOptions.file).toMatchObject({
      name: 'logo.png',
      type: 'image/png',
    })
    expect(uploadOptions.sourceFile).toMatchObject({
      name: 'logo.webp',
      type: 'image/webp',
    })
  })

  it('uploads SVG logos directly without converting them through the cropper', async () => {
    uploadFansubMediaMock.mockResolvedValue({
      data: {
        media: {
          ...uploadedMedia,
          filename: 'logo.svg',
          mime_type: 'image/svg+xml',
          public_url: '/media/groups/17/logo.svg',
        },
        gif_large_warning: false,
      },
    })

    render(
      <MediaUpload
        type="logo"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        onChange={vi.fn()}
      />,
    )

    const file = new File(['<svg />'], 'logo.svg', { type: 'image/svg+xml' })
    fireEvent.change(screen.getByLabelText(/Logo Datei/i), { target: { files: [file] } })

    await waitFor(() => expect(uploadFansubMediaMock).toHaveBeenCalledTimes(1))
    expect(uploadFansubMediaMock.mock.calls[0][0]).toMatchObject({ file })
    expect(screen.queryByRole('dialog', { name: 'Logo zuschneiden' })).toBeNull()
  })

  it('keeps technical ownership policy out of the visible branding upload UI', () => {
    render(
      <MediaUpload
        type="banner"
        fansubID={17}
        groupName="Phase Fansubs"
        value={null}
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByText(/Owner-Typ/i)).toBeNull()
    expect(screen.queryByText(/öffentlich.*Identität/i)).toBeNull()
    expect(screen.queryByText(/in Prüfung/i)).toBeNull()
  })
})
