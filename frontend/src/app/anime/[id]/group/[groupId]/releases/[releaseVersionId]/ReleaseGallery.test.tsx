// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/lib/api'
import type { PublicReleaseImage } from '@/types/releaseDetail'

import { ReleaseGallery } from './ReleaseGallery'

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => {
  const imageProps = { ...props }
  delete imageProps.fill
  delete imageProps.unoptimized
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...imageProps} />
} }))

let viewport: 'desktop' | 'tablet' | 'mobile' = 'desktop'
const listeners = new Set<() => void>()
function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    get matches() { return query.includes('600') ? viewport === 'mobile' : viewport !== 'desktop' },
    media: query,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  }) })
}

function image(id: number, category: PublicReleaseImage['category'] = 'screenshot'): PublicReleaseImage {
  return { id, category, thumbnail_url: `/thumb-${id}.jpg`, original_url: `/original-${id}.jpg`, caption: `Vollständige Beschreibung ${id}`, author_name: `Uploader ${id}`, is_preview_candidate: false }
}

const totals = { screenshot: 7, typesetting_karaoke: 1, fun_outtake: 1, other: 0 }

describe('ReleaseGallery', () => {
  beforeEach(() => { viewport = 'desktop'; listeners.clear(); installMatchMedia(); vi.restoreAllMocks() })

  it('renders one six-item desktop grid with metadata and no zero reveal', () => {
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={{ screenshot: 6, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)
    expect(screen.getByTestId('release-image-grid').children).toHaveLength(6)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    expect(screen.getAllByText('Release-Screenshot')).toHaveLength(6)
    expect(screen.getByText('Hochgeladen von Uploader 1')).toBeTruthy()
  })

  it('keeps images from multiple source groups in exactly one release grid', () => {
    const first = { ...image(1), fansub_group_id: 4 }
    const second = { ...image(2), fansub_group_id: 5 }
    render(
      <ReleaseGallery
        animeID={1}
        groupID={4}
        releaseVersionID={3}
        initialImages={[first, second]}
        categoryTotals={{ screenshot: 2, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }}
        groups={[{ id: 4, slug: 'c-subs', name: 'C-Subs', logo_url: null }, { id: 5, slug: 'd-subs', name: 'D-Subs', logo_url: null }]}
      />,
    )

    expect(screen.getAllByTestId('release-image-grid')).toHaveLength(1)
    expect(screen.getByTestId('release-image-grid').children).toHaveLength(2)
    expect(screen.queryByTestId('release-image-groups')).toBeNull()
    expect(screen.queryByText('Herkunftsgruppe')).toBeNull()
  })

  it('uses the responsive source for mobile two-item reveal and remaining label', async () => {
    viewport = 'mobile'
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={{ screenshot: 6, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)
    await waitFor(() => expect(screen.getByTestId('release-image-grid').children).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Weitere 4 Bilder anzeigen' })).toBeTruthy()
  })

  it('reveals aggregate images immediately without an unnecessary cursor request', () => {
    const loadImages = vi.spyOn(api, 'getGroupReleaseImages')
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6,7,8].map(id => image(id))} categoryTotals={{ screenshot: 8, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)

    expect(screen.getByTestId('release-image-grid').children).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 2 Bilder anzeigen' }))

    expect(screen.getByTestId('release-image-grid').children).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    expect(loadImages).not.toHaveBeenCalled()
  })

  it('does not repeat a caption that is identical to the category title in the lightbox', () => {
    const categoryCaption = image(1, 'typesetting_karaoke')
    categoryCaption.caption = 'Typesetting-/Karaoke-Beispiel'
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[categoryCaption]} categoryTotals={{ screenshot: 0, typesetting_karaoke: 1, fun_outtake: 0, other: 0 }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Typesetting-/Karaoke-Beispiel öffnen' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByText('Typesetting-/Karaoke-Beispiel')).toHaveLength(1)
  })

  it('loads every category cursor, deduplicates, and opens the original with full caption', async () => {
    vi.spyOn(api, 'getGroupReleaseImages').mockImplementation(async (_anime, _group, _release, options) => {
      if (options?.category === 'screenshot') return { category: 'screenshot', total: 7, returned_count: 2, items: [image(1), image(7)], next_cursor: null, has_more: false }
      if (options?.category === 'typesetting_karaoke') return { category: 'typesetting_karaoke', total: 1, returned_count: 1, items: [image(8, 'typesetting_karaoke')], next_cursor: null, has_more: false }
      return { category: 'fun_outtake', total: 1, returned_count: 1, items: [image(9, 'fun_outtake')], next_cursor: null, has_more: false }
    })
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={totals} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 3 Bilder anzeigen' }))
    await waitFor(() => expect(screen.getByTestId('release-image-grid').children).toHaveLength(9))
    expect(api.getGroupReleaseImages).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Vollständige Beschreibung 8 öffnen' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Typesetting-/Karaoke-Beispiel' })).toBeTruthy()
    expect(within(dialog).getAllByText('Vollständige Beschreibung 8')).toHaveLength(1)
    expect(within(dialog).getByAltText('Typesetting-/Karaoke-Beispiel').getAttribute('src')).toContain('/original-8.jpg')
  })
})
