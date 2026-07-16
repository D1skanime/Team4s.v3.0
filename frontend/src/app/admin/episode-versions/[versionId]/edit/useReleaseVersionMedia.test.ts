// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(), getReleaseVersionCapabilities: vi.fn(), patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(), reorderReleaseVersionMedia: vi.fn(), uploadReleaseVersionMedia: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

import { useReleaseVersionMedia } from './useReleaseVersionMedia'

const item = (id: number, preview: boolean) => ({
  id, release_version_id: 1, media_asset_id: id, category: 'screenshot' as const, caption: null,
  sort_order: id, is_preview_candidate: preview, visibility: 'intern' as const, review_status: 'in_pruefung' as const,
  thumbnail_url: null, original_url: null, uploaded_by_user_id: 3, can_update: true, can_delete: true,
  created_at: '2026-07-16T00:00:00Z', updated_at: null, deleted_at: null,
})

describe('useReleaseVersionMedia preview reconciliation', () => {
  beforeEach(() => {
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
})
