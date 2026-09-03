// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(), getReleaseVersionCapabilities: vi.fn(), patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(), reorderReleaseVersionMedia: vi.fn(), uploadReleaseVersionMedia: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { useReleaseVersionMedia } from './useReleaseVersionMedia'
import type { UploadRunResult } from './useReleaseVersionMedia'

const item = (id: number, preview: boolean) => ({
  id, release_version_id: 1, media_asset_id: id, category: 'screenshot' as const, caption: null,
  sort_order: id, is_preview_candidate: preview, visibility: 'intern' as const, review_status: 'in_pruefung' as const,
  thumbnail_url: null, original_url: null, uploaded_by_user_id: 3, can_update: true, can_delete: true,
  created_at: '2026-07-16T00:00:00Z', updated_at: null, deleted_at: null,
})

describe('useReleaseVersionMedia preview reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        uploadResult = await result.current.startUpload(category, [file])
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
        await result.current.startUpload('screenshot', [file])
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
      uploadResult = await result.current.startUpload('screenshot', [file])
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
      uploadResult = await result.current.startUpload('screenshot', [goodFile, badFile])
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
})
