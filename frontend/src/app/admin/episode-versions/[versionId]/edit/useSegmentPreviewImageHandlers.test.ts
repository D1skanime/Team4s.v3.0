// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  uploadSegmentPreviewImage: vi.fn(),
  getSegmentPreviewImageCandidates: vi.fn(),
  attachSegmentPreviewImage: vi.fn(),
  resetSegmentPreviewImage: vi.fn(),
}))
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  ...api,
}))

import { ApiError } from '@/lib/api'
import { useSegmentPreviewImageHandlers } from './useSegmentPreviewImageHandlers'
import type { AdminThemeSegment } from '@/types/admin'

function segment(overrides: Partial<AdminThemeSegment> = {}): AdminThemeSegment {
  return {
    id: 7,
    theme_id: 1,
    anime_id: 1,
    theme_title: null,
    theme_type_name: 'OP',
    fansub_group_id: null,
    version: 'v1',
    start_episode: 1,
    end_episode: 1,
    start_time: '0:00',
    end_time: '1:30',
    source_jellyfin_item_id: null,
    preview_url: null,
    preview_source: null,
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

function setup(overrides: Partial<Parameters<typeof useSegmentPreviewImageHandlers>[0]> = {}) {
  const setEditingSegment = vi.fn()
  const reload = vi.fn().mockResolvedValue(undefined)
  const options = {
    animeId: 1,
    releaseVariantId: null,
    hasAuthSession: true,
    editingSegment: segment(),
    setEditingSegment,
    reload,
    ...overrides,
  }
  const result = renderHook(() => useSegmentPreviewImageHandlers(options))
  return { ...result, setEditingSegment, reload }
}

describe('useSegmentPreviewImageHandlers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  it('laedt ein neues Vorschaubild hoch, aktualisiert das Segment und zeigt eine Erfolgsmeldung', async () => {
    const updated = segment({ preview_url: 'https://x/preview.jpg', preview_source: 'manual' })
    api.uploadSegmentPreviewImage.mockResolvedValue({ data: updated })
    const { result, setEditingSegment, reload } = setup()

    const file = new File(['img'], 'preview.jpg', { type: 'image/jpeg' })
    await act(async () => {
      await result.current.handlePreviewUpload(file)
    })

    expect(api.uploadSegmentPreviewImage).toHaveBeenCalledWith(1, 7, file, undefined, null)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setEditingSegment).toHaveBeenCalledWith(updated)
    expect(result.current.isUploadingPreview).toBe(false)
    expect(result.current.previewUploadError).toBeNull()
    expect(result.current.successMessage).toBe('Vorschaubild hochgeladen und übernommen.')
  })

  it('zeigt bei fehlgeschlagenem Upload die generische Fehlermeldung inklusive Serverdetail', async () => {
    api.uploadSegmentPreviewImage.mockRejectedValue(new Error('Datei zu groß.'))
    const { result } = setup()

    await act(async () => {
      await result.current.handlePreviewUpload(new File(['img'], 'preview.jpg', { type: 'image/jpeg' }))
    })

    expect(result.current.previewUploadError).toBe('Vorschaubild konnte nicht hochgeladen werden. Datei zu groß.')
    expect(result.current.isUploadingPreview).toBe(false)
  })

  it('zeigt bei 403 die feste Berechtigungsmeldung statt des generischen Textes', async () => {
    api.uploadSegmentPreviewImage.mockRejectedValue(new ApiError(403, 'forbidden'))
    const { result } = setup()

    await act(async () => {
      await result.current.handlePreviewUpload(new File(['img'], 'preview.jpg', { type: 'image/jpeg' }))
    })

    expect(result.current.previewUploadError).toBe(
      'Du hast keine Berechtigung, das Vorschaubild dieses Segments zu ändern.',
    )
  })

  it('oeffnet den Picker und laedt Kandidaten', async () => {
    api.getSegmentPreviewImageCandidates.mockResolvedValue({
      data: [{ media_asset_id: 9, thumbnail_url: 'https://x/9.jpg', release_version_label: '1080p' }],
    })
    const { result } = setup()

    await act(async () => {
      await result.current.handleOpenPreviewPicker()
    })

    expect(result.current.isPickerOpen).toBe(true)
    expect(result.current.isLoadingPickerCandidates).toBe(false)
    expect(result.current.pickerCandidates).toEqual([
      { media_asset_id: 9, thumbnail_url: 'https://x/9.jpg', release_version_label: '1080p' },
    ])
    expect(result.current.pickerError).toBeNull()
  })

  it('setzt pickerError, wenn das Laden der Kandidaten fehlschlaegt', async () => {
    api.getSegmentPreviewImageCandidates.mockRejectedValue(new Error('Netzwerkfehler.'))
    const { result } = setup()

    await act(async () => {
      await result.current.handleOpenPreviewPicker()
    })

    expect(result.current.pickerCandidates).toEqual([])
    expect(result.current.pickerError).toBe('Release-Bilder konnten nicht geladen werden. Netzwerkfehler.')
  })

  it('uebernimmt einen Kandidaten, schliesst den Picker und zeigt eine Erfolgsmeldung', async () => {
    const updated = segment({ preview_url: 'https://x/9.jpg', preview_source: 'manual' })
    api.attachSegmentPreviewImage.mockResolvedValue({ data: updated })
    const { result, setEditingSegment, reload } = setup()

    await act(async () => {
      result.current.handleOpenPreviewPicker()
    })

    await act(async () => {
      await result.current.handleAttachPreviewCandidate({
        media_asset_id: 9,
        thumbnail_url: 'https://x/9.jpg',
        release_version_label: '1080p',
      })
    })

    expect(api.attachSegmentPreviewImage).toHaveBeenCalledWith(1, 7, { media_asset_id: 9 }, undefined, null)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setEditingSegment).toHaveBeenCalledWith(updated)
    expect(result.current.isPickerOpen).toBe(false)
    expect(result.current.successMessage).toBe('Vorschaubild aus Release-Bild übernommen.')
  })

  it('setzt die automatische Wahl ohne Confirm-Dialog zurueck und zeigt eine Erfolgsmeldung', async () => {
    const updated = segment({ preview_url: 'https://x/auto.jpg', preview_source: 'auto' })
    api.resetSegmentPreviewImage.mockResolvedValue({ data: updated })
    const { result, setEditingSegment, reload } = setup()

    await act(async () => {
      await result.current.handleResetPreview()
    })

    expect(api.resetSegmentPreviewImage).toHaveBeenCalledWith(1, 7, undefined, null)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setEditingSegment).toHaveBeenCalledWith(updated)
    expect(result.current.successMessage).toBe('Automatisches Vorschaubild wird wieder verwendet.')
  })

  it('blendet die Erfolgsmeldung nach 4 Sekunden automatisch aus', async () => {
    vi.useFakeTimers()
    try {
      api.resetSegmentPreviewImage.mockResolvedValue({ data: segment({ preview_source: 'auto' }) })
      const { result } = setup()

      await act(async () => {
        await result.current.handleResetPreview()
      })
      expect(result.current.successMessage).toBe('Automatisches Vorschaubild wird wieder verwendet.')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      expect(result.current.successMessage).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('blendet die Erfolgsmeldung beim manuellen Schliessen sofort aus (UI-SPEC Design-Entscheidung 10)', async () => {
    api.resetSegmentPreviewImage.mockResolvedValue({ data: segment({ preview_source: 'auto' }) })
    const { result } = setup()

    await act(async () => {
      await result.current.handleResetPreview()
    })
    expect(result.current.successMessage).not.toBeNull()

    act(() => {
      result.current.dismissSuccessMessage()
    })
    expect(result.current.successMessage).toBeNull()
  })
})
