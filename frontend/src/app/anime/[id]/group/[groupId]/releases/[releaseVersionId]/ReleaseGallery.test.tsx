// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/lib/api'
import type { PublicReleaseImage, PublicReleaseSegment, PublicReleaseStoryItem } from '@/types/releaseDetail'

const authSession = vi.hoisted(() => ({
  value: { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true },
}))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => authSession.value }))

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
  return { id, category, thumbnail_url: `/thumb-${id}.jpg`, original_url: `/original-${id}.jpg`, caption: `Vollständige Beschreibung ${id}`, author_name: `Uploader ${id}`, is_preview_candidate: false, is_highlight: false, highlight_order: null }
}

const totals = { screenshot: 7, typesetting_karaoke: 1, fun_outtake: 1, other: 0 }

describe('ReleaseGallery', () => {
  beforeEach(() => { viewport = 'desktop'; listeners.clear(); authSession.value = { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true }; vi.restoreAllMocks(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined); vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined); installMatchMedia() })

  it('renders one six-item desktop grid with metadata and no zero reveal', () => {
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={{ screenshot: 6, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)
    expect(document.querySelector('#galerie')?.getAttribute('data-release-atmosphere-band')).toBe('true')
    expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(6)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    expect(screen.getAllByText('Fansub Screenshot')).toHaveLength(6)
    expect(screen.getByText('Uploaded von Uploader 1')).toBeTruthy()
  })

  it('keeps the viewport contract at two tablet columns and at most three desktop columns', () => {
    const source = readFileSync(resolve(
      process.cwd(),
      'src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css',
    ), 'utf8')
    expect(source).toMatch(/\.grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s)
    expect(source).toMatch(/@media\s*\(min-width:\s*901px\)[^{]*\{\s*\.grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s)
    expect(source).toMatch(/@media\s*\(min-width:\s*1200px\)[^{]*\{\s*\.grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s)
    expect(source).not.toMatch(/\.grid\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s)
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
    expect(screen.queryByText('C-Subs')).toBeNull()
    expect(screen.queryByText('D-Subs')).toBeNull()
  })

  it('uses the responsive source for mobile two-item reveal and remaining label', async () => {
    viewport = 'mobile'
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={{ screenshot: 6, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)
    await waitFor(() => expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(2))
    expect(screen.getByRole('button', { name: 'Weitere 4 Bilder anzeigen' })).toBeTruthy()
  })

  it('reveals aggregate images immediately without an unnecessary cursor request', () => {
    const loadImages = vi.spyOn(api, 'getGroupReleaseImages')
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6,7,8].map(id => image(id))} categoryTotals={{ screenshot: 8, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)

    expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(6)
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 2 Bilder anzeigen' }))

    expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(8)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    expect(loadImages).not.toHaveBeenCalled()
  })

  it('keeps an individual title separate from the full caption in the card and lightbox', () => {
    const item = { ...image(1), title: '<b>Individueller Titel</b>', caption: '<em>Eigene Beschreibung</em>' }
    const { container } = render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[item]} categoryTotals={{ screenshot: 1, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)
    const card = screen.getByTestId('release-image-grid')
    expect(within(card).getByText(item.title).tagName).toBe('STRONG')
    expect(within(card).getByText(item.caption).tagName).toBe('P')
    fireEvent.click(screen.getByRole('button', { name: `${item.title} öffnen` }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: item.title })).toBeTruthy()
    expect(within(dialog).getByText(item.caption)).toBeTruthy()
    expect(container.querySelector('b, em')).toBeNull()
    expect(dialog.querySelector('b, em')).toBeNull()
  })

  it('opens the clicked image by ID after the featured image changes the visual order', () => {
    const regular = { ...image(1), title: 'Reguläres Bild' }
    const featured = { ...image(2), title: 'Highlight-Bild', is_preview_candidate: true }
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[regular, featured]} categoryTotals={{ screenshot: 2, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reguläres Bild öffnen' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Reguläres Bild' })).toBeTruthy()
  })

  it('keeps preview independent and orders multiple highlights before regular story images', () => {
    const preview = { ...image(13), title: 'Preview-Bild', is_preview_candidate: true }
    const firstHighlight = { ...image(10), title: 'Highlight eins', is_highlight: true, highlight_order: 1 }
    const secondHighlight = { ...image(11), title: 'Highlight zwei', is_highlight: true, highlight_order: 0 }
    const regular = { ...image(12), title: 'Reguläres Bild' }

    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[regular, firstHighlight, secondHighlight, preview]} categoryTotals={{ screenshot: 4, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)

    expect([...document.querySelectorAll('[data-testid^="release-image-card-"]')].map(node => node.getAttribute('data-testid'))).toEqual([
      'release-image-card-13',
      'release-image-card-11',
      'release-image-card-10',
      'release-image-card-12',
    ])
    expect(screen.queryByText('Vorschau')).toBeNull()
    expect(screen.queryByText('Highlight')).toBeNull()
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
    await waitFor(() => expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(9))
    expect(api.getGroupReleaseImages).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Vollständige Beschreibung 8 öffnen' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Typesetting-/Karaoke-Beispiel' })).toBeTruthy()
    expect(within(dialog).getAllByText('Vollständige Beschreibung 8')).toHaveLength(1)
    expect(within(dialog).getByAltText('Typesetting-/Karaoke-Beispiel').getAttribute('src')).toContain('/original-8.jpg')
  })

  it('keeps visible cards and lightbox originals when loading more fails', async () => {
    vi.spyOn(api, 'getGroupReleaseImages').mockRejectedValue(new Error('network down'))
    render(<ReleaseGallery animeID={1} groupID={2} releaseVersionID={3} initialImages={[1,2,3,4,5,6].map(id => image(id))} categoryTotals={{ screenshot: 7, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Weitere 1 Bilder anzeigen' }))

    expect(await screen.findByText('Weitere Bilder konnten nicht geladen werden. Bitte versuche es erneut.')).toBeTruthy()
    expect(document.querySelectorAll('[data-testid^="release-image-card-"]').length).toBe(6)
    fireEvent.click(screen.getByRole('button', { name: 'Vollständige Beschreibung 1 öffnen' }))
    expect(within(screen.getByRole('dialog')).getByAltText('Fansub Screenshot').getAttribute('src')).toContain('/original-1.jpg')
  })
})


describe('ReleaseGallery Kara contributor ownership', () => {
  it('shows contributors only on the originating episode', () => {
    const segment: PublicReleaseSegment = {
      theme_segment_id: 77,
      name: 'Opening',
      type: 'OP',
      start_seconds: 0,
      end_seconds: 60,
      duration_seconds: 60,
      readiness: 'ready',
      applies_from_episode: '1',
      applies_through_episode: '12',
      participants: [{ member_id: 5, name: 'Mina', member_slug: 'mina', role_label: 'Typesetting', role_codes: ['typesetting'], segment_role_label: 'Typesetting', avatar_url: null }],
      preview_url: null,
    }
    const story: PublicReleaseStoryItem[] = [{ type: 'kara', id: 77, sort_order: 0, segment }]
    const props = {
      animeID: 1,
      groupID: 2,
      releaseVersionID: 3,
      initialImages: [] as PublicReleaseImage[],
      story,
      categoryTotals: { screenshot: 0, typesetting_karaoke: 0, fun_outtake: 0, other: 0 },
    }

    const { rerender } = render(<ReleaseGallery {...props} episodeNumber="1" />)
    expect(screen.getByText('Mitwirkende')).toBeTruthy()
    expect(screen.queryByText(/Mitwirkende siehe Folge/)).toBeNull()

    rerender(<ReleaseGallery {...props} episodeNumber="2" />)
    expect(screen.queryByText('Mitwirkende')).toBeNull()
    expect(screen.getByText('Mitwirkende siehe Folge 1')).toBeTruthy()
  })
})

describe('ReleaseGallery mixed public story', () => {
  it('collapses a canonical story on mobile and reveals the rest on demand', () => {
    viewport = 'mobile'
    const story: PublicReleaseStoryItem[] = [1, 2, 3, 4, 5, 6].map((id, index) => ({
      type: 'media' as const,
      id,
      sort_order: index,
      image: image(id),
    }))
    render(
      <ReleaseGallery
        animeID={1}
        groupID={2}
        releaseVersionID={3}
        initialImages={story.map(item => item.image!)}
        story={story}
        categoryTotals={{ screenshot: 6, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }}
      />,
    )

    expect(document.querySelectorAll('[data-testid^="release-image-card-"]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Weitere 4 Bilder anzeigen' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 4 Bilder anzeigen' }))
    expect(document.querySelectorAll('[data-testid^="release-image-card-"]')).toHaveLength(6)
    expect(screen.queryByRole('button', { name: /Weitere/ })).toBeNull()
  })

  it('renders canonical media and Kara order with fallback preview and public play affordance', () => {
    viewport = 'desktop'
    const segment: PublicReleaseSegment = {
      theme_segment_id: 42,
      name: 'Moonlight OP',
      type: 'OP',
      start_seconds: 10,
      end_seconds: 90,
      duration_seconds: 80,
      readiness: 'ready',
      participants: [],
      preview_url: null,
    }
    const story: PublicReleaseStoryItem[] = [
      { type: 'media', id: 2, sort_order: 0, image: image(2) },
      { type: 'kara', id: 42, sort_order: 1, segment },
      { type: 'media', id: 1, sort_order: 2, image: image(1) },
    ]
    render(
      <ReleaseGallery
        animeID={1}
        groupID={2}
        releaseVersionID={3}
        initialImages={[image(1)]}
        story={story}
        categoryTotals={{ screenshot: 2, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }}
      />,
    )

    const cards = [...document.querySelector('[data-testid="release-image-grid"]')!.children]
    expect(cards.map(card => card.getAttribute('data-testid'))).toEqual([
      'release-image-card-2',
      'release-kara-card-42',
      'release-image-card-1',
    ])
    expect(screen.getByRole('img', { name: 'Preview für Moonlight OP' }).getAttribute('src')).toBe('/covers/placeholder.jpg')
    expect(screen.getByRole('link', { name: 'Anmelden zum Abspielen' }).getAttribute('href')).toBe('/login?next=%2Fanime%2F1%2Fgroup%2F2%2Freleases%2F3%3Fkara%3D42%26autoplay%3D1%23op-ed-middle')
  })

  it('stops another gallery video when a Kara card starts playback', () => {
    authSession.value = { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true }
    const segments: PublicReleaseSegment[] = [41, 42].map((id) => ({
      theme_segment_id: id,
      name: 'Kara ' + id,
      type: 'KARA',
      start_seconds: 0,
      end_seconds: 30,
      duration_seconds: 30,
      readiness: 'ready',
      participants: [],
      preview_url: null,
    }))
    const story: PublicReleaseStoryItem[] = segments.map((segment, index) => ({
      type: 'kara' as const,
      id: segment.theme_segment_id,
      sort_order: index,
      segment,
    }))

    render(
      <ReleaseGallery
        animeID={1}
        groupID={2}
        releaseVersionID={3}
        initialImages={[]}
        story={story}
        categoryTotals={{ screenshot: 0, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Kara abspielen' })[0])
    expect(document.querySelectorAll('video')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Kara abspielen' }))
    expect(document.querySelectorAll('video')).toHaveLength(1)
    expect(document.querySelector('video')?.getAttribute('aria-label')).toBe('Kara: Kara 42')
  })

  it('uses the shared Karaoke label for KARA story cards', () => {
    const segment: PublicReleaseSegment = {
      theme_segment_id: 99,
      name: 'Kara Segment',
      type: 'KARA',
      start_seconds: 0,
      end_seconds: 30,
      duration_seconds: 30,
      readiness: 'unavailable',
      participants: [],
      preview_url: null,
    }
    const story: PublicReleaseStoryItem[] = [{ type: 'kara', id: 99, sort_order: 0, segment }]

    render(
      <ReleaseGallery
        animeID={1}
        groupID={2}
        releaseVersionID={3}
        initialImages={[]}
        story={story}
        categoryTotals={{ screenshot: 0, typesetting_karaoke: 0, fun_outtake: 0, other: 0 }}
      />,
    )

    expect(screen.getByText('Karaoke')).toBeTruthy()
    expect(screen.queryByText('KARA')).toBeNull()
  })
})
