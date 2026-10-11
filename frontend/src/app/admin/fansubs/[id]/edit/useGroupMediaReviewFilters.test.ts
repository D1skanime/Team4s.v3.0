// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FansubGroupMediaItem } from '@/lib/api'
import { useGroupMediaReviewFilters } from './useGroupMediaReviewFilters'

function mediaItem(overrides: Partial<FansubGroupMediaItem> = {}): FansubGroupMediaItem {
  return {
    id: 1,
    preview_url: null,
    thumbnail_url: null,
    original_url: null,
    visibility: 'intern',
    review_status: 'in_pruefung',
    title: 'Testbild',
    description: null,
    alt_text: null,
    category: 'gallery',
    sort_order: 1000,
    uploaded_by_display_name: null,
    uploaded_by_current_user: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    owner_type: 'fansub_group',
    owner_id: 1,
    owner_consistent: true,
    ...overrides,
  }
}

describe('useGroupMediaReviewFilters', () => {
  it('filtert nach Kategorie und setzt das Ladelimit bei jeder Filteraenderung zurueck', () => {
    const items = [
      mediaItem({ id: 1, category: 'gallery', review_status: 'freigegeben' }),
      mediaItem({ id: 2, category: 'forum', review_status: 'in_pruefung' }),
      mediaItem({ id: 3, category: 'gallery', review_status: 'in_pruefung' }),
    ]
    const { result } = renderHook(({ mediaItems }) => useGroupMediaReviewFilters(mediaItems), {
      initialProps: { mediaItems: items },
    })

    expect(result.current.filteredMediaItems).toHaveLength(3)

    act(() => {
      result.current.setVisibleLimit(5)
    })
    expect(result.current.visibleLimit).toBe(5)

    act(() => {
      result.current.setCategoryFilter('gallery')
    })

    expect(result.current.filteredMediaItems.map((item) => item.id)).toEqual([1, 3])
    expect(result.current.visibleLimit).toBe(40)
  })

  it('waehlt bei toggleAllFilteredSelection nur die aktuell gefilterten IDs aus, nicht alle Medien', () => {
    const items = [
      mediaItem({ id: 1, category: 'gallery' }),
      mediaItem({ id: 2, category: 'forum' }),
      mediaItem({ id: 3, category: 'gallery' }),
    ]
    const { result } = renderHook(() => useGroupMediaReviewFilters(items))

    act(() => {
      result.current.setCategoryFilter('gallery')
    })

    act(() => {
      result.current.toggleAllFilteredSelection()
    })

    expect(Array.from(result.current.selectedMediaIds).sort()).toEqual([1, 3])
  })

  it('entfernt eine ausgewaehlte ID, wenn sie nach einem Reload nicht mehr im gefilterten Set vorkommt', () => {
    const initialItems = [
      mediaItem({ id: 1, category: 'gallery' }),
      mediaItem({ id: 2, category: 'gallery' }),
    ]
    const { result, rerender } = renderHook(({ mediaItems }) => useGroupMediaReviewFilters(mediaItems), {
      initialProps: { mediaItems: initialItems },
    })

    act(() => {
      result.current.setSelectedMediaIds(new Set([1, 2]))
    })
    expect(Array.from(result.current.selectedMediaIds).sort()).toEqual([1, 2])

    const shrunkItems = [mediaItem({ id: 1, category: 'gallery' })]
    rerender({ mediaItems: shrunkItems })

    expect(Array.from(result.current.selectedMediaIds)).toEqual([1])
  })
})
