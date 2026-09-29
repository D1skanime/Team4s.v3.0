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


describe('ReleaseVersionMediaGallery presentation and ordering', () => {
  it('keeps media metadata visible and reorders through the wrapper drag surface', () => {
    const onReorder = vi.fn().mockResolvedValue(undefined)
    const rendered = render(
      <ReleaseVersionMediaGallery
        items={[
          item({
            id: 1,
            title: 'Titel des Bildes',
            caption: 'Zusätzliche Beschreibung',
            review_state: 'confirmed',
            can_update: true,
            last_activity_at: '2026-09-28T12:34:00Z',
          }),
          item({ id: 2, caption: 'Zweites Bild', sort_order: 20 }),
        ]}
        selectedItemId={null}
        onSelectItem={vi.fn()}
        versionId={42}
        onReorder={onReorder}
        canReorder
      />,
    )

    expect(screen.getByText('Titel des Bildes')).toBeTruthy()
    expect(screen.getByText('Zusätzliche Beschreibung')).toBeTruthy()
    expect(screen.getAllByText('Fansub Screenshot').length).toBeGreaterThan(0)
    expect(screen.getByText('Bestätigt')).toBeTruthy()
    expect(screen.getByText(/Letzte Aktivität:/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bearbeiten' })).toBeTruthy()
    expect(screen.queryByText('Öffnen')).toBeNull()

    const dragTargets = rendered.container.querySelectorAll('[draggable="true"]')
    expect(dragTargets).toHaveLength(2)
    fireEvent.dragStart(dragTargets[0])
    fireEvent.dragOver(dragTargets[1])
    fireEvent.drop(dragTargets[1])

    expect(onReorder).toHaveBeenCalledWith(42, {
      items: [
        { id: 1, sort_order: 10 },
        { id: 2, sort_order: 20 },
      ],
    })
  })
})
