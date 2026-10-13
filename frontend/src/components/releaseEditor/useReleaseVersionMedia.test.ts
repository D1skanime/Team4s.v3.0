// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(), getReleaseVersionCapabilities: vi.fn(), patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(), reorderReleaseVersionMedia: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { useReleaseVersionMedia } from './useReleaseVersionMedia'

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

  it('entfernt ein geloeschtes Medium sofort auch aus der Galerie-Liste (storyItems)', async () => {
    api.deleteReleaseVersionMediaItem.mockResolvedValue(undefined)
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.storyItems).toHaveLength(2))

    await act(async () => { await result.current.deleteItem(2) })

    expect(api.deleteReleaseVersionMediaItem).toHaveBeenCalledWith(1, 2)
    expect(result.current.items.map(entry => entry.id)).toEqual([1])
    expect((result.current.storyItems ?? []).map(entry => (entry.type === 'media' ? entry.media.id : null))).toEqual([1])
  })

  it('zeigt eine Medienaenderung sofort auch in der Galerie-Liste (storyItems)', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1))
    await waitFor(() => expect(result.current.storyItems).toHaveLength(2))

    api.patchReleaseVersionMediaItem.mockResolvedValueOnce({ ...item(2, false), caption: 'Neu' })
    await act(async () => { await result.current.patchItem(2, { caption: 'Neu' }) })

    const storyMedia = (result.current.storyItems ?? []).find(entry => entry.type === 'media' && entry.media.id === 2)
    expect(storyMedia?.type === 'media' ? storyMedia.media.caption : undefined).toBe('Neu')
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

  it('StrictMode verursacht kein zusaetzliches Ladepaar ueber Reacts Dev-Doppelaufruf hinaus', async () => {
    const { result } = renderHook(() => useReleaseVersionMedia(1), { wrapper: StrictMode })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(api.getReleaseVersionMedia).toHaveBeenCalledTimes(2)
    expect(api.getReleaseVersionCapabilities).toHaveBeenCalledTimes(2)
  })
})
