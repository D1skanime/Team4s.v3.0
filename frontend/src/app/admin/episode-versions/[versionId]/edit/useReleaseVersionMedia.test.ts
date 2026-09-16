// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(), getReleaseVersionCapabilities: vi.fn(), patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(), reorderReleaseVersionMedia: vi.fn(), uploadReleaseVersionMedia: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { useReleaseVersionMedia } from './useReleaseVersionMedia'
import type { UploadRunResult } from './useReleaseVersionMedia'
import { fileKey } from './ReleaseVersionMediaSection.helpers'

const item = (id: number, preview: boolean) => ({
  id, release_version_id: 1, media_asset_id: id, category: 'screenshot' as const, caption: null,
  sort_order: id, is_preview_candidate: preview, visibility: 'intern' as const, review_status: 'in_pruefung' as const,
  thumbnail_url: null, original_url: null, uploaded_by_user_id: 3, can_update: true, can_delete: true,
  created_at: '2026-07-16T00:00:00Z', updated_at: null, deleted_at: null,
})

const capabilitiesResponse = {
  data: { can_view_media: true, can_upload_media: true, can_update_media: true, can_delete_media: false, can_edit_notes: false, can_manage_segments: false },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('useReleaseVersionMedia preview reconciliation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.getReleaseVersionMedia.mockResolvedValue({ data: [item(1, true), item(2, false)] })
    api.getReleaseVersionCapabilities.mockResolvedValue({ data: { can_view_media: true, can_upload_media: true, can_update_media: true, can_delete_media: false, can_edit_notes: false, can_manage_segments: false } })
  })

  it('keeps exactly one local preview after the atomic preview patch', async () => {
    api.patchReleaseVersionMediaItem.mockResolvedValue(item(2, true))
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    await act(async () => result.current.patchItem(2, { is_preview_candidate: true }))
    expect(result.current.items.filter(media => media.is_preview_candidate).map(media => media.id)).toEqual([2])
  })

  it.each(['screenshot', 'typesetting_karaoke', 'fun_outtake', 'other'] as const)(
    'lädt %s über den zentralen Wrapper mit echter Release-Version und ohne Status-/Token-Felder hoch',
    async (category) => {
      api.uploadReleaseVersionMedia.mockResolvedValue({
        results: [{ client_file_name: 'asset.png', status: 'ready', release_version_media_id: 81 }],
      })
      const { result } = renderHook(() => useReleaseVersionMedia(42))
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const file = new File(['asset'], 'asset.png', { type: 'image/png' })

      let uploadResult: UploadRunResult | undefined
      await act(async () => {
        uploadResult = await result.current.startUpload(category, [{ file, title: '', caption: '' }])
      })

      const options = api.uploadReleaseVersionMedia.mock.calls.at(-1)?.[0]
      expect(options).toMatchObject({ versionId: 42, category, files: [file] })
      expect(options).not.toHaveProperty('authToken')
      expect(options).not.toHaveProperty('visibilityCode')
      expect(options).not.toHaveProperty('reviewStatusCode')
      expect(options).not.toHaveProperty('fansubGroupId')
      expect(uploadResult).toMatchObject({ allSucceeded: true })
      expect(uploadResult?.items[0]).toMatchObject({ status: 'ready' })
    },
  )

  it('rejects startUpload on a hard failure (network/5xx) and marks the queued item failed', async () => {
    api.uploadReleaseVersionMedia.mockRejectedValue(new Error('Netzwerkfehler beim Upload.'))
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const file = new File(['asset'], 'asset.png', { type: 'image/png' })

    let caughtError: unknown
    await act(async () => {
      try {
        await result.current.startUpload('screenshot', [{ file, title: '', caption: '' }])
      } catch (error) {
        caughtError = error
      }
    })

    expect(caughtError).toBeInstanceOf(Error)
    expect((caughtError as Error).message).toBe('Netzwerkfehler beim Upload.')
    expect(result.current.error).toBe('Netzwerkfehler beim Upload.')
    expect(result.current.uploadItems[0]).toMatchObject({
      status: 'failed',
      errorMessage: 'Netzwerkfehler beim Upload.',
    })
  })

  it('resolves with allSucceeded=false when the backend reports every file failed at HTTP 200', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [{ client_file_name: 'bad.png', status: 'failed', error_code: 'INVALID_MIME_TYPE' }],
    })
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const file = new File(['bad'], 'bad.png', { type: 'image/png' })

    let uploadResult: UploadRunResult | undefined
    await act(async () => {
      uploadResult = await result.current.startUpload('screenshot', [{ file, title: '', caption: '' }])
    })

    expect(uploadResult).toMatchObject({ allSucceeded: false })
    expect(uploadResult?.items[0]).toMatchObject({ status: 'failed', errorMessage: 'INVALID_MIME_TYPE' })
    expect(result.current.uploadItems[0].status).toBe('failed')
  })

  it('resolves with allSucceeded=false and mixed item statuses for a partial failure', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [
        { client_file_name: 'good.png', status: 'ready', release_version_media_id: 91 },
        { client_file_name: 'bad.png', status: 'failed', error_code: 'INVALID_MIME_TYPE' },
      ],
    })
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const goodFile = new File(['good'], 'good.png', { type: 'image/png' })
    const badFile = new File(['bad'], 'bad.png', { type: 'image/png' })

    let uploadResult: UploadRunResult | undefined
    await act(async () => {
      uploadResult = await result.current.startUpload('screenshot', [goodFile, badFile].map(file => ({ file, title: '', caption: '' })))
    })

    expect(uploadResult).toMatchObject({ allSucceeded: false })
    expect(uploadResult?.items.map((item) => item.status)).toEqual(['ready', 'failed'])
  })

  it('sendet bei abgelehnten Medien die erwartete Revision und übernimmt die autoritative Antwort', async () => {
    const rejected = {
      ...item(9, false),
      review_state: 'rejected' as const,
      source_revision: 2,
      last_activity_at: '2026-07-23T18:00:00Z',
      rejection_category: 'quality.insufficient' as const,
      rejection_reason: 'Bitte die Bildqualität verbessern.',
    }
    const pending = {
      ...rejected,
      review_state: 'pending' as const,
      source_revision: 3,
      last_activity_at: '2026-07-23T18:15:00Z',
      rejection_category: null,
      rejection_reason: null,
    }
    api.getReleaseVersionMedia.mockResolvedValue({ data: [rejected] })
    api.patchReleaseVersionMediaItem.mockResolvedValue(pending)
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    await act(async () => result.current.patchItem(9, { caption: 'Korrigiert' }))

    expect(api.patchReleaseVersionMediaItem).toHaveBeenCalledWith(42, 9, {
      caption: 'Korrigiert',
      source_revision: 2,
    })
    expect(result.current.items[0]).toMatchObject({
      id: 9,
      review_state: 'pending',
      source_revision: 3,
      last_activity_at: '2026-07-23T18:15:00Z',
    })
  })
  it('ordnet drei individuellen Titeln und Texten über die Batchposition ihre IDs zu und setzt nur das gewählte Preview', async () => {
    // Same filenames deliberately prove filename-only response mapping is invalid.
    const drafts = ['eins', 'zwei', 'drei'].map((value, index) => ({
      file: new File([value], 'gleich.png', { type: 'image/png', lastModified: index + 1 }),
      title: ` Titel ${index + 1} `,
      caption: ` Text ${index + 1} `,
    }))
    api.uploadReleaseVersionMedia.mockResolvedValue({ results: drafts.map((draft, index) => ({
      client_file_name: draft.file.name, status: 'ready', release_version_media_id: 101 + index, source_revision: 1,
    })) })
    api.patchReleaseVersionMediaItem.mockImplementation(async (_version, id) => ({ ...item(id, id === 102), source_revision: 2 }))
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => { await result.current.startUpload('screenshot', drafts, fileKey(drafts[1].file)) })

    expect(api.uploadReleaseVersionMedia).toHaveBeenCalledTimes(1)
    expect(api.uploadReleaseVersionMedia.mock.calls[0][0].files).toEqual(drafts.map(draft => draft.file))
    expect(api.patchReleaseVersionMediaItem.mock.calls).toEqual([
      [42, 101, { title: 'Titel 1', caption: 'Text 1', source_revision: 1 }],
      [42, 102, { title: 'Titel 2', caption: 'Text 2', is_preview_candidate: true, source_revision: 1 }],
      [42, 103, { title: 'Titel 3', caption: 'Text 3', source_revision: 1 }],
    ])
    expect(result.current.uploadItems.map(entry => entry.resultId)).toEqual([101, 102, 103])
  })

  it('lässt ohne neue Previewwahl die vorhandene Vorschau unverändert', async () => {
    const file = new File(['asset'], 'asset.png', { type: 'image/png' })
    api.uploadReleaseVersionMedia.mockResolvedValue({ results: [
      { client_file_name: file.name, status: 'ready', release_version_media_id: 81, source_revision: 1 },
    ] })
    api.patchReleaseVersionMediaItem.mockResolvedValue(item(81, false))
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    await act(async () => { await result.current.startUpload('screenshot', [{ file, title: 'Nur Titel', caption: '' }]) })

    expect(api.patchReleaseVersionMediaItem).toHaveBeenCalledWith(42, 81, { title: 'Nur Titel', source_revision: 1 })
    expect(result.current.items.filter(entry => entry.is_preview_candidate).map(entry => entry.id)).toEqual([1])
  })

  it('überträgt die Vorschau bei fehlgeschlagenem Bild nicht und behält dessen Metadaten für Retry', async () => {
    const drafts = ['good', 'bad'].map(value => ({
      file: new File([value], `${value}.png`, { type: 'image/png' }), title: value, caption: `${value}-Text`,
    }))
    api.uploadReleaseVersionMedia.mockResolvedValueOnce({ results: [
      { client_file_name: 'good.png', status: 'ready', release_version_media_id: 91, source_revision: 1 },
      { client_file_name: 'bad.png', status: 'failed', error_code: 'UPLOAD_FAILED' },
    ] }).mockResolvedValueOnce({ results: [
      { client_file_name: 'bad.png', status: 'ready', release_version_media_id: 92, source_revision: 1 },
    ] })
    api.patchReleaseVersionMediaItem.mockImplementation(async (_version, id) => item(id, id === 92))
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => { await result.current.startUpload('screenshot', drafts, fileKey(drafts[1].file)) })
    expect(api.patchReleaseVersionMediaItem).toHaveBeenCalledTimes(1)
    expect(api.patchReleaseVersionMediaItem.mock.calls[0][2]).not.toHaveProperty('is_preview_candidate')

    await act(async () => { await result.current.retryUpload(1) })
    expect(api.uploadReleaseVersionMedia.mock.calls[1][0].files).toEqual([drafts[1].file])
    expect(api.patchReleaseVersionMediaItem).toHaveBeenLastCalledWith(42, 92, {
      title: 'bad', caption: 'bad-Text', is_preview_candidate: true, source_revision: 1,
    })
    expect(result.current.uploadItems.map(entry => entry.status)).toEqual(['ready', 'ready'])
  })

  it('wiederholt nach Metadatenfehler nur das PATCH auf derselben ID und Revision, niemals den Binärupload', async () => {
    const file = new File(['asset'], 'asset.png', { type: 'image/png' })
    api.uploadReleaseVersionMedia.mockResolvedValue({ results: [
      { client_file_name: file.name, status: 'ready', release_version_media_id: 81, source_revision: 4 },
    ] })
    api.patchReleaseVersionMediaItem.mockRejectedValueOnce(new Error('Metadaten nicht gespeichert.'))
      .mockResolvedValueOnce({ ...item(81, true), source_revision: 5 })
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => { await result.current.startUpload('screenshot', [{ file, title: 'Titel', caption: 'Text' }], fileKey(file)) })
    expect(result.current.uploadItems[0]).toMatchObject({ status: 'failed', resultId: 81, sourceRevision: 4 })

    await act(async () => { await result.current.retryUpload(0) })
    expect(api.uploadReleaseVersionMedia).toHaveBeenCalledTimes(1)
    expect(api.patchReleaseVersionMediaItem.mock.calls).toEqual([
      [42, 81, { title: 'Titel', caption: 'Text', is_preview_candidate: true, source_revision: 4 }],
      [42, 81, { title: 'Titel', caption: 'Text', is_preview_candidate: true, source_revision: 4 }],
    ])
    expect(result.current.uploadItems[0]).toMatchObject({ status: 'ready', resultId: 81, sourceRevision: 5 })
  })

  it.each(['fun_outtake', 'other'] as const)('setzt für %s trotz übergebenem Key keine unerlaubte Vorschau', async category => {
    const file = new File(['asset'], 'asset.png', { type: 'image/png' })
    api.uploadReleaseVersionMedia.mockResolvedValue({ results: [
      { client_file_name: file.name, status: 'ready', release_version_media_id: 81, source_revision: 1 },
    ] })
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.startUpload(category, [{ file, title: '', caption: '' }], fileKey(file)) })
    expect(api.patchReleaseVersionMediaItem).not.toHaveBeenCalled()
  })

  it('reorderItems bleibt bis zum Abschluss eines waehrenddessen gestarteten reload() sichtbar', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    api.reorderReleaseVersionMedia.mockResolvedValueOnce(undefined)
    await act(async () => {
      await result.current.reorderItems(1, { items: [{ id: 2, sort_order: 1 }, { id: 1, sort_order: 2 }] })
    })
    expect(result.current.items.map(entry => entry.id)).toEqual([2, 1])

    const reloadPending = deferred<{ data: ReturnType<typeof item>[] }>()
    api.getReleaseVersionMedia.mockReturnValueOnce(reloadPending.promise)
    api.getReleaseVersionCapabilities.mockResolvedValueOnce(capabilitiesResponse)
    act(() => { result.current.reload() })

    // reload() haengt noch -- die optimistische Reihenfolge bleibt sichtbar.
    expect(result.current.items.map(entry => entry.id)).toEqual([2, 1])

    await act(async () => {
      reloadPending.resolve({ data: [item(1, true), item(2, false)] })
      await reloadPending.promise
    })
    await waitFor(() => expect(result.current.items.map(entry => entry.id)).toEqual([1, 2]))
  })

  it('patchItem-Ergebnisse ueberleben einen danach gestarteten, noch offenen reload()', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    api.patchReleaseVersionMediaItem.mockResolvedValueOnce({ ...item(2, false), caption: 'Neu' })
    await act(async () => { await result.current.patchItem(2, { caption: 'Neu' }) })
    expect(result.current.items.find(entry => entry.id === 2)?.caption).toBe('Neu')

    const reloadPending = deferred<{ data: ReturnType<typeof item>[] }>()
    api.getReleaseVersionMedia.mockReturnValueOnce(reloadPending.promise)
    api.getReleaseVersionCapabilities.mockResolvedValueOnce(capabilitiesResponse)
    act(() => { result.current.reload() })

    // reload() haengt noch -- das per patchItem gesetzte Feld bleibt sichtbar.
    expect(result.current.items.find(entry => entry.id === 2)?.caption).toBe('Neu')

    await act(async () => {
      reloadPending.resolve({ data: [item(1, true), item(2, false)] })
      await reloadPending.promise
    })
    await waitFor(() => expect(result.current.items.find(entry => entry.id === 2)?.caption).toBeNull())
  })

  it('reload() loest genau ein weiteres Ladepaar aus; Mutationsfunktionen loesen keine zusaetzliche Ladeoperation aus', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(1)
    expect(api.getReleaseVersionCapabilities).toHaveBeenCalledTimes(1)

    api.patchReleaseVersionMediaItem.mockResolvedValueOnce(item(2, false))
    await act(async () => { await result.current.patchItem(2, { caption: 'x' }) })
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(1)
    expect(api.getReleaseVersionCapabilities).toHaveBeenCalledTimes(1)

    act(() => { result.current.reload() })
    await waitFor(() => expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(2))
    expect(api.getReleaseVersionCapabilities).toHaveBeenCalledTimes(2)
  })

  it('wendet eine verspaetete Ladeantwort fuer die alte versionId nach einem Prop-Wechsel nicht mehr an', async () => {
    const firstPending = deferred<{ data: ReturnType<typeof item>[] }>()
    api.getReleaseVersionMedia.mockReturnValueOnce(firstPending.promise)
    api.getReleaseVersionCapabilities.mockResolvedValueOnce(capabilitiesResponse)

    const { result, rerender } = renderHook(
      (props: { versionId: number }) => useReleaseVersionMedia(props.versionId),
      { initialProps: { versionId: 1 } },
    )
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(1)

    const secondPending = deferred<{ data: ReturnType<typeof item>[] }>()
    api.getReleaseVersionMedia.mockReturnValueOnce(secondPending.promise)
    api.getReleaseVersionCapabilities.mockResolvedValueOnce(capabilitiesResponse)
    rerender({ versionId: 2 })
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(2)

    await act(async () => {
      firstPending.resolve({ data: [item(99, true)] })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.items.find(entry => entry.id === 99)).toBeUndefined()

    await act(async () => {
      secondPending.resolve({ data: [item(50, false)] })
      await secondPending.promise
    })
    await waitFor(() => expect(result.current.items.map(entry => entry.id)).toEqual([50]))
  })

  it('sperrt die heutige Fehlerreihenfolge fest: ein Ladefehler wird durch einen erfolgreichen Upload geloescht', async () => {
    api.getReleaseVersionMedia.mockRejectedValueOnce(new Error('Ladefehler'))
    const { result } = renderHook(() => useReleaseVersionMedia(42))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('Ladefehler')
    expect(result.current.capabilitiesError).toBe('Ladefehler')

    api.uploadReleaseVersionMedia.mockResolvedValueOnce({
      results: [{ client_file_name: 'x.png', status: 'ready', release_version_media_id: 1 }],
    })
    api.getReleaseVersionMedia.mockResolvedValueOnce({ data: [item(1, false)] })
    api.getReleaseVersionCapabilities.mockResolvedValueOnce(capabilitiesResponse)
    const file = new File(['a'], 'x.png', { type: 'image/png' })

    await act(async () => { await result.current.startUpload('screenshot', [{ file, title: '', caption: '' }]) })

    expect(result.current.error).toBeNull()
  })

  it('StrictMode verursacht kein zusaetzliches Ladepaar ueber Reacts Dev-Doppelaufruf hinaus', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1), { wrapper: StrictMode })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(2)
    expect(api.getReleaseVersionCapabilities).toHaveBeenCalledTimes(2)
  })
})
