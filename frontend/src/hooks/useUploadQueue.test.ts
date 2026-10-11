// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { UploadAdapter } from './useUploadQueue'
import { useUploadQueue } from './useUploadQueue'

interface StubResult {
  status: 'ready' | 'failed'
  id?: number
  message?: string
}

function makeFile(name: string, lastModified = 1): File {
  return new File(['content'], name, { type: 'image/png', lastModified })
}

function buildAdapter(overrides: Partial<UploadAdapter<StubResult>> = {}): UploadAdapter<StubResult> {
  return {
    uploadFiles: vi.fn(async (_files: File[], _onProgress: (percent: number) => void): Promise<StubResult[]> => []),
    readyResultId: (result) => result.id ?? null,
    isReady: (result) => result.status === 'ready',
    readErrorFromResult: (result) => result.message ?? null,
    ...overrides,
  }
}

describe('useUploadQueue', () => {
  it('merges new file selections into the existing queue instead of replacing it', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const { result } = renderHook(() => useUploadQueue<StubResult>())

    act(() => result.current.selectFiles([fileA]))
    act(() => result.current.selectFiles([fileB]))

    expect(result.current.items.map((item) => item.file.name)).toEqual(['a.png', 'b.png'])
  })

  it('never calls uploadFiles as a side effect of selectFiles alone (D-10)', () => {
    const adapter = buildAdapter()
    const { result } = renderHook(() => useUploadQueue<StubResult>())

    act(() => result.current.selectFiles([makeFile('a.png')]))

    expect(adapter.uploadFiles).not.toHaveBeenCalled()
  })

  it('startUpload produces one failed item and one ready item without cross-contamination', async () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const uploadFiles = vi.fn(async (_files: File[], _onProgress: (percent: number) => void): Promise<StubResult[]> => [
      { status: 'failed', message: 'INVALID_MIME_TYPE' },
      { status: 'ready', id: 7 },
    ])
    const adapter = buildAdapter({ uploadFiles })
    const { result } = renderHook(() => useUploadQueue<StubResult>())

    act(() => result.current.selectFiles([fileA, fileB]))

    let runResult
    await act(async () => {
      runResult = await result.current.startUpload(adapter)
    })

    expect(uploadFiles).toHaveBeenCalledTimes(1)
    expect(uploadFiles.mock.calls[0][0]).toEqual([fileA, fileB])
    expect(runResult).toMatchObject({ allSucceeded: false })
    expect(result.current.items.map((item) => item.status)).toEqual(['failed', 'ready'])
    expect(result.current.items[0]).toMatchObject({ errorMessage: 'INVALID_MIME_TYPE', resultId: null })
    expect(result.current.items[1]).toMatchObject({ resultId: 7, status: 'ready' })
  })

  it('retryUpload with resultId===null re-invokes uploadFiles for only that one file', async () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const uploadFiles = vi.fn()
      .mockResolvedValueOnce([
        { status: 'failed' as const, message: 'boom' },
        { status: 'ready' as const, id: 9 },
      ])
      .mockResolvedValueOnce([{ status: 'ready' as const, id: 11 }])
    const adapter = buildAdapter({ uploadFiles })
    const { result } = renderHook(() => useUploadQueue<StubResult>())

    act(() => result.current.selectFiles([fileA, fileB]))
    await act(async () => {
      await result.current.startUpload(adapter)
    })
    expect(result.current.items[0]).toMatchObject({ status: 'failed', resultId: null })

    await act(async () => {
      await result.current.retryUpload(adapter, 0)
    })

    expect(uploadFiles).toHaveBeenCalledTimes(2)
    expect(uploadFiles.mock.calls[1][0]).toEqual([fileA])
    expect(result.current.items[0]).toMatchObject({ status: 'ready', resultId: 11 })
    expect(result.current.items[1]).toMatchObject({ status: 'ready', resultId: 9 })
  })

  it('retryUpload with resultId!==null calls only patchMetadata, never uploadFiles again', async () => {
    const file = makeFile('a.png')
    const uploadFiles = vi.fn().mockResolvedValueOnce([{ status: 'ready' as const, id: 42 }])
    const patchMetadata = vi.fn()
      .mockResolvedValueOnce({ ok: false, message: 'Metadaten-Fehler' })
      .mockResolvedValueOnce({ ok: true })
    const adapter = buildAdapter({ uploadFiles, patchMetadata })
    const { result } = renderHook(() => useUploadQueue<StubResult>())

    act(() => result.current.selectFiles([file]))
    act(() => result.current.updateDraft(file.name + ':' + file.size + ':' + file.lastModified, 'title', 'Titel'))
    await act(async () => {
      await result.current.startUpload(adapter)
    })
    expect(result.current.items[0]).toMatchObject({ status: 'failed', resultId: 42, errorMessage: 'Metadaten-Fehler' })
    expect(patchMetadata).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.retryUpload(adapter, 0)
    })

    expect(uploadFiles).toHaveBeenCalledTimes(1)
    expect(patchMetadata).toHaveBeenCalledTimes(2)
    expect(result.current.items[0]).toMatchObject({ status: 'ready', resultId: 42 })
  })

  it('clearQueue resets to an empty queue', async () => {
    const { result } = renderHook(() => useUploadQueue<StubResult>())
    act(() => result.current.selectFiles([makeFile('a.png')]))
    expect(result.current.items).toHaveLength(1)

    act(() => result.current.clearQueue())

    expect(result.current.items).toEqual([])
  })

  it('removeDraft removes only the matching entry', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const { result } = renderHook(() => useUploadQueue<StubResult>())
    act(() => result.current.selectFiles([fileA, fileB]))

    const keyA = `${fileA.name}:${fileA.size}:${fileA.lastModified}`
    act(() => result.current.removeDraft(keyA))

    expect(result.current.items.map((item) => item.file.name)).toEqual(['b.png'])
  })

  it('surfaces a hard uploadFiles rejection as a failed item and hook-level error', async () => {
    const file = makeFile('a.png')
    const uploadFiles = vi.fn().mockRejectedValue(new Error('Netzwerkfehler.'))
    const adapter = buildAdapter({ uploadFiles })
    const { result } = renderHook(() => useUploadQueue<StubResult>())
    act(() => result.current.selectFiles([file]))

    let caught: unknown
    await act(async () => {
      try {
        await result.current.startUpload(adapter)
      } catch (err) {
        caught = err
      }
    })

    expect(caught).toBeInstanceOf(Error)
    await waitFor(() => expect(result.current.error).toBe('Netzwerkfehler.'))
    expect(result.current.items[0]).toMatchObject({ status: 'failed', errorMessage: 'Netzwerkfehler.' })
  })
})
