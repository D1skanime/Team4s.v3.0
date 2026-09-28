// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'
import { ReleaseVersionMediaGallery } from './ReleaseVersionMediaGallery'

vi.mock('./ReleaseVersionMediaGallery.module.css', () => ({ default: new Proxy({}, { get: (_target, key) => String(key) }) }))

function item(overrides: Partial<ReleaseVersionMediaItem> = {}): ReleaseVersionMediaItem {
  return {
    id: 1,
    release_version_id: 42,
    media_asset_id: 10,
    category: 'screenshot',
    caption: 'Szene',
    sort_order: 10,
    is_preview_candidate: false,
    is_highlight: false,
    highlight_order: null,
    thumbnail_url: 'https://example.test/thumb.png',
    original_url: 'https://example.test/original.png',
    uploaded_by_user_id: 1,
    created_at: '2026-09-28T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

describe('ReleaseVersionMediaGallery curation controls', () => {
  it('keeps preview and highlight controls independent for multiple same-category highlights', () => {
    const onPreviewChange = vi.fn().mockResolvedValue(undefined)
    const onHighlightChange = vi.fn().mockResolvedValue(undefined)
    const onSelectItem = vi.fn()

    render(
      <ReleaseVersionMediaGallery
        items={[
          item({ id: 1, caption: 'Erstes Bild', is_preview_candidate: true, is_highlight: true, highlight_order: 0 }),
          item({ id: 2, caption: 'Zweites Bild', sort_order: 20, is_highlight: true, highlight_order: 1 }),
        ]}
        selectedItemId={null}
        onSelectItem={onSelectItem}
        versionId={42}
        canReorder
        canManageHighlights
        onPreviewChange={onPreviewChange}
        onHighlightChange={onHighlightChange}
      />,
    )

    expect(screen.getAllByRole('button', { name: 'Highlight entfernen' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Vorschau entfernen' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Highlight entfernen' })[1])

    expect(onHighlightChange).toHaveBeenCalledWith(2, false)
    expect(onPreviewChange).not.toHaveBeenCalled()
  })
})
